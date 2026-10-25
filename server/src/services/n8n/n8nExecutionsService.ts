import { execSync } from 'child_process';
import path from 'path';
import { WorkflowExecution, WorkflowMapping } from '../../types';

export class N8nExecutionsService {
  getRealExecutions(limit = 40): WorkflowExecution[] {
    try {
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'get_real_executions.py');
      const output = execSync(`python "${scriptPath}" ${limit}`, { encoding: 'utf8', timeout: 5000 });
      const data = JSON.parse(output.trim());
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Failed reading real n8n executions:', e);
    }
    return [];
  }

  getRealWorkflows(): WorkflowMapping[] {
    try {
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'get_real_workflows.py');
      const output = execSync(`python "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
      const data = JSON.parse(output.trim());
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Failed reading real n8n workflows:', e);
    }
    return [];
  }
}

export const n8nExecutionsService = new N8nExecutionsService();
