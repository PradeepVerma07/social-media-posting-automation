import React from 'react';
import { ShieldAlert, CheckCircle2, Lock, User } from 'lucide-react';
import { AuditLogEntry } from '../../../server/src/types';
import { formatISTDateTime } from '../../utils/timezone';

interface AuditLogsPageProps {
  logs: AuditLogEntry[];
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ logs }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Security &amp; Operational Audit Trail</h2>
        <p className="text-xs text-[#667085] mt-1">
          Immutable audit record of user logins, post state transitions, n8n webhook dispatches, and administrative overrides.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#F9FAFB] border-b border-[#EAECF0] text-[#475467] font-sans font-semibold">
            <tr>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAECF0]">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors">
                <td className="py-3 px-4 font-bold text-[#1336E8]">{log.action}</td>
                <td className="py-3 px-4 text-[#101828]">
                  {log.entityType} {log.entityId ? `#${log.entityId}` : ''}
                </td>
                <td className="py-3 px-4 font-sans text-[#344054]">{log.userEmail || 'System'}</td>
                <td className="py-3 px-4 text-[#667085]">{log.ipAddress || '127.0.0.1'}</td>
                <td className="py-3 px-4 text-[#667085] font-mono">
                  {formatISTDateTime(log.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
