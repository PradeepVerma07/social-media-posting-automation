import React, { useState } from 'react';
import { X, Send, Webhook, Copy, Check, Sparkles } from 'lucide-react';

interface WebhookSandboxProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerWebhook: (payload: any) => void;
  isRunning?: boolean;
}

const PRESET_PAYLOADS = [
  {
    name: 'Stripe Payment Success',
    payload: {
      event: 'payment_intent.succeeded',
      id: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
      amount: 14900,
      currency: 'usd',
      customer: {
        id: 'cus_N8N_ENTERPRISE',
        email: 'billing@clientcorp.io',
        name: 'Enterprise Client',
      },
      status: 'succeeded',
    },
  },
  {
    name: 'GitHub Push / PR Merged',
    payload: {
      action: 'closed',
      pull_request: {
        number: 42,
        title: 'feat: add real-time streaming pipeline',
        user: { login: 'dev-lead' },
        merged: true,
      },
      repository: {
        full_name: 'acme/n8n-workflows',
        default_branch: 'main',
      },
    },
  },
  {
    name: 'Shopify Order Placed',
    payload: {
      event: 'orders/create',
      order_number: 1045,
      total_price: '289.00',
      financial_status: 'paid',
      customer: {
        first_name: 'Elena',
        last_name: 'Rostova',
        email: 'elena@store.com',
      },
    },
  },
  {
    name: 'X (Twitter) Tweet Event / Mention',
    payload: {
      event: 'tweet.created',
      data: {
        id: '1849204918293012480',
        author_id: '1429810283',
        author_username: 'NexusCloudTech',
        text: 'Zero-downtime multi-region K8s autoscaling is live! Sub-10ms failover across global clusters. #DevOps #Kubernetes',
        created_at: new Date().toISOString(),
        public_metrics: {
          retweet_count: 14,
          reply_count: 5,
          like_count: 48,
          impression_count: 1250,
        },
      },
    },
  },
];

export const WebhookSandbox: React.FC<WebhookSandboxProps> = ({
  isOpen,
  onClose,
  onTriggerWebhook,
  isRunning,
}) => {
  const [jsonPayload, setJsonPayload] = useState(
    JSON.stringify(PRESET_PAYLOADS[0].payload, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_PAYLOADS[0]) => {
    setJsonPayload(JSON.stringify(preset.payload, null, 2));
    setParseError(null);
  };

  const handleSend = () => {
    try {
      const parsed = JSON.parse(jsonPayload);
      setParseError(null);
      onTriggerWebhook(parsed);
      onClose();
    } catch (err: any) {
      setParseError(err?.message || 'Invalid JSON format');
    }
  };

  const curlCommand = `curl -X POST https://ais-applet.internal/webhook/trigger \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload.replace(/'/g, "'\\''")}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ff6d5a]/10 border border-[#ff6d5a]/20 flex items-center justify-center text-[#ff6d5a]">
              <Webhook className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Live Webhook Event Simulator</h3>
              <p className="text-[11px] text-slate-400">Dispatch test payloads directly into the workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector */}
        <div className="p-4 border-b border-slate-800 space-y-2 bg-slate-950/40">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ff6d5a]" />
            Load Sample Payload Preset:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_PAYLOADS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* JSON Editor */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">Payload (JSON)</label>
            <button
              onClick={copyCurl}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCurl ? 'cURL Copied' : 'Copy as cURL'}</span>
            </button>
          </div>

          <textarea
            rows={10}
            value={jsonPayload}
            onChange={e => {
              setJsonPayload(e.target.value);
              setParseError(null);
            }}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-[#ff6d5a] leading-relaxed"
            spellCheck={false}
          />

          {parseError && (
            <div className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded border border-red-900/50">
              JSON Error: {parseError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isRunning}
            className="px-4 py-2 bg-[#ff6d5a] hover:bg-[#ea503c] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Trigger Workflow Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
