import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db } from '../db/sqlite';
import { canEdit, ownBrand, audit } from '../services/access';
import { generateStudio, studioInput, studioModels, hasGeminiKey, StudioError } from '../services/ai/studioGemini';

export const aiStudioRouter = Router();
const privateImages = () => path.resolve(process.env.DATA_DIRECTORY || process.cwd(), 'studio-images');
aiStudioRouter.get('/status', (req, res) => {
  res.json({ configured: hasGeminiKey(), provider: 'Google Gemini', models: studioModels(), canGenerate: canEdit(req.principal),
    message: hasGeminiKey() ? 'Key configured. Model availability is verified when you generate.' : 'An administrator must configure a Gemini API key on the server.' });
});
aiStudioRouter.get('/history', (req, res) => {
  const rows: any[] = db.prepare('SELECT id, brand_id, task, model, status, result_json, error_code, input_tokens, output_tokens, created_at FROM studio_generations WHERE user_id = ? AND (? = 1 OR client_id = ?) ORDER BY created_at DESC LIMIT 20').all(req.principal.id, Number(req.principal.global), req.principal.clientId);
  res.json({ data: rows.map(row => ({ id: row.id, brandId: row.brand_id, task: row.task, model: row.model, status: row.status, result: row.result_json ? JSON.parse(row.result_json) : null,
    errorCode: row.error_code, inputTokens: row.input_tokens, outputTokens: row.output_tokens, createdAt: row.created_at })) });
});
aiStudioRouter.get('/images/:id', async (req, res) => {
  const row: any = db.prepare("SELECT image_filename, image_mime FROM studio_generations WHERE id = ? AND user_id = ? AND (? = 1 OR client_id = ?) AND status = 'succeeded'").get(req.params.id, req.principal.id, Number(req.principal.global), req.principal.clientId);
  if (!row?.image_filename) return res.status(404).json({ error: 'Image not found.' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `inline; filename="${row.image_filename}"`);
  res.type(row.image_mime);
  res.sendFile(path.join(privateImages(), path.basename(row.image_filename)), error => { if (error && !res.headersSent) res.status(404).json({ error: 'Image is unavailable.' }); });
});
aiStudioRouter.post('/generate', async (req, res) => {
  if (!canEdit(req.principal)) return res.status(403).json({ error: 'Content editing permission is required.' });
  const parsed = studioInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose a brand, a supported task, and a brief of 10–12,000 characters. Images must be PNG, JPEG, or WebP under 6 MB.' });
  let id: string | undefined;
  try {
    const input = parsed.data; const brand = ownBrand(req, input.brandId);
    if (!hasGeminiKey()) throw new StudioError(503, 'GEMINI_NOT_CONFIGURED', 'Gemini is not configured. Add the API key in the server settings first.');
    const now = new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      const running = db.prepare("SELECT 1 FROM studio_generations WHERE client_id = ? AND status = 'running' AND created_at > ?").get(brand.client_id, new Date(Date.now()-120000).toISOString());
      const recent: any = db.prepare('SELECT count(*) AS count FROM studio_generations WHERE client_id = ? AND created_at > ?').get(brand.client_id, new Date(Date.now()-60000).toISOString());
      const daily: any = db.prepare('SELECT count(*) AS count FROM studio_generations WHERE client_id = ? AND created_at > ?').get(brand.client_id, new Date(Date.now()-86400000).toISOString());
      if (running) throw new StudioError(429, 'STUDIO_BUSY', 'Another generation is running for this workspace. Wait for it to finish.');
      if (recent.count >= 6 || daily.count >= 100) throw new StudioError(429, 'STUDIO_LIMIT', 'Workspace generation limit reached (6 per minute, 100 per 24 hours). Try again later.');
      id = randomUUID();
      db.prepare("INSERT INTO studio_generations (id,client_id,brand_id,user_id,task,model,status,created_at) VALUES (?,?,?,?,?,?,'running',?)").run(id,brand.client_id,brand.brand_id,req.principal.id,input.task,input.task==='image'?studioModels().image:studioModels().text,now);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    const generated = await generateStudio(input, brand.brand_name);
    let imageFilename: string | null = null;
    if (generated.image) {
      imageFilename = `${id}.${generated.image.mimeType === 'image/jpeg' ? 'jpg' : generated.image.mimeType === 'image/webp' ? 'webp' : 'png'}`;
      await fs.mkdir(privateImages(), { recursive: true });
      await fs.writeFile(path.join(privateImages(),imageFilename),generated.image.bytes,{flag:'wx',mode:0o600});
    }
    const result = { text: generated.text, imageUrl: generated.image ? `/api/v1/ai/studio/images/${id}` : null, model: generated.model, usage: generated.usage };
    db.prepare("UPDATE studio_generations SET status='succeeded',result_json=?,image_filename=?,image_mime=?,input_tokens=?,output_tokens=?,completed_at=? WHERE id=?").run(JSON.stringify(result),imageFilename,generated.image?.mimeType || null,generated.usage.inputTokens,generated.usage.outputTokens,new Date().toISOString(),id);
    audit(req.principal,'ai_generation',id!,'generate',{task:input.task,brandId:brand.brand_id,model:generated.model});
    res.json({id,...result});
  } catch (error: any) {
    const code = error instanceof StudioError ? error.code : 'STUDIO_ERROR';
    if (id) db.prepare("UPDATE studio_generations SET status='failed',error_code=?,completed_at=? WHERE id=?").run(code,new Date().toISOString(),id);
    const status = error instanceof StudioError ? error.status : error.status === 404 ? 404 : 500;
    res.status(status).json({error: error instanceof StudioError || status === 404 ? error.message : 'The request could not be completed. Please try again.',code});
  }
});
