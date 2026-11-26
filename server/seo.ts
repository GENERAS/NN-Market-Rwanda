import { Request, Response } from 'express';
import { getDb } from './db';

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export function handleRobotsTxt(req: Request, res: Response): void {
  const baseUrl = getBaseUrl(req);
  const content = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /request/confirmed',
    'Disallow: /join/confirmed',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
  res.type('text/plain').send(content);
}

export function handleSitemapXml(req: Request, res: Response): void {
  const db = getDb();
  const baseUrl = getBaseUrl(req);
  const today = new Date().toISOString().split('T')[0];

  const staticPaths = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/products', priority: '0.9', changefreq: 'daily' },
    { path: '/join', priority: '0.9', changefreq: 'weekly' },
    { path: '/join/requirements', priority: '0.8', changefreq: 'monthly' },
    { path: '/join/how-it-works', priority: '0.8', changefreq: 'monthly' },
    { path: '/faq', priority: '0.7', changefreq: 'monthly' },
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
    { path: '/privacy-policy', priority: '0.4', changefreq: 'yearly' },
    { path: '/terms', priority: '0.4', changefreq: 'yearly' },
  ];

  const categories = db
    .prepare('SELECT slug, updated_at FROM product_categories WHERE is_active = 1')
    .all() as Array<{ slug: string; updated_at: string }>;

  const products = db
    .prepare('SELECT slug, updated_at FROM products WHERE is_published = 1 AND is_archived = 0')
    .all() as Array<{ slug: string; updated_at: string }>;

  const urls: string[] = [];

  for (const item of staticPaths) {
    urls.push(
      `  <url>\n    <loc>${escapeXml(baseUrl + item.path)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`
    );
  }

  for (const cat of categories) {
    const lastmod = (cat.updated_at || today).split('T')[0];
    urls.push(
      `  <url>\n    <loc>${escapeXml(`${baseUrl}/categories/${cat.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }

  for (const prod of products) {
    const lastmod = (prod.updated_at || today).split('T')[0];
    urls.push(
      `  <url>\n    <loc>${escapeXml(`${baseUrl}/products/${prod.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
}

export function injectSeoHtml(html: string, reqPath: string, baseUrl: string): string {
  const db = getDb();
  const cleanPath = reqPath.split('?')[0] || '/';
  const canonicalUrl = `${baseUrl}${cleanPath}`;

  let title = 'NN Market Rwanda — N-Nutrition Products & Referral Assistance';
  let description =
    'Discover available N-Nutrition nutrition and wellness products in Rwanda, submit a request, and learn how to join through an independent marketing agent.';
  let robotsMeta = 'index, follow';

  const jsonLdObjects: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'NN Market Rwanda',
      url: baseUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'NN Market Rwanda',
      description:
        'Independent N-Nutrition product marketing, customer assistance, and referral guidance platform in Rwanda.',
      url: baseUrl,
    },
  ];

  if (cleanPath.startsWith('/admin') || cleanPath === '/request/confirmed' || cleanPath === '/join/confirmed') {
    robotsMeta = 'noindex, nofollow';
  }

  if (cleanPath.startsWith('/products/')) {
    const slug = cleanPath.replace('/products/', '').trim();
    const product = db
      .prepare(
        `SELECT p.*, c.name_en as category_name_en, c.slug as category_slug
         FROM products p
         JOIN product_categories c ON p.category_id = c.id
         WHERE p.slug = ? AND p.is_published = 1 AND p.is_archived = 0`
      )
      .get(slug) as
      | {
          name_en: string;
          slug: string;
          short_description_en: string;
          seo_title: string;
          seo_description: string;
          price_rwf: number | null;
          currency: string;
          availability_status: string;
          main_image: string;
          category_name_en: string;
          category_slug: string;
        }
      | undefined;

    if (product) {
      title = product.seo_title || `${product.name_en} | NN Market Rwanda`;
      description = product.seo_description || product.short_description_en;

      const productSchema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name_en,
        description: product.short_description_en,
        category: product.category_name_en,
        url: canonicalUrl,
      };
      if (product.main_image) {
        productSchema.image = product.main_image.startsWith('http')
          ? product.main_image
          : `${baseUrl}${product.main_image}`;
      }
      if (product.price_rwf !== null && product.price_rwf !== undefined) {
        productSchema.offers = {
          '@type': 'Offer',
          price: String(product.price_rwf),
          priceCurrency: product.currency || 'RWF',
          availability:
            product.availability_status === 'available'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/PreOrder',
          url: canonicalUrl,
        };
      }
      jsonLdObjects.push(productSchema);
      jsonLdObjects.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Products', item: `${baseUrl}/products` },
          { '@type': 'ListItem', position: 3, name: product.name_en, item: canonicalUrl },
        ],
      });
    }
  } else if (cleanPath === '/products') {
    title = 'N-Nutrition Products in Rwanda | NN Market Rwanda';
    description =
      'Browse available N-Nutrition nutrition, digestive wellness, and herbal infusion products in Rwanda and request direct assistance.';
  } else if (cleanPath.startsWith('/categories/')) {
    const catSlug = cleanPath.replace('/categories/', '').trim();
    const cat = db
      .prepare('SELECT name_en, description_en FROM product_categories WHERE slug = ? AND is_active = 1')
      .get(catSlug) as { name_en: string; description_en: string } | undefined;
    if (cat) {
      title = `${cat.name_en} — N-Nutrition Products | NN Market Rwanda`;
      description = cat.description_en || description;
    }
  } else if (cleanPath === '/join') {
    title = 'Join N-Nutrition in Rwanda — Requirements & Referral Guide | NN Market Rwanda';
    description =
      'Learn how joining N-Nutrition works in Rwanda, review requirements and costs, and submit your joining interest for guided referral assistance.';
  } else if (cleanPath === '/join/requirements') {
    title = 'N-Nutrition Distributor Joining Requirements | NN Market Rwanda';
    description =
      'Clear checklist of verified and pending N-Nutrition distributor requirements and onboarding costs in Rwanda.';
  } else if (cleanPath === '/join/how-it-works') {
    title = 'How Joining N-Nutrition Works | NN Market Rwanda';
    description =
      'Step-by-step guide to learning about N-Nutrition, recording your joining interest, and continuing via an authorized referral link.';
  } else if (cleanPath === '/faq') {
    title = 'Frequently Asked Questions | NN Market Rwanda';
    const faqs = db
      .prepare('SELECT question_en, answer_en FROM faqs WHERE is_published = 1 AND product_id IS NULL ORDER BY sort_order ASC')
      .all() as Array<{ question_en: string; answer_en: string }>;
    if (faqs.length > 0) {
      jsonLdObjects.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question_en,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer_en,
          },
        })),
      });
    }
  } else if (cleanPath === '/about') {
    title = 'About NN Market Rwanda — Independent Marketing Platform';
  }

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtmlAttr(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`
    );

  const extraHead = `
    <link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />
    <meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />
    <meta name="robots" content="${robotsMeta}" />
    <script type="application/ld+json">${JSON.stringify(jsonLdObjects)}</script>
  `;

  out = out.replace('</head>', `${extraHead}\n  </head>`);
  return out;
}
