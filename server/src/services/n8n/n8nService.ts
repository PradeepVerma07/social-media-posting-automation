import crypto from 'node:crypto';
import { db } from '../../repositories/database';

export interface N8nWebhookPayload {
  requestId: string; idempotencyKey: string; postId?: number; brandId?: number;
  requestedBy: number; timestamp: string; data: Record<string, any>;
}
export interface N8nCallbackPayload {
  executionId: string; n8nWorkflowId: string; postId?: number;
  status: 'success' | 'partial_success' | 'failed';
  perPlatformResults?: Record<string, { status: string; url?: string; error?: string }>;
  errorSummary?: string; durationMs?: number; timestamp: string;
}

export class N8nService {
  private get baseUrl() { return process.env.N8N_BASE_URL || 'http://localhost:5678'; }
  private get webhookBaseUrl() { return process.env.N8N_WEBHOOK_BASE_URL || `${this.baseUrl}/webhook/ci360`; }
  private get webhookSecret() { return process.env.N8N_WEBHOOK_SECRET || ''; }

  generateSignature(payloadString: string, timestamp: string): string {
    if (this.webhookSecret.length < 32) throw new Error('n8n webhook signing is not configured');
    return crypto.createHmac('sha256', this.webhookSecret).update(`${timestamp}.${payloadString}`).digest('hex');
  }
  verifyCallbackSignature(signature: string, timestamp: string, payloadString: string): boolean {
    if (!signature || !timestamp || this.webhookSecret.length < 32) return false;
    const time = Date.parse(timestamp);
    if (!Number.isFinite(time) || Math.abs(Date.now() - time) > 300000) return false;
    const expected = this.generateSignature(payloadString, timestamp);
    return /^[a-f0-9]{64}$/i.test(signature) && crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  async dispatchWebhook(actionPath: string, payload: { postId?: number; brandId?: number; requestedBy: number; data: Record<string, any> }): Promise<{
    success: boolean; executionId: string; perPlatformResults?: Record<string, { status: string; url?: string; error?: string }>;
    responseData?: any; error?: string;
  }> {
    const executionId = `exec_${crypto.randomUUID()}`;
    if (this.webhookSecret.length < 32) return { success: false, executionId, error: 'n8n integration is not configured.' };
    if (!/^\/[a-zA-Z0-9/_-]+$/.test(actionPath)) return { success: false, executionId, error: 'Invalid workflow action.' };
    const timestamp = new Date().toISOString();
    const fullPayload: N8nWebhookPayload = { ...payload, requestId: executionId,
      idempotencyKey: payload.data?.idempotencyKey || executionId, timestamp };
    const body = JSON.stringify(fullPayload);
    const execution = db.createExecution({ executionId, n8nWorkflowId: 'configured-webhook',
      workflowName: 'n8n workflow', postId: payload.postId, brandId: payload.brandId,
      initiatedByUserId: payload.requestedBy, initiatedByName: 'Application user',
      triggerType: 'manual', status: 'running', startedAt: timestamp,
      sanitizedInput: { actionPath, postId: payload.postId, brandId: payload.brandId } });
    const started = performance.now();
    try {
      const response = await fetch(`${this.webhookBaseUrl}${actionPath}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json',
          'X-CI360-Signature': this.generateSignature(body, timestamp), 'X-CI360-Timestamp': timestamp,
          'X-CI360-Request-Id': executionId, 'X-CI360-Idempotency-Key': fullPayload.idempotencyKey },
        body, signal: AbortSignal.timeout(Math.max(1000, Number(process.env.N8N_TIMEOUT_MS) || 15000)),
      });
      execution.durationMs = Math.round(performance.now() - started);
      if (!response.ok) {
        execution.status = 'failed'; execution.finishedAt = new Date().toISOString();
        execution.errorSummary = `n8n rejected dispatch (HTTP ${response.status}).`;
        return { success: false, executionId, error: execution.errorSummary };
      }
      // HTTP acceptance is not publishing confirmation. Only the delivery API
      // persists confirmed provider receipts; never invent IDs, URLs or metrics.
      return { success: true, executionId, responseData: { status: 'accepted', publicationConfirmed: false } };
    } catch {
      execution.status = 'failed'; execution.finishedAt = new Date().toISOString();
      execution.durationMs = Math.round(performance.now() - started);
      execution.errorSummary = 'Dispatch response unavailable; check execution state before retrying.';
      return { success: false, executionId, error: execution.errorSummary };
    }
  }

  async testConnection(): Promise<{ reachable: boolean; latencyMs: number; version?: string; error?: string }> {
    const started = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, { signal: AbortSignal.timeout(4000) });
      return { reachable: response.ok, latencyMs: Math.round(performance.now() - started),
        ...(response.ok ? {} : { error: `Health check returned HTTP ${response.status}.` }) };
    } catch { return { reachable: false, latencyMs: Math.round(performance.now() - started), error: 'n8n is unavailable.' }; }
  }
}
export const n8nService = new N8nService();
