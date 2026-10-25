import React, { useState } from 'react';
import {
  X,
  Play,
  Code2,
  Table,
  FileJson,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Key,
  Share2,
  MessageCircle,
  Heart,
  Repeat,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { WorkflowNode } from '../types/workflow';

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface NodeInspectorProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onUpdateParameters: (nodeId: string, parameters: Record<string, any>) => void;
  onRunSingleNode: (nodeId: string) => void;
  isRunning?: boolean;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  onClose,
  onUpdateParameters,
  onRunSingleNode,
  isRunning,
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'input' | 'output' | 'raw'>('params');
  const [copied, setCopied] = useState(false);
  const [outputViewMode, setOutputViewMode] = useState<'table' | 'json'>('json');
  const [testingCreds, setTestingCreds] = useState(false);
  const [credStatus, setCredStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!node) return null;

  const params = node.parameters || {};

  const handleParamChange = (key: string, value: any) => {
    onUpdateParameters(node.id, {
      ...params,
      [key]: value,
    });
  };

  const copyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper for editFields key-value pairs
  const fields: Array<{ key: string; value: string; type: string }> = params.fields || [];

  const handleAddField = () => {
    const newFields = [...fields, { key: 'newField', value: '', type: 'string' }];
    handleParamChange('fields', newFields);
  };

  const handleUpdateField = (index: number, key: string, value: string, type: string) => {
    const updated = [...fields];
    updated[index] = { key, value, type };
    handleParamChange('fields', updated);
  };

  const handleRemoveField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    handleParamChange('fields', updated);
  };

  const executionOutput = node.executionResult?.output;
  const executionInput = node.executionResult?.input;

  return (
    <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-[480px] lg:w-[520px] bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
              node.type === 'xNode'
                ? 'bg-black border border-zinc-700 text-white'
                : 'bg-[#ff6d5a]/10 border border-[#ff6d5a]/20 text-[#ff6d5a]'
            }`}
          >
            {node.type === 'xNode' ? <XIcon className="w-4 h-4" /> : 'n8n'}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{node.name}</h3>
            <span className="text-[11px] text-slate-400 capitalize block truncate">
              {node.type === 'xNode' ? 'Twitter / X Integration • n8n-nodes-base.twitter' : `Type: ${node.type}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRunSingleNode(node.id)}
            disabled={isRunning}
            className="px-3 py-1.5 bg-[#ff6d5a] hover:bg-[#ea503c] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            title="Execute node step"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Test Step</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950/40 text-xs">
        <button
          onClick={() => setActiveTab('params')}
          className={`py-2.5 px-3 font-medium border-b-2 transition-colors ${
            activeTab === 'params'
              ? 'border-[#ff6d5a] text-white'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Parameters
        </button>
        <button
          onClick={() => setActiveTab('input')}
          className={`py-2.5 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'input'
              ? 'border-[#ff6d5a] text-white'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>Input Data</span>
          {executionInput && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`py-2.5 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'output'
              ? 'border-[#ff6d5a] text-white'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>Output Data</span>
          {executionOutput && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6d5a]"></span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TAB: PARAMETERS */}
        {activeTab === 'params' && (
          <div className="space-y-4">
            {/* Common: Node Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Node Name</label>
              <input
                type="text"
                value={node.name}
                onChange={e => {
                  node.name = e.target.value;
                  onUpdateParameters(node.id, { ...params });
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
              />
            </div>

            {/* HTTP Request specific params */}
            {node.type === 'httpRequest' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">Method</label>
                    <select
                      value={params.method || 'GET'}
                      onChange={e => handleParamChange('method', e.target.value)}
                      className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-xs font-medium text-slate-300">URL</label>
                    <input
                      type="text"
                      value={params.url || ''}
                      onChange={e => handleParamChange('url', e.target.value)}
                      placeholder="https://api.example.com/v1/resource"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">Headers (JSON)</label>
                    <label className="text-[11px] text-slate-400 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={Boolean(params.sendHeaders)}
                        onChange={e => handleParamChange('sendHeaders', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-[#ff6d5a]"
                      />
                      Send Headers
                    </label>
                  </div>
                  {params.sendHeaders && (
                    <textarea
                      rows={3}
                      value={params.headers || ''}
                      onChange={e => handleParamChange('headers', e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-[#ff6d5a]"
                    />
                  )}
                </div>

                {['POST', 'PUT', 'PATCH'].includes(params.method) && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">Request Body (JSON)</label>
                      <label className="text-[11px] text-slate-400 flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={Boolean(params.sendBody)}
                          onChange={e => handleParamChange('sendBody', e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-[#ff6d5a]"
                        />
                        Send Body
                      </label>
                    </div>
                    {params.sendBody && (
                      <textarea
                        rows={4}
                        value={params.body || ''}
                        onChange={e => handleParamChange('body', e.target.value)}
                        placeholder="{'title': 'Test item'}"
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-[#ff6d5a]"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Code Node (JavaScript) */}
            {node.type === 'code' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[#ff6d5a]" />
                    <span>JavaScript Code (n8n Syntax)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    Use $input.all() & return items
                  </span>
                </div>
                <textarea
                  rows={12}
                  value={params.code || ''}
                  onChange={e => handleParamChange('code', e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-[#ff6d5a] leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Webhook specific params */}
            {node.type === 'webhook' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">HTTP Method</label>
                    <select
                      value={params.httpMethod || 'POST'}
                      onChange={e => handleParamChange('httpMethod', e.target.value)}
                      className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-300">Endpoint Path</label>
                    <input
                      type="text"
                      value={params.path || ''}
                      onChange={e => handleParamChange('path', e.target.value)}
                      placeholder="/webhook/test"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Test Trigger Payload (JSON)</label>
                  <textarea
                    rows={6}
                    value={params.testPayload || ''}
                    onChange={e => handleParamChange('testPayload', e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
              </div>
            )}

            {/* Schedule Trigger */}
            {node.type === 'schedule' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Trigger Rule</label>
                  <select
                    value={params.rule || 'interval'}
                    onChange={e => handleParamChange('rule', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                  >
                    <option value="interval">Every X Hours / Minutes</option>
                    <option value="cron">Custom Cron Expression</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Cron Expression</label>
                  <input
                    type="text"
                    value={params.cronExpression || '0 * * * *'}
                    onChange={e => handleParamChange('cronExpression', e.target.value)}
                    placeholder="*/15 * * * *"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                  <span className="text-[11px] text-slate-500">
                    Standard 5-part cron: minute hour day month day-of-week
                  </span>
                </div>
              </div>
            )}

            {/* Edit Fields (Set) */}
            {node.type === 'editFields' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Assigned Fields</label>
                  <button
                    onClick={handleAddField}
                    className="text-xs text-[#ff6d5a] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <input
                        type="text"
                        value={f.key}
                        onChange={e => handleUpdateField(i, e.target.value, f.value, f.type)}
                        placeholder="fieldKey"
                        className="w-1/3 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={f.value}
                        onChange={e => handleUpdateField(i, f.key, e.target.value, f.type)}
                        placeholder="value"
                        className="flex-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none"
                      />
                      <select
                        value={f.type}
                        onChange={e => handleUpdateField(i, f.key, f.value, e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300 focus:outline-none"
                      >
                        <option value="string">str</option>
                        <option value="number">num</option>
                        <option value="boolean">bool</option>
                      </select>
                      <button
                        onClick={() => handleRemoveField(i)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="p-4 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                      No fields assigned. Click "Add Field" to inject or modify values.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IF node */}
            {node.type === 'if' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Target Field</label>
                  <input
                    type="text"
                    value={params.field || ''}
                    onChange={e => handleParamChange('field', e.target.value)}
                    placeholder="e.g. total, isHighValue, status"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Operator</label>
                  <select
                    value={params.operator || 'equals'}
                    onChange={e => handleParamChange('operator', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                  >
                    <option value="equals">Equals</option>
                    <option value="notEquals">Not Equals</option>
                    <option value="greaterThan">Greater Than (&gt;)</option>
                    <option value="lessThan">Less Than (&lt;)</option>
                    <option value="contains">Contains Substring</option>
                    <option value="notEmpty">Is Not Empty</option>
                  </select>
                </div>
                {params.operator !== 'notEmpty' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Comparison Value</label>
                    <input
                      type="text"
                      value={params.value || ''}
                      onChange={e => handleParamChange('value', e.target.value)}
                      placeholder="e.g. 100, true, active"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Slack Webhook */}
            {node.type === 'slackWebhook' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Webhook URL</label>
                  <input
                    type="text"
                    value={params.webhookUrl || ''}
                    onChange={e => handleParamChange('webhookUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Channel</label>
                  <input
                    type="text"
                    value={params.channel || ''}
                    onChange={e => handleParamChange('channel', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Message Template</label>
                  <textarea
                    rows={4}
                    value={params.messageTemplate || ''}
                    onChange={e => handleParamChange('messageTemplate', e.target.value)}
                    placeholder="Use {{field}} expressions"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
              </div>
            )}

            {/* Email Notification */}
            {node.type === 'email' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Recipient Email</label>
                  <input
                    type="email"
                    value={params.toEmail || ''}
                    onChange={e => handleParamChange('toEmail', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Subject</label>
                  <input
                    type="text"
                    value={params.subject || ''}
                    onChange={e => handleParamChange('subject', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Email Body Template</label>
                  <textarea
                    rows={4}
                    value={params.bodyTemplate || ''}
                    onChange={e => handleParamChange('bodyTemplate', e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  />
                </div>
              </div>
            )}

            {/* X (formerly Twitter) Node v2 */}
            {node.type === 'xNode' && (
              <div className="space-y-4">
                {/* Node Subheading & Official Docs Badge */}
                <div className="bg-black/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                      <XIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>Twitter / X API v2</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                          v2.1
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Official Node Integration • OAuth 2.0 PKCE / OAuth 1.0a
                      </div>
                    </div>
                  </div>
                  <a
                    href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twitter/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
                  >
                    <span>Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Operation Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Operation</label>
                  <select
                    value={params.operation || 'createTweet'}
                    onChange={e => handleParamChange('operation', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a] font-medium"
                  >
                    <option value="createTweet">Create Tweet (Post text &amp; media)</option>
                    <option value="replyTweet">Reply to Tweet (Thread continuation)</option>
                    <option value="searchTweets">Search Recent Tweets (Query v2)</option>
                    <option value="getUser">Get User Profile (Metrics &amp; details)</option>
                    <option value="likeTweet">Like Tweet (Engage)</option>
                    <option value="retweet">Retweet / Repost (Amplify)</option>
                  </select>
                </div>

                {/* Credentials & Authentication Config */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>X API Credentials</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      User Context
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="authType"
                        value="oauth2"
                        checked={(params.authType || 'oauth2') === 'oauth2'}
                        onChange={() => handleParamChange('authType', 'oauth2')}
                        className="text-[#ff6d5a] focus:ring-0"
                      />
                      <span>OAuth 2.0 (Recommended)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="authType"
                        value="oauth1"
                        checked={params.authType === 'oauth1'}
                        onChange={() => handleParamChange('authType', 'oauth1')}
                        className="text-[#ff6d5a] focus:ring-0"
                      />
                      <span>OAuth 1.0a (API Keys)</span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">
                        {params.authType === 'oauth1' ? 'API Key (Consumer Key)' : 'Client ID'}
                      </label>
                      <input
                        type="text"
                        value={params.apiKey || ''}
                        onChange={e => handleParamChange('apiKey', e.target.value)}
                        placeholder="ci360_x_client_id_live"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Bearer Token / Secret</label>
                      <input
                        type="password"
                        value={params.bearerToken || ''}
                        onChange={e => handleParamChange('bearerToken', e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTestingCreds(true);
                          setCredStatus(null);
                          setTimeout(() => {
                            setTestingCreds(false);
                            setCredStatus({
                              ok: true,
                              msg: 'Verified! Connected to @NexusCloudTech (App ID: 2940291, tweet.write OK)',
                            });
                          }, 650);
                        }}
                        disabled={testingCreds}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] rounded flex items-center gap-1 transition-colors"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{testingCreds ? 'Validating Token...' : 'Test Connection'}</span>
                      </button>

                      {credStatus && (
                        <span className={`text-[11px] font-mono ${credStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                          {credStatus.msg}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* OPERATION: CREATE TWEET */}
                {(!params.operation || params.operation === 'createTweet') && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300">Tweet Text</label>
                        <span
                          className={`text-[11px] font-mono ${
                            (params.text || '').length > 280
                              ? 'text-red-400 font-bold'
                              : (params.text || '').length > 240
                              ? 'text-amber-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {(params.text || '').length} / 280 characters
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={params.text || ''}
                        onChange={e => handleParamChange('text', e.target.value)}
                        placeholder="What's happening? Type your tweet text or use expressions like {{$json.masterCaption}}"
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a] leading-relaxed"
                      />
                      {/* Character Meter */}
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            (params.text || '').length > 280
                              ? 'bg-red-500'
                              : (params.text || '').length > 240
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, ((params.text || '').length / 280) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Media URLs */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Media Attachment URL (Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={params.mediaUrls || ''}
                        onChange={e => handleParamChange('mediaUrls', e.target.value)}
                        placeholder="https://images.unsplash.com/... or {{$json.mediaUrl}}"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                      />
                      <span className="text-[10px] text-zinc-500">
                        Supports JPEG, PNG, GIF, and MP4. Automatically uploaded to Twitter Media Endpoint.
                      </span>
                    </div>

                    {/* Reply Settings */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Who Can Reply?</label>
                      <select
                        value={params.replySettings || 'everyone'}
                        onChange={e => handleParamChange('replySettings', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#ff6d5a]"
                      >
                        <option value="everyone">Everyone (Public engagement)</option>
                        <option value="following">Accounts you follow</option>
                        <option value="mentionedUsers">Only mentioned accounts (@mentions)</option>
                      </select>
                    </div>

                    {/* Poll Options */}
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(params.enablePoll)}
                            onChange={e => handleParamChange('enablePoll', e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-[#ff6d5a]"
                          />
                          <span>Attach Twitter Poll</span>
                        </label>
                        {params.enablePoll && (
                          <span className="text-[10px] text-zinc-400">Duration: 24h</span>
                        )}
                      </div>

                      {params.enablePoll && (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={(params.pollOptions && params.pollOptions[0]) || ''}
                            onChange={e => {
                              const opts = [...(params.pollOptions || ['Option 1', 'Option 2'])];
                              opts[0] = e.target.value;
                              handleParamChange('pollOptions', opts);
                            }}
                            placeholder="Choice 1 (e.g. Option A)"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                          />
                          <input
                            type="text"
                            value={(params.pollOptions && params.pollOptions[1]) || ''}
                            onChange={e => {
                              const opts = [...(params.pollOptions || ['Option 1', 'Option 2'])];
                              opts[1] = e.target.value;
                              handleParamChange('pollOptions', opts);
                            }}
                            placeholder="Choice 2 (e.g. Option B)"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* LIVE TWEET PREVIEW MOCKUP */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-zinc-400 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Live X (Twitter) Preview</span>
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">Rendered output</span>
                      </div>

                      <div className="bg-black border border-zinc-800 rounded-2xl p-4 text-white shadow-xl space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden">
                              <img
                                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=64&h=64&q=80"
                                alt="Avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 leading-tight">
                                <span className="font-bold text-xs text-white">Nexus Cloud</span>
                                <span className="w-3.5 h-3.5 rounded-full bg-sky-400 flex items-center justify-center text-black text-[9px] font-black">
                                  ✓
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-500 font-mono">@NexusCloudTech · Now</span>
                            </div>
                          </div>
                          <XIcon className="w-4 h-4 text-zinc-500" />
                        </div>

                        {/* Tweet Text */}
                        <p className="text-xs text-zinc-100 leading-relaxed whitespace-pre-wrap font-sans">
                          {params.text || 'Type your tweet in the inspector parameters above to preview it here...'}
                        </p>

                        {/* Media Preview if attached */}
                        {params.mediaUrls && (
                          <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-48">
                            <img
                              src={params.mediaUrls}
                              alt="Media Attachment"
                              className="w-full h-44 object-cover"
                              onError={e => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* Action Icons */}
                        <div className="flex items-center justify-between text-zinc-500 text-xs pt-1 px-1">
                          <div className="flex items-center gap-1 hover:text-sky-400">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px]">0</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-emerald-400">
                            <Repeat className="w-3.5 h-3.5" />
                            <span className="text-[10px]">0</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-rose-400">
                            <Heart className="w-3.5 h-3.5" />
                            <span className="text-[10px]">0</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-sky-400">
                            <Share2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* OPERATION: REPLY TWEET */}
                {params.operation === 'replyTweet' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">
                        In Reply to Tweet ID
                      </label>
                      <input
                        type="text"
                        value={params.inReplyToTweetId || ''}
                        onChange={e => handleParamChange('inReplyToTweetId', e.target.value)}
                        placeholder="1849204918293012480 or {{$node['X Root Post'].json.data.id}}"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                      />
                      <span className="text-[10px] text-zinc-500">
                        The numeric ID of the parent tweet in the thread.
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300">Reply Text</label>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {(params.text || '').length} / 280
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={params.text || ''}
                        onChange={e => handleParamChange('text', e.target.value)}
                        placeholder="Follow-up thread reply text..."
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                      />
                    </div>
                  </div>
                )}

                {/* OPERATION: SEARCH TWEETS */}
                {params.operation === 'searchTweets' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Search Query</label>
                      <input
                        type="text"
                        value={params.searchQuery || ''}
                        onChange={e => handleParamChange('searchQuery', e.target.value)}
                        placeholder="#DevOps OR #GenerativeAI -is:retweet"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                      />
                    </div>

                    {/* Query helpers */}
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {[
                        'from:username',
                        '#hashtag',
                        'has:images',
                        '-is:retweet',
                        'lang:en',
                      ].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const cur = params.searchQuery || '';
                            handleParamChange('searchQuery', `${cur} ${chip}`.trim());
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                        >
                          +{chip}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">Max Results</label>
                        <input
                          type="number"
                          min={10}
                          max={100}
                          value={params.maxResults || 10}
                          onChange={e => handleParamChange('maxResults', parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">Sort Order</label>
                        <select
                          value={params.sortOrder || 'recency'}
                          onChange={e => handleParamChange('sortOrder', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                        >
                          <option value="recency">Most Recent</option>
                          <option value="relevancy">Most Relevant</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* OPERATION: GET USER */}
                {params.operation === 'getUser' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">User Handle (Screen Name)</label>
                      <input
                        type="text"
                        value={params.userHandle || ''}
                        onChange={e => handleParamChange('userHandle', e.target.value)}
                        placeholder="e.g. NexusCloudTech (without @)"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                      />
                    </div>
                  </div>
                )}

                {/* OPERATION: LIKE / RETWEET */}
                {(params.operation === 'likeTweet' || params.operation === 'retweet') && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Target Tweet ID</label>
                      <input
                        type="text"
                        value={params.targetTweetId || '1849204918293012480'}
                        onChange={e => handleParamChange('targetTweetId', e.target.value)}
                        placeholder="1849204918293012480"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: INPUT DATA */}
        {activeTab === 'input' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Incoming Data from Parent Node</span>
              {executionInput && (
                <button
                  onClick={() => copyJson(executionInput)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {executionInput ? (
              <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[460px] leading-relaxed">
                {JSON.stringify(executionInput, null, 2)}
              </pre>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500 space-y-2">
                <Clock className="w-6 h-6 mx-auto text-slate-600" />
                <p>No incoming execution data recorded yet.</p>
                <p className="text-[11px] text-slate-600">Run the workflow or test step to capture input.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: OUTPUT DATA */}
        {activeTab === 'output' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOutputViewMode('json')}
                  className={`px-2.5 py-1 text-xs rounded font-medium ${
                    outputViewMode === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5 inline mr-1" />
                  JSON
                </button>
                <button
                  onClick={() => setOutputViewMode('table')}
                  className={`px-2.5 py-1 text-xs rounded font-medium ${
                    outputViewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 inline mr-1" />
                  Table
                </button>
              </div>

              {executionOutput && (
                <button
                  onClick={() => copyJson(executionOutput)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {node.executionResult?.error && (
              <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Execution Error</span>
                  <span className="font-mono text-[11px]">{node.executionResult.error}</span>
                </div>
              </div>
            )}

            {executionOutput ? (
              outputViewMode === 'json' ? (
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[460px] leading-relaxed">
                  {JSON.stringify(executionOutput, null, 2)}
                </pre>
              ) : (
                <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2 px-3">Item #</th>
                        <th className="py-2 px-3">Key Fields</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {(Array.isArray(executionOutput) ? executionOutput : [executionOutput]).map((item, i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 text-slate-500 align-top">{i + 1}</td>
                          <td className="py-2 px-3">
                            <pre className="text-[11px] text-slate-300 whitespace-pre-wrap">
                              {JSON.stringify(item.json || item, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="w-6 h-6 mx-auto text-slate-600" />
                <p>No output generated yet.</p>
                <p className="text-[11px] text-slate-600">Click "Test Step" above to execute this node.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      {node.executionResult && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Latency: {node.executionResult.durationMs ?? 0}ms</span>
          <span>{node.executionResult.timestamp ? new Date(node.executionResult.timestamp).toLocaleTimeString() : ''}</span>
        </div>
      )}
    </div>
  );
};
