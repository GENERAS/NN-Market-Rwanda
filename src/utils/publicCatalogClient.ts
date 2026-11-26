import {
  SEED_CATEGORIES,
  SEED_CONTENT_BLOCKS,
  SEED_FAQS,
  SEED_PRODUCTS,
  SEED_PUBLIC_SETTINGS,
} from '../../shared/catalogSeed';
import type { Category, ContentBlock, Faq, Product, PublicBootstrap } from '../types';

export interface PublicProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicProductDetailResponse {
  product: Product;
  images: Array<{ id: string; product_id: string; image_url: string; alt_text: string; sort_order: number }>;
  faqs: Faq[];
  relatedProducts: Product[];
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.toLowerCase().includes('application/json');
}

export function buildFallbackBootstrap(): PublicBootstrap {
  const categories: Category[] = SEED_CATEGORIES.map((cat) => ({
    ...cat,
    product_count: SEED_PRODUCTS.filter((p) => p.category_id === cat.id && p.is_published === 1 && p.is_archived === 0).length,
  }));

  const content: Record<string, ContentBlock> = {};
  for (const block of SEED_CONTENT_BLOCKS) {
    content[block.key] = block;
  }

  return {
    settings: { ...SEED_PUBLIC_SETTINGS },
    categories,
    content,
    faqs: SEED_FAQS.filter((f) => f.is_published === 1 && !f.product_id),
    featuredProducts: SEED_PRODUCTS.filter((p) => p.is_published === 1 && p.is_archived === 0 && p.is_featured === 1).slice(0, 6),
  };
}

export function queryFallbackProducts(options: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): PublicProductsResponse {
  const q = (options.q || '').trim().toLowerCase();
  const category = (options.category || 'all').trim();
  const sort = options.sort || 'featured';
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(24, Math.max(1, options.limit || 12));

  let filtered = SEED_PRODUCTS.filter((p) => p.is_published === 1 && p.is_archived === 0);

  if (category && category !== 'all') {
    filtered = filtered.filter((p) => p.category_slug === category);
  }

  if (q) {
    filtered = filtered.filter((p) => {
      const hay = [
        p.name_en,
        p.name_rw,
        p.short_description_en,
        p.short_description_rw,
        p.full_description_en,
        p.category_name_en || '',
        p.classification,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'price_asc') {
      if (a.price_rwf === null && b.price_rwf !== null) return 1;
      if (a.price_rwf !== null && b.price_rwf === null) return -1;
      if (a.price_rwf !== null && b.price_rwf !== null && a.price_rwf !== b.price_rwf) {
        return a.price_rwf - b.price_rwf;
      }
      return a.name_en.localeCompare(b.name_en);
    }
    if (sort === 'price_desc') {
      if (a.price_rwf === null && b.price_rwf !== null) return 1;
      if (a.price_rwf !== null && b.price_rwf === null) return -1;
      if (a.price_rwf !== null && b.price_rwf !== null && a.price_rwf !== b.price_rwf) {
        return b.price_rwf - a.price_rwf;
      }
      return a.name_en.localeCompare(b.name_en);
    }
    if (sort === 'newest') {
      return b.created_at.localeCompare(a.created_at);
    }
    if (sort === 'name') {
      return a.name_en.localeCompare(b.name_en);
    }
    if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
    return a.name_en.localeCompare(b.name_en);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  return { items, total, page, limit, totalPages };
}

export function getFallbackProductDetail(slug: string): PublicProductDetailResponse | null {
  const cleanSlug = (slug || '').trim();
  if (!cleanSlug) return null;

  const product = SEED_PRODUCTS.find(
    (p) => p.slug === cleanSlug && p.is_published === 1 && p.is_archived === 0
  );
  if (!product) return null;

  const relatedProducts = SEED_PRODUCTS.filter(
    (p) => p.id !== product.id && p.is_published === 1 && p.is_archived === 0
  )
    .sort((a, b) => {
      const aMatch = a.category_id === product.category_id ? 0 : 1;
      const bMatch = b.category_id === product.category_id ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return b.is_featured - a.is_featured;
    })
    .slice(0, 3);

  const faqs = SEED_FAQS.filter((f) => f.is_published === 1 && f.scope === 'general').slice(0, 6);

  return {
    product,
    images: [],
    faqs,
    relatedProducts,
  };
}

export async function fetchPublicBootstrap(): Promise<PublicBootstrap> {
  try {
    const res = await fetch('/api/public/bootstrap');
    if (res.ok && isJsonResponse(res)) {
      return (await res.json()) as PublicBootstrap;
    }
  } catch {
    // Fall back to static non-sensitive catalog seed when API server is unavailable
  }
  return buildFallbackBootstrap();
}

export async function fetchPublicProducts(options: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<PublicProductsResponse> {
  const params = new URLSearchParams({
    q: options.q || '',
    category: options.category || 'all',
    sort: options.sort || 'featured',
    page: String(options.page || 1),
    limit: String(options.limit || 12),
  });

  try {
    const res = await fetch(`/api/public/products?${params.toString()}`);
    if (res.ok && isJsonResponse(res)) {
      return (await res.json()) as PublicProductsResponse;
    }
  } catch {
    // Fall back to static non-sensitive catalog seed when API server is unavailable
  }
  return queryFallbackProducts(options);
}

export async function fetchPublicProductDetail(slug: string): Promise<PublicProductDetailResponse | null> {
  try {
    const res = await fetch(`/api/public/products/${encodeURIComponent(slug || '')}`);
    if (isJsonResponse(res)) {
      if (res.status === 404) return null;
      if (res.ok) {
        return (await res.json()) as PublicProductDetailResponse;
      }
    }
  } catch {
    // Fall back to static non-sensitive catalog seed when API server is unavailable
  }
  return getFallbackProductDetail(slug);
}
