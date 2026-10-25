import http from 'http';
import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { sseManager } from './sseManager';

export class N8nApiPoller {
  private n8nBaseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
  private n8nApiKey = process.env.N8N_API_KEY || '';
  private workflowId = process.env.N8N_WORKFLOW_ID || 'Utaz0U82aZQZ7uHF';

  async pollExecutions(): Promise<void> {
    try {
      const url = new URL(`${this.n8nBaseUrl}/api/v1/executions?limit=50`);
      if (this.workflowId) {
        url.searchParams.set('workflowId', this.workflowId);
      }

      const raw = await this.httpGet(url.toString());
      const data = JSON.parse(raw);
      const executions = data.data || [];

      for (const exec of executions) {
        const execId = String(exec.id);
        const wfId = exec.workflowId || this.workflowId;
        const rawStatus = exec.status || 'unknown';
        const startedAt = exec.startedAt || new Date().toISOString();
        const stoppedAt = exec.stoppedAt || null;

        // Map status
        let mappedStatus = 'running';
        if (rawStatus === 'success') mappedStatus = 'succeeded';
        else if (rawStatus === 'error' || rawStatus === 'crashed') mappedStatus = 'failed';
        else if (rawStatus === 'canceled') mappedStatus = 'cancelled';

        const existing = db.prepare(`SELECT status FROM executions_cache WHERE execution_id = ?`).get(execId) as any;

        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO executions_cache (execution_id, workflow_id, status, mode, started_at, stopped_at, target_ids, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?)
          ON CONFLICT(execution_id) DO UPDATE SET
            status = excluded.status,
            stopped_at = excluded.stopped_at,
            updated_at = excluded.updated_at
        `).run(execId, wfId, mappedStatus, exec.mode || 'trigger', startedAt, stoppedAt, now, now);

        // If status transitioned to finished, emit SSE event
        if ((!existing || existing.status === 'running') && (mappedStatus === 'succeeded' || mappedStatus === 'failed')) {
          sseManager.emit('execution.finished', 'CL-ALL', {
            executionId: execId,
            workflowId: wfId,
            status: mappedStatus,
            startedAt,
            stoppedAt,
          });
        }
      }
    } catch (err) {
      // If n8n API is unreachable, keep serving last cached data; do not fail dashboard
      logger.warn({ err }, 'Could not poll n8n Public REST API. Using cached executions.');
    }
  }

  private httpGet(urlStr: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': this.n8nApiKey,
          },
          timeout: 5000,
        },
        res => {
          let body = '';
          res.on('data', chunk => (body += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode < 400) {
              resolve(body);
            } else {
              reject(new Error(`n8n API returned HTTP ${res.statusCode}: ${body}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout querying n8n REST API'));
      });
      req.end();
    });
  }

  startPoller(intervalSeconds = 15) {
    // Initial poll
    this.pollExecutions().catch(() => {});
    setInterval(() => {
      this.pollExecutions().catch(() => {});
    }, intervalSeconds * 1000);
  }
}

export const n8nApiPoller = new N8nApiPoller();
