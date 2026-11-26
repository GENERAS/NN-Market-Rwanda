import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  SEED_CATEGORIES,
  SEED_CONTENT_BLOCKS,
  SEED_FAQS,
  SEED_PRODUCTS,
  SEED_PUBLIC_SETTINGS,
} from '../shared/catalogSeed';

let dbInstance: DatabaseSync | null = null;

function resolveDbPath(): string {
  if (process.env.NN_DB_PATH) {
    return process.env.NN_DB_PATH;
  }

  const preferred = process.env.VERCEL
    ? path.join(os.tmpdir(), 'nn_market.db')
    : path.resolve(process.cwd(), 'data', 'nn_market.db');

  try {
    fs.mkdirSync(path.dirname(preferred), { recursive: true });
    fs.accessSync(path.dirname(preferred), fs.constants.W_OK);
    return preferred;
  } catch {
    const tmpFallback = path.join(os.tmpdir(), 'nn_market.db');
    fs.mkdirSync(path.dirname(tmpFallback), { recursive: true });
    return tmpFallback;
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = resolveDbPath();
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  initializeSchema(db);
  seedInitialData(db);

  dbInstance = db;
  return db;
}

export function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      phone_normalized TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES admin_roles(id)
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_rw TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description_en TEXT NOT NULL DEFAULT '',
      description_rw TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_rw TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      short_description_en TEXT NOT NULL,
      short_description_rw TEXT NOT NULL,
      full_description_en TEXT NOT NULL,
      full_description_rw TEXT NOT NULL,
      main_image TEXT NOT NULL DEFAULT '',
      price_rwf REAL,
      currency TEXT NOT NULL DEFAULT 'RWF',
      quantity_label TEXT NOT NULL DEFAULT '',
      ingredients_en TEXT NOT NULL DEFAULT '',
      ingredients_rw TEXT NOT NULL DEFAULT '',
      manufacturer_info TEXT NOT NULL DEFAULT '',
      classification TEXT NOT NULL DEFAULT 'nutritional_supplement',
      availability_status TEXT NOT NULL DEFAULT 'awaiting_confirmation',
      verification_status TEXT NOT NULL DEFAULT 'awaiting_confirmation',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_requests (
      id TEXT PRIMARY KEY,
      reference_code TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      phone_normalized TEXT NOT NULL,
      phone_raw TEXT NOT NULL,
      product_id TEXT,
      product_name_snapshot TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      source_page TEXT NOT NULL DEFAULT '/',
      consent_processing INTEGER NOT NULL DEFAULT 0,
      consent_marketing INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'New',
      internal_notes TEXT NOT NULL DEFAULT '',
      ip_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS joining_applications (
      id TEXT PRIMARY KEY,
      reference_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      phone_normalized TEXT NOT NULL,
      phone_raw TEXT NOT NULL,
      question TEXT NOT NULL DEFAULT '',
      source_page TEXT NOT NULL DEFAULT '/join',
      consent_processing INTEGER NOT NULL DEFAULT 0,
      consent_marketing INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'New',
      referral_clicked INTEGER NOT NULL DEFAULT 0,
      internal_notes TEXT NOT NULL DEFAULT '',
      ip_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL DEFAULT 'general',
      product_id TEXT,
      question_en TEXT NOT NULL,
      question_rw TEXT NOT NULL,
      answer_en TEXT NOT NULL,
      answer_rw TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS website_content (
      key TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_rw TEXT NOT NULL,
      body_en TEXT NOT NULL,
      body_rw TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'verified',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      is_private INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      path TEXT NOT NULL,
      product_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published, is_archived);
    CREATE INDEX IF NOT EXISTS idx_requests_reference ON product_requests(reference_code);
    CREATE INDEX IF NOT EXISTS idx_requests_phone ON product_requests(phone_normalized);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON product_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_created ON product_requests(created_at);
    CREATE INDEX IF NOT EXISTS idx_joining_reference ON joining_applications(reference_code);
    CREATE INDEX IF NOT EXISTS idx_joining_phone ON joining_applications(phone_normalized);
    CREATE INDEX IF NOT EXISTS idx_joining_status ON joining_applications(status);
    CREATE INDEX IF NOT EXISTS idx_joining_created ON joining_applications(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
  `);

  const userCols = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (!userCols.some((col) => col.name === 'phone_normalized')) {
    db.exec("ALTER TABLE users ADD COLUMN phone_normalized TEXT NOT NULL DEFAULT ''");
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_normalized)');
}

function seedInitialData(db: DatabaseSync): void {
  const now = new Date().toISOString();

  // 1. Seed admin role
  const roleCount = db.prepare('SELECT COUNT(*) as cnt FROM admin_roles').get() as { cnt: number };
  if (roleCount.cnt === 0) {
    db.prepare('INSERT INTO admin_roles (id, name, description, created_at) VALUES (?, ?, ?, ?)').run(
      'role-admin',
      'admin',
      'Independent Marketing Agent Administrator',
      now
    );
  }

  // 2. Seed categories (idempotent upgrade for new categories via catalog_seed_version)
  const seedVersionRow = db
    .prepare("SELECT value FROM website_settings WHERE key = 'catalog_seed_version'")
    .get() as { value?: string } | undefined;
  const needsCatalogSeed = seedVersionRow?.value !== 'v2_18_products';

  const catCount = db.prepare('SELECT COUNT(*) as cnt FROM product_categories').get() as { cnt: number };
  if (catCount.cnt === 0 || needsCatalogSeed) {
    const insertCat = db.prepare(`
      INSERT OR IGNORE INTO product_categories (id, name_en, name_rw, slug, description_en, description_rw, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of SEED_CATEGORIES) {
      insertCat.run(
        c.id,
        c.name_en,
        c.name_rw,
        c.slug,
        c.description_en,
        c.description_rw,
        c.sort_order,
        c.is_active,
        now,
        now
      );
    }
  }

  // 3. Seed products (18 authentic N-Nutrition products + 1 unpublished draft item)
  const prodCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number };
  if (prodCount.cnt === 0 || needsCatalogSeed) {
    const insertProd = db.prepare(`
      INSERT OR IGNORE INTO products (
        id, category_id, name_en, name_rw, slug,
        short_description_en, short_description_rw,
        full_description_en, full_description_rw,
        main_image, price_rwf, currency, quantity_label,
        ingredients_en, ingredients_rw, manufacturer_info,
        classification, availability_status, verification_status,
        is_featured, is_published, is_archived,
        seo_title, seo_description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of SEED_PRODUCTS) {
      insertProd.run(
        p.id,
        p.category_id,
        p.name_en,
        p.name_rw,
        p.slug,
        p.short_description_en,
        p.short_description_rw,
        p.full_description_en,
        p.full_description_rw,
        p.main_image,
        p.price_rwf,
        p.currency,
        p.quantity_label,
        p.ingredients_en,
        p.ingredients_rw,
        p.manufacturer_info,
        p.classification,
        p.availability_status,
        p.verification_status,
        p.is_featured,
        p.is_published,
        p.is_archived,
        p.seo_title,
        p.seo_description,
        now,
        now
      );
    }

    // 1 unpublished draft product to ensure unpublished products stay hidden publicly
    insertProd.run(
      'prod-unpublished-draft',
      'cat-nutrition',
      'Internal Catalog Draft Item',
      'Igicuruzwa Kirimo Gutegurwa',
      'internal-catalog-draft',
      'Draft entry visible only in the admin dashboard.',
      'Iki gicuruzwa kigaragara mu buyobozi gusa.',
      'Unpublished draft item for catalog testing.',
      'Igicuruzwa kitaratangazwa.',
      '',
      null,
      'RWF',
      'Draft',
      '',
      '',
      '',
      'nutritional_supplement',
      'unavailable',
      'not_available',
      0,
      0,
      0,
      'Draft',
      'Draft',
      now,
      now
    );
  }

  // 4. Seed FAQs
  const faqCount = db.prepare('SELECT COUNT(*) as cnt FROM faqs').get() as { cnt: number };
  if (faqCount.cnt === 0) {
    const insertFaq = db.prepare(`
      INSERT INTO faqs (id, scope, product_id, question_en, question_rw, answer_en, answer_rw, sort_order, is_published, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of SEED_FAQS) {
      insertFaq.run(
        f.id,
        f.scope,
        f.question_en,
        f.question_rw,
        f.answer_en,
        f.answer_rw,
        f.sort_order,
        f.is_published,
        now,
        now
      );
    }
  }

  // 5. Seed editable website_content blocks
  const contentCount = db.prepare('SELECT COUNT(*) as cnt FROM website_content').get() as { cnt: number };
  if (contentCount.cnt === 0) {
    const insertContent = db.prepare(`
      INSERT INTO website_content (key, section, title_en, title_rw, body_en, body_rw, verification_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of SEED_CONTENT_BLOCKS) {
      insertContent.run(
        c.key,
        c.section,
        c.title_en,
        c.title_rw,
        c.body_en,
        c.body_rw,
        c.verification_status,
        now
      );
    }
  }

  // 6. Seed website_settings (strict public vs private split)
  const settingsCount = db.prepare('SELECT COUNT(*) as cnt FROM website_settings').get() as { cnt: number };
  if (settingsCount.cnt === 0) {
    const insertSetting = db.prepare(`
      INSERT INTO website_settings (key, value, is_private, updated_at) VALUES (?, ?, ?, ?)
    `);

    for (const [k, v] of Object.entries(SEED_PUBLIC_SETTINGS)) {
      if (k === 'has_referral_configured') continue;
      insertSetting.run(k, v, 0, now);
    }

    const privateSettings: Array<[string, string]> = [
      ['agent_phone', (process.env.AGENT_PHONE_NUMBER || '+250794144738').trim()],
      ['agent_whatsapp', (process.env.AGENT_WHATSAPP_NUMBER || '+250794144738').trim()],
      ['business_email', ''],
      ['n_nutrition_referral_url', (process.env.N_NUTRITION_REFERRAL_URL || '').trim()],
    ];

    for (const [k, v] of privateSettings) {
      insertSetting.run(k, v, 1, now);
    }
  }

  if (needsCatalogSeed) {
    db.prepare(
      `INSERT INTO website_settings (key, value, is_private, updated_at)
       VALUES ('catalog_seed_version', 'v2_18_products', 1, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_private = 1, updated_at = excluded.updated_at`
    ).run(now);
  }
}

export function writeAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {}
): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    crypto.randomUUID(),
    userId,
    action,
    entityType,
    entityId,
    JSON.stringify(details),
    new Date().toISOString()
  );
}
