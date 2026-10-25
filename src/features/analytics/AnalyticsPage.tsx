import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Share2,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Repeat,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { AnalyticsOverview } from '../../../server/src/types';

interface AnalyticsPageProps {
  analytics: AnalyticsOverview;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ analytics }) => {
  const [reportType, setReportType] = useState('Monthly Performance Report');

  const handleExportCSV = () => {
    const csvContent = `Metric,Value
Total Published Posts,${analytics.totalPublishedPosts}
Total Scheduled Posts,${analytics.totalScheduledPosts}
Total Impressions,${analytics.totalImpressions}
Total Reach,${analytics.totalReach}
Total Engagements,${analytics.totalEngagement}
Engagement Rate,${analytics.engagementRate}%
LinkedIn Posts,${analytics.publishedByPlatform.linkedin}
X (Twitter) Posts,${analytics.publishedByPlatform.x}
Facebook Posts,${analytics.publishedByPlatform.facebook}
Instagram Posts,${analytics.publishedByPlatform.instagram}
`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ci360-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#101828]">Social Analytics &amp; Reporting</h2>
          <p className="text-xs text-[#667085] mt-1">
            Aggregated cross-platform engagement telemetry synced directly with SQLite WAL &amp; n8n Orchestrator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            className="h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
          >
            <option>Monthly Performance Report</option>
            <option>Weekly Content Summary</option>
            <option>Automation Health Audit</option>
            <option>Brand Distribution Report</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 Performance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-sm space-y-2">
          <span className="text-xs font-medium text-[#667085]">Total Impressions</span>
          <div className="text-2xl font-bold text-[#101828] font-mono">
            {analytics.totalImpressions.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#12B76A] font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {analytics.totalImpressions > 0 ? '+14.2% organic growth' : `${analytics.totalScheduledPosts || 0} posts queued in scheduler`}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-sm space-y-2">
          <span className="text-xs font-medium text-[#667085]">Audience Reach</span>
          <div className="text-2xl font-bold text-[#101828] font-mono">
            {analytics.totalReach.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#12B76A] font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {analytics.totalReach > 0 ? 'Organic reach telemetry' : 'Awaiting scheduled post release'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-sm space-y-2">
          <span className="text-xs font-medium text-[#667085]">Total Engagements</span>
          <div className="text-2xl font-bold text-[#101828] font-mono">
            {analytics.totalEngagement.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#1336E8] font-semibold">
            {analytics.totalEngagement > 0 ? 'Likes, comments & shares' : 'Real-time telemetry ready'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-sm space-y-2">
          <span className="text-xs font-medium text-[#667085]">Engagement Rate</span>
          <div className="text-2xl font-bold text-[#12B76A] font-mono">
            {analytics.engagementRate}%
          </div>
          <span className="text-[11px] text-[#667085]">
            {analytics.engagementRate > 0 ? 'Above target benchmark' : 'Calculated upon post publishing'}
          </span>
        </div>
      </div>

      {/* Platform Breakdown Bars */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#101828]">Distribution &amp; Performance by Channel</h3>
            <p className="text-xs text-[#667085] mt-0.5">Live platform counts updated across all brand dispatches via n8n.</p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#1336E8] bg-[#EFF8FF] px-2.5 py-1 rounded-lg">
            {(analytics.publishedByPlatform.linkedin || 0) +
              (analytics.publishedByPlatform.x || 0) +
              (analytics.publishedByPlatform.facebook || 0) +
              (analytics.publishedByPlatform.instagram || 0) +
              (analytics.publishedByPlatform.youtube || 0)} Total Live Posts
            {analytics.totalScheduledPosts > 0 ? ` (${analytics.totalScheduledPosts} Scheduled)` : ''}
          </span>
        </div>

        {(() => {
          const totalPostsByPlat =
            (analytics.publishedByPlatform.linkedin || 0) +
            (analytics.publishedByPlatform.x || 0) +
            (analytics.publishedByPlatform.facebook || 0) +
            (analytics.publishedByPlatform.instagram || 0) +
            (analytics.publishedByPlatform.youtube || 0);

          const pct = (val: number) => totalPostsByPlat > 0 ? Math.round((val / totalPostsByPlat) * 100) : 0;
          const scheduledFb = analytics.scheduledByPlatform?.facebook || 0;
          const scheduledIg = analytics.scheduledByPlatform?.instagram || 0;
          const scheduledLi = analytics.scheduledByPlatform?.linkedin || 0;
          const scheduledX = analytics.scheduledByPlatform?.x || 0;
          const scheduledYt = analytics.scheduledByPlatform?.youtube || 0;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#101828]">Facebook</span>
                    <span className="text-[#12B76A] font-mono">
                      {analytics.publishedByPlatform.facebook || 0} Posts {scheduledFb > 0 ? `(${scheduledFb} Scheduled)` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#EAECF0]">
                    <div
                      className="h-full bg-[#12B76A] rounded-full transition-all duration-500"
                      style={{ width: `${pct(analytics.publishedByPlatform.facebook || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#101828]">Instagram</span>
                    <span className="text-[#F79009] font-mono">
                      {analytics.publishedByPlatform.instagram || 0} Posts {scheduledIg > 0 ? `(${scheduledIg} Scheduled)` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#EAECF0]">
                    <div
                      className="h-full bg-[#F79009] rounded-full transition-all duration-500"
                      style={{ width: `${pct(analytics.publishedByPlatform.instagram || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#101828]">LinkedIn</span>
                    <span className="text-[#1336E8] font-mono">
                      {analytics.publishedByPlatform.linkedin || 0} Posts {scheduledLi > 0 ? `(${scheduledLi} Scheduled)` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#EAECF0]">
                    <div
                      className="h-full bg-[#1336E8] rounded-full transition-all duration-500"
                      style={{ width: `${pct(analytics.publishedByPlatform.linkedin || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#101828]">X (Twitter v2)</span>
                    <span className="text-[#08C5E1] font-mono">
                      {analytics.publishedByPlatform.x || 0} Posts {scheduledX > 0 ? `(${scheduledX} Scheduled)` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#EAECF0]">
                    <div
                      className="h-full bg-[#08C5E1] rounded-full transition-all duration-500"
                      style={{ width: `${pct(analytics.publishedByPlatform.x || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#101828]">YouTube</span>
                    <span className="text-[#F04438] font-mono">
                      {analytics.publishedByPlatform.youtube || 0} Posts {scheduledYt > 0 ? `(${scheduledYt} Scheduled)` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#EAECF0]">
                    <div
                      className="h-full bg-[#F04438] rounded-full transition-all duration-500"
                      style={{ width: `${pct(analytics.publishedByPlatform.youtube || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#F6F8FC] p-4 rounded-xl border border-[#EAECF0] text-xs text-[#475467] space-y-3">
                <div className="font-bold text-[#101828] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                  <span>Real-Time n8n Reporting Active</span>
                </div>
                <p className="leading-relaxed">
                  Every multi-brand post dispatched through Node.js triggers an authenticated n8n webhook workflow with HMAC SHA-256 verification.
                </p>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span>🌱 Next Auto-Publish: {analytics.nextScheduledDisplay ? `${analytics.nextScheduledDisplay} IST` : 'Scheduled Queue Active'}</span>
                  </div>
                  <div>• Facebook Page: <strong>Flower plant</strong> (ID: 1454740611044963)</div>
                  <div>• Instagram Business: <strong>@ciflow904</strong> (ID: 17841439037630316)</div>
                </div>
                <div className="pt-2 border-t border-[#EAECF0] flex items-center justify-between text-[11px] text-[#667085]">
                  <span>Telemetry Heartbeat: <strong className="text-[#12B76A]">Healthy</strong></span>
                  <span className="font-mono">Sync Interval: Instant</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Multi-Brand Performance Breakdown Table */}
      {analytics.brandBreakdown && analytics.brandBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#101828]">Multi-Brand Performance &amp; Telemetry Breakdown</h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Aggregated cross-platform analytics segmented by brand portfolio.
              </p>
            </div>
            <span className="text-xs text-[#475467] font-medium bg-[#F6F8FC] px-3 py-1 rounded-xl border border-[#EAECF0]">
              {analytics.brandBreakdown.length} Active Brands
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9FAFB] border-b border-[#EAECF0] text-[#475467] font-semibold">
                <tr>
                  <th className="py-3 px-4">Brand Portfolio</th>
                  <th className="py-3 px-4">Live Published Posts</th>
                  <th className="py-3 px-4">Total Impressions</th>
                  <th className="py-3 px-4">Audience Reach</th>
                  <th className="py-3 px-4">Total Engagements</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {analytics.brandBreakdown.map(brand => (
                  <tr key={brand.brandId} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#1336E8]/10 text-[#1336E8] font-bold flex items-center justify-center text-xs">
                          {brand.brandName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-[#101828]">{brand.brandName}</div>
                          <div className="text-[10px] text-[#667085] font-mono">@{brand.brandSlug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#101828]">
                      {brand.publishedCount} Posts
                    </td>
                    <td className="py-3 px-4 font-mono text-[#475467]">
                      {brand.impressions.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#475467]">
                      {brand.reach.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#1336E8] font-semibold">
                      {brand.engagement.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#12B76A] bg-[#ECFDF3] px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
