# Production Implementation Prompt: Antigravity AI Engine & n8n Video/Image Generation Pipeline

> **How to use this document:**  
> Copy and paste the prompt below starting from **`=== MASTER PROMPT: ANTIGRAVITY & N8N VIDEO/IMAGE GENERATION PIPELINE ===`** directly into your Antigravity agent, Cursor, Claude Code, or Python/Node environment. It contains the exact technical specification, worker daemon code, n8n workflow nodes, and API contracts to generate both videos and images using your local Antigravity setup and existing n8n/storage system.

---

```markdown
=== MASTER PROMPT: ANTIGRAVITY & N8N VIDEO/IMAGE GENERATION PIPELINE ===

You are an expert AI Video & Image Systems Engineer specializing in Antigravity and n8n pipeline automation.

Your goal is to implement the complete **Antigravity AI Generation Worker & n8n Pipeline** that connects directly to the existing backend system (`https://360.webtrionix.com`). It will generate both **Videos** (9:16 vertical reels/stories with voiceover & visuals) and **Images** (1:1 / 4:5 feed posts and carousel cards), stream live progress, upload the generated media to the existing storage server, and trigger n8n workflows for automated multi-channel social publishing.

---

### 1. EXISTING SYSTEM INTEGRATION CONTRACTS

Your Antigravity engine connects directly to the existing backend endpoints using two pre-shared authentication keys:
- **`X-Worker-Key`**: Header authenticated with `process.env.ANTIGRAVITY_WORKER_KEY` (minimum 32 chars).
- **`X-Automation-Key`**: Header authenticated with `process.env.ANTIGRAVITY_N8N_KEY` (minimum 32 chars).
- **Base Backend URL**: `https://360.webtrionix.com/api/v1/machine`
- **Public Media Host**: `https://360.webtrionix.com/uploads/`

#### API Endpoints Used by Antigravity:
1. `POST /api/v1/machine/worker/ping`
   - Payload: `{ "workerId": "antigravity-local-01", "cliReady": true }`
   - Keeps worker registered as online in the central dashboard.

2. `POST /api/v1/machine/worker/claim`
   - Payload: `{ "workerId": "antigravity-local-01" }`
   - Atomically locks and returns the next pending job:
     ```json
     {
       "job": {
         "id": "e9673ba8-b271-431b-8314-bf00e4c742de",
         "leaseToken": "7b8e1a...",
         "prompt": "Detailed storyboard / visual prompt",
         "inputJson": "{\"kind\":\"video\"|\"post\",\"title\":\"...\",\"caption\":\"...\",\"format\":\"9:16\",\"videoLength\":30,\"language\":\"en\"}"
       }
     }
     ```

3. `POST /api/v1/machine/worker/progress`
   - Payload: `{ "jobId": "...", "leaseToken": "...", "stage": "Synthesizing voiceover", "progressPercent": 45 }`
   - Updates the live progress bar in the web studio.

4. `POST /api/v1/machine/worker/heartbeat`
   - Payload: `{ "jobId": "...", "leaseToken": "..." }`
   - Extends the 2-minute worker lease while rendering long video chunks.

5. `PUT /api/v1/machine/worker/upload/:id`
   - Binary stream upload of the completed `.mp4` or `.png`.
   - Required Headers:
     - `X-Job-Lease`: The `leaseToken` received during claim.
     - `X-Content-SHA256`: Hex SHA-256 hash of the generated file.
     - `Content-Type`: `video/mp4` (for video/reels) or `image/png` (for feed posts/carousels).
     - `Content-Length`: Exact file byte size.

6. `POST /api/v1/machine/worker/post-result/:id` (for Image Posts only)
   - Headers: `X-Job-Lease: <leaseToken>`
   - Payload: `{ "title": "...", "caption": "...", "hashtags": "..." }`
   - Finalizes image post copy and moves status to `READY`.

7. `POST /api/v1/machine/worker/fail`
   - Payload: `{ "jobId": "...", "leaseToken": "...", "error": "Clear description of error" }`

---

### 2. ANTIGRAVITY GENERATION PIPELINE SPECIFICATION

Your local Antigravity generation engine must support two output modes:

#### Mode A: 9:16 AI Video Generation (Reels / Stories)
1. **Script & Visual Breakdown**:
   - Parse input prompt into scenes (3 to 6 scenes for 30s video).
   - Generate scene visual descriptions + voiceover script in the requested language.
2. **Audio Synthesis (TTS)**:
   - Generate speech audio (MP3/WAV) with clean pacing matching the requested duration.
3. **Visual Scene Rendering**:
   - Generate 9:16 frames / animations matching scene prompts.
   - If reference image is provided in `input.referenceImageUrl`, use it as image-to-image or style reference.
4. **Assembly (FFmpeg)**:
   - Combine audio narration, background music track, and video scenes.
   - Encode to standard H.264 / AAC MP4 with faststart flags (`-c:v libx264 -pix_fmt yuv420p -movflags +faststart`).
   - Save output to `./output/<jobId>.mp4`.

#### Mode B: High-Res Image Generation (Feed Posts & Carousels)
1. **Aspect Ratio & Composition**:
   - 1:1 Square (`1080x1080`) or 4:5 Portrait (`1080x1350`).
2. **Visual Generation**:
   - Render image using prompt and style reference.
   - If carousel, render each slide sequentially with slide index branding.
3. **Format & Metadata**:
   - Export crisp PNG or high-quality JPG.
   - Save output to `./output/<jobId>.png`.

---

### 3. COMPLETE LOCAL ANTIGRAVITY WORKER DAEMON SCRIPT

Create `antigravity-worker.ts` (or `.js`) on the machine where Antigravity CLI and local GPU / AI models are installed:

```typescript
import axios from 'axios';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Configuration
const CENTRAL_API = process.env.CENTRAL_API_URL || 'https://360.webtrionix.com/api/v1/machine';
const WORKER_KEY = process.env.ANTIGRAVITY_WORKER_KEY!;
const WORKER_ID = process.env.WORKER_ID || `antigravity-worker-${process.pid}`;
const POLL_INTERVAL = 4000;
const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR || './antigravity_output');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const client = axios.create({
  baseURL: CENTRAL_API,
  headers: {
    'X-Worker-Key': WORKER_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

async function ping() {
  try {
    await client.post('/worker/ping', { workerId: WORKER_ID, cliReady: true });
  } catch (err: any) {
    console.error('[Ping Error]:', err.message);
  }
}

async function claim() {
  try {
    const { data } = await client.post('/worker/claim', { workerId: WORKER_ID });
    return data?.job || null;
  } catch (err: any) {
    if (err.response?.status !== 204) console.error('[Claim Error]:', err.response?.data || err.message);
    return null;
  }
}

async function sendProgress(jobId: string, leaseToken: string, stage: string, progressPercent: number) {
  try {
    await client.post('/worker/progress', { jobId, leaseToken, stage, progressPercent });
  } catch (err: any) {
    console.warn('[Progress Error]:', err.message);
  }
}

async function sendHeartbeat(jobId: string, leaseToken: string) {
  try {
    await client.post('/worker/heartbeat', { jobId, leaseToken });
  } catch (err: any) {
    console.warn('[Heartbeat Error]:', err.message);
  }
}

async function uploadMedia(jobId: string, leaseToken: string, filePath: string, isImage: boolean) {
  const fileBuffer = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  await client.put(`/worker/upload/${jobId}`, fileBuffer, {
    headers: {
      'X-Job-Lease': leaseToken,
      'X-Content-SHA256': sha256,
      'Content-Type': isImage ? 'image/png' : 'video/mp4',
      'Content-Length': fileBuffer.length,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

async function finalizePostText(jobId: string, leaseToken: string, copy: { title: string; caption: string; hashtags: string }) {
  await client.post(`/worker/post-result/${jobId}`, copy, {
    headers: { 'X-Job-Lease': leaseToken },
  });
}

async function reportFailure(jobId: string, leaseToken: string, errorMessage: string) {
  try {
    await client.post('/worker/fail', { jobId, leaseToken, error: errorMessage });
  } catch (err: any) {
    console.error('[Fail Report Error]:', err.message);
  }
}

/**
 * Executes local Antigravity Video or Image generation
 */
async function generateWithAntigravity(job: any): Promise<{ filePath: string; isImage: boolean; title?: string; caption?: string; hashtags?: string }> {
  const input = JSON.parse(job.inputJson || '{}');
  const isImage = input.kind === 'post';
  const extension = isImage ? 'png' : 'mp4';
  const outputPath = path.join(OUTPUT_DIR, `${job.id}.${extension}`);
  const prompt = job.prompt || input.title || 'Creative Brand Media';

  console.log(`[Antigravity] Starting ${isImage ? 'IMAGE' : 'VIDEO'} generation for Job ${job.id}...`);

  // Invoke your local Antigravity generator command / script
  // Example CLI invocation:
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  const command = isImage
    ? `antigravity-cli image --prompt "${escapedPrompt}" --output "${outputPath}"`
    : `antigravity-cli video --prompt "${escapedPrompt}" --duration ${input.videoLength || 30} --format "9:16" --output "${outputPath}"`;

  const { stdout } = await execAsync(command);
  console.log('[Antigravity CLI Output]:', stdout);

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Media file was not created at expected path: ${outputPath}`);
  }

  return {
    filePath: outputPath,
    isImage,
    title: input.title || 'AI Generated Asset',
    caption: input.caption || prompt,
    hashtags: input.hashtags || '#AI #Webtrionix #Automation',
  };
}

async function runWorkerLoop() {
  console.log(`[Worker] Antigravity worker connected to ${CENTRAL_API}. ID: ${WORKER_ID}`);
  setInterval(ping, 60000);
  await ping();

  while (true) {
    try {
      const job = await claim();
      if (!job) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        continue;
      }

      console.log(`[Worker] Claimed Job ${job.id}`);
      const lease = job.leaseToken;
      const heartbeatTimer = setInterval(() => sendHeartbeat(job.id, lease), 30000);

      try {
        await sendProgress(job.id, lease, 'Analyzing prompt & building storyboard in Antigravity', 15);
        await sendProgress(job.id, lease, 'Synthesizing voiceover audio & visual scenes', 50);

        const result = await generateWithAntigravity(job);

        await sendProgress(job.id, lease, 'Encoding and uploading media to storage server', 85);
        await uploadMedia(job.id, lease, result.filePath, result.isImage);

        if (result.isImage) {
          await finalizePostText(job.id, lease, {
            title: result.title!,
            caption: result.caption!,
            hashtags: result.hashtags!,
          });
        }

        console.log(`[Worker] Job ${job.id} finished successfully!`);
      } catch (err: any) {
        console.error(`[Worker] Generation failed for Job ${job.id}:`, err.message);
        await reportFailure(job.id, lease, err.message);
      } finally {
        clearInterval(heartbeatTimer);
      }
    } catch (loopErr: any) {
      console.error('[Worker Loop Error]:', loopErr.message);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
  }
}

runWorkerLoop();
```

---

### 4. N8N WORKFLOW SPECIFICATION (SAME N8N INSTANCE)

In your existing n8n instance (`https://n8n.webtrionix.com` or local n8n), implement two workflows:

#### Workflow 1: Instant Generation Dispatch (`/webhook/antigravity/dispatch`)
1. **Webhook Node (POST)**:
   - Path: `/webhook/antigravity/dispatch`
   - Authentication: Header Auth `X-Automation-Key`
2. **Code / HTTP Node**:
   - Logs incoming `{ "jobId": "..." }`.
   - Sends notification / triggers local daemon if needed.
3. **HTTP Request Node (Release Dispatch)**:
   - URL: `https://360.webtrionix.com/api/v1/machine/dispatch`
   - Headers: `X-Automation-Key: {{ $env.ANTIGRAVITY_N8N_KEY }}`
   - Body: `{ "jobId": $json.jobId }`
   - Sets `dispatched = 1` so the worker can claim immediately.

#### Workflow 2: Automated Social Media Publishing (`/webhook/ci360/publish-now`)
Triggered automatically when a post is ready or scheduled for release:
1. **Webhook Trigger**: Receives post ID, caption, and public media URL:
   `https://360.webtrionix.com/uploads/<jobId>.mp4` (or `.png`).
2. **Platform Routing**:
   - **Instagram Node**: Submits to Meta Graph API Container (`/media?media_type=REELS&video_url=...`), polls until `FINISHED`, then triggers `/media_publish`.
   - **Facebook Page Node**: Posts to `/{page-id}/videos` or `/{page-id}/photos`.
   - **YouTube Shorts Node**: Uploads video with `#Shorts` in title.
   - **LinkedIn Node**: Registers upload, streams binary from media URL, and publishes share.
3. **Callback Node**:
   - Reports live published URLs back to:
     `POST https://360.webtrionix.com/api/v1/integrations/n8n/callback`

---

### 5. LOCAL ENVIRONMENT CONFIGURATION (`.env`)

Add these to your local PC where the Antigravity worker and n8n run:

```env
CENTRAL_API_URL="https://360.webtrionix.com/api/v1/machine"
ANTIGRAVITY_WORKER_KEY="minimum_32_char_worker_key_from_server_env"
ANTIGRAVITY_N8N_KEY="minimum_32_char_n8n_key_from_server_env"
WORKER_ID="local-antigravity-gpu-01"
OUTPUT_DIR="./antigravity_output"
```

---

### 6. RUN & VERIFY

1. Start your local worker:
   ```bash
   npx ts-node antigravity-worker.ts
   ```
2. Verify connection on dashboard:
   - Check `GET https://360.webtrionix.com/api/v1/creator/status` -> `workerOnline` should immediately show `true`.
3. Submit a Reel or Post:
   - The worker automatically claims the job, runs Antigravity generation, uploads the MP4/PNG to storage, and the finished media renders live in the Creator Studio preview player!
```
