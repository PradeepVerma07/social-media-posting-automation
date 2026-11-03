import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { WorkflowExecution, WorkflowMapping } from '../../types';

export class N8nExecutionsService {
  private read<T>(script: string, args: string[] = []): T[] {
    // Legacy local imports are opt-in and never run arbitrary shell text.
    if (process.env.ENABLE_LEGACY_N8N_IMPORT !== 'true') return [];
    try {
      const output = execFileSync('python', [path.resolve(process.cwd(), 'scripts', script), ...args],
        { encoding: 'utf8', timeout: 5000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      const data = JSON.parse(output.trim());
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  getRealExecutions(limit = 40): WorkflowExecution[] {
    return this.read('get_real_executions.py', [String(Math.min(100, Math.max(1, Math.trunc(limit) || 40)))]);
  }
  getRealWorkflows(): WorkflowMapping[] { return this.read('get_real_workflows.py'); }
}
export const n8nExecutionsService = new N8nExecutionsService();
