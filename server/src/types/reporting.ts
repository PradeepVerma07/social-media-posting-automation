export interface ReportFilters {
  from: string;
  to: string;
  timezone: string;
  brandId?: string;
  platform?: string;
}

export interface ReportMetric {
  value: number | null;
  measuredItems: number;
  totalItems: number;
}

export interface ReportItem {
  id: string;
  brandId: string;
  brandName: string;
  platform: string;
  caption: string;
  publishedAt: string | null;
  permalink: string | null;
  snapshotAt: string | null;
  source: 'API' | null;
  stale: boolean;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  interactions: number | null;
  engagementRate: number | null;
}

export interface AnalyticsReport {
  generatedAt: string;
  filters: ReportFilters;
  period: { startInclusiveUtc: string; endExclusiveUtc: string };
  availableBrands: Array<{ id: string; name: string }>;
  operations: { published: number; scheduled: number; failed: number; processing: number; needsReview: number; awaitingApproval: number };
  coverage: {
    feedItems: number;
    withApiSnapshot: number;
    withoutApiSnapshot: number;
    staleItems: number;
    configuredAccounts: number;
    connectedAccounts: number;
    latestSnapshotAt: string | null;
    oldestSnapshotAt: string | null;
  };
  platforms: Array<{
    platform: string;
    published: number;
    scheduled: number;
    items: number;
    measuredItems: number;
    impressions: ReportMetric;
    interactions: ReportMetric;
    latestSnapshotAt: string | null;
  }>;
  items: ReportItem[];
  definitions: string[];
  warnings: string[];
}
