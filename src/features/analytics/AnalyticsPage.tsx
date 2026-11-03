import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, FileText, RefreshCw } from 'lucide-react';
import { DateTime } from 'luxon';
import type { AnalyticsOverview } from '../../../server/src/types';
import type { AnalyticsReport, ReportFilters, ReportMetric } from '../../../server/src/types/reporting';
import { downloadAnalyticsReport } from './reportExport';

interface AnalyticsPageProps {
  analytics?: AnalyticsOverview;
  loadReport?: (filters: ReportFilters) => Promise<AnalyticsReport>;
}
const platforms = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['x', 'X'], ['youtube', 'YouTube'], ['whatsapp', 'WhatsApp']];
const platformName = (platform: string) => platforms.find(([id]) => id === platform)?.[1] || platform;
const value = (number: number | null) => number === null ? 'Unavailable' : number.toLocaleString();
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600';
const cell = 'px-3 py-3';
const panel = 'rounded-xl border border-slate-200 bg-white p-5';
function MetricValue({ metric }: { metric: ReportMetric }) {
  return <><span>{value(metric.value)}</span>{metric.measuredItems < metric.totalItems && <span className="block text-xs font-normal text-amber-800">{metric.measuredItems}/{metric.totalItems} items measured</span>}</>;
}
function TableHeading({ labels }: { labels: string[] }) {
  return <thead><tr className="border-b border-slate-200 text-xs text-slate-600">{labels.map(label => <th key={label} scope="col" className={cell}>{label}</th>)}</tr></thead>;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ loadReport }) => {
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const today = DateTime.now().setZone(timezone);
    return { from: today.minus({ days: 29 }).toISODate()!, to: today.toISODate()!, timezone };
  });
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const generation = useRef(0);
  const loadRef = useRef(loadReport);
  loadRef.current = loadReport;
  const refresh = async (selected: ReportFilters) => {
    if (!loadRef.current) return;
    const requestId = ++generation.current;
    setLoading(true); setError('');
    try {
      const next = await loadRef.current(selected);
      if (requestId === generation.current) { setReport(next); setPage(0); }
    } catch {
      if (requestId === generation.current) { setReport(null); setError('The report could not be loaded. Check the date range and your access, then try again.'); }
    } finally { if (requestId === generation.current) setLoading(false); }
  };
  useEffect(() => { void refresh(filters); return () => { generation.current++; }; }, [Boolean(loadReport)]);
  const date = (iso: string | null) => iso ? DateTime.fromISO(iso).setZone(report?.filters.timezone || filters.timezone).toFormat('dd LLL yyyy, HH:mm') : 'No snapshot';
  const selectedBrand = report?.availableBrands.find(brand => brand.id === report.filters.brandId)?.name || 'All authorized brands';
  const displayed = report?.items.slice(page * 25, (page + 1) * 25) || [];

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <style>{`@media print { body * { visibility: hidden; } #webtrionix-report, #webtrionix-report * { visibility: visible; } #webtrionix-report { position: absolute; left: 0; top: 0; width: 100%; padding: 12mm; background: white; color: black; } .report-screen-only { display: none !important; } #webtrionix-report table { font-size: 9pt; } #webtrionix-report tr { break-inside: avoid; } #webtrionix-report .report-scroll { overflow: visible !important; } }`}</style>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Reports</h1><p className="mt-1 text-sm text-slate-600">Review publishing outcomes and the performance data your accounts have supplied.</p></div>
      <div className="flex gap-2">
        <button type="button" disabled={!report || loading} onClick={() => report && downloadAnalyticsReport(report)} className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Download size={16} />Export CSV</button>
        <button type="button" disabled={!report || loading} onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><FileText size={16} />Print / Save PDF</button>
      </div>
    </div>
    {!loadReport && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Reporting is not connected to the server yet. No estimated performance data is displayed.</div>}
    <form onSubmit={event => { event.preventDefault(); void refresh(filters); }} className={`${panel} grid gap-4 sm:grid-cols-2 lg:grid-cols-6`}>
      <label className="space-y-1 text-sm font-medium">Brand<select value={filters.brandId || ''} onChange={event => setFilters({ ...filters, brandId: event.target.value || undefined })} className={fieldClass}><option value="">All authorized brands</option>{report?.availableBrands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Platform<select value={filters.platform || ''} onChange={event => setFilters({ ...filters, platform: event.target.value || undefined })} className={fieldClass}><option value="">All platforms</option>{platforms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">From<input required type="date" value={filters.from} max={filters.to} onChange={event => setFilters({ ...filters, from: event.target.value })} className={fieldClass} /></label>
      <label className="space-y-1 text-sm font-medium">Through<input required type="date" value={filters.to} min={filters.from} onChange={event => setFilters({ ...filters, to: event.target.value })} className={fieldClass} /></label>
      <label className="space-y-1 text-sm font-medium">Timezone<input required value={filters.timezone} onChange={event => setFilters({ ...filters, timezone: event.target.value })} aria-describedby="report-timezone-help" className={fieldClass} /></label>
      <button disabled={loading || !loadReport} type="submit" className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{loading ? 'Loading…' : 'Apply filters'}</button>
      <p id="report-timezone-help" className="text-xs text-slate-600 sm:col-span-2 lg:col-span-6">Dates include both selected days in this timezone (for example, Asia/Kolkata). Maximum range: 366 days. Exports use the applied report filters.</p>
    </form>
    {loading && <p role="status" className="text-sm text-slate-600">Loading report data…</p>}
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertCircle size={18} />{error}</div>}
    {report && <article id="webtrionix-report" className="space-y-6" aria-busy={loading}>
      <header className={panel}>
        <p className="text-sm font-semibold text-blue-800">Webtrionix 360</p><h2 className="mt-1 text-xl font-bold text-slate-900">Publishing and performance report</h2>
        <p className="mt-2 text-sm text-slate-700">{selectedBrand} · {report.filters.platform ? platformName(report.filters.platform) : 'All platforms'} · {report.filters.from} through {report.filters.to} · {report.filters.timezone}</p>
        <p className="mt-1 text-xs text-slate-600">Generated {date(report.generatedAt)}. Latest stored API snapshot: {date(report.coverage.latestSnapshotAt)}.</p>
      </header>
      <section aria-label="Publishing outcomes" className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[["Recorded published", report.operations.published], ['Scheduled', report.operations.scheduled], ['Failed / retrying', report.operations.failed], ['Processing', report.operations.processing], ['Needs review', report.operations.needsReview], ['Awaiting approval', report.operations.awaitingApproval]].map(([label, count]) => <div key={String(label)} className={panel}><h3 className="text-xs font-medium text-slate-600">{label}</h3><p className="mt-2 text-2xl font-bold text-slate-900">{Number(count).toLocaleString()}</p></div>)}
      </section>
      <section className={panel} aria-labelledby="coverage-heading">
        <h3 id="coverage-heading" className="font-semibold text-slate-900">Data coverage</h3>
        <p className="mt-2 text-sm text-slate-700">{report.coverage.withApiSnapshot} of {report.coverage.feedItems} feed items have stored API snapshots. {report.coverage.connectedAccounts} of {report.coverage.configuredAccounts} configured accounts are marked connected.</p>
        <p className="mt-1 text-xs text-slate-600">Performance uses lifetime snapshots for content published in these dates. Missing values are “Unavailable”; reach is never added across audiences.</p>
        {report.warnings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">{report.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      </section>
      <section className={panel} aria-labelledby="platform-report-heading">
        <h3 id="platform-report-heading" className="font-semibold text-slate-900">Platform results</h3>
        <div className="report-scroll mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Publication records and lifetime API metric totals, separated by platform</caption><TableHeading labels={['Platform', 'Published', 'Scheduled', 'API coverage', 'Impressions', 'Interactions', 'Latest snapshot']} /><tbody>{report.platforms.map(row => <tr key={row.platform} className="border-b border-slate-100"><th scope="row" className={`${cell} font-medium`}>{platformName(row.platform)}</th><td className={cell}>{row.published}</td><td className={cell}>{row.scheduled}</td><td className={cell}>{row.measuredItems}/{row.items} items</td><td className={cell}><MetricValue metric={row.impressions} /></td><td className={cell}><MetricValue metric={row.interactions} /></td><td className={`${cell} text-xs`}>{date(row.latestSnapshotAt)}</td></tr>)}</tbody></table></div>
        {report.platforms.length === 0 && <p className="py-6 text-center text-sm text-slate-600">No account or publication records match these filters.</p>}
      </section>
      <section className={panel} aria-labelledby="post-metrics-heading">
        <h3 id="post-metrics-heading" className="font-semibold text-slate-900">Post performance</h3>
        <p className="mt-1 text-xs text-slate-600">{report.items.length ? `Showing ${page * 25 + 1}–${Math.min((page + 1) * 25, report.items.length)} of ${report.items.length} items.` : 'No feed items match this period.'} PDF includes the summary and this detail page; CSV includes all matching items.</p>
        <div className="report-scroll mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Per-post values, with missing data preserved and reach reported individually</caption><TableHeading labels={['Content / brand', 'Platform', 'Impressions', 'Reach', 'Interactions', 'Rate', 'Snapshot']} /><tbody>{displayed.map(item => <tr key={item.id} className="border-b border-slate-100"><th scope="row" className={`${cell} max-w-xs font-normal`}><span className="block font-semibold">{item.brandName}</span><span className="mt-1 block">{item.caption.slice(0, 140) || 'No caption'}{item.caption.length > 140 ? '…' : ''}</span><span className="mt-1 block text-slate-500">Published {date(item.publishedAt)}</span></th><td className={cell}>{platformName(item.platform)}</td><td className={cell}>{value(item.impressions)}</td><td className={cell}>{value(item.reach)}</td><td className={cell}>{value(item.interactions)}</td><td className={cell}>{item.engagementRate === null ? 'Unavailable' : `${item.engagementRate}%`}</td><td className={cell}>{date(item.snapshotAt)}<span className={`mt-1 block ${item.stale ? 'text-amber-800' : 'text-slate-500'}`}>{item.source ? item.stale ? 'API · over 24h old' : 'API snapshot' : 'No API data'}</span></td></tr>)}</tbody></table></div>
        {report.items.length > 25 && <div className="report-screen-only mt-4 flex items-center justify-between"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous page</button><span className="text-xs" aria-live="polite">Page {page + 1} of {Math.ceil(report.items.length / 25)}</span><button type="button" disabled={(page + 1) * 25 >= report.items.length} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next page</button></div>}
      </section>
      <section className="rounded-xl bg-slate-50 p-5"><h3 className="font-semibold text-slate-900">How to read this report</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-700">{report.definitions.map(definition => <li key={definition}>{definition}</li>)}</ul></section>
    </article>}
  </div>;
};
