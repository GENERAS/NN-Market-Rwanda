import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsvContent, computeFunnelMetrics } from './analytics';

test('computeFunnelMetrics handles zero denominators and computes accurate rates', () => {
  const empty = computeFunnelMetrics({
    totalSiteViews: 0,
    productViews: 0,
    totalRequests: 0,
    completedRequests: 0,
    totalApplications: 0,
    referralClickCount: 0,
    completedApplications: 0,
  });
  assert.deepEqual(empty, {
    requestConversionRate: 0,
    salesConversionRate: 0,
    referralClickRate: 0,
    referralCompletionRate: 0,
  });

  const active = computeFunnelMetrics({
    totalSiteViews: 120,
    productViews: 40,
    totalRequests: 10,
    completedRequests: 3,
    totalApplications: 8,
    referralClickCount: 6,
    completedApplications: 2,
  });
  assert.equal(active.requestConversionRate, 25);
  assert.equal(active.salesConversionRate, 30);
  assert.equal(active.referralClickRate, 75);
  assert.equal(active.referralCompletionRate, 25);
});

test('buildCsvContent escapes quotes and neutralizes spreadsheet formula prefixes', () => {
  const csv = buildCsvContent(
    ['Name', 'Notes'],
    [
      ['Jean "Bosco"', '=CMD("calc")'],
      ['Aline', '+250788123456'],
    ]
  );
  assert.match(csv, /^"Name","Notes"\r\n/);
  assert.ok(csv.includes('"Jean ""Bosco"""'));
  assert.ok(csv.includes('"\'=CMD(""calc"")"'));
  assert.ok(csv.includes('"\'+250788123456"'));
});
