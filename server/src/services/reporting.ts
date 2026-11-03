import { DateTime } from 'luxon';
import type { DatabaseSync } from 'node:sqlite';
import type { AnalyticsReport, ReportFilters, ReportItem, ReportMetric } from '../types/reporting';
import { PLATFORM_METRICS_CONFIG } from './social/platform_metrics.config';

/** Client and optional brand scope must come from authenticated server-side authorization. */
export interface ReportScope { clientId: string; allowedBrandIds?: string[] }

export class ReportValidationError extends Error {}

export function parseReportFilters(input: Record<string, unknown>, now = new Date()): ReportFilters {
  const text = (key: string): string | undefined => {
    if (input[key] === undefined || input[key] === '') return undefined;
    if (typeof input[key] !== 'string') throw new ReportValidationError(`${key} must be a single value.`);
    return input[key] as string;
  };
  const timezone = text('timezone') || 'UTC';
  const today = DateTime.fromJSDate(now).setZone(timezone);
  if (!today.isValid) throw new ReportValidationError('Choose a valid reporting timezone.');
  const from = text('from') || today.minus({ days: 29 }).toISODate()!;
  const to = text('to') || today.toISODate()!;
  const start = DateTime.fromISO(from, { zone: timezone }).startOf('day');
  const end = DateTime.fromISO(to, { zone: timezone }).startOf('day');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || !start.isValid || !end.isValid || start.toISODate() !== from || end.toISODate() !== to) {
    throw new ReportValidationError('Use valid dates in YYYY-MM-DD format.');
  }
  if (end < start || end.diff(start, 'days').days > 365) throw new ReportValidationError('Choose an ordered date range of at most 366 days.');
  const platform = text('platform');
  if (platform && !['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'whatsapp'].includes(platform)) throw new ReportValidationError('Unsupported platform filter.');
  const brandId = text('brandId');
  if (brandId && brandId.length > 100) throw new ReportValidationError('Invalid brand filter.');
  return { from, to, timezone, ...(brandId ? { brandId } : {}), ...(platform ? { platform } : {}) };
}

const numeric = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const latest = (values: Array<string | null>) => values.filter((v): v is string => Boolean(v)).sort().at(-1) || null;
const oldest = (values: Array<string | null>) => values.filter((v): v is string => Boolean(v)).sort()[0] || null;

function aggregate(items: ReportItem[], field: 'impressions' | 'interactions'): ReportMetric {
  const measured = items.map(item => item[field]).filter((v): v is number => v !== null);
  return { value: measured.length ? measured.reduce((sum, value) => sum + value, 0) : null, measuredItems: measured.length, totalItems: items.length };
}

/** Read-only, no provider requests, no environment/token access, and no report delivery. */
export function buildAnalyticsReport(database: DatabaseSync, scope: ReportScope, input: ReportFilters, now = new Date()): AnalyticsReport {
  if (!scope.clientId?.trim()) throw new ReportValidationError('An authorized client scope is required.');
  const filters = parseReportFilters(input as unknown as Record<string, unknown>, now);
  const startInclusiveUtc = DateTime.fromISO(filters.from, { zone: filters.timezone }).startOf('day').toUTC().toISO()!;
  const endExclusiveUtc = DateTime.fromISO(filters.to, { zone: filters.timezone }).plus({ days: 1 }).startOf('day').toUTC().toISO()!;
  const brands = database.prepare('SELECT brand_id AS id, brand_name AS name FROM brands WHERE client_id = ? ORDER BY brand_name').all(scope.clientId) as Array<{ id: string; name: string }>;
  const availableBrands = scope.allowedBrandIds === undefined ? brands : brands.filter(brand => scope.allowedBrandIds!.includes(brand.id));
  if (filters.brandId && !availableBrands.some(brand => brand.id === filters.brandId)) throw new ReportValidationError('This brand is not available in your reporting scope.');
  const selectedIds = availableBrands.filter(brand => !filters.brandId || brand.id === filters.brandId).map(brand => brand.id);
  const placeholders = selectedIds.map(() => '?').join(',') || 'NULL';
  const brandClause = `p.brand_id IN (${placeholders})`;
  const platformClause = filters.platform ? ' AND t.platform = ?' : '';
  const targetRows = database.prepare(`
    SELECT t.platform, t.status, p.approval_status, t.posted_at, p.scheduled_utc
    FROM post_targets t JOIN posts p ON p.post_id = t.post_id
    JOIN social_accounts a ON a.account_id = t.account_id AND a.client_id = p.client_id AND a.brand_id = p.brand_id
    WHERE p.client_id = ? AND p.deleted_at IS NULL AND ${brandClause}${platformClause}
      AND julianday(CASE WHEN t.status = 'Posted' THEN t.posted_at ELSE p.scheduled_utc END) >= julianday(?)
      AND julianday(CASE WHEN t.status = 'Posted' THEN t.posted_at ELSE p.scheduled_utc END) < julianday(?)
  `).all(scope.clientId, ...selectedIds, ...(filters.platform ? [filters.platform] : []), startInclusiveUtc, endExclusiveUtc) as Array<{ platform: string; status: string; approval_status: string }>;

  const operations = { published: 0, scheduled: 0, failed: 0, processing: 0, needsReview: 0, awaitingApproval: 0 };
  for (const row of targetRows) {
    if (row.status === 'Posted') operations.published++;
    else if (['Scheduled', 'Retrying'].includes(row.status)) operations.scheduled++;
    else if (['Failed', 'Missed', 'FailedPermanent'].includes(row.status)) operations.failed++;
    else if (['Publishing', 'Processing', 'Queued', 'Locked', 'InProgress'].includes(row.status)) operations.processing++;
    else if (['Unknown', 'NeedsVerification', 'NeedsReconciliation', 'NeedsReview'].includes(row.status)) operations.needsReview++;
    if (row.approval_status === 'PendingApproval' && row.status !== 'Posted') operations.awaitingApproval++;
  }

  const rawItems = database.prepare(`
    SELECT f.id, f.brand_id, b.brand_name, f.platform, f.caption, f.published_at, f.permalink,
           m.id AS snapshot_id, m.snapshot_at, m.likes, m.comments, m.impressions, m.reach
    FROM feed_items f JOIN brands b ON b.brand_id = f.brand_id
    LEFT JOIN metric_snapshots m ON m.id = (
      SELECT s.id FROM metric_snapshots s WHERE s.feed_item_id = f.id AND s.platform = f.platform
      AND s.provenance = 'API' AND julianday(s.snapshot_at) <= julianday(?)
      ORDER BY julianday(s.snapshot_at) DESC, s.id DESC LIMIT 1
    )
    WHERE b.client_id = ? AND f.brand_id IN (${placeholders})${filters.platform ? ' AND f.platform = ?' : ''}
      AND julianday(f.published_at) >= julianday(?) AND julianday(f.published_at) < julianday(?)
    ORDER BY f.published_at DESC, f.id LIMIT 10001
  `).all(now.toISOString(), scope.clientId, ...selectedIds, ...(filters.platform ? [filters.platform] : []), startInclusiveUtc, endExclusiveUtc) as any[];
  if (rawItems.length > 10000) throw new ReportValidationError('This report exceeds 10,000 feed items. Narrow the date, brand, or platform filters.');
  const items: ReportItem[] = rawItems.map(row => {
    const capabilities = PLATFORM_METRICS_CONFIG[row.platform]?.metrics;
    const metric = (field: 'likes' | 'comments' | 'impressions' | 'reach') => row.snapshot_id && capabilities?.[field]?.supported ? numeric(row[field]) : null;
    const likes = metric('likes');
    const comments = metric('comments');
    const impressions = metric('impressions');
    const interactions = likes !== null && comments !== null ? likes + comments : null;
    return {
      id: row.id, brandId: row.brand_id, brandName: row.brand_name, platform: row.platform,
      caption: row.caption || '', publishedAt: row.published_at || null, permalink: row.permalink || null,
      snapshotAt: row.snapshot_at || null, source: row.snapshot_id ? 'API' : null,
      stale: Boolean(row.snapshot_at && now.getTime() - new Date(row.snapshot_at).getTime() > 24 * 60 * 60 * 1000),
      likes, comments, impressions, reach: metric('reach'), interactions,
      engagementRate: impressions !== null && impressions > 0 && interactions !== null ? Math.round(interactions / impressions * 10000) / 100 : null,
    };
  });
  const accountRows = database.prepare(`SELECT a.platform, a.status FROM social_accounts a
    JOIN brands b ON b.brand_id = a.brand_id AND b.client_id = a.client_id
    WHERE a.client_id = ? AND a.brand_id IN (${placeholders})${filters.platform ? ' AND a.platform = ?' : ''}
  `).all(scope.clientId, ...selectedIds, ...(filters.platform ? [filters.platform] : [])) as Array<{ platform: string; status: string }>;
  const platforms = [...new Set([...targetRows.map(row => row.platform), ...items.map(row => row.platform), ...accountRows.map(row => row.platform)])].sort().map(platform => {
    const subset = items.filter(item => item.platform === platform);
    return { platform, published: targetRows.filter(row => row.platform === platform && row.status === 'Posted').length,
      scheduled: targetRows.filter(row => row.platform === platform && row.status === 'Scheduled').length,
      items: subset.length, measuredItems: subset.filter(item => item.source === 'API').length,
      impressions: aggregate(subset, 'impressions'), interactions: aggregate(subset, 'interactions'), latestSnapshotAt: latest(subset.map(item => item.snapshotAt)) };
  });
  const withApiSnapshot = items.filter(item => item.source === 'API').length;
  const staleItems = items.filter(item => item.stale).length;
  return {
    generatedAt: now.toISOString(), filters, period: { startInclusiveUtc, endExclusiveUtc }, availableBrands, operations, platforms, items,
    coverage: { feedItems: items.length, withApiSnapshot, withoutApiSnapshot: items.length - withApiSnapshot, staleItems,
      configuredAccounts: accountRows.length, connectedAccounts: accountRows.filter(row => row.status === 'active').length,
      latestSnapshotAt: latest(items.map(item => item.snapshotAt)), oldestSnapshotAt: oldest(items.map(item => item.snapshotAt)) },
    definitions: [
      'Publishing counts are destination-level records from the application delivery ledger, not unique posts. Published counts use posted_at; other outcomes use the planned schedule time. Records without the relevant timestamp are excluded.',
      'Performance covers feed content published within the selected local dates. Values are the latest stored API lifetime snapshots available when this report is generated, not activity accrued only during the reporting period.',
      'Interactions means likes/reactions plus comments. The per-post rate is interactions divided by impressions × 100, only when all inputs exist and impressions are greater than zero. Shares, saves, and clicks are not included.',
      'Impressions and interactions are reported separately by platform. Reach is shown per post only; it is never added across posts or platforms because audiences overlap.',
      'Unavailable means no usable API value or unsupported by the installed adapter. Zero is retained only as a stored API value. Legacy API snapshots may contain defaulted zeros that cannot be retrospectively distinguished from measured zeros.',
      'Coverage is by feed item. The current feed schema does not attribute metrics to a social account, so account-level metric completeness cannot be established. Connection counts show configuration state, not a live provider health check.',
    ],
    warnings: [
      ...(items.length === 0 ? ['No synced feed content falls within these filters. Publishing records and imported feed content have different coverage.'] : []),
      ...(withApiSnapshot < items.length ? [`${items.length - withApiSnapshot} feed items have no stored API snapshot. Estimates and sample data are excluded.`] : []),
      ...(staleItems ? [`${staleItems} items have API snapshots more than 24 hours old. These values may have changed.`] : []),
      ...(accountRows.some(row => row.status !== 'active') ? ['Some selected account connections need attention; performance coverage may be incomplete.'] : []),
    ],
  };
}
