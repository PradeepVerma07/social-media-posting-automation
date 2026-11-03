import type { AnalyticsReport } from '../../../server/src/types/reporting';

/** Quote every cell and neutralize spreadsheet formulas, including whitespace-prefixed input. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? 'Unavailable' : String(value);
  if (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function analyticsReportCsv(report: AnalyticsReport): string {
  const rows: unknown[][] = [
    ['Webtrionix 360 report', 'Value'], ['Generated at', report.generatedAt],
    ['From (inclusive)', report.filters.from], ['To (inclusive)', report.filters.to], ['Timezone', report.filters.timezone],
    ['Brand', report.filters.brandId ? report.availableBrands.find(brand => brand.id === report.filters.brandId)?.name || report.filters.brandId : 'All authorized brands'],
    ['Platform', report.filters.platform || 'All platforms'],
    ...Object.entries(report.operations).map(([key, count]) => [`Publishing destinations: ${key}`, count]),
    ['Feed items with API snapshots', report.coverage.withApiSnapshot], ['Feed items in scope', report.coverage.feedItems],
    ...report.definitions.map(definition => ['Definition', definition]), ...report.warnings.map(warning => ['Coverage warning', warning]), [],
    ['Brand', 'Platform', 'Content', 'Published at', 'Snapshot at', 'Source', 'Snapshot over 24h old', 'Impressions', 'Reach (per post)', 'Likes/reactions', 'Comments', 'Interactions (likes + comments)', 'Interactions / impressions (%)'],
    ...report.items.map(item => [item.brandName, item.platform, item.caption, item.publishedAt, item.snapshotAt, item.source, item.stale ? 'Yes' : 'No', item.impressions, item.reach, item.likes, item.comments, item.interactions, item.engagementRate]),
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadAnalyticsReport(report: AnalyticsReport): void {
  const url = URL.createObjectURL(new Blob([analyticsReportCsv(report)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `webtrionix-360-report-${report.filters.from}-to-${report.filters.to}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
