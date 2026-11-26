import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Faq, Product } from '../types';
import { formatPriceRwf } from '../utils/validation';
import { ProductCard, ProductImage } from '../components/ProductCard';
import { ProductRequestForm } from '../components/ProductRequestForm';
import { SeoHead } from '../components/SeoHead';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useApp();
  const requestSectionRef = useRef<HTMLDivElement | null>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/public/products/${encodeURIComponent(slug || '')}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load product');
        const data = await res.json();
        if (!cancelled) {
          setProduct(data.product);
          setFaqs(data.faqs || []);
          setRelated(data.relatedProducts || []);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 rounded-lg bg-[#FBF7EF] animate-pulse border border-[#E9E7E1]" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <>
        <SeoHead title="Product Not Found | NN Market Rwanda" description="Requested product could not be found." noIndex />
        <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#252B25] mb-3">{t.productDetail.notFoundTitle}</h1>
          <p className="text-base text-[#647067] mb-6">{t.productDetail.notFoundBody}</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-md bg-[#26733E] text-white text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t.productDetail.backToCatalog}
          </Link>
        </div>
      </>
    );
  }

  const name = lang === 'rw' && product.name_rw ? product.name_rw : product.name_en;
  const shortDesc =
    lang === 'rw' && product.short_description_rw ? product.short_description_rw : product.short_description_en;
  const fullDesc =
    lang === 'rw' && product.full_description_rw ? product.full_description_rw : product.full_description_en;
  const ingredients =
    lang === 'rw' && product.ingredients_rw ? product.ingredients_rw : product.ingredients_en;
  const categoryName =
    lang === 'rw' && product.category_name_rw ? product.category_name_rw : product.category_name_en || '';

  const classMap = t.catalog.classification as Record<string, string>;
  const availMap = t.catalog.availability as Record<string, string>;
  const verifMap = t.catalog.verification as Record<string, string>;

  const scrollToForm = () => {
    requestSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const nameInput = document.getElementById('req-name');
    nameInput?.focus({ preventScroll: true });
  };

  return (
    <>
      <SeoHead
        title={product.seo_title || `${name} | NN Market Rwanda`}
        description={product.seo_description || shortDesc}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs text-[#647067] mb-6 flex flex-wrap items-center gap-2">
          <Link to="/" className="hover:text-[#26733E]">
            {t.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/products" className="hover:text-[#26733E]">
            {t.nav.products}
          </Link>
          {product.category_slug && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/categories/${product.category_slug}`} className="hover:text-[#26733E]">
                {categoryName}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-[#252B25] font-medium">{name}</span>
        </nav>

        {/* Contiguous Product Showcase + Request Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left: Product Image & Full Specs */}
          <div className="lg:col-span-7 space-y-8">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#FBF7EF] border border-[#E9E7E1]">
              <ProductImage src={product.main_image} alt={name} loading="eager" />
            </div>

            <div>
              <div className="text-xs font-medium text-[#A87936] mb-1.5">
                {categoryName} · {classMap[product.classification] || product.classification}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#252B25] mb-3">{name}</h1>
              <div className="text-xl font-bold text-[#26733E] tabular-nums mb-4">
                {formatPriceRwf(product.price_rwf, product.currency, lang)}
              </div>
              <p className="text-base text-[#252B25] leading-relaxed mb-4">{shortDesc}</p>
              <p className="text-sm sm:text-base text-[#647067] leading-relaxed whitespace-pre-line">{fullDesc}</p>

              <div className="mt-6 lg:hidden">
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="w-full min-h-[48px] px-6 py-3.5 text-base font-semibold text-white bg-[#26733E] hover:bg-[#1e5c31] rounded-md"
                >
                  {t.productDetail.requestButton}
                </button>
              </div>
            </div>

            {/* Specifications Table */}
            <section className="border-t border-[#E9E7E1] pt-6">
              <h2 className="text-lg font-semibold text-[#252B25] mb-4">{t.productDetail.specsTitle}</h2>
              <dl className="divide-y divide-[#E9E7E1] border border-[#E9E7E1] rounded-lg bg-white">
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                  <dt className="text-[#647067]">{t.productDetail.classificationLabel}</dt>
                  <dd className="font-medium text-[#252B25]">
                    {classMap[product.classification] || product.classification}
                  </dd>
                </div>
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                  <dt className="text-[#647067]">{t.productDetail.quantityLabel}</dt>
                  <dd className="font-medium text-[#252B25]">{product.quantity_label || '—'}</dd>
                </div>
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                  <dt className="text-[#647067]">{t.productDetail.availabilityLabel}</dt>
                  <dd className="font-medium text-[#26733E]">
                    {availMap[product.availability_status] || product.availability_status}
                  </dd>
                </div>
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                  <dt className="text-[#647067]">{t.productDetail.manufacturerLabel}</dt>
                  <dd className="font-medium text-[#252B25]">{product.manufacturer_info || '—'}</dd>
                </div>
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                  <dt className="text-[#647067]">{t.productDetail.verificationLabel}</dt>
                  <dd className="font-medium text-[#A87936]">
                    {verifMap[product.verification_status] || product.verification_status}
                  </dd>
                </div>
              </dl>
            </section>

            {ingredients && (
              <section className="border-t border-[#E9E7E1] pt-6">
                <h2 className="text-lg font-semibold text-[#252B25] mb-2">{t.productDetail.ingredientsTitle}</h2>
                <p className="text-sm text-[#647067] leading-relaxed">{ingredients}</p>
              </section>
            )}

            {/* Health & Medical Safeguard Notice */}
            <section className="p-5 rounded-lg bg-[#FBF7EF] border border-[#E9E7E1]">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#A87936] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[#252B25] mb-1">
                    {t.productDetail.medicalNoticeTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#647067] leading-relaxed">
                    {t.productDetail.medicalNoticeBody}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Prominent Request CTA & Attached Product Request Form */}
          <aside ref={requestSectionRef} className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="border border-[#E9E7E1] rounded-lg p-6 bg-white">
              <div className="mb-5 pb-4 border-b border-[#E9E7E1]">
                <h2 className="text-xl font-bold text-[#252B25]">{t.productDetail.requestButton}</h2>
                <p className="text-sm text-[#647067] mt-1">
                  {lang === 'rw'
                    ? 'Uzuza amazina yawe na nimero ya telefone maze uhabwe ubufasha kuri WhatsApp.'
                    : 'Enter your name and phone number below to record your request and unlock WhatsApp assistance.'}
                </p>
              </div>
              <ProductRequestForm attachedProduct={product} />
            </div>
          </aside>
        </div>

        {/* Product FAQs */}
        {faqs.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[#E9E7E1]">
            <h2 className="text-2xl font-bold text-[#252B25] mb-6">{t.productDetail.faqsTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq) => {
                const q = lang === 'rw' && faq.question_rw ? faq.question_rw : faq.question_en;
                const a = lang === 'rw' && faq.answer_rw ? faq.answer_rw : faq.answer_en;
                return (
                  <details key={faq.id} className="group border border-[#E9E7E1] rounded-lg p-4 bg-white">
                    <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold text-[#252B25]">
                      <span>{q}</span>
                      <ChevronDown className="w-4 h-4 text-[#647067] shrink-0 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="mt-2.5 pt-2.5 border-t border-[#E9E7E1] text-sm text-[#647067] leading-relaxed">
                      {a}
                    </p>
                  </details>
                );
              })}
            </div>
          </section>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[#E9E7E1]">
            <h2 className="text-2xl font-bold text-[#252B25] mb-6">{t.productDetail.relatedTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};
