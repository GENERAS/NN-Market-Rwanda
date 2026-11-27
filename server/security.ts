import crypto from 'node:crypto';

const FALLBACK_SESSION_SECRET = crypto
  .createHash('sha256')
  .update(
    `${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.APP_URL || process.cwd()}:nn-market-rwanda-session-key`
  )
  .digest('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || FALLBACK_SESSION_SECRET;
}

export function isAdminLocked(): boolean {
  return process.env.LOCK_ADMIN === 'true';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

export function verifyAdminPasscodeOverride(inputPasscode: string): boolean {
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (!envPasscode) return false;
  const a = Buffer.from(inputPasscode);
  const b = Buffer.from(envPasscode);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>, ttlSeconds = 60 * 60 * 8): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!decoded || typeof decoded.exp !== 'number' || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 16);
}

export function generateReferenceCode(prefix: 'NNR' | 'NNJ'): string {
  const now = new Date();
  const yymmdd =
    String(now.getUTCFullYear()).slice(2) +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${yymmdd}-${randomPart}`;
}

export interface SettingRow {
  key: string;
  value: string;
  is_private: number;
}

const PRIVATE_SETTING_KEYS = new Set([
  'agent_phone',
  'agent_whatsapp',
  'business_email',
  'n_nutrition_referral_url',
]);

export function filterPublicSettings(rows: SettingRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.is_private === 0 && !PRIVATE_SETTING_KEYS.has(row.key)) {
      result[row.key] = row.value;
    }
  }
  return result;
}

export class SlidingWindowRateLimiter {
  private buckets = new Map<string, number[]>();

  constructor(private readonly maxRequests: number, private readonly windowMs: number) {}

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const cutoff = now - this.windowMs;
    const history = (this.buckets.get(key) || []).filter((ts) => ts > cutoff);

    if (history.length >= this.maxRequests) {
      const oldest = history[0] || now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      this.buckets.set(key, history);
      return { allowed: false, retryAfterSeconds };
    }

    history.push(now);
    this.buckets.set(key, history);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
