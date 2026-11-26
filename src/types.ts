export type Language = 'en' | 'rw';

export interface Category {
  id: string;
  name_en: string;
  name_rw: string;
  slug: string;
  description_en: string;
  description_rw: string;
  sort_order: number;
  is_active: number;
  product_count?: number;
}

export interface Product {
  id: string;
  category_id: string;
  category_name_en?: string;
  category_name_rw?: string;
  category_slug?: string;
  name_en: string;
  name_rw: string;
  slug: string;
  short_description_en: string;
  short_description_rw: string;
  full_description_en: string;
  full_description_rw: string;
  main_image: string;
  price_rwf: number | null;
  currency: string;
  quantity_label: string;
  ingredients_en: string;
  ingredients_rw: string;
  manufacturer_info: string;
  classification: string;
  availability_status: string;
  verification_status: string;
  is_featured: number;
  is_published: number;
  is_archived: number;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

export interface Faq {
  id: string;
  scope: 'general' | 'joining' | 'product';
  product_id: string | null;
  question_en: string;
  question_rw: string;
  answer_en: string;
  answer_rw: string;
  sort_order: number;
  is_published: number;
}

export interface ContentBlock {
  key: string;
  section: string;
  title_en: string;
  title_rw: string;
  body_en: string;
  body_rw: string;
  verification_status: 'verified' | 'awaiting_confirmation' | 'not_available';
  updated_at: string;
}

export interface PublicBootstrap {
  settings: Record<string, string>;
  categories: Category[];
  content: Record<string, ContentBlock>;
  faqs: Faq[];
  featuredProducts: Product[];
}

export interface ProductRequestConfirmation {
  ok: true;
  referenceCode: string;
  productName: string;
  contactAuthorized: true;
  whatsappUrl: string | null;
  agentPhoneDisplay: string | null;
}

export interface JoiningConfirmation {
  ok: true;
  referenceCode: string;
  referralUrl: string | null;
  assistanceWhatsappUrl: string | null;
  externalNotice: true;
}
