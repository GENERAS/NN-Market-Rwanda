import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { getDb, writeAuditLog } from '../db';
import {
  createSessionToken,
  hashIp,
  hashPassword,
  isAdminLocked,
  SlidingWindowRateLimiter,
  verifyAdminPasscodeOverride,
  verifyPassword,
  verifySessionToken,
} from '../security';
import { computeFunnelMetrics } from '../../shared/analytics';
import {
  buildWhatsAppUrl,
  sanitizePlainText,
  slugify,
  validateAndNormalizeRwandaPhone,
  validateExternalReferralUrl,
} from '../../src/utils/validation';

import os from 'node:os';

const adminRouter = Router();
const loginLimiter = new SlidingWindowRateLimiter(10, 15 * 60 * 1000);

function resolveUploadsDir(): string {
  const preferred = process.env.VERCEL
    ? path.join(os.tmpdir(), 'uploads')
    : path.resolve(process.cwd(), 'public', 'uploads');
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const fallback = path.join(os.tmpdir(), 'uploads');
    try {
      fs.mkdirSync(fallback, { recursive: true });
    } catch {
      // ignore if filesystem is restricted
    }
    return fallback;
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, resolveUploadsDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const targetName = `product_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    const uploadsDir = resolveUploadsDir();
    const resolved = path.resolve(uploadsDir, targetName);
    if (!resolved.startsWith(uploadsDir + path.sep)) {
      cb(new Error('Invalid upload path'), '');
      return;
    }
    cb(null, targetName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images up to 3MB are allowed.'));
    }
  },
});

interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    fullName: string;
    phoneNormalized?: string;
    role: string;
  };
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid' });
    return;
  }

  if (payload.userId === 'env-admin') {
    req.adminUser = {
      id: 'env-admin',
      email: payload.email,
      fullName: 'Administrator',
      role: 'admin',
    };
    next();
    return;
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.phone_normalized, u.is_active, r.name as role_name
       FROM users u
       JOIN admin_roles r ON u.role_id = r.id
       WHERE u.id = ?`
    )
    .get(payload.userId) as
    | { id: string; email: string; full_name: string; phone_normalized: string; is_active: number; role_name: string }
    | undefined;

  if (!user || user.is_active !== 1) {
    res.status(401).json({ error: 'Account inactive or not found' });
    return;
  }

  req.adminUser = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phoneNormalized: user.phone_normalized,
    role: user.role_name,
  };
  next();
}

adminRouter.get('/auth/status', (req: Request, res: Response) => {
  const db = getDb();
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
  const hasEnvPasscode = Boolean((process.env.ADMIN_PASSCODE || '').trim());
  const needsSetup = userCount === 0 && !hasEnvPasscode;
  const adminLocked = isAdminLocked();

  const token = getBearerToken(req);
  let authenticated = false;
  let user: { id: string; email: string; fullName: string; phoneNormalized?: string; role: string } | undefined;

  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      if (payload.userId === 'env-admin' && hasEnvPasscode) {
        authenticated = true;
        user = { id: 'env-admin', email: payload.email, fullName: 'Administrator', role: 'admin' };
      } else {
        const dbUser = db
          .prepare(
            `SELECT u.id, u.email, u.full_name, u.phone_normalized, u.is_active, r.name as role_name
             FROM users u JOIN admin_roles r ON u.role_id = r.id
             WHERE u.id = ? AND u.is_active = 1`
          )
          .get(payload.userId) as
          | { id: string; email: string; full_name: string; phone_normalized: string; role_name: string }
          | undefined;
        if (dbUser) {
          authenticated = true;
          user = {
            id: dbUser.id,
            email: dbUser.email,
            fullName: dbUser.full_name,
            phoneNormalized: dbUser.phone_normalized,
            role: dbUser.role_name,
          };
        }
      }
    }
  }

  res.json({
    needsSetup,
    hasEnvPasscode,
    adminLocked,
    authenticated,
    user,
  });
});

adminRouter.post('/auth/setup', (req: Request, res: Response) => {
  const db = getDb();
  const hasEnvPasscode = Boolean((process.env.ADMIN_PASSCODE || '').trim());
  const existingCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;

  if (existingCount > 0 || hasEnvPasscode) {
    res.status(409).json({ error: 'Admin account has already been configured.' });
    return;
  }

  const body = req.body || {};
  const fullName = sanitizePlainText(String(body.fullName || ''), 100);
  const email = sanitizePlainText(String(body.email || ''), 120).toLowerCase();
  const rawPhone = sanitizePlainText(String(body.phone || ''), 40);
  const password = String(body.password || '');

  if (fullName.length < 2) {
    res.status(400).json({ error: 'Please enter your full name.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  let phoneNormalized = '+250794144738';
  if (rawPhone) {
    const phoneCheck = validateAndNormalizeRwandaPhone(rawPhone);
    if (!phoneCheck.valid || !phoneCheck.normalized) {
      res.status(400).json({ error: 'Please enter a valid Rwandan phone number.' });
      return;
    }
    phoneNormalized = phoneCheck.normalized;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  db.prepare(
    `INSERT INTO users (id, email, full_name, phone_normalized, password_hash, role_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'role-admin', 1, ?, ?)`
  ).run(userId, email, fullName, phoneNormalized, passwordHash, now, now);

  writeAuditLog(userId, 'ADMIN_SETUP', 'users', userId, { email });

  const token = createSessionToken({ userId, email, role: 'admin' });
  res.status(201).json({
    ok: true,
    token,
    user: { id: userId, email, fullName, phoneNormalized, role: 'admin' },
  });
});

adminRouter.post('/auth/login', (req: Request, res: Response) => {
  if (isAdminLocked()) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const rate = loginLimiter.check(`admin_login:${ip}`);
    if (!rate.allowed) {
      res.status(429).json({ error: `Too many login attempts. Wait ${rate.retryAfterSeconds}s.` });
      return;
    }
  }

  const body = req.body || {};
  const rawIdentifier = sanitizePlainText(String(body.identifier || body.email || ''), 120);
  const identifierEmail = rawIdentifier.toLowerCase();
  const phoneCheck = rawIdentifier ? validateAndNormalizeRwandaPhone(rawIdentifier) : { valid: false, normalized: null };
  const password = String(body.password || '');

  if (!password) {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  // Optional env passcode override check
  if (verifyAdminPasscodeOverride(password)) {
    const token = createSessionToken({
      userId: 'env-admin',
      email: identifierEmail || 'generaskagiraneza@gmail.com',
      role: 'admin',
    });
    res.json({
      ok: true,
      token,
      user: {
        id: 'env-admin',
        email: identifierEmail || 'generaskagiraneza@gmail.com',
        fullName: 'Administrator',
        role: 'admin',
      },
    });
    return;
  }

  if (!rawIdentifier) {
    res.status(400).json({ error: 'Email or phone number and password are required.' });
    return;
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.phone_normalized, u.password_hash, u.is_active, r.name as role_name
       FROM users u JOIN admin_roles r ON u.role_id = r.id
       WHERE u.email = ? OR (u.phone_normalized != '' AND u.phone_normalized = ?)`
    )
    .get(identifierEmail, phoneCheck.valid && phoneCheck.normalized ? phoneCheck.normalized : '__none__') as
    | {
        id: string;
        email: string;
        full_name: string;
        phone_normalized: string;
        password_hash: string;
        is_active: number;
        role_name: string;
      }
    | undefined;

  if (!user || user.is_active !== 1 || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials.' });
    return;
  }

  const token = createSessionToken({ userId: user.id, email: user.email, role: user.role_name });
  writeAuditLog(user.id, 'ADMIN_LOGIN', 'users', user.id, {});

  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phoneNormalized: user.phone_normalized,
      role: user.role_name,
    },
  });
});

// Pre-live unlocked entry so admin is never locked out before going live (disabled automatically when LOCK_ADMIN=true)
adminRouter.post('/auth/prelive-enter', (_req: Request, res: Response) => {
  if (isAdminLocked()) {
    res.status(403).json({ error: 'Direct pre-live access is locked in live mode. Please sign in with your password.' });
    return;
  }

  const db = getDb();
  const dbUser = db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.phone_normalized, r.name as role_name
       FROM users u JOIN admin_roles r ON u.role_id = r.id
       WHERE u.is_active = 1
       ORDER BY u.created_at ASC LIMIT 1`
    )
    .get() as
    | { id: string; email: string; full_name: string; phone_normalized: string; role_name: string }
    | undefined;

  if (!dbUser) {
    res.status(404).json({ error: 'Admin user record not found.' });
    return;
  }

  const token = createSessionToken({ userId: dbUser.id, email: dbUser.email, role: dbUser.role_name });
  writeAuditLog(dbUser.id, 'ADMIN_PRELIVE_ENTER', 'users', dbUser.id, {});

  res.json({
    ok: true,
    token,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      phoneNormalized: dbUser.phone_normalized,
      role: dbUser.role_name,
    },
  });
});

// Protect all routes below this middleware
adminRouter.use(requireAdmin);

adminRouter.put('/auth/credentials', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const body = req.body || {};

  const fullName = sanitizePlainText(String(body.fullName || ''), 100);
  const email = sanitizePlainText(String(body.email || ''), 120).toLowerCase();
  const rawPhone = sanitizePlainText(String(body.phone || ''), 40);
  const newPassword = String(body.newPassword || '');

  if (fullName.length < 2) {
    res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid admin email address.' });
    return;
  }

  let phoneNormalized = req.adminUser?.phoneNormalized || '+250794144738';
  if (rawPhone) {
    const phoneCheck = validateAndNormalizeRwandaPhone(rawPhone);
    if (!phoneCheck.valid || !phoneCheck.normalized) {
      res.status(400).json({ error: 'Please enter a valid Rwandan phone number (e.g. 0794144738).' });
      return;
    }
    phoneNormalized = phoneCheck.normalized;
  }

  if (newPassword && newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }

  let targetId = req.adminUser?.id || '';
  if (targetId === 'env-admin' || !targetId) {
    const firstUser = db.prepare('SELECT id FROM users WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1').get() as
      | { id: string }
      | undefined;
    if (!firstUser) {
      res.status(404).json({ error: 'No database admin record available to update.' });
      return;
    }
    targetId = firstUser.id;
  }

  const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, targetId);
  if (conflict) {
    res.status(400).json({ error: 'Another admin account already uses this email address.' });
    return;
  }

  const now = new Date().toISOString();
  if (newPassword) {
    const passwordHash = hashPassword(newPassword);
    db.prepare(
      'UPDATE users SET full_name = ?, email = ?, phone_normalized = ?, password_hash = ?, updated_at = ? WHERE id = ?'
    ).run(fullName, email, phoneNormalized, passwordHash, now, targetId);
  } else {
    db.prepare(
      'UPDATE users SET full_name = ?, email = ?, phone_normalized = ?, updated_at = ? WHERE id = ?'
    ).run(fullName, email, phoneNormalized, now, targetId);
  }

  writeAuditLog(targetId, 'ADMIN_CREDENTIALS_UPDATED', 'users', targetId, {
    email,
    passwordChanged: Boolean(newPassword),
  });

  res.json({
    ok: true,
    user: {
      id: targetId,
      email,
      fullName,
      phoneNormalized,
      role: 'admin',
    },
  });
});

adminRouter.get('/overview', (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();

  const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products WHERE is_archived = 0').get() as { c: number }).c;
  const publishedProducts = (
    db.prepare('SELECT COUNT(*) as c FROM products WHERE is_published = 1 AND is_archived = 0').get() as { c: number }
  ).c;
  const unavailableProducts = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM products WHERE is_archived = 0 AND availability_status IN ('unavailable', 'out_of_stock')"
      )
      .get() as { c: number }
  ).c;

  const totalRequests = (db.prepare('SELECT COUNT(*) as c FROM product_requests').get() as { c: number }).c;
  const newRequests = (db.prepare("SELECT COUNT(*) as c FROM product_requests WHERE status = 'New'").get() as { c: number }).c;
  const contactedRequests = (
    db.prepare("SELECT COUNT(*) as c FROM product_requests WHERE status = 'Contacted'").get() as { c: number }
  ).c;
  const completedRequests = (
    db.prepare("SELECT COUNT(*) as c FROM product_requests WHERE status = 'Completed'").get() as { c: number }
  ).c;

  const totalApplications = (db.prepare('SELECT COUNT(*) as c FROM joining_applications').get() as { c: number }).c;
  const newApplications = (
    db.prepare("SELECT COUNT(*) as c FROM joining_applications WHERE status = 'New'").get() as { c: number }
  ).c;
  const referralClickCount = (
    db.prepare('SELECT COUNT(*) as c FROM joining_applications WHERE referral_clicked = 1').get() as { c: number }
  ).c;
  const completedApplications = (
    db.prepare("SELECT COUNT(*) as c FROM joining_applications WHERE status = 'Completed'").get() as { c: number }
  ).c;

  const totalSiteViews = (db.prepare('SELECT COUNT(*) as c FROM analytics_events').get() as { c: number }).c;
  const productViews = (
    db.prepare("SELECT COUNT(*) as c FROM analytics_events WHERE event_type = 'product_view'").get() as { c: number }
  ).c;

  const customerSummary = db
    .prepare(
      `SELECT
         COUNT(*) as totalCustomers,
         SUM(CASE WHEN total_touchpoints > 1 THEN 1 ELSE 0 END) as repeatCustomerCount,
         SUM(CASE WHEN latest_email != '' THEN 1 ELSE 0 END) as emailsCollectedCount
       FROM (
         SELECT
           phone_normalized,
           COUNT(*) as total_touchpoints,
           COALESCE(MAX(NULLIF(email, '')), '') as latest_email
         FROM (
           SELECT phone_normalized, customer_email as email FROM product_requests
           UNION ALL
           SELECT phone_normalized, email FROM joining_applications
         )
         GROUP BY phone_normalized
       )`
    )
    .get() as {
    totalCustomers: number;
    repeatCustomerCount: number | null;
    emailsCollectedCount: number | null;
  };

  const funnel = computeFunnelMetrics({
    totalSiteViews,
    productViews,
    totalRequests,
    completedRequests,
    totalApplications,
    referralClickCount,
    completedApplications,
  });

  const topRequestedProducts = db
    .prepare(
      `SELECT
         product_name_snapshot as product_name,
         COUNT(*) as request_count,
         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count
       FROM product_requests
       GROUP BY product_name_snapshot
       ORDER BY request_count DESC, completed_count DESC
       LIMIT 5`
    )
    .all();

  const recentAudit = db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 12')
    .all();

  res.json({
    stats: {
      totalProducts,
      publishedProducts,
      unavailableProducts,
      totalRequests,
      newRequests,
      contactedRequests,
      completedRequests,
      totalApplications,
      newApplications,
      referralClickCount,
      completedApplications,
      totalSiteViews,
      productViews,
      totalCustomers: customerSummary?.totalCustomers || 0,
      repeatCustomerCount: customerSummary?.repeatCustomerCount || 0,
      emailsCollectedCount: customerSummary?.emailsCollectedCount || 0,
      ...funnel,
    },
    topRequestedProducts,
    recentAudit,
  });
});

function sanitizeImageUrl(raw: unknown): string {
  const val = sanitizePlainText(String(raw || ''), 300).trim();
  if (!val) return '';
  if (val.startsWith('/uploads/') || val.startsWith('/src/assets/')) return val;
  if (/^https?:\/\/[^\s]+$/i.test(val)) return val;
  return '';
}

function parseGalleryImages(raw: unknown, fallbackMain?: string): string[] {
  const list: string[] = [];
  const seen = new Set<string>();
  const add = (candidate: unknown) => {
    const clean = sanitizeImageUrl(candidate);
    if (clean && !seen.has(clean) && list.length < 8) {
      seen.add(clean);
      list.push(clean);
    }
  };

  if (fallbackMain) add(fallbackMain);
  if (Array.isArray(raw)) {
    for (const item of raw) add(item);
  }
  return list;
}

function syncProductGallery(db: ReturnType<typeof getDb>, productId: string, gallery: string[]): void {
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
  const now = new Date().toISOString();
  const insert = db.prepare(
    'INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  gallery.forEach((url, idx) => {
    insert.run(`pimg-${crypto.randomUUID().slice(0, 8)}`, productId, url, '', idx, now);
  });
}

function getGalleryMap(db: ReturnType<typeof getDb>): Map<string, string[]> {
  const rows = db
    .prepare('SELECT product_id, image_url FROM product_images ORDER BY sort_order ASC, created_at ASC')
    .all() as Array<{ product_id: string; image_url: string }>;
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const arr = map.get(r.product_id) || [];
    arr.push(r.image_url);
    map.set(r.product_id, arr);
  }
  return map;
}

adminRouter.post('/upload', upload.single('image'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No valid image uploaded.' });
    return;
  }
  const url = `/uploads/${req.file.filename}`;
  writeAuditLog(req.adminUser?.id || null, 'IMAGE_UPLOADED', 'upload', req.file.filename, { url });
  res.status(201).json({ url });
});

adminRouter.post('/uploads', upload.array('images', 8), (req: AuthenticatedRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.length === 0) {
    res.status(400).json({ error: 'No valid images uploaded.' });
    return;
  }
  const urls = files.map((f) => `/uploads/${f.filename}`);
  writeAuditLog(req.adminUser?.id || null, 'IMAGES_UPLOADED', 'upload', String(urls.length), { urls });
  res.status(201).json({ urls });
});

adminRouter.get('/products', (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, c.name_en as category_name_en, c.slug as category_slug
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       ORDER BY p.is_archived ASC, p.updated_at DESC`
    )
    .all() as Array<{ id: string; main_image: string }>;
  const galleryMap = getGalleryMap(db);
  const items = rows.map((row) => {
    const imgs = galleryMap.get(row.id) || [];
    const merged = parseGalleryImages(imgs, row.main_image);
    return { ...row, gallery_images: merged };
  });
  res.json({ items });
});

adminRouter.post('/products', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const body = req.body || {};

  const nameEn = sanitizePlainText(String(body.name_en || ''), 160);
  const nameRw = sanitizePlainText(String(body.name_rw || nameEn), 160);
  const categoryId = sanitizePlainText(String(body.category_id || ''), 80);

  if (!nameEn || !categoryId) {
    res.status(400).json({ error: 'Product name and category are required.' });
    return;
  }

  const catExists = db.prepare('SELECT id FROM product_categories WHERE id = ?').get(categoryId);
  if (!catExists) {
    res.status(400).json({ error: 'Invalid category selected.' });
    return;
  }

  let slug = slugify(String(body.slug || nameEn));
  if (!slug) slug = `product-${Date.now()}`;
  const slugConflict = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  if (slugConflict) {
    slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
  }

  const priceRaw = body.price_rwf;
  const priceRwf =
    priceRaw === null || priceRaw === undefined || priceRaw === '' ? null : Number(priceRaw);
  if (priceRwf !== null && (Number.isNaN(priceRwf) || priceRwf < 0)) {
    res.status(400).json({ error: 'Price must be a valid positive number in RWF.' });
    return;
  }

  const explicitMain = sanitizeImageUrl(body.main_image);
  const galleryImages = parseGalleryImages(body.gallery_images, explicitMain);
  const finalMainImage = explicitMain || galleryImages[0] || '';

  const now = new Date().toISOString();
  const id = `prod-${crypto.randomUUID().slice(0, 8)}`;

  db.prepare(
    `INSERT INTO products (
      id, category_id, name_en, name_rw, slug,
      short_description_en, short_description_rw,
      full_description_en, full_description_rw,
      main_image, price_rwf, currency, quantity_label,
      ingredients_en, ingredients_rw, manufacturer_info,
      classification, availability_status, verification_status,
      is_featured, is_published, is_archived,
      seo_title, seo_description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RWF', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
  ).run(
    id,
    categoryId,
    nameEn,
    nameRw,
    slug,
    sanitizePlainText(String(body.short_description_en || ''), 300),
    sanitizePlainText(String(body.short_description_rw || body.short_description_en || ''), 300),
    sanitizePlainText(String(body.full_description_en || ''), 2000),
    sanitizePlainText(String(body.full_description_rw || body.full_description_en || ''), 2000),
    finalMainImage,
    priceRwf,
    sanitizePlainText(String(body.quantity_label || ''), 120),
    sanitizePlainText(String(body.ingredients_en || ''), 1000),
    sanitizePlainText(String(body.ingredients_rw || ''), 1000),
    sanitizePlainText(String(body.manufacturer_info || ''), 300),
    sanitizePlainText(String(body.classification || 'nutritional_supplement'), 60),
    sanitizePlainText(String(body.availability_status || 'awaiting_confirmation'), 60),
    sanitizePlainText(String(body.verification_status || 'awaiting_confirmation'), 60),
    body.is_featured ? 1 : 0,
    body.is_published ? 1 : 0,
    sanitizePlainText(String(body.seo_title || `${nameEn} | NN Market Rwanda`), 160),
    sanitizePlainText(String(body.seo_description || body.short_description_en || ''), 240),
    now,
    now
  );

  syncProductGallery(db, id, parseGalleryImages(galleryImages, finalMainImage));
  writeAuditLog(req.adminUser?.id || null, 'PRODUCT_CREATED', 'products', id, { nameEn, slug });
  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json({ product: { ...created, gallery_images: parseGalleryImages(galleryImages, finalMainImage) } });
});

adminRouter.put('/products/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as { id: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const body = req.body || {};
  const nameEn = sanitizePlainText(String(body.name_en || ''), 160);
  const nameRw = sanitizePlainText(String(body.name_rw || nameEn), 160);
  const categoryId = sanitizePlainText(String(body.category_id || ''), 80);

  if (!nameEn || !categoryId) {
    res.status(400).json({ error: 'Product name and category are required.' });
    return;
  }

  let slug = slugify(String(body.slug || nameEn));
  if (!slug) slug = `product-${id}`;
  const conflict = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, id);
  if (conflict) {
    res.status(400).json({ error: 'Another product already uses this URL slug.' });
    return;
  }

  const priceRaw = body.price_rwf;
  const priceRwf =
    priceRaw === null || priceRaw === undefined || priceRaw === '' ? null : Number(priceRaw);
  if (priceRwf !== null && (Number.isNaN(priceRwf) || priceRwf < 0)) {
    res.status(400).json({ error: 'Price must be a valid positive number in RWF.' });
    return;
  }

  const explicitMain = sanitizeImageUrl(body.main_image);
  const hasGalleryField = Array.isArray(body.gallery_images);
  const galleryImages = parseGalleryImages(body.gallery_images, explicitMain);
  const finalMainImage = explicitMain || galleryImages[0] || '';

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE products SET
      category_id = ?, name_en = ?, name_rw = ?, slug = ?,
      short_description_en = ?, short_description_rw = ?,
      full_description_en = ?, full_description_rw = ?,
      main_image = ?, price_rwf = ?, quantity_label = ?,
      ingredients_en = ?, ingredients_rw = ?, manufacturer_info = ?,
      classification = ?, availability_status = ?, verification_status = ?,
      is_featured = ?, is_published = ?, is_archived = ?,
      seo_title = ?, seo_description = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    categoryId,
    nameEn,
    nameRw,
    slug,
    sanitizePlainText(String(body.short_description_en || ''), 300),
    sanitizePlainText(String(body.short_description_rw || body.short_description_en || ''), 300),
    sanitizePlainText(String(body.full_description_en || ''), 2000),
    sanitizePlainText(String(body.full_description_rw || body.full_description_en || ''), 2000),
    finalMainImage,
    priceRwf,
    sanitizePlainText(String(body.quantity_label || ''), 120),
    sanitizePlainText(String(body.ingredients_en || ''), 1000),
    sanitizePlainText(String(body.ingredients_rw || ''), 1000),
    sanitizePlainText(String(body.manufacturer_info || ''), 300),
    sanitizePlainText(String(body.classification || 'nutritional_supplement'), 60),
    sanitizePlainText(String(body.availability_status || 'awaiting_confirmation'), 60),
    sanitizePlainText(String(body.verification_status || 'awaiting_confirmation'), 60),
    body.is_featured ? 1 : 0,
    body.is_published ? 1 : 0,
    body.is_archived ? 1 : 0,
    sanitizePlainText(String(body.seo_title || `${nameEn} | NN Market Rwanda`), 160),
    sanitizePlainText(String(body.seo_description || ''), 240),
    now,
    id
  );

  if (hasGalleryField) {
    syncProductGallery(db, id, parseGalleryImages(galleryImages, finalMainImage));
  }

  writeAuditLog(req.adminUser?.id || null, 'PRODUCT_UPDATED', 'products', id, { nameEn, slug });
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown>;
  const savedGallery = (
    db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC').all(id) as Array<{
      image_url: string;
    }>
  ).map((r) => r.image_url);
  res.json({ product: { ...updated, gallery_images: parseGalleryImages(savedGallery, finalMainImage) } });
});

adminRouter.delete('/products/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  const existing = db.prepare('SELECT id, name_en FROM products WHERE id = ?').get(id) as
    | { id: string; name_en: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const reqCount = (
    db.prepare('SELECT COUNT(*) as c FROM product_requests WHERE product_id = ?').get(id) as { c: number }
  ).c;
  if (reqCount > 0) {
    // Archive instead of hard-deleting when customer requests reference it
    db.prepare('UPDATE products SET is_archived = 1, is_published = 0, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      id
    );
    writeAuditLog(req.adminUser?.id || null, 'PRODUCT_ARCHIVED', 'products', id, { reason: 'has_requests' });
    res.json({ ok: true, archived: true });
    return;
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  writeAuditLog(req.adminUser?.id || null, 'PRODUCT_DELETED', 'products', id, { name: existing.name_en });
  res.json({ ok: true, deleted: true });
});

// Categories CRUD
adminRouter.get('/categories', (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const items = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM product_categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_archived = 0
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name_en ASC`
    )
    .all();
  res.json({ items });
});

adminRouter.post('/categories', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const body = req.body || {};
  const nameEn = sanitizePlainText(String(body.name_en || ''), 100);
  const nameRw = sanitizePlainText(String(body.name_rw || nameEn), 100);
  if (!nameEn) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug = slugify(String(body.slug || nameEn)) || `cat-${Date.now()}`;
  const conflict = db.prepare('SELECT id FROM product_categories WHERE slug = ?').get(slug);
  if (conflict) {
    res.status(400).json({ error: 'Category slug already exists.' });
    return;
  }
  const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO product_categories (id, name_en, name_rw, slug, description_en, description_rw, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    nameEn,
    nameRw,
    slug,
    sanitizePlainText(String(body.description_en || ''), 400),
    sanitizePlainText(String(body.description_rw || ''), 400),
    Number(body.sort_order || 0),
    body.is_active === false ? 0 : 1,
    now,
    now
  );
  writeAuditLog(req.adminUser?.id || null, 'CATEGORY_CREATED', 'product_categories', id, { nameEn });
  res.status(201).json({ category: db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) });
});

adminRouter.put('/categories/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  const body = req.body || {};
  const nameEn = sanitizePlainText(String(body.name_en || ''), 100);
  const nameRw = sanitizePlainText(String(body.name_rw || nameEn), 100);
  if (!nameEn) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug = slugify(String(body.slug || nameEn));
  const conflict = db.prepare('SELECT id FROM product_categories WHERE slug = ? AND id != ?').get(slug, id);
  if (conflict) {
    res.status(400).json({ error: 'Category slug already exists.' });
    return;
  }
  db.prepare(
    `UPDATE product_categories SET name_en = ?, name_rw = ?, slug = ?, description_en = ?, description_rw = ?, sort_order = ?, is_active = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    nameEn,
    nameRw,
    slug,
    sanitizePlainText(String(body.description_en || ''), 400),
    sanitizePlainText(String(body.description_rw || ''), 400),
    Number(body.sort_order || 0),
    body.is_active === false ? 0 : 1,
    new Date().toISOString(),
    id
  );
  writeAuditLog(req.adminUser?.id || null, 'CATEGORY_UPDATED', 'product_categories', id, { nameEn });
  res.json({ category: db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) });
});

adminRouter.delete('/categories/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  const prodCount = (db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(id) as { c: number }).c;
  if (prodCount > 0) {
    res.status(400).json({ error: 'Reassign or archive products in this category before deleting it.' });
    return;
  }
  db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
  writeAuditLog(req.adminUser?.id || null, 'CATEGORY_DELETED', 'product_categories', id, {});
  res.json({ ok: true });
});

// Product Requests Management
adminRouter.get('/requests', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const q = sanitizePlainText(String(req.query.q || ''), 100).toLowerCase();
  const status = sanitizePlainText(String(req.query.status || ''), 40);

  const where: string[] = ['1=1'];
  const params: string[] = [];

  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }
  if (q) {
    where.push(
      '(LOWER(reference_code) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(phone_normalized) LIKE ? OR LOWER(customer_email) LIKE ? OR LOWER(product_name_snapshot) LIKE ?)'
    );
    const p = `%${q}%`;
    params.push(p, p, p, p, p);
  }

  const rows = db
    .prepare(`SELECT * FROM product_requests WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`)
    .all(...params) as Array<{
    id: string;
    reference_code: string;
    customer_name: string;
    phone_normalized: string;
    product_name_snapshot: string;
  }>;

  const enriched = rows.map((row) => ({
    ...row,
    whatsapp_customer_url: buildWhatsAppUrl(
      row.phone_normalized,
      `Hello ${row.customer_name}, this is NN Market Rwanda following up on your request ${row.reference_code} (${row.product_name_snapshot}).`
    ),
  }));

  res.json({ items: enriched });
});

adminRouter.patch('/requests/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  const body = req.body || {};
  const allowedStatuses = ['New', 'Contacted', 'Processing', 'Completed', 'Cancelled'];
  const status = String(body.status || '');
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }
  const internalNotes = sanitizePlainText(String(body.internal_notes ?? ''), 2000);
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM product_requests WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Request not found.' });
    return;
  }

  db.prepare('UPDATE product_requests SET status = ?, internal_notes = ?, updated_at = ? WHERE id = ?').run(
    status,
    internalNotes,
    now,
    id
  );
  writeAuditLog(req.adminUser?.id || null, 'REQUEST_STATUS_UPDATED', 'product_requests', id, { status });
  res.json({ item: db.prepare('SELECT * FROM product_requests WHERE id = ?').get(id) });
});

// Joining Applications Management
adminRouter.get('/applications', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const q = sanitizePlainText(String(req.query.q || ''), 100).toLowerCase();
  const status = sanitizePlainText(String(req.query.status || ''), 60);

  const where: string[] = ['1=1'];
  const params: string[] = [];

  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }
  if (q) {
    where.push('(LOWER(reference_code) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(phone_normalized) LIKE ? OR LOWER(email) LIKE ?)');
    const p = `%${q}%`;
    params.push(p, p, p, p);
  }

  const rows = db
    .prepare(`SELECT * FROM joining_applications WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`)
    .all(...params) as Array<{
    id: string;
    reference_code: string;
    full_name: string;
    phone_normalized: string;
  }>;

  const enriched = rows.map((row) => ({
    ...row,
    whatsapp_customer_url: buildWhatsAppUrl(
      row.phone_normalized,
      `Hello ${row.full_name}, this is NN Market Rwanda following up on your N-Nutrition joining inquiry (${row.reference_code}).`
    ),
  }));

  res.json({ items: enriched });
});

adminRouter.patch('/applications/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  const body = req.body || {};
  const allowedStatuses = [
    'New',
    'Contacted',
    'Referral link shared',
    'External application submitted',
    'Completed',
    'Not proceeding',
  ];
  const status = String(body.status || '');
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }
  const internalNotes = sanitizePlainText(String(body.internal_notes ?? ''), 2000);
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM joining_applications WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Application not found.' });
    return;
  }

  db.prepare('UPDATE joining_applications SET status = ?, internal_notes = ?, updated_at = ? WHERE id = ?').run(
    status,
    internalNotes,
    now,
    id
  );
  writeAuditLog(req.adminUser?.id || null, 'APPLICATION_STATUS_UPDATED', 'joining_applications', id, { status });
  res.json({ item: db.prepare('SELECT * FROM joining_applications WHERE id = ?').get(id) });
});

// Customer Directory (aggregated by normalized phone)
adminRouter.get('/customers', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const q = sanitizePlainText(String(req.query.q || ''), 100).toLowerCase();

  let sql = `SELECT
       phone_normalized,
       MAX(name) as latest_name,
       COALESCE(MAX(NULLIF(email, '')), '') as latest_email,
       SUM(req_cnt) as request_count,
       SUM(app_cnt) as application_count,
       MAX(marketing_opt_in) as marketing_opt_in,
       MAX(last_seen) as last_activity
     FROM (
       SELECT phone_normalized, customer_name as name, customer_email as email, 1 as req_cnt, 0 as app_cnt, consent_marketing as marketing_opt_in, created_at as last_seen
       FROM product_requests
       UNION ALL
       SELECT phone_normalized, full_name as name, email, 0 as req_cnt, 1 as app_cnt, consent_marketing as marketing_opt_in, created_at as last_seen
       FROM joining_applications
     )
     GROUP BY phone_normalized`;

  const params: string[] = [];
  if (q) {
    sql = `SELECT * FROM (${sql}) WHERE LOWER(latest_name) LIKE ? OR LOWER(phone_normalized) LIKE ? OR LOWER(latest_email) LIKE ?`;
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern);
  }
  sql += ' ORDER BY last_activity DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ items: rows });
});

adminRouter.delete('/customers/:phone', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const rawPhone = decodeURIComponent(String(req.params.phone || ''));
  const check = validateAndNormalizeRwandaPhone(rawPhone);
  if (!check.valid || !check.normalized) {
    res.status(400).json({ error: 'Invalid customer phone identifier.' });
    return;
  }

  const deletedRequests = db
    .prepare('DELETE FROM product_requests WHERE phone_normalized = ?')
    .run(check.normalized).changes;
  const deletedApplications = db
    .prepare('DELETE FROM joining_applications WHERE phone_normalized = ?')
    .run(check.normalized).changes;

  if (deletedRequests === 0 && deletedApplications === 0) {
    res.status(404).json({ error: 'Customer record not found.' });
    return;
  }

  const phoneHash = hashIp(check.normalized);
  writeAuditLog(req.adminUser?.id || null, 'CUSTOMER_DATA_DELETED', 'customers', phoneHash, {
    deletedRequests,
    deletedApplications,
  });

  res.json({ ok: true, deletedRequests, deletedApplications });
});

// Content Management
adminRouter.get('/content', (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM website_content ORDER BY section ASC, key ASC').all();
  res.json({ items });
});

adminRouter.put('/content/:key', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const key = sanitizePlainText(String(req.params.key || ''), 80);
  const body = req.body || {};
  const existing = db.prepare('SELECT * FROM website_content WHERE key = ?').get(key);
  if (!existing) {
    res.status(404).json({ error: 'Content block not found.' });
    return;
  }

  const allowedVerif = ['verified', 'awaiting_confirmation', 'not_available'];
  const verificationStatus = allowedVerif.includes(String(body.verification_status))
    ? String(body.verification_status)
    : 'awaiting_confirmation';

  db.prepare(
    `UPDATE website_content
     SET title_en = ?, title_rw = ?, body_en = ?, body_rw = ?, verification_status = ?, updated_at = ?
     WHERE key = ?`
  ).run(
    sanitizePlainText(String(body.title_en || ''), 240),
    sanitizePlainText(String(body.title_rw || ''), 240),
    sanitizePlainText(String(body.body_en || ''), 6000),
    sanitizePlainText(String(body.body_rw || ''), 6000),
    verificationStatus,
    new Date().toISOString(),
    key
  );

  writeAuditLog(req.adminUser?.id || null, 'CONTENT_UPDATED', 'website_content', key, { verificationStatus });
  res.json({ item: db.prepare('SELECT * FROM website_content WHERE key = ?').get(key) });
});

// FAQs Management
adminRouter.get('/faqs', (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM faqs ORDER BY scope ASC, sort_order ASC').all();
  res.json({ items });
});

adminRouter.post('/faqs', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const body = req.body || {};
  const qEn = sanitizePlainText(String(body.question_en || ''), 300);
  const aEn = sanitizePlainText(String(body.answer_en || ''), 2000);
  if (!qEn || !aEn) {
    res.status(400).json({ error: 'Question and answer in English are required.' });
    return;
  }
  const id = `faq-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO faqs (id, scope, product_id, question_en, question_rw, answer_en, answer_rw, sort_order, is_published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    ['general', 'joining', 'product'].includes(String(body.scope)) ? String(body.scope) : 'general',
    body.product_id ? String(body.product_id) : null,
    qEn,
    sanitizePlainText(String(body.question_rw || qEn), 300),
    aEn,
    sanitizePlainText(String(body.answer_rw || aEn), 2000),
    Number(body.sort_order || 10),
    body.is_published === false ? 0 : 1,
    now,
    now
  );
  writeAuditLog(req.adminUser?.id || null, 'FAQ_CREATED', 'faqs', id, {});
  res.status(201).json({ item: db.prepare('SELECT * FROM faqs WHERE id = ?').get(id) });
});

adminRouter.put('/faqs/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  const body = req.body || {};
  const qEn = sanitizePlainText(String(body.question_en || ''), 300);
  const aEn = sanitizePlainText(String(body.answer_en || ''), 2000);
  if (!qEn || !aEn) {
    res.status(400).json({ error: 'Question and answer in English are required.' });
    return;
  }
  db.prepare(
    `UPDATE faqs
     SET scope = ?, question_en = ?, question_rw = ?, answer_en = ?, answer_rw = ?, sort_order = ?, is_published = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    ['general', 'joining', 'product'].includes(String(body.scope)) ? String(body.scope) : 'general',
    qEn,
    sanitizePlainText(String(body.question_rw || qEn), 300),
    aEn,
    sanitizePlainText(String(body.answer_rw || aEn), 2000),
    Number(body.sort_order || 10),
    body.is_published === false ? 0 : 1,
    new Date().toISOString(),
    id
  );
  writeAuditLog(req.adminUser?.id || null, 'FAQ_UPDATED', 'faqs', id, {});
  res.json({ item: db.prepare('SELECT * FROM faqs WHERE id = ?').get(id) });
});

adminRouter.delete('/faqs/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const id = String(req.params.id || '');
  db.prepare('DELETE FROM faqs WHERE id = ?').run(id);
  writeAuditLog(req.adminUser?.id || null, 'FAQ_DELETED', 'faqs', id, {});
  res.json({ ok: true });
});

// Settings Management (both public and private settings editable only by authenticated Admin)
adminRouter.get('/settings', (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value, is_private FROM website_settings').all() as Array<{
    key: string;
    value: string;
    is_private: number;
  }>;
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  res.json({ settings });
});

adminRouter.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const body = (req.body?.settings || req.body || {}) as Record<string, unknown>;

  if (typeof body.n_nutrition_referral_url === 'string') {
    const urlCheck = validateExternalReferralUrl(body.n_nutrition_referral_url);
    if (!urlCheck.valid) {
      res.status(400).json({ error: urlCheck.error || 'Invalid referral URL.' });
      return;
    }
    body.n_nutrition_referral_url = urlCheck.normalized;
  }

  for (const phoneKey of ['agent_phone', 'agent_whatsapp']) {
    if (typeof body[phoneKey] === 'string' && body[phoneKey].trim().length > 0) {
      const check = validateAndNormalizeRwandaPhone(String(body[phoneKey]));
      if (!check.valid || !check.normalized) {
        res.status(400).json({ error: `Invalid Rwandan phone number for ${phoneKey}.` });
        return;
      }
      body[phoneKey] = check.normalized;
    }
  }

  const now = new Date().toISOString();
  const privateKeys = new Set([
    'agent_phone',
    'agent_whatsapp',
    'business_email',
    'n_nutrition_referral_url',
  ]);

  const upsert = db.prepare(`
    INSERT INTO website_settings (key, value, is_private, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_private = excluded.is_private, updated_at = excluded.updated_at
  `);

  for (const [k, rawVal] of Object.entries(body)) {
    const cleanKey = sanitizePlainText(k, 80);
    if (!cleanKey) continue;
    const val = typeof rawVal === 'string' ? rawVal.trim().slice(0, 1000) : String(rawVal ?? '');
    upsert.run(cleanKey, val, privateKeys.has(cleanKey) ? 1 : 0, now);
  }

  writeAuditLog(req.adminUser?.id || null, 'SETTINGS_UPDATED', 'website_settings', 'global', {
    keys: Object.keys(body),
  });
  res.json({ ok: true });
});

export default adminRouter;
