import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { ProductRequestForm } from '../components/ProductRequestForm';
import { SeoHead } from '../components/SeoHead';
import { fetchPublicProducts } from '../utils/publicCatalogClient';

export const FaqPage: React.FC = () => {
  const { lang, t, bootstrap } = useApp();
  const [scopeFilter, setScopeFilter] = useState<'all' | 'general' | 'joining'>('all');

  const allFaqs = bootstrap?.faqs || [];
  const faqs = allFaqs.filter((f) => scopeFilter === 'all' || f.scope === scopeFilter);

  const faqSchema =
    allFaqs.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: allFaqs.map((f) => ({
              '@type': 'Question',
              name: f.question_en,
              acceptedAnswer: { '@type': 'Answer', text: f.answer_en },
            })),
          },
        ]
      : [];

  return (
    <>
      <SeoHead
        title="Frequently Asked Questions | NN Market Rwanda"
        description="Answers to common questions about NN Market Rwanda (N Market in Rwanda), requesting N-Nutrition products, and joining requirements."
        structuredData={faqSchema}
      />
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-[#5C6760] mb-4 flex items-center gap-2">
          <Link to="/" className="hover:text-[#1F5138]">
            {t.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1E2420] font-medium">{t.nav.faq}</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E2420] mb-3">{t.home.faqTitle}</h1>
        <p className="text-base text-[#5C6760] mb-6">{t.home.faqSub}</p>

        <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="FAQ topic filter">
          {(['all', 'general', 'joining'] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setScopeFilter(sc)}
              className={`px-4 py-2 min-h-[44px] rounded-md text-sm font-semibold ${
                scopeFilter === sc
                  ? 'bg-[#1F5138] text-white'
                  : 'bg-[#F9F5EC] border border-[#E5DEC9] text-[#1E2420]'
              }`}
            >
              {sc === 'all'
                ? lang === 'rw'
                  ? 'Byose'
                  : 'All Topics'
                : sc === 'general'
                  ? lang === 'rw'
                    ? 'Ibicuruzwa n’Urubuga'
                    : 'Products & Platform'
                  : lang === 'rw'
                    ? 'Kwinjira muri N-Nutrition'
                    : 'Joining N-Nutrition'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => {
            const q = lang === 'rw' && faq.question_rw ? faq.question_rw : faq.question_en;
            const a = lang === 'rw' && faq.answer_rw ? faq.answer_rw : faq.answer_en;
            return (
              <details key={faq.id} className="group border border-[#E5DEC9] rounded-lg p-5 bg-white">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-base font-semibold text-[#1E2420]">
                  <span>{q}</span>
                  <ChevronDown className="w-5 h-5 text-[#5C6760] shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 pt-3 border-t border-[#E5DEC9] text-sm text-[#5C6760] leading-relaxed">{a}</p>
              </details>
            );
          })}
        </div>
      </div>
    </>
  );
};

export const AboutPage: React.FC = () => {
  const { lang, t, bootstrap } = useApp();
  const content = bootstrap?.content || {};

  const about = content.about_story;
  const disclosure = content.disclosure;

  const aboutTitle = about ? (lang === 'rw' && about.title_rw ? about.title_rw : about.title_en) : 'About NN Market Rwanda';
  const aboutBody = about ? (lang === 'rw' && about.body_rw ? about.body_rw : about.body_en) : '';
  const discTitle = disclosure
    ? lang === 'rw' && disclosure.title_rw
      ? disclosure.title_rw
      : disclosure.title_en
    : 'Independent Platform Notice';
  const discBody = disclosure ? (lang === 'rw' && disclosure.body_rw ? disclosure.body_rw : disclosure.body_en) : '';

  return (
    <>
      <SeoHead
        title="About NN Market Rwanda (N Market in Rwanda)"
        description="Learn how NN Market Rwanda assists customers in Rwanda with N-Nutrition product discovery, requests, and referral guidance."
      />
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <nav aria-label="Breadcrumb" className="text-xs text-[#5C6760] flex items-center gap-2">
          <Link to="/" className="hover:text-[#1F5138]">
            {t.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1E2420] font-medium">{t.nav.about}</span>
        </nav>

        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E2420] mb-4">{aboutTitle}</h1>
          <p className="text-base text-[#5C6760] leading-relaxed whitespace-pre-line">{aboutBody}</p>
        </div>

        <section className="p-6 rounded-lg bg-[#F9F5EC] border border-[#E5DEC9]">
          <h2 className="text-lg font-bold text-[#9C661F] mb-2">{discTitle}</h2>
          <p className="text-sm sm:text-base text-[#1E2420] leading-relaxed">{discBody}</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-5 py-3 min-h-[46px] rounded-md bg-[#1F5138] text-white text-sm font-semibold"
          >
            {t.hero.primaryCta}
          </Link>
          <Link
            to="/join#join-form"
            className="inline-flex items-center justify-center px-5 py-3 min-h-[46px] rounded-md bg-white border border-[#E5DEC9] text-[#1E2420] text-sm font-semibold"
          >
            {t.hero.secondaryCta}
          </Link>
        </div>
      </div>
    </>
  );
};

export const RequestAndContactPage: React.FC<{ mode?: 'request' | 'contact' }> = ({ mode = 'request' }) => {
  const { lang, t } = useApp();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchPublicProducts({ limit: 24 })
      .then((d) => setProducts(d.items || []))
      .catch(() => {});
  }, []);

  const title =
    mode === 'contact'
      ? lang === 'rw'
        ? 'Ubufasha n’Itumanaho'
        : 'Contact & Customer Assistance'
      : t.requestForm.heading;

  const subtitle =
    lang === 'rw'
      ? 'Ohereza amazina yawe na nimero ya telefone. Nimero ya WhatsApp y’uhagarariye ibikorwa ifunguka umaze kohereza ubusabe.'
      : 'Submit your name and Rwandan phone number below. For privacy and spam protection, direct WhatsApp contact is revealed once your request is recorded.';

  return (
    <>
      <SeoHead title={`${title} | NN Market Rwanda`} description={subtitle} />
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-[#5C6760] mb-4 flex items-center gap-2">
          <Link to="/" className="hover:text-[#1F5138]">
            {t.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1E2420] font-medium">{title}</span>
        </nav>

        <h1 className="text-3xl font-bold text-[#1E2420] mb-3">{title}</h1>
        <p className="text-base text-[#5C6760] leading-relaxed mb-8">{subtitle}</p>

        <div className="border border-[#E5DEC9] rounded-lg p-6 sm:p-8 bg-white">
          <ProductRequestForm availableProducts={products} />
        </div>

        <div className="mt-6 p-4 rounded-md bg-[#EEF5F0] border border-[#E5DEC9] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#1F5138] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-[#5C6760] leading-relaxed">
            {lang === 'rw'
              ? 'Ukeneye ko amakuru yawe akosorwa cyangwa asibwa muri sisitemu? Andika ubutumwa binyuze muri iyi fishi wongereho ko usaba gusibwa.'
              : 'To request correction or deletion of your phone record under our Privacy Policy, submit a short note in the message box above and our administrator will process it promptly.'}
          </p>
        </div>
      </div>
    </>
  );
};

export const LegalPage: React.FC<{ type: 'privacy' | 'terms' }> = ({ type }) => {
  const { lang, t, bootstrap } = useApp();
  const blockKey = type === 'privacy' ? 'privacy_policy' : 'terms_conditions';
  const block = bootstrap?.content?.[blockKey];

  const title = block
    ? lang === 'rw' && block.title_rw
      ? block.title_rw
      : block.title_en
    : type === 'privacy'
      ? t.footer.privacyLink
      : t.footer.termsLink;

  const body = block ? (lang === 'rw' && block.body_rw ? block.body_rw : block.body_en) : '';

  return (
    <>
      <SeoHead title={`${title} | NN Market Rwanda`} description={body.slice(0, 155)} />
      <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-[#5C6760] mb-4 flex items-center gap-2">
          <Link to="/" className="hover:text-[#1F5138]">
            {t.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1E2420] font-medium">{title}</span>
        </nav>

        <h1 className="text-3xl font-bold text-[#1E2420] mb-6">{title}</h1>
        <div className="p-6 sm:p-8 rounded-lg border border-[#E5DEC9] bg-white">
          <p className="text-sm sm:text-base text-[#1E2420] leading-relaxed whitespace-pre-line">{body}</p>
        </div>
      </div>
    </>
  );
};
