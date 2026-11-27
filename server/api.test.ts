import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolate DB in a temp file for API integration test
const tmpDbPath = path.join(os.tmpdir(), `nn_market_test_${Date.now()}.db`);
process.env.NN_DB_PATH = tmpDbPath;

import { createApp } from './app';

let server: http.Server;
let baseUrl = '';

async function requestJson(urlPath: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    // non-json response
  }
  return { status: res.status, text, json };
}

test('API end-to-end security, contact gating, product visibility, and admin workflow', async (t) => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      fs.unlinkSync(tmpDbPath);
    } catch {
      // ignore
    }
  });

  // 1. Public bootstrap never exposes private contact settings
  const boot = await requestJson('/api/public/bootstrap');
  assert.equal(boot.status, 200);
  const settings = boot.json.settings as Record<string, string>;
  assert.equal(settings.agent_whatsapp, undefined);
  assert.equal(settings.agent_phone, undefined);
  assert.equal(settings.business_email, undefined);
  assert.equal(settings.n_nutrition_referral_url, undefined);
  assert.equal(boot.text.includes('794144738'), false);

  // 2. Unpublished products remain hidden from public catalog & detail endpoints, while all 18 published products load
  const catalog = await requestJson('/api/public/products?limit=24');
  assert.equal(catalog.status, 200);
  const items = catalog.json.items as Array<{ slug: string }>;
  assert.equal(catalog.json.total, 18);
  assert.equal(items.length, 18);
  assert.equal(items.some((p) => p.slug === 'internal-catalog-draft'), false);
  const hiddenDetail = await requestJson('/api/public/products/internal-catalog-draft');
  assert.equal(hiddenDetail.status, 404);

  // 3. Unauthorized admin request is blocked
  const unauthAdmin = await requestJson('/api/admin/overview');
  assert.equal(unauthAdmin.status, 401);

  // 3b. Default seeded admin WhatsApp (+250794144738) unlocks ONLY after valid product request
  const seededReq = await requestJson('/api/public/product-requests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Claude Habimana',
      phone: '078 111 2233',
      productId: 'prod-liver-support',
      consentProcessing: true,
      sourcePage: '/products/liver-support',
    }),
  });
  assert.equal(seededReq.status, 201);
  assert.ok(String(seededReq.json.whatsappUrl).startsWith('https://wa.me/250794144738?text='));

  // 4. Configured admin login with email (generaskagiraneza@gmail.com) and phone (0794144738) using password 123456
  const emailLogin = await requestJson('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'generaskagiraneza@gmail.com',
      password: '123456',
    }),
  });
  assert.equal(emailLogin.status, 200);
  const adminToken = String(emailLogin.json.token);

  const phoneLogin = await requestJson('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '0794144738',
      password: '123456',
    }),
  });
  assert.equal(phoneLogin.status, 200);
  assert.ok(phoneLogin.json.token);

  // 4b. Pre-live unlocked entry works when LOCK_ADMIN !== 'true', and blocks when LOCK_ADMIN === 'true'
  const preliveRes = await requestJson('/api/admin/auth/prelive-enter', {
    method: 'POST',
  });
  assert.equal(preliveRes.status, 200);
  assert.ok(preliveRes.json.token);

  process.env.LOCK_ADMIN = 'true';
  const preliveBlocked = await requestJson('/api/admin/auth/prelive-enter', {
    method: 'POST',
  });
  assert.equal(preliveBlocked.status, 403);
  delete process.env.LOCK_ADMIN;

  // 4c. Admin can update credentials anytime
  const updateCreds = await requestJson('/api/admin/auth/credentials', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fullName: 'Agent Kigali',
      email: 'generaskagiraneza@gmail.com',
      phone: '0794144738',
      newPassword: 'UpdatedPass2026',
    }),
  });
  assert.equal(updateCreds.status, 200);

  const loginUpdated = await requestJson('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '0794144738',
      password: 'UpdatedPass2026',
    }),
  });
  assert.equal(loginUpdated.status, 200);

  const saveSettings = await requestJson('/api/admin/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      settings: {
        agent_whatsapp: '078 812 3456',
        agent_phone: '+250 788 123 456',
        n_nutrition_referral_url: 'https://portal.example.org/join/rw-agent',
      },
    }),
  });
  assert.equal(saveSettings.status, 200);

  // Verify public bootstrap STILL hides private contact & referral URL even after configured!
  const bootAfter = await requestJson('/api/public/bootstrap');
  const settingsAfter = bootAfter.json.settings as Record<string, string>;
  assert.equal(settingsAfter.agent_whatsapp, undefined);
  assert.equal(settingsAfter.agent_phone, undefined);
  assert.equal(settingsAfter.n_nutrition_referral_url, undefined);

  // 5. Failed product request NEVER reveals contact details
  const badReq = await requestJson('/api/public/product-requests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Jean',
      phone: '12345',
      consentProcessing: true,
    }),
  });
  assert.equal(badReq.status, 400);
  assert.equal(badReq.json.whatsappUrl, undefined);
  assert.equal(badReq.json.contactAuthorized, undefined);

  // 5b. Invalid optional email is rejected cleanly
  const badEmailReq = await requestJson('/api/public/product-requests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Jean',
      phone: '078 965 4321',
      email: 'not-an-email',
      consentProcessing: true,
    }),
  });
  assert.equal(badEmailReq.status, 400);
  assert.equal(badEmailReq.json.field, 'email');

  // 6. Valid product request with optional email saves to DB and reveals updated WhatsApp URL
  const goodReq = await requestJson('/api/public/product-requests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Marie Claire',
      phone: '078 965 4321',
      email: 'Marie.Claire@Example.RW',
      productId: 'prod-liver-support',
      consentProcessing: true,
      sourcePage: '/products/liver-support',
    }),
  });
  assert.equal(goodReq.status, 201);
  assert.equal(goodReq.json.contactAuthorized, true);
  assert.match(String(goodReq.json.referenceCode), /^NNR-/);
  assert.ok(String(goodReq.json.whatsappUrl).startsWith('https://wa.me/250788123456?text='));

  // 7. Valid joining application with optional email saves to DB and returns configured referral URL
  const goodJoin = await requestJson('/api/public/joining-applications', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Eric Ndayisaba',
      phone: '+250722334455',
      email: 'eric.ndayisaba@example.com',
      consentProcessing: true,
      sourcePage: '/join',
    }),
  });
  assert.equal(goodJoin.status, 201);
  assert.match(String(goodJoin.json.referenceCode), /^NNJ-/);
  assert.equal(goodJoin.json.referralUrl, 'https://portal.example.org/join/rw-agent');

  // Verify public bootstrap STILL leaks zero customer emails
  const bootFinalCheck = await requestJson('/api/public/bootstrap');
  assert.equal(bootFinalCheck.text.includes('marie.claire@example.rw'), false);
  assert.equal(bootFinalCheck.text.includes('eric.ndayisaba@example.com'), false);

  // 8. Admin overview shows real database-driven counts
  const overview = await requestJson('/api/admin/overview', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(overview.status, 200);
  const stats = overview.json.stats as Record<string, number>;
  assert.equal(stats.totalRequests, 2);
  assert.equal(stats.newRequests, 2);
  assert.equal(stats.totalApplications, 1);
  assert.equal(stats.newApplications, 1);

  // 9. Sitemap excludes unpublished draft and includes published products
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemapXml = await sitemapRes.text();
  assert.equal(sitemapRes.status, 200);
  assert.ok(sitemapXml.includes('/products/liver-support'));
  assert.equal(sitemapXml.includes('/products/internal-catalog-draft'), false);

  // 10. Anonymous analytics view tracking + referral click + status completion -> real funnel metrics
  await requestJson('/api/public/analytics/view', {
    method: 'POST',
    body: JSON.stringify({ eventType: 'page_view', path: '/' }),
  });
  await requestJson('/api/public/analytics/view', {
    method: 'POST',
    body: JSON.stringify({ eventType: 'product_view', path: '/products/liver-support', productSlug: 'liver-support' }),
  });

  // Repeat request from same customer phone triggers repeat customer detection
  const repeatReq = await requestJson('/api/public/product-requests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Marie Claire',
      phone: '078 965 4321',
      productId: 'prod-golden-defense-tea',
      consentProcessing: true,
      sourcePage: '/products/golden-defense-tea',
    }),
  });
  assert.equal(repeatReq.status, 201);

  const reqList = await requestJson('/api/admin/requests', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const reqItems = reqList.json.items as Array<{ id: string }>;
  assert.equal(reqItems.length, 3);

  const markCompleted = await requestJson(`/api/admin/requests/${reqItems[0].id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'Completed', internal_notes: 'Confirmed delivery in Kigali' }),
  });
  assert.equal(markCompleted.status, 200);

  // Track referral click and mark joining application Completed
  const refClick = await requestJson(`/api/public/joining-applications/${goodJoin.json.referenceCode}/referral-click`, {
    method: 'POST',
  });
  assert.equal(refClick.status, 200);

  const appList = await requestJson('/api/admin/applications', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const appItems = appList.json.items as Array<{ id: string; referral_clicked: number }>;
  assert.equal(appItems[0].referral_clicked, 1);

  const overviewAfter = await requestJson('/api/admin/overview', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsAfter = overviewAfter.json.stats as Record<string, number>;
  assert.equal(statsAfter.totalSiteViews, 2);
  assert.equal(statsAfter.productViews, 1);
  assert.equal(statsAfter.referralClickCount, 1);
  assert.equal(statsAfter.referralClickRate, 100);
  assert.equal(statsAfter.completedRequests, 1);
  assert.equal(statsAfter.repeatCustomerCount, 1);
  assert.equal(statsAfter.emailsCollectedCount, 2);
  assert.ok(Array.isArray(overviewAfter.json.topRequestedProducts));

  // 11. Customer search (by name and by email) & privacy deletion workflow
  const custSearch = await requestJson('/api/admin/customers?q=Marie', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const custItems = custSearch.json.items as Array<{ latest_email: string }>;
  assert.equal(custItems.length, 1);
  assert.equal(custItems[0].latest_email, 'marie.claire@example.rw');

  const emailSearch = await requestJson('/api/admin/customers?q=eric.ndayisaba@example.com', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal((emailSearch.json.items as unknown[]).length, 1);

  const delCust = await requestJson(`/api/admin/customers/${encodeURIComponent('+250789654321')}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(delCust.status, 200);
  assert.equal(delCust.json.deletedRequests, 2);

  // Confirm deleted customer no longer appears in directory
  const custAfter = await requestJson('/api/admin/customers?q=Marie', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal((custAfter.json.items as unknown[]).length, 0);
});
