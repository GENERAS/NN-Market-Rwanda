import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ContentBlock } from '../types';
import { JoiningForm } from '../components/JoiningForm';
import { SeoHead } from '../components/SeoHead';

const VerificationBadgeText: React.FC<{ status: ContentBlock['verification_status']; lang: 'en' | 'rw' }> = ({
  status,
  lang,
}) => {
  const labels = {
    en: {
      verified: 'Verified information',
      awaiting_confirmation: 'Awaiting corporate confirmation',
      not_available: 'Details not currently available',
    },
    rw: {
      verified: 'Amakuru yemejwe',
      awaiting_confirmation: 'Bitegereje kwemezwa n’ikigo',
      not_available: 'Amakuru ntaraboneka ubu',
    },
  };
  const color =
    status === 'verified'
      ? 'text-[#1F5138]'
      : status === 'awaiting_confirmation'
        ? 'text-[#9C661F]'
        : 'text-[#5C6760]';
  return <span className={`text-xs font-semibold ${color}`}>{labels[lang][status]}</span>;
};

export const JoinHubPage: React.FC<{ section?: 'overview' | 'requirements' | 'how-it-works' }> = ({
  section = 'overview',
}) => {
  const { lang, t, bootstrap } = useApp();
  const location = useLocation();
  const formRef = useRef<HTMLElement | null>(null);

  const content = bootstrap?.content || {};
  const joiningFaqs = (bootstrap?.faqs || []).filter((f) => f.scope === 'joining' || f.scope === 'general');

  useEffect(() => {
    if (location.hash === '#join-form') {
      const frame = requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('join-name')?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [location.hash]);

  const scrollToJoinForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('join-name')?.focus({ preventScroll: true });
  };

  const getBlock = (key: string, fallbackTitle: string, fallbackBody: string) => {
    const b = content[key];
    return {
      title: b ? (lang === 'rw' && b.title_rw ? b.title_rw : b.title_en) : fallbackTitle,
      body: b ? (lang === 'rw' && b.body_rw ? b.body_rw : b.body_en) : fallbackBody,
      status: b?.verification_status || 'awaiting_confirmation',
    };
  };

  const opp = getBlock('joining_opportunity', 'About the Opportunity', '');
  const act = getBlock('joining_activities', 'What Distributors Actually Do', '');
  const req = getBlock('joining_requirements', 'Joining Requirements', '');
  const costs = getBlock('joining_costs', 'Joining Costs', '');
  const training = getBlock('joining_training', 'Training Information', '');
  const comp = getBlock('joining_compensation', 'Compensation Information', '');

  const seoMap = {
    overview: {
      title: 'Join N-Nutrition in Rwanda — Submit Request | NN Market Rwanda',
      desc: 'Understand how N-Nutrition works, review joining requirements and costs, and submit your request for guided referral assistance in Rwanda.',
    },
    requirements: {
      title: 'N-Nutrition Joining Requirements & Costs | NN Market Rwanda',
      desc: 'Clear checklist of verified and pending N-Nutrition distributor requirements and starter costs in Rwanda.',
    },
    'how-it-works': {
      title: 'How Joining N-Nutrition Works | NN Market Rwanda',
      desc: 'Step-by-step guide to submitting your joining request and continuing through an authorized N-Nutrition referral link.',
    },
  }[section];

  return (
    <>
      <SeoHead title={seoMap.title} description={seoMap.desc} />

      <div className="bg-[#F9F5EC] border-b border-[#E5DEC9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-xs text-[#5C6760] mb-3 flex items-center gap-2">
            <Link to="/" className="hover:text-[#1F5138]">
              {t.nav.home}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#1E2420] font-medium">{t.nav.join}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1E2420] mb-3">{t.join.title}</h1>
              <p className="text-base text-[#5C6760] max-w-2xl">{t.join.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={scrollToJoinForm}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-semibold text-white bg-[#1F5138] hover:bg-[#173D2A] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t.join.topCta}</span>
              <ArrowDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Sub-navigation tabs */}
          <div className="flex flex-wrap gap-2" role="navigation" aria-label="Joining sections">
            <Link
              to="/join"
              className={`px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-md text-sm font-semibold whitespace-nowrap ${
                location.pathname === '/join'
                  ? 'bg-[#1F5138] text-white'
                  : 'bg-white border border-[#E5DEC9] text-[#1E2420] hover:border-[#9C661F]'
              }`}
            >
              {t.join.navHub}
            </Link>
            <Link
              to="/join/requirements"
              className={`px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-md text-sm font-semibold whitespace-nowrap ${
                location.pathname === '/join/requirements'
                  ? 'bg-[#1F5138] text-white'
                  : 'bg-white border border-[#E5DEC9] text-[#1E2420] hover:border-[#9C661F]'
              }`}
            >
              {t.join.navRequirements}
            </Link>
            <Link
              to="/join/how-it-works"
              className={`px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-md text-sm font-semibold whitespace-nowrap ${
                location.pathname === '/join/how-it-works'
                  ? 'bg-[#1F5138] text-white'
                  : 'bg-white border border-[#E5DEC9] text-[#1E2420] hover:border-[#9C661F]'
              }`}
            >
              {t.join.navHowItWorks}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Right Form first on mobile so users can immediately Submit Request without scrolling */}
          <aside
            id="join-form"
            ref={formRef}
            className="order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-24 scroll-mt-20"
          >
            <div className="border border-[#E5DEC9] rounded-lg p-6 bg-white">
              <div className="mb-5 pb-4 border-b border-[#E5DEC9]">
                <h2 className="text-xl font-bold text-[#1E2420]">{t.join.formTitle}</h2>
                <p className="text-sm text-[#5C6760] mt-1">{t.join.formSubtitle}</p>
              </div>
              <JoiningForm />
            </div>
          </aside>

          {/* Main educational sections */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-6">
            {(section === 'overview' || section === 'how-it-works') && (
              <>
                <section className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={opp.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E2420] mb-3">{opp.title}</h2>
                  <p className="text-sm sm:text-base text-[#5C6760] leading-relaxed whitespace-pre-line">{opp.body}</p>
                </section>

                <section className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={act.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E2420] mb-3">{act.title}</h2>
                  <p className="text-sm sm:text-base text-[#5C6760] leading-relaxed whitespace-pre-line">{act.body}</p>
                </section>

                <section className="p-6 rounded-lg border border-[#E5DEC9] bg-[#EEF5F0]">
                  <h2 className="text-xl font-bold text-[#1E2420] mb-4">
                    {lang === 'rw' ? 'Intambwe zo Kwinjira' : 'Registration Process (Step-by-Step)'}
                  </h2>
                  <ol className="space-y-3 text-sm sm:text-base text-[#1E2420]">
                    <li>
                      <strong className="text-[#1F5138]">1.</strong>{' '}
                      {lang === 'rw'
                        ? 'Soma ibisabwa n’amakuru y’ibanze kuri uru rubuga.'
                        : 'Review the verified requirements, activities, and cost status on this page.'}
                    </li>
                    <li>
                      <strong className="text-[#1F5138]">2.</strong>{' '}
                      {lang === 'rw'
                        ? 'Ohereza amazina yawe na nimero ya telefone ukoresheje buto ya Ohereza Ubusabe.'
                        : 'Enter your full name and Rwandan phone number and tap Submit Request.'}
                    </li>
                    <li>
                      <strong className="text-[#1F5138]">3.</strong>{' '}
                      {lang === 'rw'
                        ? 'Fungura umurongo w’iyandikisha ryo hanze (igihe wuzujwe) cyangwa uvugane n’uhagarariye ibikorwa.'
                        : 'Proceed to the external company registration link (when configured) or speak with our agent for guidance.'}
                    </li>
                  </ol>
                </section>
              </>
            )}

            {(section === 'overview' || section === 'requirements') && (
              <>
                <section className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={req.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E2420] mb-3">{req.title}</h2>
                  <p className="text-sm sm:text-base text-[#5C6760] leading-relaxed whitespace-pre-line">{req.body}</p>
                </section>

                <section className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={costs.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E2420] mb-3">{costs.title}</h2>
                  <p className="text-sm sm:text-base text-[#5C6760] leading-relaxed whitespace-pre-line">{costs.body}</p>
                </section>
              </>
            )}

            <section className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
              <div className="mb-2">
                <VerificationBadgeText status={training.status} lang={lang} />
              </div>
              <h2 className="text-xl font-bold text-[#1E2420] mb-3">{training.title}</h2>
              <p className="text-sm sm:text-base text-[#5C6760] leading-relaxed whitespace-pre-line">{training.body}</p>
            </section>

            <section className="p-6 rounded-lg border border-[#E5DEC9] bg-white">
              <div className="mb-2">
                <VerificationBadgeText status={comp.status} lang={lang} />
              </div>
              <h2 className="text-xl font-bold text-[#1E2420] mb-3">{comp.title}</h2>
              <p className="text-sm sm:text-base text-[#5C6760] leading-relaxed whitespace-pre-line">{comp.body}</p>
            </section>

            {joiningFaqs.length > 0 && (
              <section className="pt-4">
                <h2 className="text-xl font-bold text-[#1E2420] mb-4">{t.home.faqTitle}</h2>
                <div className="space-y-3">
                  {joiningFaqs.map((faq) => (
                    <details key={faq.id} className="group border border-[#E5DEC9] rounded-lg p-4 bg-white">
                      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold text-[#1E2420]">
                        <span>{lang === 'rw' && faq.question_rw ? faq.question_rw : faq.question_en}</span>
                        <ChevronDown className="w-4 h-4 text-[#5C6760] shrink-0 group-open:rotate-180 transition-transform" />
                      </summary>
                      <p className="mt-2.5 pt-2.5 border-t border-[#E5DEC9] text-sm text-[#5C6760] leading-relaxed">
                        {lang === 'rw' && faq.answer_rw ? faq.answer_rw : faq.answer_en}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
