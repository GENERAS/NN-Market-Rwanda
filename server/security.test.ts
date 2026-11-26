import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  filterPublicSettings,
  SlidingWindowRateLimiter,
  generateReferenceCode,
} from './security';

test('hashes and verifies passwords with scrypt', () => {
  const hash = hashPassword('RwandaWellness2026!');
  assert.notEqual(hash, 'RwandaWellness2026!');
  assert.equal(verifyPassword('RwandaWellness2026!', hash), true);
  assert.equal(verifyPassword('WrongPassword', hash), false);
});

test('creates and verifies HMAC session tokens and rejects tampering', () => {
  const token = createSessionToken({ userId: 'u1', email: 'agent@example.com', role: 'admin' }, 60);
  const payload = verifySessionToken(token);
  assert.equal(payload?.userId, 'u1');
  assert.equal(payload?.role, 'admin');

  const tampered = `${token.slice(0, -3)}xxx`;
  assert.equal(verifySessionToken(tampered), null);
});

test('strips private contact and referral settings from public settings output', () => {
  const publicMap = filterPublicSettings([
    { key: 'site_name', value: 'NN Market Rwanda', is_private: 0 },
    { key: 'currency', value: 'RWF', is_private: 0 },
    { key: 'agent_phone', value: '+250788000111', is_private: 1 },
    { key: 'agent_whatsapp', value: '+250788000111', is_private: 1 },
    { key: 'business_email', value: 'private@example.com', is_private: 1 },
    { key: 'n_nutrition_referral_url', value: 'https://example.com/ref', is_private: 1 },
    { key: 'agent_whatsapp', value: '+250788000111', is_private: 0 }, // even if misflagged, key blocklist protects it
  ]);

  assert.equal(publicMap.site_name, 'NN Market Rwanda');
  assert.equal(publicMap.currency, 'RWF');
  assert.equal(publicMap.agent_phone, undefined);
  assert.equal(publicMap.agent_whatsapp, undefined);
  assert.equal(publicMap.business_email, undefined);
  assert.equal(publicMap.n_nutrition_referral_url, undefined);
});

test('rate limiter enforces max requests per window', () => {
  const limiter = new SlidingWindowRateLimiter(2, 60_000);
  assert.equal(limiter.check('ip1', 1000).allowed, true);
  assert.equal(limiter.check('ip1', 2000).allowed, true);
  const blocked = limiter.check('ip1', 3000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  // After window expires
  assert.equal(limiter.check('ip1', 62_000).allowed, true);
});

test('generates unique formatted reference codes', () => {
  const r1 = generateReferenceCode('NNR');
  const r2 = generateReferenceCode('NNJ');
  assert.match(r1, /^NNR-\d{6}-[A-F0-9]{6}$/);
  assert.match(r2, /^NNJ-\d{6}-[A-F0-9]{6}$/);
  assert.notEqual(r1, r2);
});
