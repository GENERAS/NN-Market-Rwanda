import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolate DB in a temp file for API integration test
const tmpDbPath = path.join(os.tmpdir(), `nn_market_test_${Date.now()}.db`);
process.env.NN_DB_PATH = tmpDbPath;

import { createApp } from '../server';

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

  // 4. First-run admin setup + verify phone login (0794144738) + configure private settings
  const setup = await requestJson('/api/admin/auth/setup', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Agent Kigali',
      email: 'agent@nnmarket.rw',
      password: 'SecurePassword123',
    }),
  });
  assert.equal(setup.status, 201);
  const adminToken = String(setup.json.token);

  // Admin can log in using phone number 0794144738 as well as email
  const phoneLogin = await requestJson('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '0794144738',
      password: 'SecurePassword123',
    }),
  });
  assert.equal(phoneLogin.status, 200);
  assert.ok(phoneLogin.json.token);

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

  // 6. Valid product request saves to DB and reveals updated WhatsApp URL
  const goodReq = await requestJson('/api/public/product-requests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Marie Claire',
      phone: '078 965 4321',
      productId: 'prod-liver-support',
      consentProcessing: true,
      sourcePage: '/products/liver-support',
    }),
  });
  assert.equal(goodReq.status, 201);
  assert.equal(goodReq.json.contactAuthorized, true);
  assert.match(String(goodReq.json.referenceCode), /^NNR-/);
  assert.ok(String(goodReq.json.whatsappUrl).startsWith('https://wa.me/250788123456?text='));

  // 7. Valid joining application saves to DB and returns configured referral URL
  const goodJoin = await requestJson('/api/public/joining-applications', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Eric Ndayisaba',
      phone: '+250722334455',
      consentProcessing: true,
      sourcePage: '/join',
    }),
  });
  assert.equal(goodJoin.status, 201);
  assert.match(String(goodJoin.json.referenceCode), /^NNJ-/);
  assert.equal(goodJoin.json.referralUrl, 'https://portal.example.org/join/rw-agent');

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
});
