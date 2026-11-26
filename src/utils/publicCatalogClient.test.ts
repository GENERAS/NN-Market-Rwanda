import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackBootstrap,
  getFallbackProductDetail,
  queryFallbackProducts,
} from './publicCatalogClient';

test('fallback catalog contains 18 published products across 5 categories and zero private settings', () => {
  const boot = buildFallbackBootstrap();
  assert.equal(boot.categories.length, 5);
  assert.equal(boot.settings.agent_whatsapp, undefined);
  assert.equal(boot.settings.agent_phone, undefined);
  assert.equal(boot.settings.n_nutrition_referral_url, undefined);

  const page1 = queryFallbackProducts({ page: 1, limit: 12 });
  assert.equal(page1.total, 18);
  assert.equal(page1.items.length, 12);
  assert.equal(page1.totalPages, 2);

  const page2 = queryFallbackProducts({ page: 2, limit: 12 });
  assert.equal(page2.items.length, 6);
});

test('fallback catalog search and category filtering work accurately', () => {
  const teaResults = queryFallbackProducts({ category: 'herbal-infusions', limit: 12 });
  assert.equal(teaResults.total, 3);
  assert.ok(teaResults.items.every((p) => p.category_slug === 'herbal-infusions'));

  const searchResults = queryFallbackProducts({ q: 'chlorophyll' });
  assert.equal(searchResults.total, 1);
  assert.equal(searchResults.items[0].slug, 'nutri-liquid-chlorophyll');
});

test('fallback product detail returns matching product and related items', () => {
  const detail = getFallbackProductDetail('golden-defense-tea');
  assert.ok(detail);
  assert.equal(detail.product.name_en, 'Golden Defense Tea');
  assert.equal(detail.relatedProducts.length, 3);
  assert.equal(getFallbackProductDetail('internal-catalog-draft'), null);
});
