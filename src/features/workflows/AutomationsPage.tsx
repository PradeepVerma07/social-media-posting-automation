import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CalendarClock, CheckCircle2, FileText, RefreshCw, Users } from 'lucide-react';
import { api } from '../../api/client';
import type { RoleName, WorkflowMapping } from '../../../server/src/types';

interface AutomationsPageProps {
  workflows: WorkflowMapping[];
  currentRole?: RoleName;
  onExecuteWorkflow: (workflowId: number) => void;
  onTestConnection: () => Promise<{ reachable: boolean; latencyMs: number; version?: string }>;
  onViewExecutions: () => void;
  onGoToLogin?: () => void;
}
function businessTask(name: string) {
  const normalized = name.toLowerCase();
  if (/report|analytic|metric/.test(normalized)) return { title: 'Collect performance and prepare reports', description: 'Bring available account results into your reporting workspace.', icon: FileText };
  if (/approv|review|remind/.test(normalized)) return { title: 'Follow up on approvals', description: 'Help the responsible people review content before its planned time.', icon: Users };
  if (/publish|post|schedul|dispatch/.test(normalized)) return { title: 'Publish approved scheduled content', description: 'Process eligible scheduled posts and record each destination’s result.', icon: CalendarClock };
  if (/sheet|sync|import/.test(normalized)) return { title: 'Synchronize connected content', description: 'Keep the configured content source and this workspace up to date.', icon: RefreshCw };
  return { title: 'Connected background task', description: 'An operator-configured process supports this workspace. Ask your administrator for its purpose.', icon: Activity };
}
const count = (number: unknown) => typeof number === 'number' && Number.isFinite(number) && number >= 0 ? number : 0;
const localDate = (iso?: string) => iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No recorded run';

export const AutomationsPage: React.FC<AutomationsPageProps> = ({ workflows, currentRole, onViewExecutions }) => {
  const [health, setHealth] = useState<{ reachable: boolean; checkedAt: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const isOperator = currentRole === 'Super Admin' || currentRole === 'Admin';
  const checkHealth = async () => {
    setChecking(true); setCheckFailed(false);
    try { const result = await api.getN8nHealth(); setHealth({ reachable: result.reachable === true, checkedAt: new Date().toISOString() }); }
    catch { setCheckFailed(true); setHealth(null); }
    finally { setChecking(false); }
  };
  // Read connection health only; visiting this screen never starts a business workflow.
  useEffect(() => { void checkHealth(); }, []);
  const failures = workflows.reduce((sum, workflow) => sum + count(workflow.failureCount), 0);
  const active = workflows.filter(workflow => workflow.isActive).length;
  const panel = 'rounded-xl border border-slate-200 bg-white p-5';

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Automations</h1><p className="mt-1 max-w-2xl text-sm text-slate-600">See which background tasks are configured and which results need attention. Schedule and approve content from your normal publishing workflow.</p></div><button type="button" onClick={onViewExecutions} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">View activity</button></header>
    <section className={panel} aria-labelledby="automation-health-heading">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="automation-health-heading" className="flex items-center gap-2 font-semibold text-slate-900"><Activity size={19} />Automation service</h2><button type="button" disabled={checking} onClick={checkHealth} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={checking ? 'animate-spin' : ''} />{checking ? 'Checking…' : 'Check connection'}</button></div>
      <p role="status" className={`mt-3 flex items-center gap-2 text-sm font-medium ${health?.reachable ? 'text-emerald-800' : 'text-amber-900'}`}>{health?.reachable ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}{checking ? 'Checking service availability' : checkFailed ? 'Connection could not be verified' : health?.reachable ? 'Service responded to the latest check' : health ? 'Service needs attention' : 'Connection not checked'}</p>
      <p className="mt-2 text-xs text-slate-600">{health ? `Checked ${localDate(health.checkedAt)}. ` : ''}A connection check does not confirm that a post was published or that every account has valid permissions. Review destination results in activity.</p>
      {(checkFailed || (health && !health.reachable)) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Contact your workspace administrator to check the automation connection. Review existing scheduled content before manual retries.</p>}
    </section>
    <div className="grid gap-4 sm:grid-cols-3">{[['Configured tasks', workflows.length], ['Enabled configurations', active], ['Recorded failed runs', failures]].map(([label, total]) => <div key={String(label)} className={panel}><p className="text-xs font-medium text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{total}</p></div>)}</div>
    {workflows.length === 0 ? <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><CalendarClock className="mx-auto text-slate-400" size={30} /><h2 className="mt-3 font-semibold text-slate-900">No automation configurations are available</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">An administrator can connect approved publishing and reporting processes. This screen does not assume that any task is running.</p></section> : <section className="grid gap-4 lg:grid-cols-2" aria-label="Configured background tasks">{workflows.map(workflow => {
      const task = businessTask(workflow.workflowName); const Icon = task.icon;
      const success = count(workflow.successCount), failure = count(workflow.failureCount), total = success + failure;
      const hasHistory = Boolean(workflow.lastExecutedAt) && total > 0;
      return <article key={workflow.id} className={`${panel} space-y-4`}><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><Icon className="mt-1 shrink-0 text-blue-700" size={21} /><div><h2 className="font-semibold text-slate-900">{task.title}</h2><p className="mt-1 text-sm text-slate-600">{task.description}</p></div></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${workflow.isActive ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>{workflow.isActive ? 'Enabled' : 'Disabled'}</span></div>
        <dl className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm"><div><dt className="text-xs text-slate-600">Successful runs</dt><dd className="mt-1 font-semibold">{hasHistory ? success : 'No history'}</dd></div><div><dt className="text-xs text-slate-600">Failed runs</dt><dd className="mt-1 font-semibold">{hasHistory ? failure : 'No history'}</dd></div><div><dt className="text-xs text-slate-600">Success rate</dt><dd className="mt-1 font-semibold">{hasHistory ? `${Math.round(success / total * 100)}%` : 'Not measured'}</dd></div></dl>
        <p className="text-xs text-slate-600">Last recorded run: {localDate(workflow.lastExecutedAt)}. Counts reflect stored activity history, not a delivery guarantee.</p>
        {isOperator && <details className="border-t border-slate-100 pt-3 text-xs text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Configuration reference</summary><p className="mt-2 break-words">{workflow.workflowName}</p><p className="mt-1">Reference #{workflow.id}. Workflow logic is managed in the separately secured operator environment.</p></details>}
      </article>;
    })}</section>}
    <section className="rounded-xl bg-slate-50 p-5"><h2 className="font-semibold text-slate-900">Keep publication decisions in your workspace</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700"><li>Create and schedule content in Posts or Calendar; complete required approvals before its planned time.</li><li>Use Activity to review failures and partial outcomes. Check uncertain provider results before retrying to avoid duplicate posts.</li><li>Reports show available stored metrics and freshness. Scheduled report delivery is available only when your administrator has configured and verified it.</li></ul></section>
  </div>;
};
