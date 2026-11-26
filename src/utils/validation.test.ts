import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndNormalizeRwandaPhone,
  validateCustomerName,
  validateExternalReferralUrl,
  formatPriceRwf,
  slugify,
  buildWhatsAppUrl,
} from './validation';

test('accepts and normalizes local and international Rwandan phone numbers across networks', () => {
  assert.deepEqual(validateAndNormalizeRwandaPhone('0781234567'), {
    valid: true,
    normalized: '+250781234567',
  });
  assert.deepEqual(validateAndNormalizeRwandaPhone('079 123 4567'), {
    valid: true,
    normalized: '+250791234567',
  });
  assert.deepEqual(validateAndNormalizeRwandaPhone('072-123-4567'), {
    valid: true,
    normalized: '+250721234567',
  });
  assert.deepEqual(validateAndNormalizeRwandaPhone('+250 738 456 789'), {
    valid: true,
    normalized: '+250738456789',
  });
  assert.deepEqual(validateAndNormalizeRwandaPhone('250788112233'), {
    valid: true,
    normalized: '+250788112233',
  });
  assert.deepEqual(validateAndNormalizeRwandaPhone('00250 788 112 233'), {
    valid: true,
    normalized: '+250788112233',
  });
});

test('rejects empty, invalid, or dummy Rwandan phone numbers', () => {
  assert.equal(validateAndNormalizeRwandaPhone('').valid, false);
  assert.equal(validateAndNormalizeRwandaPhone('').errorCode, 'REQUIRED');
  assert.equal(validateAndNormalizeRwandaPhone('078123').valid, false);
  assert.equal(validateAndNormalizeRwandaPhone('+1 555 234 5678').valid, false);
  assert.equal(validateAndNormalizeRwandaPhone('0780000000').valid, false);
  assert.equal(validateAndNormalizeRwandaPhone('0711234567').valid, false);
  assert.equal(validateAndNormalizeRwandaPhone('abc1234567').valid, false);
});

test('validates customer names safely', () => {
  assert.equal(validateCustomerName('').valid, false);
  assert.equal(validateCustomerName('A').valid, false);
  assert.equal(validateCustomerName('<script>alert(1)</script>').valid, false);
  assert.deepEqual(validateCustomerName('  Jean   Bosco  '), {
    valid: true,
    cleaned: 'Jean Bosco',
  });
});

test('validates referral URLs and blocks unsafe schemes and local hosts', () => {
  assert.equal(validateExternalReferralUrl('').valid, true);
  assert.equal(validateExternalReferralUrl('https://portal.example.com/ref/abc').valid, true);
  assert.equal(validateExternalReferralUrl('javascript:alert(1)').valid, false);
  assert.equal(validateExternalReferralUrl('data:text/html,hi').valid, false);
  assert.equal(validateExternalReferralUrl('http://localhost:3000/admin').valid, false);
  assert.equal(validateExternalReferralUrl('http://127.0.0.1/test').valid, false);
});

test('formats RWF prices and generates WhatsApp URLs', () => {
  assert.equal(formatPriceRwf(35000), '35,000 RWF');
  assert.equal(formatPriceRwf(null, 'RWF', 'rw'), 'Igiciro kiracyemezwa');
  assert.equal(slugify('Liver Support Formula!'), 'liver-support-formula');
  assert.equal(
    buildWhatsAppUrl('+250 788 123 456', 'Hello NNR-1001'),
    'https://wa.me/250788123456?text=Hello%20NNR-1001'
  );
});
