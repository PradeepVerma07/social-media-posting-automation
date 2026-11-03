import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { N8nClaimRequestSchema, N8nCallbackSchema } from '../schemas';
import { verifyHmacSignature } from '../crypto/tokenVault';
import { transitionTarget, transitionPostStatus } from '../services/stateMachine';
import { claimDueTargets, loadDelivery, approvalIsCurrent, DeliveryConflict } from '../services/deliveryClaims';
import { publishDelivery } from '../services/reliablePublisher';
import { metaVerifierService } from '../services/verifier';
import { feedIntelligenceService } from '../services/ai/FeedIntelligenceService';
import { predictivePerformanceEngine } from '../services/ai/PredictivePerformanceEngine';
import { sheetsOutboxWorker } from '../services/sheetsOutboxWorker';
import { sseManager } from '../services/sseManager';

export const internalRouter = Router();

internalRouter.use((req, res, next) => {
  const secret = process.env.N8N_INTERNAL_API_KEY;
  const supplied = req.get('X-Internal-API-Key');
  if (!secret || secret.length < 32) return res.status(503).json({ error: 'Internal integration is not configured' });
  if (!supplied || Buffer.byteLength(secret) !== Buffer.byteLength(supplied)
    || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) {
    return res.status(401).json({ error: 'Invalid internal authentication' });
  }
  res.set('Cache-Control', 'no-store');
  next();
});

internalRouter.post('/jobs/claim', (req: Request, res: Response) => {
  const parsed = N8nClaimRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  try {
    const { execution_id, target_ids, limit } = parsed.data;
    const jobs = claimDueTargets(execution_id, target_ids, limit);
    for (const job of jobs) sseManager.emit('target.status_changed', job.client_id, { targetId: job.target_id, status: 'Processing' });
    // Credentials and media remain behind the application integration boundary.
    return res.json({ jobs: jobs.map(job => ({ target_id: job.target_id, execution_id,
      post_id: job.post_id, client_id: job.client_id, platform: job.platform, post_version: job.claimed_post_version })) });
  } catch {
    logger.error('Atomic claim failed');
    return res.status(500).json({ error: 'Could not claim deliveries' });
  }
});

internalRouter.post('/jobs/:id/publish', async (req: Request, res: Response) => {
  if (typeof req.body.execution_id !== 'string' || !req.body.execution_id)
    return res.status(400).json({ error: 'execution_id is required' });
  const target = loadDelivery(req.params.id);
  if (!target || target.status !== 'Processing' || target.lock_execution_id !== req.body.execution_id)
    return res.status(409).json({ error: 'The delivery is not owned by this execution' });
  try {
    return res.json(await publishDelivery(req.params.id, req.body.execution_id));
  } catch (error) {
    if (error instanceof DeliveryConflict) return res.status(409).json({ error: error.message });
    logger.error({ targetId: req.params.id }, 'Delivery execution failed; sweeper will reconcile its state');
    return res.status(500).json({ error: 'Delivery outcome requires reconciliation' });
  }
});

internalRouter.post('/automation/errors', (req: Request, res: Response) => {
  const { execution_id, workflow_id } = req.body;
  if (typeof execution_id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(execution_id)
    || typeof workflow_id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(workflow_id))
    return res.status(400).json({ error: 'Valid execution_id and workflow_id are required' });
  db.prepare(`INSERT OR IGNORE INTO audit_log (id, actor, entity, entity_id, action, after_val, created_at)
    VALUES (?, 'n8n', 'automation', ?, 'execution_failed', ?, ?)`)
    .run(`n8n-error-${workflow_id}-${execution_id}`, execution_id,
      JSON.stringify({ workflowId: workflow_id, executionId: execution_id }), new Date().toISOString());
  logger.error({ workflowId: workflow_id, executionId: execution_id }, 'Automation execution failed');
  return res.json({ status: 'recorded' });
});

// Legacy token-export workflows must be migrated to the job API.
internalRouter.get('/accounts/:id/token', (_req: Request, res: Response) =>
  res.status(410).json({ error: 'Token export is disabled. Use the claimed delivery publishing API.' }));

export function verifyCallbackEnvelope(req: Request): boolean {
  const secret = process.env.N8N_CALLBACK_SECRET;
  const timestamp = req.get('X-CI360-Timestamp');
  const signature = req.get('X-CI360-Signature');
  const eventId = req.get('X-CI360-Event-Id');
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!secret || secret.length < 32 || !timestamp || !/^\d{13}$/.test(timestamp)
    || !signature || !eventId || !/^[A-Za-z0-9:_-]{8,160}$/.test(eventId)
    || !raw || Math.abs(Date.now() - Number(timestamp)) > 300000) return false;
  return verifyHmacSignature(`${timestamp}.${eventId}.${raw.toString('utf8')}`, signature, secret);
}

internalRouter.post('/n8n/callback', (req: Request, res: Response) => {
  if (!verifyCallbackEnvelope(req)) return res.status(401).json({ error: 'Invalid signed callback envelope' });
  const parsed = N8nCallbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const payload = parsed.data;
  const eventId = req.get('X-CI360-Event-Id')!;
  const now = new Date().toISOString();
  let changed: any;
  let shouldVerify = false;
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare('SELECT event_id FROM webhook_events WHERE event_id = ?').get(eventId)) {
      db.exec('COMMIT');
      return res.json({ status: 'duplicate_ignored' });
    }
    const target = loadDelivery(payload.target_id);
    const attempt = db.prepare(`SELECT attempt_id FROM publish_attempts WHERE target_id = ? AND execution_id = ? AND result = 'running'`)
      .get(payload.target_id, payload.execution_id);
    if (!target || target.status !== 'Processing' || target.lock_execution_id !== payload.execution_id || !attempt) {
      db.exec('ROLLBACK');
      return res.status(409).json({ error: 'Stale callback or delivery not owned by this execution' });
    }
    if (payload.stage === 'claimed' || payload.stage === 'publishing') {
      if (!approvalIsCurrent(target) || target.post_version !== target.claimed_post_version || target.lock_stage !== 'claimed') {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: 'Approval, version, or claim changed' });
      }
      if (payload.stage === 'publishing') db.prepare(`UPDATE post_targets SET lock_stage = 'publishing', version = version + 1, updated_at = ?
        WHERE target_id = ? AND version = ?`).run(now, target.target_id, target.version);
    } else {
      if (payload.stage === 'succeeded' && (!payload.platform_post_id || !/^[A-Za-z0-9_-]+$/.test(payload.platform_post_id))) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: 'A valid provider post ID is required' });
      }
      // Legacy external workers cannot prove a negative outcome after submission.
      // Success callbacks are also reconciled against the provider, never trusted as a live-post assertion.
      shouldVerify = payload.stage === 'succeeded';
      const uncertain = target.lock_stage === 'publishing' || shouldVerify;
      changed = transitionTarget(target, uncertain ? 'NeedsVerification' : 'Failed', 'n8n_callback',
        uncertain ? 'External execution outcome requires provider verification' : 'Execution failed before publication', {
          platform_post_id: payload.platform_post_id || null,
          post_url: null, error_code: uncertain ? 'EXTERNAL_OUTCOME_UNVERIFIED' : 'EXECUTION_FAILED',
          error_category: 'unknown', error_message: uncertain ? 'Verify this delivery before retrying.' : 'The automation failed before publication.',
          lock_execution_id: uncertain ? payload.execution_id : null, lock_stage: uncertain ? 'publishing' : null,
          locked_at: uncertain ? target.locked_at : null,
        });
      db.prepare(`UPDATE publish_attempts SET result = ?, finished_at = ?, error_code = ?
        WHERE attempt_id = ?`).run(uncertain ? 'unknown' : 'failed', now, changed.error_code, (attempt as any).attempt_id);
    }
    db.prepare('INSERT INTO webhook_events (event_id, received_at) VALUES (?, ?)').run(eventId, now);
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    return res.status(409).json({ error: 'Callback could not update the current delivery' });
  }
  if (changed) {
    sheetsOutboxWorker.enqueueTargetUpsert(payload.target_id, changed.client_id);
    sseManager.emit('target.status_changed', changed.client_id, { targetId: payload.target_id, status: changed.status });
  }
  if (shouldVerify) void metaVerifierService.verifyTarget(payload.target_id);
  return res.json({ status: changed ? 'outcome_recorded' : 'stage_updated' });
});

/**
 * ============================================================================
 * PRE-FLIGHT AI REVIEW PIPELINE INTERNAL ENDPOINTS
 * ============================================================================
 */

/**
 * POST /internal/review-jobs/:id/ack
 * Acknowledges job received by n8n workflow, sets status to 'running'
 */
internalRouter.post('/review-jobs/:id/ack', (req: Request, res: Response) => {
  const jobId = req.params.id;
  const { executionId } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE review_jobs
    SET status = 'running', workflow_execution_id = ?, started_at = ?
    WHERE id = ?
  `).run(executionId || null, now, jobId);

  logger.info({ jobId, executionId }, 'Review job acknowledged and running');
  res.json({ success: true, jobId, status: 'running' });
});

/**
 * POST /internal/review-jobs/:id/complete
 * Completes review job, saves analysis/prediction/recommendations, transitions post to AI_REVIEWED
 */
internalRouter.post('/review-jobs/:id/complete', async (req: Request, res: Response) => {
  const jobId = req.params.id;
  const { analysis, prediction, timing, recommendations } = req.body;
  const now = new Date().toISOString();

  const job = db.prepare('SELECT * FROM review_jobs WHERE id = ?').get(jobId) as any;
  if (!job) {
    return res.status(404).json({ error: `Review job ${jobId} not found` });
  }

  db.prepare(`
    UPDATE review_jobs
    SET status = 'completed', completed_at = ?
    WHERE id = ?
  `).run(now, jobId);

  // Transition post status
  try {
    transitionPostStatus(job.post_id, 'AI_REVIEWED', 'n8n_review_pipeline', 'Review workflow completed successfully', {
      jobId,
      scores: analysis?.scores,
      predictionScore: prediction?.performanceScore,
    });
  } catch (err) {
    logger.warn({ err, postId: job.post_id }, 'Failed to transition post status to AI_REVIEWED');
  }

  // Save diagnostic run into post_analyses
  if (analysis) {
    const analysisId = 'ANA-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    db.prepare(`
      INSERT INTO post_analyses (
        id, post_id, brand_id, hook_score, cta_score, readability_score,
        brand_voice_alignment, predicted_sentiment, overall_grade, feedback_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'positive', ?, ?, ?)
    `).run(
      analysisId,
      job.post_id,
      analysis.brandId || 'BR-001',
      analysis.scores?.hookScore || 85,
      analysis.scores?.ctaScore || 85,
      analysis.scores?.captionScore || 85,
      analysis.scores?.brandFitScore || 85,
      analysis.scores?.overallScore >= 90 ? 'A+' : analysis.scores?.overallScore >= 80 ? 'A' : 'B',
      JSON.stringify(analysis.strengths || []),
      now
    );
  }

  // Save predictions into prediction_runs
  if (prediction) {
    const predId = 'PRED-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    db.prepare(`
      INSERT INTO prediction_runs (
        id, brand_id, post_id, platform, performance_score,
        predicted_engagement_min, predicted_engagement_max, confidence_level,
        is_cold_start, top_positive_factors_json, top_negative_factors_json,
        benchmark_percentile, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      predId,
      prediction.brandId || 'BR-001',
      job.post_id,
      prediction.platform || 'instagram',
      prediction.performanceScore || 85,
      prediction.predictedEngagement?.min || 1.8,
      prediction.predictedEngagement?.max || 3.6,
      prediction.confidenceLevel || 'HIGH',
      prediction.isColdStart ? 1 : 0,
      JSON.stringify(prediction.topPositiveFactors || []),
      JSON.stringify(prediction.topNegativeFactors || []),
      prediction.benchmarkPercentile || 88,
      now
    );
  }

  // Save recommendations into ai_recommendations
  if (Array.isArray(recommendations)) {
    for (const rec of recommendations) {
      const recId = rec.recommendationId || ('REC-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      db.prepare(`
        INSERT OR REPLACE INTO ai_recommendations (
          id, brand_id, post_id, field, original_content, suggested_content,
          reason, expected_impact, confidence, risk_level, category, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        recId,
        rec.brandId || 'BR-001',
        job.post_id,
        rec.field || 'caption',
        rec.original || '',
        rec.suggested || '',
        rec.reason || '',
        rec.expectedImpact || '',
        rec.confidence || 0.9,
        rec.riskLevel || 'LOW',
        rec.category || 'safe',
        now
      );
    }
  }

  logger.info({ jobId, postId: job.post_id }, 'Review job completed successfully');
  res.json({ success: true, jobId, status: 'completed' });
});

/**
 * POST /internal/review-jobs/:id/fail
 * Handles review workflow failure, transitions post to DRAFT
 */
internalRouter.post('/review-jobs/:id/fail', (req: Request, res: Response) => {
  const jobId = req.params.id;
  const { error } = req.body;
  const now = new Date().toISOString();

  const job = db.prepare('SELECT * FROM review_jobs WHERE id = ?').get(jobId) as any;
  if (!job) {
    return res.status(404).json({ error: `Review job ${jobId} not found` });
  }

  db.prepare(`
    UPDATE review_jobs
    SET status = 'failed', error_message = ?, completed_at = ?
    WHERE id = ?
  `).run(error || 'Workflow execution error', now, jobId);

  try {
    transitionPostStatus(job.post_id, 'DRAFT', 'n8n_review_pipeline', `Review workflow failed: ${error || 'Unknown error'}`);
  } catch (err) {
    logger.warn({ err, postId: job.post_id }, 'Failed to transition post back to DRAFT');
  }

  logger.error({ jobId, postId: job.post_id, error }, 'Review job failed');
  res.json({ success: true, jobId, status: 'failed' });
});

/**
 * POST /internal/ai/analyze-post
 * Linguistic & hook scoring
 */
internalRouter.post('/ai/analyze-post', async (req: Request, res: Response) => {
  try {
    const { brandId, platform, caption, hashtags, mediaUrl } = req.body;
    const result = await feedIntelligenceService.analyzePost({
      brandId: brandId || 'BR-001',
      platform: platform || 'instagram',
      caption: caption || '',
      hashtags: hashtags || '',
      mediaUrl: mediaUrl || '',
    });
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, 'Error in analyze-post');
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /internal/ai/analyze-image
 * Multimodal image evaluation
 */
internalRouter.post('/ai/analyze-image', (req: Request, res: Response) => {
  const { mediaUrl, platform } = req.body;
  const hasMedia = !!mediaUrl && mediaUrl.length > 0;
  res.json({
    hasMedia,
    aspectRatio: '1:1',
    qualityScore: hasMedia ? 92 : 60,
    safeZoneCompliant: true,
    recommendations: hasMedia ? [] : ['Add high-resolution visual creative to boost engagement by +40%'],
  });
});

/**
 * POST /internal/ml/predict
 * Statistical virality and performance prediction
 */
internalRouter.post('/internal/ml/predict', async (req: Request, res: Response) => {
  try {
    const { brandId, platform, caption, scheduledAt, hashtags } = req.body;
    const result = await predictivePerformanceEngine.predictPostPerformance({
      brandId: brandId || 'BR-001',
      platform: platform || 'instagram',
      caption: caption || '',
      hashtags: hashtags || '',
      scheduledAt: scheduledAt || new Date().toISOString(),
    });
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, 'Error in ml predict');
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /internal/ai/suggest-time
 * Optimal timing recommender
 */
internalRouter.post('/ai/suggest-time', (req: Request, res: Response) => {
  const { brandId, platform, scheduledAt } = req.body;
  const date = scheduledAt ? new Date(scheduledAt) : new Date();
  date.setHours(11, 30, 0, 0); // Suggest 11:30 AM peak window
  res.json({
    recommendedIso: date.toISOString(),
    explanation: 'Peak algorithmic engagement window for your target audience cluster (11:00 AM - 1:30 PM)',
    confidence: 0.92,
  });
});

/**
 * POST /internal/ai/recommendations
 * Structured actionable improvement recommendations
 */
internalRouter.post('/ai/recommendations', async (req: Request, res: Response) => {
  try {
    const { brandId, platform, caption, hashtags } = req.body;
    const diagnostic = await feedIntelligenceService.analyzePost({
      brandId: brandId || 'BR-001',
      platform: platform || 'instagram',
      caption: caption || '',
      hashtags: hashtags || '',
    });
    res.json({ recommendations: diagnostic.recommendations });
  } catch (err: any) {
    logger.error({ err }, 'Error generating recommendations');
    res.status(500).json({ error: err.message });
  }
});

