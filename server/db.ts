import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.NN_DB_PATH || path.resolve(process.cwd(), 'data', 'nn_market.db');
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

  // 2. Seed categories
  const catCount = db.prepare('SELECT COUNT(*) as cnt FROM product_categories').get() as { cnt: number };
  if (catCount.cnt === 0) {
    const insertCat = db.prepare(`
      INSERT INTO product_categories (id, name_en, name_rw, slug, description_en, description_rw, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    insertCat.run(
      'cat-nutrition',
      'Daily Nutrition',
      'Imirire ya Buri Munsi',
      'nutrition',
      'Nutritional formulas intended to complement balanced daily meals.',
      'Ibiribwa nyunganiramubiri bifasha kuzuza indyo ya buri munsi.',
      1,
      now,
      now
    );
    insertCat.run(
      'cat-digestive',
      'Digestive Wellness',
      'Ubuzima bw’Igogora',
      'digestive-wellness',
      'Botanical and wellness formulas focused on gentle digestive comfort.',
      'Ibinyobwa n’inyunganiramubiri bifasha mu igogora rinoze.',
      2,
      now,
      now
    );
    insertCat.run(
      'cat-infusions',
      'Herbal Infusions',
      'Icyayi cy’Ibimera',
      'herbal-infusions',
      'Natural herbal teas and botanical infusions for daily routines.',
      'Icyayi cy’ibimera karemano cyifashishwa mu mibereho ya buri munsi.',
      3,
      now,
      now
    );
  }

  // 3. Seed starter products (marked awaiting_confirmation until agent verifies exact corporate prices/ingredients)
  const prodCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number };
  if (prodCount.cnt === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (
        id, category_id, name_en, name_rw, slug,
        short_description_en, short_description_rw,
        full_description_en, full_description_rw,
        main_image, price_rwf, currency, quantity_label,
        ingredients_en, ingredients_rw, manufacturer_info,
        classification, availability_status, verification_status,
        is_featured, is_published, is_archived,
        seo_title, seo_description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RWF', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `);

    insertProd.run(
      'prod-liver-support',
      'cat-nutrition',
      'Liver Support Formula',
      'Inyunganiramubiri ya Liver Support',
      'liver-support',
      'Nutritional supplement designed to support general daily liver wellness alongside a balanced diet.',
      'Inyunganiramubiri yagenewe gufasha mu mibereho myiza y’umwijima hamwe n’indyo yuzuye.',
      'Liver Support Formula is categorized as a nutritional supplement. Before requesting or using any supplement, review product specifications directly with our independent marketing agent and consult a qualified healthcare professional if you have existing health conditions or take prescription medication.',
      'Liver Support Formula ni inyunganiramubiri. Mbere yo gusaba cyangwa gukoresha inyunganiramubiri iyariyo yose, banza uvugane n’uhagarariye NN Market Rwanda kugira ngo wemeze ibisobanuro nyabyo, kandi ugishe inama muganga igihe ufite ikibazo cy’ubuzima cyangwa ufata indi miti.',
      '/src/assets/images/product_liver_support_1795377557144.jpg',
      null,
      'Bottle (count confirmed upon verification)',
      'Awaiting official label verification by agent.',
      'Ibikubiyemo biracyemezwa hakurikijwe inyandiko zemewe.',
      'N-Nutrition (Verified distributor packaging details confirmed on request)',
      'nutritional_supplement',
      'awaiting_confirmation',
      'awaiting_confirmation',
      1,
      1,
      'Liver Support Formula in Rwanda | NN Market Rwanda',
      'Learn about Liver Support Formula, review product classification, and submit a quick request through an independent N-Nutrition marketing agent in Rwanda.',
      now,
      now
    );

    insertProd.run(
      'prod-colon-cleanse',
      'cat-digestive',
      'Colon Cleanse Formula',
      'Inyunganiramubiri ya Colon Cleanse',
      'colon-cleanse',
      'Botanical wellness supplement formulated to complement healthy hydration and fiber-rich daily habits.',
      'Inyunganiramubiri ishingiye ku bimera ifasha mu kugira ubuzima bwiza bw’igogora hamwe no kunywa amazi ahagije.',
      'Colon Cleanse Formula is offered as a wellness supplement. It is not a medicine and does not diagnose, treat, cure, or prevent any disease. Submit a request below to confirm current Rwanda availability, packaging size, and verified pricing.',
      'Colon Cleanse Formula ni inyunganiramubiri y’ubuzima bwiza. Si umuti kandi ntisimbura ubuvuzi bwa muganga. Ohereza ubusabe kugira ngo umenye niba iboneka mu Rwanda, ingano yayo n’igiciro cyemejwe.',
      '/src/assets/images/product_colon_cleanse_1795377559292.jpg',
      null,
      'Jar (count confirmed upon verification)',
      'Awaiting official label verification by agent.',
      'Ibikubiyemo biracyemezwa hakurikijwe inyandiko zemewe.',
      'N-Nutrition (Packaging details confirmed on request)',
      'wellness_product',
      'awaiting_confirmation',
      'awaiting_confirmation',
      1,
      1,
      'Colon Cleanse Formula in Rwanda | NN Market Rwanda',
      'Discover Colon Cleanse Formula details, availability status, and request direct guidance from an independent N-Nutrition marketing agent in Rwanda.',
      now,
      now
    );

    insertProd.run(
      'prod-daily-wellness-blend',
      'cat-nutrition',
      'Daily Wellness Nutrition Blend',
      'Ifu y’Imirire ya Daily Wellness',
      'daily-wellness-blend',
      'Everyday nutritional powder blend intended to support balanced daily nourishment.',
      'Ifu y’imirire ya buri munsi yunganira indyo yuzuye ku bantu bakuru.',
      'Daily Wellness Nutrition Blend is classified as a food and nutrition product. Exact serving size, ingredient list, and current price in RWF can be verified directly by the agent upon request or updated in the admin dashboard.',
      'Daily Wellness Nutrition Blend ni igicuruzwa cy’imirire. Ingano y’ifunguro, ibikigize n’igiciro mu mafaranga y’u Rwanda byemezwa n’uhagarariye ibicuruzwa igihe cy’ubusabe.',
      '/src/assets/images/product_daily_nutrition_1795377558621.jpg',
      null,
      'Canister (weight confirmed upon verification)',
      'Awaiting official label verification by agent.',
      'Ibikubiyemo biracyemezwa hakurikijwe inyandiko zemewe.',
      'N-Nutrition (Packaging details confirmed on request)',
      'food_product',
      'awaiting_confirmation',
      'awaiting_confirmation',
      1,
      1,
      'Daily Wellness Nutrition Blend in Rwanda | NN Market Rwanda',
      'Explore Daily Wellness Nutrition Blend and request verified pricing and delivery details in Rwanda via NN Market Rwanda.',
      now,
      now
    );

    insertProd.run(
      'prod-herbal-digestive-tea',
      'cat-infusions',
      'Botanical Digestive Tea',
      'Icyayi cy’Ibimera cy’Igogora',
      'botanical-digestive-tea',
      'Caffeine-conscious botanical infusion crafted for calm morning or evening hydration routines.',
      'Icyayi cy’ibimera karemano cyifashishwa mu gitondo cyangwa nimugoroba.',
      'Botanical Digestive Tea is a herbal food product designed for everyday refreshment. No unverified medicinal claims are made. Request this product to confirm stock status and current pricing in Rwanda.',
      'Icyayi cy’ibimera ni igicuruzwa cy’ibiribwa cyifashishwa mu kunywa buri munsi. Ntikiri mu rwego rw’imiti. Ohereza ubusabe umenye ko gihari n’igiciro.',
      '/src/assets/images/product_herbal_tea_1795377558164.jpg',
      null,
      'Pouch (sachet count confirmed upon verification)',
      'Awaiting official label verification by agent.',
      'Ibikubiyemo biracyemezwa hakurikijwe inyandiko zemewe.',
      'N-Nutrition (Packaging details confirmed on request)',
      'food_product',
      'awaiting_confirmation',
      'awaiting_confirmation',
      0,
      1,
      'Botanical Digestive Tea in Rwanda | NN Market Rwanda',
      'Request Botanical Digestive Tea in Rwanda and receive personal confirmation from an independent N-Nutrition marketing agent.',
      now,
      now
    );

    // 1 unpublished draft product to prove unpublished products stay hidden publicly
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
      'Draft',
      '',
      '',
      '',
      'nutritional_supplement',
      'unavailable',
      'not_available',
      0,
      0,
      'Draft',
      'Draft',
      now,
      now
    );
  }

  // 4. Seed FAQs (Phase 11 AEO Questions in EN & RW)
  const faqCount = db.prepare('SELECT COUNT(*) as cnt FROM faqs').get() as { cnt: number };
  if (faqCount.cnt === 0) {
    const insertFaq = db.prepare(`
      INSERT INTO faqs (id, scope, product_id, question_en, question_rw, answer_en, answer_rw, sort_order, is_published, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const seedFaqs: Array<[string, string, string, string, string, string, number]> = [
      [
        'faq-1',
        'general',
        'What is NN Market Rwanda?',
        'NN Market Rwanda ni iki?',
        'NN Market Rwanda is an independently operated marketing and customer-assistance platform run by an independent N-Nutrition marketing agent in Rwanda. We help visitors explore available products, submit product requests, and understand the N-Nutrition joining process.',
        'NN Market Rwanda ni urubuga rwigenga rukorwa n’umufatanyabikorwa ushinzwe kwamamaza no gufasha abakiriya ba N-Nutrition mu Rwanda. Dufasha abashaka kumenya ibicuruzwa, kubisaba, no gusobanukirwa uko bakwinjira muri N-Nutrition.',
        1,
      ],
      [
        'faq-2',
        'general',
        'Is NN Market Rwanda the official N-Nutrition website?',
        'Ese NN Market Rwanda ni rwo rubuga rwa kompanyi ya N-Nutrition nyirizina?',
        'No. NN Market Rwanda is NOT the official corporate website of N-Nutrition & Market. It is operated independently by a marketing agent to provide product guidance, local customer support, and referral assistance.',
        'Oya. NN Market Rwanda SI urubuga rwemewe rwa kompanyi ya N-Nutrition & Market. Ni urubuga rwigenga rukorwa n’uhagarariye ibikorwa byo kwamamaza no gufasha abakiriya mu Rwanda.',
        2,
      ],
      [
        'faq-3',
        'general',
        'What products can I request on this platform?',
        'Ni ibihe bicuruzwa nshobora gusaba kuri uru rubuga?',
        'You can browse our verified catalogue of nutrition, digestive wellness, and herbal infusion products. Each product page lists its classification, availability status, and a direct button to submit a request.',
        'Ushobora kureba ibicuruzwa by’imirire, ubuzima bw’igogora n’ibyayi by’ibimera biri ku rubuga. Buri gicuruzwa kigaragaza ubwoko bwacyo, niba kiboneka, hamwe n’aho usabira ubufasha.',
        3,
      ],
      [
        'faq-4',
        'general',
        'How can I request an N-Nutrition product?',
        'Nasaba nte igicuruzwa cya N-Nutrition?',
        'Open the product you are interested in and click "Request This Product", or open the general Request page. Enter your name and Rwandan phone number and submit. Once your request is saved with a reference code, you will receive the authorized WhatsApp option to continue the conversation.',
        'Fungura igicuruzwa wifuza ukande "Saba Iki Gicuruzwa", cyangwa ujye ahanditse Gusaba. Shyiramo amazina yawe na nimero ya telefone yo mu Rwanda. Ubusabe bwawe nibumara kwandikwa uhabwa nimero ya referansi, uhita ubona uburyo bwo gukomereza kuri WhatsApp.',
        4,
      ],
      [
        'faq-5',
        'joining',
        'How do I join N-Nutrition in Rwanda?',
        'Nakwinjira nte muri N-Nutrition mu Rwanda?',
        'Read the opportunity overview and requirements on our Join N-Nutrition page, then submit your name and phone number in the short interest form. After your interest is recorded, you can proceed via the configured referral link or speak with our agent for guidance.',
        'Soma ibisobanuro n’ibisabwa ku rupapuro rwo Kwinjira muri N-Nutrition, hanyuma wohereze amazina yawe na nimero ya telefone. Ibyo nibimara kubikwa, uzahabwa inzira yo gukomeza ukoresheje umurongo w’uhagarariye ibikorwa cyangwa uhabwe ubufasha.',
        5,
      ],
      [
        'faq-6',
        'joining',
        'What are the joining requirements?',
        'Ni ibiki bisabwa kugira ngo winjire?',
        'Exact corporate eligibility requirements are maintained in our Joining Requirements section and marked clearly as either verified or awaiting confirmation. Never rely on unofficial promises—review the current confirmed checklist on the Requirements page.',
        'Ibisabwa byemewe n’ikigo bigaragara ku rupapuro rw’Ibisabwa mu Kwinjira kandi bigaragaza ibyamaze kwemezwa n’ibigitegereje kwemezwa.',
        6,
      ],
      [
        'faq-7',
        'joining',
        'Is there a joining fee?',
        'Hari amafaranga asabwa kugira ngo umuntu yinjire?',
        'Current registration or starter package costs are published only when verified from authorized N-Nutrition documentation. If the fee status is marked "Awaiting confirmation" in the Joining Costs section, please submit your interest so the agent can share current official figures.',
        'Amafaranga yo kwiyandikisha cyangwa y’intangiriro atangazwa gusa igihe yamaze kwemezwa hakurikijwe amabwiriza y’ikigo. Niba handitse ko bigitegereje kwemezwa, ohereza ubusabe bwawe uhabwe ibisobanuro byuzuye.',
        7,
      ],
      [
        'faq-8',
        'joining',
        'How does the referral process work?',
        'Uburyo bwo kwiyandikisha ukoresheje umurongo w’uhagarariye ibikorwa bukora bute?',
        'After you submit your joining interest form, our platform records your reference number and presents the authorized referral link (when configured). Clicking "Continue to N-Nutrition" opens the external company registration process. Submitting this form does not automatically make you a distributor.',
        'Nyuma yo kohereza ubusabe bwo kwinjira, urubuga rubika nimero yawe ya referansi rukakwereka umurongo w’ubufasha (igihe wuzujwe). Gukanda "Komeza kuri N-Nutrition" bijyana ku rubuga rwo hanze rwo kwiyandikisha. Kohereza iyi fomu ntibivuze ko uhise uba umucuruzi wemewe.',
        8,
      ],
      [
        'faq-9',
        'general',
        'How can I contact the marketing agent?',
        'Navugana nte n’uhagarariye NN Market Rwanda?',
        'To protect customer privacy and prevent spam, direct WhatsApp and phone contact details are unlocked immediately after you submit a product request or joining interest form with your name and phone number.',
        'Mu rwego rwo kurinda amakuru no kwirinda ubutumwa budafite gahunda, nimero ya WhatsApp n’iya telefone zifunguka ako kanya umaze kohereza ubusabe bw’igicuruzwa cyangwa ubwo kwinjira.',
        9,
      ],
    ];

    for (const row of seedFaqs) {
      insertFaq.run(row[0], row[1], row[2], row[3], row[4], row[5], row[6], now, now);
    }
  }

  // 5. Seed editable website_content blocks
  const contentCount = db.prepare('SELECT COUNT(*) as cnt FROM website_content').get() as { cnt: number };
  if (contentCount.cnt === 0) {
    const insertContent = db.prepare(`
      INSERT INTO website_content (key, section, title_en, title_rw, body_en, body_rw, verification_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const contentBlocks: Array<[string, string, string, string, string, string, string]> = [
      [
        'hero',
        'homepage',
        'Discover N-Nutrition Products. Find Your Next Opportunity.',
        'Menya Ibicuruzwa bya N-Nutrition. Tangira Amahirwe Mashya.',
        'Explore available nutrition and wellness products, request what you need, and discover how to join the N-Nutrition business network with assistance from an independent marketing agent.',
        'Reba ibicuruzwa by’imirire n’ubuzima bwiza biboneka, usabe ibyo ukeneye mu buryo bworoshye, kandi usobanukirwe uko wakwinjira mu muryango wa N-Nutrition ufashijwe n’uhagarariye ibikorwa wigenga.',
        'verified',
      ],
      [
        'disclosure',
        'legal',
        'Independent Platform Notice',
        'Itangazo ry’Urubuga Rwigenga',
        'NN Market Rwanda is an independently operated marketing and customer-assistance platform run by an N-Nutrition marketing agent. We help customers discover products, submit product requests and learn about joining opportunities through referral assistance. We are not the official corporate website of N-Nutrition & Market.',
        'NN Market Rwanda ni urubuga rwigenga rukorwa n’uhagarariye ibikorwa byo kwamamaza no gufasha abakiriya ba N-Nutrition. Dufasha abakiriya kumenya ibicuruzwa, kubisaba, no gusobanukirwa amahirwe yo kwinjira binyuze mu bufasha bw’uwabigize umwuga. Ntabwo turi urubuga rwemewe rwa kompanyi ya N-Nutrition & Market.',
        'verified',
      ],
      [
        'about_story',
        'about',
        'Personal Guidance for Rwanda Customers',
        'Ubufasha Bwegereye Abakiriya mu Rwanda',
        'Finding genuine wellness information online can feel confusing. NN Market Rwanda exists to make the process clear and personal: browse verified product summaries in English or Kinyarwanda, submit a short request with your phone number, and speak directly with a real agent in Rwanda who can confirm current availability, RWF pricing, and next steps.',
        'Kubona amakuru y’ukuri ku bijyanye n’ibicuruzwa by’ubuzima akenshi biragora. NN Market Rwanda yashyiriweho kugira ngo ibyoroshye: usoma amakuru y’ibicuruzwa mu Cyongereza cyangwa Ikinyarwanda, wohereza ubusabe bugufi ukoresheje nimero yawe ya telefone, maze ukavugana n’uhagarariye ibikorwa mu Rwanda ukwemeza niba biboneka n’igiciro mu mafaranga y’u Rwanda.',
        'verified',
      ],
      [
        'joining_opportunity',
        'joining',
        'About the N-Nutrition Distributor Opportunity',
        'Ibyerekeye Amahirwe yo Kuba Umufatanyabikorwa wa N-Nutrition',
        'Independent N-Nutrition distributors introduce nutrition and wellness products to customers and help onboard new members through an authorized referral process. Earnings and progression depend strictly on official company policies and personal effort—no guaranteed income claims are made here.',
        'Abafatanyabikorwa bigenga ba N-Nutrition bamenyekanisha ibicuruzwa by’imirire n’ubuzima bwiza ku bakiriya kandi bagafasha abashya kwiyandikisha binyuze mu murongo wemewe. Inyungu zishingira ku mabwiriza y’ikigo no ku muhate wa buri muntu—nta nyungu z’ibinyoma twizeza.',
        'verified',
      ],
      [
        'joining_activities',
        'joining',
        'What Distributors Actually Do',
        'Icyo Abafatanyabikorwa Bakora mu Kuri',
        'Distributors share accurate product information, help customers place product orders or requests, attend available product trainings, and guide interested individuals through official registration using their referral link.',
        'Abafatanyabikorwa basobanurira abakiriya ibicuruzwa mu kuri, bakabafasha kubibona, bakitabira amahugurwa aboneka, kandi bakayobora abashaka kwinjira bakoresheje umurongo wabo wo kwiyandikisha.',
        'verified',
      ],
      [
        'joining_requirements',
        'joining',
        'Joining Requirements',
        'Ibisabwa mu Kwinjira',
        '• Valid national identification or legal residency details (per official company onboarding).\n• Active Rwandan mobile phone number for communication and verification.\n• Confirmed sponsor/referral link during registration.\n• Additional corporate eligibility rules are subject to confirmation against current official N-Nutrition Rwanda documentation.',
        '• Irangamuntu cyangwa ibyangombwa byemewe byo gutura mu Rwanda.\n• Nimero ya telefone ikora mu Rwanda yo kuvuganaho no kwemeza amakuru.\n• Umurongo wemewe w’uguhagarariye mu kwiyandikisha.\n• Ibindi bisabwa na kompanyi byemezwa hakurikijwe amabwiriza mashya ya N-Nutrition Rwanda.',
        'awaiting_confirmation',
      ],
      [
        'joining_costs',
        'joining',
        'Joining Costs & Starter Packages',
        'Ikiguzi cyo Kwinjira n’Ibikoresho by’Intangiriro',
        'Official registration fees and starter kit prices in RWF are currently marked as awaiting verification by the platform administrator. Submit your joining interest below and our independent marketing agent will share confirmed, up-to-date corporate fee schedules before you commit.',
        'Amafaranga yemewe yo kwiyandikisha cyangwa ay’ibikoresho by’intangiriro mu mafaranga y’u Rwanda aracyari mu rwego rwo kwemezwa. Ohereza ubusabe bwawe kugira ngo uhabwe ibiciro nyabyo byemejwe mbere yo gufata icyemezo.',
        'awaiting_confirmation',
      ],
      [
        'joining_training',
        'joining',
        'Training & Onboarding Assistance',
        'Amahugurwa n’Ubufasha ku Batangira',
        'New members who register through our referral process receive basic product orientation and guidance on how to answer customer questions responsibly without making unverified medical claims.',
        'Abashya biyandikishije binyuze muri ubu bufasha bahabwa amakuru y’ibanze ku bicuruzwa n’uburyo bwo gufasha abakiriya mu buryo bunyuze mu kuri badasezeranya ibinyoma by’ubuvuzi.',
        'verified',
      ],
      [
        'joining_compensation',
        'joining',
        'Compensation Information',
        'Amakuru ku Bihembo n’Inyungu',
        'Official commission structures and qualification tiers are governed solely by N-Nutrition & Market corporate policy and are currently marked as awaiting official document verification here. We do not publish unverified income projections.',
        'Uburyo bwo kubara inyungu n’ibihembo bigengwa gusa n’amabwiriza ya kompanyi ya N-Nutrition & Market, kandi kuri uru rubuga biracyemezwa. Ntitujya dutangaza imibare y’inyungu itaremezwa.',
        'not_available',
      ],
      [
        'privacy_policy',
        'legal',
        'Privacy Policy & Data Protection',
        'Politiki y’Ibanga no Kurinda Amakuru',
        'NN Market Rwanda collects only the information you voluntarily provide (your name, Rwandan phone number, and optional inquiry notes) solely to respond to your product request or joining inquiry. Marketing updates are strictly opt-in via a separate consent checkbox. We do not sell, rent, or publicly display customer phone numbers. Data is retained only as long as needed for active customer assistance or legal compliance. You may request correction or deletion of your phone record at any time through our Contact page.',
        'NN Market Rwanda ifata gusa amakuru utanze ku bushake (amazina yawe, nimero ya telefone yo mu Rwanda, n’ubutumwa wongeraho) kugira ngo igufashe ku busabe bw’igicuruzwa cyangwa ubwo kwinjira. Amakuru yo kwamamaza atangwa gusa iyo wabyemeye ukoresheje akazu kabugenewe. Ntitugurisha cyangwa ngo dutangaze nimero z’abakiriya. Ushobora gusaba ko amakuru yawe akosorwa cyangwa asibwa igihe icyo aricyo cyose unyuze ku rupapuro rw’Ubufasha.',
        'verified',
      ],
      [
        'terms_conditions',
        'legal',
        'Terms & Conditions of Use',
        'Amabwiriza n’Ibisabwa mu Gukoresha Urubuga',
        'NN Market Rwanda is an independent marketing agent platform and not the official corporate portal of N-Nutrition & Market. Product descriptions and nutritional information provided here are for general informational purposes only and do not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider regarding medical conditions. Submitting a product request or joining interest form records an inquiry and does not constitute a binding purchase contract or distributor appointment.',
        'NN Market Rwanda ni urubuga rwigenga rw’uhagarariye ibikorwa byo kwamamaza kandi si urubuga rwa kompanyi ya N-Nutrition & Market. Amakuru y’ibicuruzwa atangwa hano agamije gusobanurira abasomyi gusa kandi ntasimbura inama z’abaganga. Kohereza ubusabe bw’igicuruzwa cyangwa ubwo kwinjira bisobanura gusaba ubufasha; ntibisobanura amasezerano y’ubugure cyangwa kwemererwa kuba umufatanyabikorwa ako kanya.',
        'verified',
      ],
    ];

    for (const c of contentBlocks) {
      insertContent.run(c[0], c[1], c[2], c[3], c[4], c[5], c[6], now);
    }
  }

  // 6. Seed website_settings (strict public vs private split)
  const settingsCount = db.prepare('SELECT COUNT(*) as cnt FROM website_settings').get() as { cnt: number };
  if (settingsCount.cnt === 0) {
    const insertSetting = db.prepare(`
      INSERT INTO website_settings (key, value, is_private, updated_at) VALUES (?, ?, ?, ?)
    `);

    const publicSettings: Array<[string, string]> = [
      ['site_name', 'NN Market Rwanda'],
      ['logo_url', ''],
      ['agent_display_name', 'Independent N-Nutrition Marketing Agent — Rwanda'],
      ['currency', 'RWF'],
      ['default_language', 'en'],
      ['seo_default_title', 'NN Market Rwanda — N-Nutrition Products & Referral Assistance'],
      [
        'seo_default_description',
        'Discover available N-Nutrition products in Rwanda, submit product requests, and learn about joining requirements with assistance from an independent marketing agent.',
      ],
      ['social_facebook', ''],
      ['social_instagram', ''],
      ['request_success_title_en', 'Your request has been received!'],
      ['request_success_title_rw', 'Ubusabe bwawe bwakiriwe!'],
      [
        'request_success_body_en',
        'Thank you for your interest. Your request has been recorded. You can now continue to WhatsApp for assistance.',
      ],
      [
        'request_success_body_rw',
        'Murakoze kutugirira icyizere. Ubusabe bwawe bwabitswe neza. Ubu ushobora gukomereza kuri WhatsApp kugira ngo uhabwe ubufasha.',
      ],
      ['join_success_title_en', 'Your interest has been recorded!'],
      ['join_success_title_rw', 'Ubusabe bwo kwinjira bwabitswe!'],
      [
        'join_success_body_en',
        'Thank you for your interest in joining N-Nutrition. Follow the next step below to continue the registration process.',
      ],
      [
        'join_success_body_rw',
        'Murakoze kugaragaza ubushake bwo kwinjira muri N-Nutrition. Kurikiza intambwe ikurikira hepfo kugira ngo ukomeze kwiyandikisha.',
      ],
    ];

    for (const [k, v] of publicSettings) {
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
