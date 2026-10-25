import React from 'react';
import {
  GitPullRequest,
  Database,
  Globe,
  MessageSquare,
  HardDrive,
  ArrowRight,
  CheckCircle2,
  Play,
  Layers,
  Code2,
  Users
} from 'lucide-react';
import { WORKFLOW_TEMPLATES } from '../data/templates';
import { Workflow } from '../types/workflow';

interface DeveloperIntegrationsViewProps {
  onLoadWorkflow: (workflow: Workflow) => void;
  onGoToCanvas: () => void;
}

export const DeveloperIntegrationsView: React.FC<DeveloperIntegrationsViewProps> = ({
  onLoadWorkflow,
  onGoToCanvas,
}) => {
  const crmTemplate = WORKFLOW_TEMPLATES.find(t => t.id === 'tpl-form-crm-sync') || WORKFLOW_TEMPLATES[0];
  const githubTemplate = WORKFLOW_TEMPLATES.find(t => t.id === 'tpl-github-devops') || WORKFLOW_TEMPLATES[1];

  const TOP_INTEGRATIONS = [
    {
      id: 'github',
      title: '1. GitHub & Gitlab Integration',
      badge: 'DevOps & CI/CD',
      icon: GitPullRequest,
      accent: 'text-purple-400',
      description:
        'Listen to repository webhooks (PR opened, review submitted, release published, branch merged) and automate CI/CD triggers, linear/Jira ticket synchronization, and team alerts.',
      workflowSummary: 'GitHub Webhook (PR Closed) → Code Status Evaluator → IF Merged to Main → Slack Ops Channel Notification',
      template: githubTemplate,
      benefits: [
        'Automate PR triage and auto-assign engineering reviewers based on touched filepaths',
        'Auto-generate release notes from closed PRs and push to Confluence or Slack',
        'Synchronize bug issues between GitHub and project trackers (Linear, Jira)',
      ],
    },
    {
      id: 'postgres',
      title: '2. PostgreSQL & Relational DBs',
      badge: 'Data & State Management',
      icon: Database,
      accent: 'text-sky-400',
      description:
        'Execute parameterized SQL queries, listen to LISTEN/NOTIFY events, perform bulk ETL migrations, and safely mutate records across transactional databases.',
      workflowSummary: 'Schedule Cron (Every 15m) → Execute SQL Query (Pending Orders) → Transform to JSON Array → Bulk Upsert Target',
      template: WORKFLOW_TEMPLATES.find(t => t.id === 'tpl-data-etl') || WORKFLOW_TEMPLATES[0],
      benefits: [
        'Event-driven database mutations without custom cron daemon infrastructure',
        'Extract, transform, and load (ETL) data pipelines into analytics data warehouses',
        'Automated database health audits, slow query logging, and table archival',
      ],
    },
    {
      id: 'http',
      title: '3. HTTP Request Node (Universal REST / GraphQL / gRPC)',
      badge: 'Universal API Bridge',
      icon: Globe,
      accent: 'text-emerald-400',
      description:
        'The developer swiss-army knife in n8n. Connect to any internal microservice, proprietary VPC endpoint, or external API with full control over headers, query parameters, Bearer tokens, and multipart payloads.',
      workflowSummary: 'Inbound Webhook → Inject Authorization Headers → Fetch / Mutate Remote API → Map Response JSON',
      template: WORKFLOW_TEMPLATES.find(t => t.id === 'tpl-api-monitor') || WORKFLOW_TEMPLATES[0],
      benefits: [
        'Call any internal REST or GraphQL microservice without waiting for a prebuilt plugin',
        'Built-in pagination handling, automatic retry with exponential backoff',
        'Transform external API payloads before forwarding to downstream listeners',
      ],
    },
    {
      id: 'slack',
      title: '4. Slack / Discord (ChatOps & Interactive Approvals)',
      badge: 'ChatOps & Incident Response',
      icon: MessageSquare,
      accent: 'text-[#ff6d5a]',
      description:
        'Turn Slack and Discord into a complete ChatOps command center. Post formatted rich block alerts, receive slash commands, and implement two-way approval buttons (e.g. human-in-the-loop deployment gating).',
      workflowSummary: 'Sentry / Alertmanager Webhook → Severity Check → Interactive Slack Card with "Acknowledge" & "Restart Service" Buttons',
      template: WORKFLOW_TEMPLATES.find(t => t.id === 'tpl-webhook-slack') || WORKFLOW_TEMPLATES[0],
      benefits: [
        'Interactive approval workflows where engineers click buttons inside Slack to approve staging deploys',
        'Route error stack traces from Sentry/Datadog to on-call developers with direct links',
        'Slash commands that trigger internal administrative runbooks and database resets',
      ],
    },
    {
      id: 's3',
      title: '5. AWS S3 / Cloudflare R2 / Cloud Storage',
      badge: 'File & Asset Pipelines',
      icon: HardDrive,
      accent: 'text-amber-400',
      description:
        'Automate binary file uploads, document transformation, scheduled database dump storage, and programmatic generation of pre-signed URLs for clients.',
      workflowSummary: 'Form File Attachment Upload → S3 PutObject → Extract Document Metadata → Store Storage Key in CRM / DB',
      template: crmTemplate,
      benefits: [
        'Ingest user-uploaded files, generate thumbnails/transcripts, and save directly to object buckets',
        'Nightly backup pipelines that pull DB snapshots and upload encrypted archives to cold storage',
        'Sync assets between cloud providers (e.g. S3 to Cloudflare R2 for zero-egress distribution)',
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Hero: Form to CRM Featured Starter Workflow */}
      <div className="border border-[#ff6d5a]/40 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-[#ff6d5a]">
              <span>RECOMMENDED STARTER WORKFLOW</span>
              <span>·</span>
              <span>CRM INTEGRATION</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[#ff6d5a]" />
              Sync New Contacts from Form to CRM
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              A standard, production-ready pipeline that receives incoming lead submissions, cleans and validates
              contact data via JavaScript, checks for existing records in your CRM via REST API, upserts the contact,
              and notifies the sales team.
            </p>
          </div>

          <button
            onClick={() => {
              onLoadWorkflow(crmTemplate);
              onGoToCanvas();
            }}
            className="px-5 py-2.5 bg-[#ff6d5a] hover:bg-[#ea503c] text-white font-semibold text-xs rounded-lg transition-colors shadow-lg shadow-[#ff6d5a]/20 flex items-center gap-2 shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Load &amp; Run Starter Workflow</span>
          </button>
        </div>

        {/* Visual Pipeline Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Step 1 · Trigger</span>
            <div className="text-xs font-semibold text-white">Form Webhook</div>
            <p className="text-[11px] text-slate-400">Captures name, email, company, and phone</p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Step 2 · Transform</span>
            <div className="text-xs font-semibold text-emerald-400">Code Normalizer</div>
            <p className="text-[11px] text-slate-400">Trims email, calculates lead score, formats phone</p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Step 3 · Query</span>
            <div className="text-xs font-semibold text-sky-400">CRM GET Request</div>
            <p className="text-[11px] text-slate-400">Queries CRM (HubSpot/Salesforce/Postgres) by email</p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Step 4 · Logic</span>
            <div className="text-xs font-semibold text-amber-400">IF Condition</div>
            <p className="text-[11px] text-slate-400">Routes to Create New Lead or Update Existing</p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Step 5 · Alert</span>
            <div className="text-xs font-semibold text-[#ff6d5a]">Slack Notification</div>
            <p className="text-[11px] text-slate-400">Dispatches real-time lead alert to sales channel</p>
          </div>
        </div>
      </div>

      {/* Top 5 Developer Integrations */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Top 5 Most Useful n8n Integrations for Developers
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Engineered for automation of software lifecycles, databases, microservices, and incident response.
          </p>
        </div>

        <div className="space-y-4">
          {TOP_INTEGRATIONS.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="border border-slate-800 bg-slate-900/60 p-6 rounded-xl space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${item.accent}`} />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">{item.title}</h4>
                      <span className="text-[11px] font-mono text-slate-400">{item.badge}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onLoadWorkflow(item.template);
                      onGoToCanvas();
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span>Load Template into Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                {/* Workflow Sequence */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Example Workflow Architecture:
                  </span>
                  <div className="text-xs font-mono text-emerald-400">{item.workflowSummary}</div>
                </div>

                {/* Use cases */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  {item.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
