import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db';
import {
  filterPublicSettings,
  generateReferenceCode,
  hashIp,
  SlidingWindowRateLimiter,
  SettingRow,
} from '../security';
import {
  buildWhatsAppUrl,
  sanitizePlainText,
  validateAndNormalizeRwandaPhone,
  validateCustomerName,
  validateExternalReferralUrl,
} from '../../src/utils/validation';

const publicRouter = Router();

const submissionLimiter = new SlidingWindowRateLimiter(8, 10 * 60 * 1000);

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

publicRouter.get('/bootstrap', (_req: Request, res: Response) => {
  const db = getDb();

  const settingRows = db
    .prepare('SELECT key, value, is_private FROM website_settings WHERE is_private = 0')
    .all() as unknown as SettingRow[];
  const settings = filterPublicSettings(settingRows);

  const referralRow = db
    .prepare("SELECT value FROM website_settings WHERE key = 'n_nutrition_referral_url'")
    .get() as { value?: string } | undefined;
  const referralValid = validateExternalReferralUrl(referralRow?.value || '');
  settings.has_referral_configured = referralValid.valid && Boolean(referralValid.normalized) ? '1' : '0';

  const categories = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM product_categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_published = 1 AND p.is_archived = 0
       WHERE c.is_active = 1
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name_en ASC`
    )
    .all();

  const contentRows = db.prepare('SELECT * FROM website_content').all() as Array<{
    key: string;
    section: string;
    title_en: string;
    title_rw: string;
    body_en: string;
    body_rw: string;
    verification_status: string;
    updated_at: string;
  }>;

  const content: Record<string, (typeof contentRows)[number]> = {};
  for (const row of contentRows) {
    content[row.key] = row;
  }

  const faqs = db
    .prepare(
      'SELECT * FROM faqs WHERE is_published = 1 AND product_id IS NULL ORDER BY sort_order ASC, created_at ASC'
    )
    .all();

  const featuredProducts = db
    .prepare(
      `SELECT p.*, c.name_en as category_name_en, c.name_rw as category_name_rw, c.slug as category_slug
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       WHERE p.is_published = 1 AND p.is_archived = 0 AND p.is_featured = 1
       ORDER BY p.updated_at DESC
       LIMIT 6`
    )
    .all();

  res.json({
    settings,
    categories,
    content,
    faqs,
    featuredProducts,
  });
});

publicRouter.get('/products', (req: Request, res: Response) => {
  const db = getDb();
  const q = sanitizePlainText(String(req.query.q || ''), 100).toLowerCase();
  const categorySlug = sanitizePlainText(String(req.query.category || ''), 80);
  const sort = String(req.query.sort || 'featured');
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = ['p.is_published = 1', 'p.is_archived = 0'];
  const params: Array<string | number> = [];

  if (categorySlug && categorySlug !== 'all') {
    whereClauses.push('c.slug = ?');
    params.push(categorySlug);
  }

  if (q) {
    whereClauses.push(
      `(LOWER(p.name_en) LIKE ? OR LOWER(p.name_rw) LIKE ? OR LOWER(p.short_description_en) LIKE ? OR LOWER(p.short_description_rw) LIKE ? OR LOWER(p.full_description_en) LIKE ? OR LOWER(c.name_en) LIKE ? OR LOWER(p.classification) LIKE ?)`
    );
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  let orderSql = 'p.is_featured DESC, p.updated_at DESC';
  if (sort === 'price_asc') {
    orderSql = 'CASE WHEN p.price_rwf IS NULL THEN 1 ELSE 0 END ASC, p.price_rwf ASC, p.name_en ASC';
  } else if (sort === 'price_desc') {
    orderSql = 'CASE WHEN p.price_rwf IS NULL THEN 1 ELSE 0 END ASC, p.price_rwf DESC, p.name_en ASC';
  } else if (sort === 'newest') {
    orderSql = 'p.created_at DESC';
  } else if (sort === 'name') {
    orderSql = 'p.name_en ASC';
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       WHERE ${whereSql}`
    )
    .get(...params) as { total: number };

  const items = db
    .prepare(
      `SELECT p.*, c.name_en as category_name_en, c.name_rw as category_name_rw, c.slug as category_slug
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       WHERE ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.json({
    items,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(countRow.total / limit)),
  });
});

publicRouter.get('/products/:slug', (req: Request, res: Response) => {
  const db = getDb();
  const slug = sanitizePlainText(String(req.params.slug || ''), 120);
  if (!slug) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const product = db
    .prepare(
      `SELECT p.*, c.name_en as category_name_en, c.name_rw as category_name_rw, c.slug as category_slug
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_published = 1 AND p.is_archived = 0`
    )
    .get(slug) as { id: string; category_id: string } | undefined;

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const images = db
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
    .all(product.id);

  const productFaqs = db
    .prepare(
      'SELECT * FROM faqs WHERE is_published = 1 AND (product_id = ? OR scope = ?) ORDER BY product_id DESC, sort_order ASC LIMIT 6'
    )
    .all(product.id, 'general');

  const relatedProducts = db
    .prepare(
      `SELECT p.*, c.name_en as category_name_en, c.name_rw as category_name_rw, c.slug as category_slug
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       WHERE p.is_published = 1 AND p.is_archived = 0 AND p.id != ?
       ORDER BY CASE WHEN p.category_id = ? THEN 0 ELSE 1 END, p.is_featured DESC
       LIMIT 3`
    )
    .all(product.id, product.category_id);

  res.json({
    product,
    images,
    faqs: productFaqs,
    relatedProducts,
  });
});

publicRouter.post('/product-requests', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = submissionLimiter.check(`req:${ip}`);
  if (!rate.allowed) {
    res.status(429).json({
      errorCode: 'RATE_LIMITED',
      error: `Too many requests. Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
    });
    return;
  }

  const body = req.body || {};
  // Honeypot anti-spam trap
  if (typeof body.website_url === 'string' && body.website_url.trim().length > 0) {
    res.status(400).json({ errorCode: 'SPAM_REJECTED', error: 'Submission rejected.' });
    return;
  }

  const nameCheck = validateCustomerName(String(body.name || ''));
  if (!nameCheck.valid) {
    res.status(400).json({
      errorCode: `NAME_${nameCheck.errorCode}`,
      field: 'name',
      error: 'Please enter your full name (at least 2 characters).',
    });
    return;
  }

  const phoneCheck = validateAndNormalizeRwandaPhone(String(body.phone || ''));
  if (!phoneCheck.valid || !phoneCheck.normalized) {
    res.status(400).json({
      errorCode: `PHONE_${phoneCheck.errorCode}`,
      field: 'phone',
      error: 'Please enter a valid Rwandan phone number (e.g. 078 123 4567 or +250 781 234 567).',
    });
    return;
  }

  if (body.consentProcessing !== true) {
    res.status(400).json({
      errorCode: 'CONSENT_REQUIRED',
      field: 'consentProcessing',
      error: 'Please confirm consent so we can respond to your product request.',
    });
    return;
  }

  const db = getDb();
  let resolvedProductId: string | null = null;
  let resolvedProductName = 'General Product Inquiry';

  if (body.productId) {
    const prod = db
      .prepare('SELECT id, name_en FROM products WHERE id = ? AND is_published = 1 AND is_archived = 0')
      .get(String(body.productId)) as { id: string; name_en: string } | undefined;
    if (!prod) {
      res.status(400).json({
        errorCode: 'INVALID_PRODUCT',
        field: 'productId',
        error: 'The selected product is unavailable.',
      });
      return;
    }
    resolvedProductId = prod.id;
    resolvedProductName = prod.name_en;
  }

  const message = sanitizePlainText(String(body.message || ''), 600);
  const sourcePage = sanitizePlainText(String(body.sourcePage || '/request'), 200) || '/request';
  const consentMarketing = body.consentMarketing === true ? 1 : 0;
  const ipHash = hashIp(ip);
  const now = new Date().toISOString();

  // Duplicate submission protection within 2 minutes
  const twoMinsAgo = new Date(Date.now() - 120_000).toISOString();
  const existingRecent = db
    .prepare(
      `SELECT reference_code, product_name_snapshot
       FROM product_requests
       WHERE phone_normalized = ?
         AND ((? IS NULL AND product_id IS NULL) OR product_id = ?)
         AND created_at >= ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(phoneCheck.normalized, resolvedProductId, resolvedProductId, twoMinsAgo) as
    | { reference_code: string; product_name_snapshot: string }
    | undefined;

  let referenceCode: string;
  if (existingRecent) {
    referenceCode = existingRecent.reference_code;
    resolvedProductName = existingRecent.product_name_snapshot || resolvedProductName;
  } else {
    referenceCode = generateReferenceCode('NNR');
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO product_requests (
        id, reference_code, customer_name, phone_normalized, phone_raw,
        product_id, product_name_snapshot, message, source_page,
        consent_processing, consent_marketing, status, internal_notes, ip_hash,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'New', '', ?, ?, ?)`
    ).run(
      id,
      referenceCode,
      nameCheck.cleaned,
      phoneCheck.normalized,
      sanitizePlainText(String(body.phone || ''), 40),
      resolvedProductId,
      resolvedProductName,
      message,
      sourcePage,
      consentMarketing,
      ipHash,
      now,
      now
    );
  }

  // ONLY AFTER successful DB write/verification: retrieve private agent WhatsApp/phone settings
  const whatsappSetting = db
    .prepare("SELECT value FROM website_settings WHERE key = 'agent_whatsapp'")
    .get() as { value?: string } | undefined;
  const phoneSetting = db
    .prepare("SELECT value FROM website_settings WHERE key = 'agent_phone'")
    .get() as { value?: string } | undefined;

  const rawAgentWa = (whatsappSetting?.value || '').trim();
  const rawAgentPhone = (phoneSetting?.value || '').trim();
  const targetWaNumber = rawAgentWa || rawAgentPhone;

  const prefillText = `Hello NN Market Rwanda, my request reference is ${referenceCode}. Product: ${resolvedProductName}. Name: ${nameCheck.cleaned}.`;
  const whatsappUrl = targetWaNumber ? buildWhatsAppUrl(targetWaNumber, prefillText) : null;

  res.status(201).json({
    ok: true,
    referenceCode,
    productName: resolvedProductName,
    contactAuthorized: true,
    whatsappUrl,
    agentPhoneDisplay: rawAgentPhone || rawAgentWa || null,
  });
});

publicRouter.post('/joining-applications', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = submissionLimiter.check(`join:${ip}`);
  if (!rate.allowed) {
    res.status(429).json({
      errorCode: 'RATE_LIMITED',
      error: `Too many applications submitted. Please wait ${rate.retryAfterSeconds} seconds.`,
    });
    return;
  }

  const body = req.body || {};
  if (typeof body.website_url === 'string' && body.website_url.trim().length > 0) {
    res.status(400).json({ errorCode: 'SPAM_REJECTED', error: 'Submission rejected.' });
    return;
  }

  const nameCheck = validateCustomerName(String(body.fullName || ''));
  if (!nameCheck.valid) {
    res.status(400).json({
      errorCode: `NAME_${nameCheck.errorCode}`,
      field: 'fullName',
      error: 'Please enter your full name (at least 2 characters).',
    });
    return;
  }

  const phoneCheck = validateAndNormalizeRwandaPhone(String(body.phone || ''));
  if (!phoneCheck.valid || !phoneCheck.normalized) {
    res.status(400).json({
      errorCode: `PHONE_${phoneCheck.errorCode}`,
      field: 'phone',
      error: 'Please enter a valid Rwandan phone number (e.g. 078 123 4567 or +250 781 234 567).',
    });
    return;
  }

  if (body.consentProcessing !== true) {
    res.status(400).json({
      errorCode: 'CONSENT_REQUIRED',
      field: 'consentProcessing',
      error: 'Please confirm consent so our agent can assist with your joining inquiry.',
    });
    return;
  }

  const db = getDb();
  const question = sanitizePlainText(String(body.question || ''), 600);
  const sourcePage = sanitizePlainText(String(body.sourcePage || '/join'), 200) || '/join';
  const consentMarketing = body.consentMarketing === true ? 1 : 0;
  const ipHash = hashIp(ip);
  const now = new Date().toISOString();

  const twoMinsAgo = new Date(Date.now() - 120_000).toISOString();
  const existingRecent = db
    .prepare(
      `SELECT reference_code FROM joining_applications
       WHERE phone_normalized = ? AND created_at >= ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(phoneCheck.normalized, twoMinsAgo) as { reference_code: string } | undefined;

  let referenceCode: string;
  if (existingRecent) {
    referenceCode = existingRecent.reference_code;
  } else {
    referenceCode = generateReferenceCode('NNJ');
    db.prepare(
      `INSERT INTO joining_applications (
        id, reference_code, full_name, phone_normalized, phone_raw,
        question, source_page, consent_processing, consent_marketing,
        status, referral_clicked, internal_notes, ip_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'New', 0, '', ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      referenceCode,
      nameCheck.cleaned,
      phoneCheck.normalized,
      sanitizePlainText(String(body.phone || ''), 40),
      question,
      sourcePage,
      consentMarketing,
      ipHash,
      now,
      now
    );
  }

  // Only after DB write succeeds, retrieve configured referral URL and optional WhatsApp assistance link
  const referralRow = db
    .prepare("SELECT value FROM website_settings WHERE key = 'n_nutrition_referral_url'")
    .get() as { value?: string } | undefined;
  const urlValidation = validateExternalReferralUrl(referralRow?.value || '');
  const referralUrl = urlValidation.valid && urlValidation.normalized ? urlValidation.normalized : null;

  const whatsappSetting = db
    .prepare("SELECT value FROM website_settings WHERE key = 'agent_whatsapp'")
    .get() as { value?: string } | undefined;
  const phoneSetting = db
    .prepare("SELECT value FROM website_settings WHERE key = 'agent_phone'")
    .get() as { value?: string } | undefined;
  const targetWa = (whatsappSetting?.value || '').trim() || (phoneSetting?.value || '').trim();
  const assistanceWhatsappUrl = targetWa
    ? buildWhatsAppUrl(
        targetWa,
        `Hello NN Market Rwanda, my joining inquiry reference is ${referenceCode}. Name: ${nameCheck.cleaned}. I would like guidance on joining N-Nutrition.`
      )
    : null;

  res.status(201).json({
    ok: true,
    referenceCode,
    referralUrl,
    assistanceWhatsappUrl,
    externalNotice: true,
  });
});

publicRouter.post('/joining-applications/:referenceCode/referral-click', (req: Request, res: Response) => {
  const db = getDb();
  const ref = sanitizePlainText(String(req.params.referenceCode || ''), 40);
  if (!ref) {
    res.status(400).json({ ok: false });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE joining_applications
     SET referral_clicked = 1,
         updated_at = ?
     WHERE reference_code = ?`
  ).run(now, ref);
  res.json({ ok: true });
});

const viewLimiter = new SlidingWindowRateLimiter(120, 5 * 60 * 1000);

publicRouter.post('/analytics/view', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = viewLimiter.check(`view:${ip}`);
  if (!rate.allowed) {
    res.status(204).end();
    return;
  }

  const body = req.body || {};
  const eventType = body.eventType === 'product_view' ? 'product_view' : 'page_view';
  const cleanPath = sanitizePlainText(String(body.path || '/'), 200) || '/';
  const productSlug = sanitizePlainText(String(body.productSlug || ''), 120);

  if (cleanPath.startsWith('/admin')) {
    res.status(204).end();
    return;
  }

  const db = getDb();
  let productId: string | null = null;
  if (eventType === 'product_view' && productSlug) {
    const prod = db
      .prepare('SELECT id FROM products WHERE slug = ? AND is_published = 1 AND is_archived = 0')
      .get(productSlug) as { id: string } | undefined;
    if (prod) {
      productId = prod.id;
    }
  }

  db.prepare(
    'INSERT INTO analytics_events (id, event_type, path, product_id, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), eventType, cleanPath, productId, new Date().toISOString());

  res.status(204).end();
});

export default publicRouter;
