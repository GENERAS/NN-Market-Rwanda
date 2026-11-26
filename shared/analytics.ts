export interface FunnelCounts {
  totalSiteViews: number;
  productViews: number;
  totalRequests: number;
  completedRequests: number;
  totalApplications: number;
  referralClickCount: number;
  completedApplications: number;
}

export interface FunnelMetrics {
  requestConversionRate: number;
  salesConversionRate: number;
  referralClickRate: number;
  referralCompletionRate: number;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeFunnelMetrics(counts: FunnelCounts): FunnelMetrics {
  const viewDenominator = counts.productViews > 0 ? counts.productViews : counts.totalSiteViews;
  const requestConversionRate =
    viewDenominator > 0 ? roundOneDecimal(Math.min(100, (counts.totalRequests / viewDenominator) * 100)) : 0;

  const salesConversionRate =
    counts.totalRequests > 0 ? roundOneDecimal((counts.completedRequests / counts.totalRequests) * 100) : 0;

  const referralClickRate =
    counts.totalApplications > 0 ? roundOneDecimal((counts.referralClickCount / counts.totalApplications) * 100) : 0;

  const referralCompletionRate =
    counts.totalApplications > 0 ? roundOneDecimal((counts.completedApplications / counts.totalApplications) * 100) : 0;

  return {
    requestConversionRate,
    salesConversionRate,
    referralClickRate,
    referralCompletionRate,
  };
}

function escapeCsvCell(raw: string | number | null | undefined): string {
  const str = raw === null || raw === undefined ? '' : String(raw);
  const formulaSafe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export function buildCsvContent(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}
