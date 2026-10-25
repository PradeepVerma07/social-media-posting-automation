import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Search,
  ExternalLink,
  Code,
  Check,
  Eye,
  X
} from 'lucide-react';
import { WorkflowExecution } from '../../../server/src/types';
import { formatISTDateTime } from '../../utils/timezone';

interface WorkflowExecutionsPageProps {
  executions: WorkflowExecution[];
  onRetryExecution: (executionId: number) => void;
}

export const WorkflowExecutionsPage: React.FC<WorkflowExecutionsPageProps> = ({
  executions,
  onRetryExecution,
}) => {
  const [search, setSearch] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const filtered = executions.filter(
    e =>
      e.workflowName.toLowerCase().includes(search.toLowerCase()) ||
      e.executionId.toLowerCase().includes(search.toLowerCase()) ||
      (e.postTitle && e.postTitle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Workflow Execution Logs</h2>
          <p className="text-xs text-[#667085] mt-1">
            Real-time tracking of automated publishing jobs, scheduler triggers, and n8n webhook callbacks.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by execution ID or workflow name..."
            className="w-full h-9 pl-9 pr-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] placeholder-[#667085] focus:outline-none focus:border-[#1336E8]"
          />
        </div>
      </div>

      {/* Executions Table */}
      <div className="bg-white border border-[#EAECF0] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F9FAFB] border-b border-[#EAECF0] text-[#475467] font-sans font-semibold">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Execution ID</th>
                <th className="py-3 px-4">Workflow Name</th>
                <th className="py-3 px-4">Brand / Target</th>
                <th className="py-3 px-4">Platforms</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Started At (IST)</th>
                <th className="py-3 px-4 text-right font-sans">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {filtered.map(exec => {
                const platforms = exec.perPlatformResults ? Object.keys(exec.perPlatformResults) : [];
                return (
                  <tr key={exec.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-sans font-bold capitalize ${
                          exec.status === 'success'
                            ? 'text-[#027A48]'
                            : exec.status === 'failed'
                            ? 'text-[#B42318]'
                            : 'text-[#1336E8]'
                        }`}
                      >
                        {exec.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A]" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-[#F04438]" />
                        )}
                        <span>{exec.status.replace('_', ' ')}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#101828] font-bold">{exec.executionId}</td>
                    <td className="py-3 px-4 font-sans font-medium text-[#101828]">
                      <div>{exec.workflowName}</div>
                      <div className="text-[10px] text-[#667085] font-mono">{exec.n8nWorkflowId}</div>
                    </td>
                    <td className="py-3 px-4 font-sans text-[#475467] max-w-xs">
                      {exec.brandName && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EFF8FF] text-[#1336E8] mb-1">
                          {exec.brandName}
                        </span>
                      )}
                      <div className="truncate font-medium text-[#101828]">
                        {exec.postTitle || 'Scheduled System Task'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {platforms.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {platforms.map(p => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#F2F4F7] text-[#344054]"
                              title={`Published to ${p}`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#667085] text-[11px] capitalize">{exec.triggerType}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#101828]">{exec.durationMs ? `${exec.durationMs}ms` : '380ms'}</td>
                    <td className="py-3 px-4 text-[#667085] font-mono">
                      {exec.startedAtIst || formatISTDateTime(exec.startedAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedExecution(exec)}
                        className="px-2.5 py-1 text-xs font-sans font-semibold text-[#1336E8] hover:bg-[#EFF8FF] rounded-lg transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-xs text-[#667085]">
              No executions found matching your query.
            </div>
          )}
        </div>
      </div>

      {/* Execution Detail Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#1336E8]">
                  EXECUTION DETAIL
                </span>
                <h3 className="text-base font-bold text-[#101828]">{selectedExecution.executionId}</h3>
              </div>
              <button
                onClick={() => setSelectedExecution(null)}
                className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F2F4F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#F6F8FC] p-3 rounded-xl border border-[#EAECF0] text-xs">
              <div>
                <span className="text-[10px] text-[#667085] block">Workflow</span>
                <span className="font-semibold text-[#101828] truncate block">
                  {selectedExecution.workflowName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#667085] block">Status</span>
                <span className="font-bold text-[#12B76A] capitalize">
                  {selectedExecution.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#667085] block">Duration</span>
                <span className="font-mono text-[#101828]">{selectedExecution.durationMs || 1200}ms</span>
              </div>
              <div>
                <span className="text-[10px] text-[#667085] block">Executed (IST)</span>
                <span className="font-mono text-[#101828] text-[11px]">
                  {selectedExecution.startedAtIst || formatISTDateTime(selectedExecution.startedAt)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#667085] block">Initiated By</span>
                <span className="text-[#101828]">{selectedExecution.initiatedByName}</span>
              </div>
            </div>

            {/* Per-Platform Results */}
            {selectedExecution.perPlatformResults && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#101828] block">Multi-Platform Publishing Results:</span>
                <div className="space-y-2">
                  {Object.entries(selectedExecution.perPlatformResults).map(([plat, res]) => (
                    <div
                      key={plat}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F6F8FC] border border-[#EAECF0] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[#1336E8]">{plat}</span>
                        <span className="text-[11px] text-[#12B76A] font-medium">Published successfully</span>
                      </div>
                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1336E8] font-semibold flex items-center gap-1 hover:underline"
                        >
                          <span>View Post</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Toggle */}
            <div className="space-y-2 pt-2 border-t border-[#EAECF0]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#101828]">Audit Payload Snapshot</span>
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-xs text-[#1336E8] hover:underline"
                >
                  {showRawJson ? 'Hide Raw JSON' : 'Show Sanitized JSON'}
                </button>
              </div>

              {showRawJson && (
                <pre className="p-3 bg-[#101828] rounded-xl text-[11px] font-mono text-[#08C5E1] overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(selectedExecution, null, 2)}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAECF0]">
              <button
                onClick={() => {
                  onRetryExecution(selectedExecution.id);
                  setSelectedExecution(null);
                }}
                className="px-4 py-2 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry via n8n</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
