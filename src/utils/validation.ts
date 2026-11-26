export type PhoneValidationErrorCode = 'REQUIRED' | 'INVALID_RWANDA_PHONE';

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string | null;
  errorCode?: PhoneValidationErrorCode;
}

export interface NameValidationResult {
  valid: boolean;
  cleaned: string;
  errorCode?: 'REQUIRED' | 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_CHARACTERS';
}

export interface UrlValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Accepts Rwandan mobile numbers in local (078..., 079..., 072..., 073...),
 * 9-digit (78...), or international (+2507..., 2507..., 002507...) formats,
 * ignoring spaces, hyphens, parentheses, and dots.
 * Normalizes to +2507XXXXXXXX.
 */
export function validateAndNormalizeRwandaPhone(rawInput: string): PhoneValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, normalized: null, errorCode: 'REQUIRED' };
  }

  // Strip allowed visual separators: spaces, hyphens, dots, parentheses
  let cleaned = trimmed.replace(/[\s\-().]/g, '');

  // Reject if any non-digit remains (other than leading +)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
    if (!/^\d+$/.test(cleaned)) {
      return { valid: false, normalized: null, errorCode: 'INVALID_RWANDA_PHONE' };
    }
  } else {
    if (!/^\d+$/.test(cleaned)) {
      return { valid: false, normalized: null, errorCode: 'INVALID_RWANDA_PHONE' };
    }
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.slice(2);
    }
  }

  let nationalNineDigits = '';

  if (cleaned.startsWith('250') && cleaned.length === 12) {
    nationalNineDigits = cleaned.slice(3);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    nationalNineDigits = cleaned.slice(1);
  } else if (cleaned.length === 9 && cleaned.startsWith('7')) {
    nationalNineDigits = cleaned;
  } else {
    return { valid: false, normalized: null, errorCode: 'INVALID_RWANDA_PHONE' };
  }

  // Rwandan mobile prefixes: 72, 73, 78, 79 (plus future 7x mobile allocations)
  if (!/^7[2389]\d{7}$/.test(nationalNineDigits)) {
    return { valid: false, normalized: null, errorCode: 'INVALID_RWANDA_PHONE' };
  }

  // Reject obvious dummy repeated digits like 780000000 or 781111111
  const subscriber = nationalNineDigits.slice(2);
  if (/^(\d)\1{6}$/.test(subscriber)) {
    return { valid: false, normalized: null, errorCode: 'INVALID_RWANDA_PHONE' };
  }

  return {
    valid: true,
    normalized: `+250${nationalNineDigits}`,
  };
}

export function validateCustomerName(rawName: string): NameValidationResult {
  const cleaned = (rawName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { valid: false, cleaned: '', errorCode: 'REQUIRED' };
  }
  if (cleaned.length < 2) {
    return { valid: false, cleaned, errorCode: 'TOO_SHORT' };
  }
  if (cleaned.length > 120) {
    return { valid: false, cleaned, errorCode: 'TOO_LONG' };
  }
  // Reject HTML brackets or obvious script injection characters
  if (/[<>]/.test(cleaned) || /https?:\/\//i.test(cleaned)) {
    return { valid: false, cleaned, errorCode: 'INVALID_CHARACTERS' };
  }
  return { valid: true, cleaned };
}

export function validateExternalReferralUrl(rawUrl: string): UrlValidationResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, normalized: '', error: 'Please enter a valid URL starting with https://' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, normalized: '', error: 'Only https:// or http:// URLs are permitted.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return { valid: false, normalized: '', error: 'Internal or local network URLs cannot be used as referral links.' };
  }

  return { valid: true, normalized: parsed.toString() };
}

export function formatPriceRwf(
  priceRwf: number | null | undefined,
  currency = 'RWF',
  lang: 'en' | 'rw' = 'en'
): string {
  if (priceRwf === null || priceRwf === undefined || Number.isNaN(Number(priceRwf))) {
    return lang === 'rw' ? 'Igiciro kiracyemezwa' : 'Price awaiting confirmation';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(priceRwf)));
  return `${formatted} ${currency}`;
}

export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildWhatsAppUrl(rawPhone: string, prefillMessage: string): string | null {
  const normalized = validateAndNormalizeRwandaPhone(rawPhone);
  let digits = '';
  if (normalized.valid && normalized.normalized) {
    digits = normalized.normalized.replace(/\D/g, '');
  } else {
    digits = (rawPhone || '').replace(/\D/g, '');
  }
  if (digits.length < 10) {
    return null;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefillMessage)}`;
}

export function sanitizePlainText(input: string, maxLength = 1000): string {
  return (input || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}
