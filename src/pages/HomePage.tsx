import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, PhoneCall, ShieldCheck, ShoppingBag, Smartphone, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';

export const HomePage: React.FC = () => {
  const { lang, t, bootstrap, loadingBootstrap } = useApp();

  const heroContent = bootstrap?.content?.hero;
  const heroTitle =
    lang === 'rw' && heroContent?.title_rw
      ? heroContent.title_rw
      : heroContent?.title_en || 'Discover N-Nutrition Products. Find Your Next Opportunity.';
  const heroBody =
    lang === 'rw' && heroContent?.body_rw
      ? heroContent.body_rw
      : heroContent?.body_en ||
        'Explore available nutrition and wellness products, request what you need and discover how to join the N-Nutrition business network with assistance from an independent marketing agent.';

  const featuredProducts = bootstrap?.featuredProducts || [];
  const categories = bootstrap?.categories || [];
  const faqs = (bootstrap?.faqs || []).slice(0, 5);

  const seoTitle =
    bootstrap?.settings?.seo_default_title || 'NN Market Rwanda (N Market in Rwanda) — N-Nutrition Products';
  const seoDesc =
    bootstrap?.settings?.seo_default_description ||
    'Shop and request N-Nutrition products at N Market in Rwanda (NN Market Rwanda). Simple ordering, RWF pricing, and joining assistance.';

  const homeFaqSchema =
    faqs.length > 0
      ? [
          {
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
          },
        ]
      : [];

  return (
    <>
      <SeoHead title={seoTitle} description={seoDesc} structuredData={homeFaqSchema} />

      {/* A. Hero Section */}
      <section className="bg-white border-b border-[#E5DEC9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-semibold text-[#9C661F] mb-3">{t.hero.eyebrow}</p>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#1E2420] leading-[1.15] mb-4">
                {heroTitle}
              </h1>
              <p className="text-base sm:text-lg text-[#5C6760] leading-relaxed mb-6 max-w-xl">{heroBody}</p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-semibold text-white bg-[#1F5138] hover:bg-[#173D2A] rounded-md transition-colors whitespace-nowrap"
                >
                  {t.hero.primaryCta}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/join"
                  className="inline-flex items-center justify-center px-6 py-3.5 min-h-[48px] text-base font-semibold text-[#9C661F] bg-[#F9F5EC] hover:bg-[#f0e8d6] border border-[#E5DEC9] rounded-md transition-colors whitespace-nowrap"
                >
                  {t.hero.secondaryCta}
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#5C6760] pt-4 border-t border-[#E5DEC9]">
                <span>{t.hero.trust1}</span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span>{t.hero.trust2}</span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span>{t.hero.trust3}</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[260px] sm:min-h-[340px] rounded-lg overflow-hidden bg-[#F9F5EC] border border-[#E5DEC9]">
                <img
                  src="/src/assets/images/hero_wellness_showcase_1795377557844.jpg"
                  alt="Natural N-Nutrition green tins and amber botanical supplement bottles on travertine stone"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Zero-Tech-Experience Quick Start Strip (3 clear choices right below hero) */}
          <div className="mt-8 pt-6 border-t border-[#E5DEC9]">
            <p className="text-xs font-semibold text-[#5C6760] mb-3">{t.hero.easyGuideTitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                to="/products"
                className="flex items-start gap-3 p-4 min-h-[64px] rounded-lg bg-[#F9F5EC] border border-[#E5DEC9] hover:border-[#1F5138] transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-[#1F5138] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-[#1E2420]">{t.hero.easyOption1Title}</div>
                  <div className="text-xs text-[#5C6760] mt-0.5">{t.hero.easyOption1Body}</div>
                </div>
              </Link>
              <Link
                to="/request"
                className="flex items-start gap-3 p-4 min-h-[64px] rounded-lg bg-[#EEF5F0] border border-[#E5DEC9] hover:border-[#1F5138] transition-colors"
              >
                <PhoneCall className="w-5 h-5 text-[#1F5138] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-[#1E2420]">{t.hero.easyOption2Title}</div>
                  <div className="text-xs text-[#5C6760] mt-0.5">{t.hero.easyOption2Body}</div>
                </div>
              </Link>
              <Link
                to="/join"
                className="flex items-start gap-3 p-4 min-h-[64px] rounded-lg bg-[#F9F5EC] border border-[#E5DEC9] hover:border-[#9C661F] transition-colors"
              >
                <UserPlus className="w-5 h-5 text-[#9C661F] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-[#1E2420]">{t.hero.easyOption3Title}</div>
                  <div className="text-xs text-[#5C6760] mt-0.5">{t.hero.easyOption3Body}</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* B. Featured Products */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2420]">{t.home.featuredTitle}</h2>
              <p className="text-sm sm:text-base text-[#5C6760] mt-1.5 max-w-2xl">{t.home.featuredSub}</p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F5138] hover:underline whitespace-nowrap shrink-0"
            >
              {t.home.viewAllProducts}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {loadingBootstrap ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 rounded-lg bg-[#F9F5EC] animate-pulse border border-[#E5DEC9]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* C. Browse Product Categories */}
      <section className="py-12 sm:py-16 bg-[#F9F5EC] border-y border-[#E5DEC9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2420]">{t.home.categoriesTitle}</h2>
            <p className="text-sm sm:text-base text-[#5C6760] mt-1.5">{t.home.categoriesSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {categories.map((cat) => {
              const name = lang === 'rw' && cat.name_rw ? cat.name_rw : cat.name_en;
              const desc = lang === 'rw' && cat.description_rw ? cat.description_rw : cat.description_en;
              return (
                <Link
                  key={cat.id}
                  to={`/categories/${cat.slug}`}
                  className="bg-white border border-[#E5DEC9] rounded-lg p-6 hover:border-[#9C661F] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs font-medium text-[#5C6760] mb-1.5 tabular-nums">
                      {cat.product_count ?? 0} {lang === 'rw' ? 'ibicuruzwa' : 'products'}
                    </div>
                    <h3 className="text-lg font-semibold text-[#1E2420] mb-2">{name}</h3>
                    <p className="text-sm text-[#5C6760] leading-relaxed">{desc}</p>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9C661F]">
                    <span>{t.catalog.viewDetails}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* D. How Product Requests Work */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2420]">{t.home.howItWorksTitle}</h2>
            <p className="text-sm sm:text-base text-[#5C6760] mt-1.5">{t.home.howItWorksSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
              <div className="text-sm font-bold text-[#9C661F] mb-2">01</div>
              <h3 className="text-base font-semibold text-[#1E2420] mb-2">{t.home.step1Title}</h3>
              <p className="text-sm text-[#5C6760] leading-relaxed">{t.home.step1Body}</p>
            </div>
            <div className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
              <div className="text-sm font-bold text-[#9C661F] mb-2">02</div>
              <h3 className="text-base font-semibold text-[#1E2420] mb-2">{t.home.step2Title}</h3>
              <p className="text-sm text-[#5C6760] leading-relaxed">{t.home.step2Body}</p>
            </div>
            <div className="p-6 rounded-lg border border-[#E5DEC9] bg-[#EEF5F0]">
              <div className="text-sm font-bold text-[#1F5138] mb-2">03</div>
              <h3 className="text-base font-semibold text-[#1E2420] mb-2">{t.home.step3Title}</h3>
              <p className="text-sm text-[#5C6760] leading-relaxed">{t.home.step3Body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* E. Interested in Joining N-Nutrition? */}
      <section className="py-12 sm:py-16 bg-[#EEF5F0] border-y border-[#E5DEC9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2420] mb-3">{t.home.joinBannerTitle}</h2>
            <p className="text-base text-[#5C6760] leading-relaxed">{t.home.joinBannerBody}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <Link
              to="/join#join-form"
              className="inline-flex items-center justify-center px-6 py-3.5 min-h-[48px] text-sm font-semibold text-white bg-[#1F5138] hover:bg-[#173D2A] rounded-md transition-colors whitespace-nowrap"
            >
              {t.home.joinBannerPrimary}
            </Link>
            <Link
              to="/join/requirements"
              className="inline-flex items-center justify-center px-6 py-3.5 min-h-[48px] text-sm font-semibold text-[#1E2420] bg-white hover:bg-[#F9F5EC] border border-[#E5DEC9] rounded-md transition-colors whitespace-nowrap"
            >
              {t.home.joinBannerSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* F. Why Use NN Market Rwanda? */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2420]">{t.home.whyTitle}</h2>
            <p className="text-sm sm:text-base text-[#5C6760] mt-1.5">{t.home.whySub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-[#E5DEC9]">
              <CheckCircle2 className="w-5 h-5 text-[#1F5138] mb-3" aria-hidden="true" />
              <h3 className="text-base font-semibold text-[#1E2420] mb-2">{t.home.why1Title}</h3>
              <p className="text-sm text-[#5C6760] leading-relaxed">{t.home.why1Body}</p>
            </div>
            <div className="p-6 rounded-lg border border-[#E5DEC9]">
              <Smartphone className="w-5 h-5 text-[#9C661F] mb-3" aria-hidden="true" />
              <h3 className="text-base font-semibold text-[#1E2420] mb-2">{t.home.why2Title}</h3>
              <p className="text-sm text-[#5C6760] leading-relaxed">{t.home.why2Body}</p>
            </div>
            <div className="p-6 rounded-lg border border-[#E5DEC9]">
              <ShieldCheck className="w-5 h-5 text-[#1F5138] mb-3" aria-hidden="true" />
              <h3 className="text-base font-semibold text-[#1E2420] mb-2">{t.home.why3Title}</h3>
              <p className="text-sm text-[#5C6760] leading-relaxed">{t.home.why3Body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* G. Frequently Asked Questions */}
      <section className="py-12 sm:py-16 bg-[#F9F5EC] border-t border-[#E5DEC9]">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2420]">{t.home.faqTitle}</h2>
              <p className="text-sm sm:text-base text-[#5C6760] mt-1.5">{t.home.faqSub}</p>
            </div>
            <Link to="/faq" className="text-sm font-semibold text-[#1F5138] hover:underline whitespace-nowrap shrink-0">
              {t.home.viewAllFaqs}
            </Link>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => {
              const q = lang === 'rw' && faq.question_rw ? faq.question_rw : faq.question_en;
              const a = lang === 'rw' && faq.answer_rw ? faq.answer_rw : faq.answer_en;
              return (
                <details
                  key={faq.id}
                  className="group bg-white border border-[#E5DEC9] rounded-lg p-5"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-base font-semibold text-[#1E2420]">
                    <span>{q}</span>
                    <ChevronDown
                      className="w-5 h-5 text-[#5C6760] shrink-0 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 pt-3 border-t border-[#E5DEC9] text-sm text-[#5C6760] leading-relaxed">{a}</p>
                </details>
              );
            })}
          </div>
        </div>
      </section>

      {/* H. Final Call to Action */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1E2420] mb-3">{t.home.finalTitle}</h2>
          <p className="text-base text-[#5C6760] max-w-xl mx-auto mb-7">{t.home.finalBody}</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              to="/request"
              className="inline-flex items-center justify-center px-6 py-3.5 min-h-[48px] text-base font-semibold text-white bg-[#1F5138] hover:bg-[#173D2A] rounded-md transition-colors whitespace-nowrap"
            >
              {t.home.finalProductCta}
            </Link>
            <Link
              to="/join#join-form"
              className="inline-flex items-center justify-center px-6 py-3.5 min-h-[48px] text-base font-semibold text-[#9C661F] bg-[#F9F5EC] hover:bg-[#f0e8d6] border border-[#E5DEC9] rounded-md transition-colors whitespace-nowrap"
            >
              {t.home.finalJoinCta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};
