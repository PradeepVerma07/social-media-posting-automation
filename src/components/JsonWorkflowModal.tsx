import React, { useState } from 'react';
import { X, Copy, Check, Download, Upload, AlertCircle } from 'lucide-react';
import { Workflow } from '../types/workflow';
import { exportWorkflowToN8n, importWorkflowFromN8n } from '../utils/n8nJsonConverter';

interface JsonWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow;
  onImportWorkflow: (imported: Workflow) => void;
  mode: 'export' | 'import';
}

export const JsonWorkflowModal: React.FC<JsonWorkflowModalProps> = ({
  isOpen,
  onClose,
  workflow,
  onImportWorkflow,
  mode,
}) => {
  const [copied, setCopied] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportedJson = exportWorkflowToN8n(workflow);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-n8n.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      setErrorMessage(null);
      const parsed = importWorkflowFromN8n(importJsonText);
      onImportWorkflow(parsed);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid n8n workflow JSON format');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">
              {mode === 'export' ? 'Export n8n Workflow JSON' : 'Import n8n Workflow JSON'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'export'
                ? 'Standard n8n format compatible with Self-Hosted n8n & n8n Cloud'
                : 'Paste workflow JSON exported from any n8n instance or template library'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {mode === 'export' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Ready to copy and paste directly into n8n:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 bg-[#ff6d5a] hover:bg-[#ea503c] text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .json</span>
                  </button>
                </div>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto max-h-[360px] leading-relaxed">
                {exportedJson}
              </pre>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Paste Workflow JSON</label>
                <textarea
                  rows={14}
                  value={importJsonText}
                  onChange={e => {
                    setImportJsonText(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder='{"name": "My Workflow", "nodes": [...], "connections": {...}}'
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-[#ff6d5a] leading-relaxed"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {mode === 'import' && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!importJsonText.trim()}
              className="px-4 py-2 bg-[#ff6d5a] hover:bg-[#ea503c] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Load into Canvas</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
