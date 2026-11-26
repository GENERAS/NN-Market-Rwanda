import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
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
      ? 'text-[#26733E]'
      : status === 'awaiting_confirmation'
        ? 'text-[#A87936]'
        : 'text-[#647067]';
  return <span className={`text-xs font-semibold ${color}`}>{labels[lang][status]}</span>;
};

export const JoinHubPage: React.FC<{ section?: 'overview' | 'requirements' | 'how-it-works' }> = ({
  section = 'overview',
}) => {
  const { lang, t, bootstrap } = useApp();
  const location = useLocation();

  const content = bootstrap?.content || {};
  const joiningFaqs = (bootstrap?.faqs || []).filter((f) => f.scope === 'joining' || f.scope === 'general');

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
      title: 'Join N-Nutrition in Rwanda — Opportunity & Referral Guide | NN Market Rwanda',
      desc: 'Understand how N-Nutrition works, review joining requirements and costs, and submit your interest for guided referral assistance in Rwanda.',
    },
    requirements: {
      title: 'N-Nutrition Joining Requirements & Costs | NN Market Rwanda',
      desc: 'Clear checklist of verified and pending N-Nutrition distributor requirements and starter costs in Rwanda.',
    },
    'how-it-works': {
      title: 'How Joining N-Nutrition Works | NN Market Rwanda',
      desc: 'Step-by-step guide to submitting joining interest and continuing through an authorized N-Nutrition referral link.',
    },
  }[section];

  return (
    <>
      <SeoHead title={seoMap.title} description={seoMap.desc} />

      <div className="bg-[#FBF7EF] border-b border-[#E9E7E1]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-xs text-[#647067] mb-3 flex items-center gap-2">
            <Link to="/" className="hover:text-[#26733E]">
              {t.nav.home}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#252B25] font-medium">{t.nav.join}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#252B25] mb-3">{t.join.title}</h1>
          <p className="text-base text-[#647067] max-w-2xl mb-6">{t.join.subtitle}</p>

          {/* Sub-navigation tabs */}
          <div className="flex flex-wrap gap-2" role="navigation" aria-label="Joining sections">
            <Link
              to="/join"
              className={`px-4 py-2.5 min-h-[42px] rounded-md text-sm font-semibold whitespace-nowrap ${
                location.pathname === '/join'
                  ? 'bg-[#26733E] text-white'
                  : 'bg-white border border-[#E9E7E1] text-[#252B25] hover:border-[#A87936]'
              }`}
            >
              {t.join.navHub}
            </Link>
            <Link
              to="/join/requirements"
              className={`px-4 py-2.5 min-h-[42px] rounded-md text-sm font-semibold whitespace-nowrap ${
                location.pathname === '/join/requirements'
                  ? 'bg-[#26733E] text-white'
                  : 'bg-white border border-[#E9E7E1] text-[#252B25] hover:border-[#A87936]'
              }`}
            >
              {t.join.navRequirements}
            </Link>
            <Link
              to="/join/how-it-works"
              className={`px-4 py-2.5 min-h-[42px] rounded-md text-sm font-semibold whitespace-nowrap ${
                location.pathname === '/join/how-it-works'
                  ? 'bg-[#26733E] text-white'
                  : 'bg-white border border-[#E9E7E1] text-[#252B25] hover:border-[#A87936]'
              }`}
            >
              {t.join.navHowItWorks}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Main educational sections */}
          <div className="lg:col-span-7 space-y-8">
            {(section === 'overview' || section === 'how-it-works') && (
              <>
                <section className="p-6 rounded-lg border border-[#E9E7E1] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={opp.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#252B25] mb-3">{opp.title}</h2>
                  <p className="text-sm sm:text-base text-[#647067] leading-relaxed whitespace-pre-line">{opp.body}</p>
                </section>

                <section className="p-6 rounded-lg border border-[#E9E7E1] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={act.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#252B25] mb-3">{act.title}</h2>
                  <p className="text-sm sm:text-base text-[#647067] leading-relaxed whitespace-pre-line">{act.body}</p>
                </section>

                <section className="p-6 rounded-lg border border-[#E9E7E1] bg-[#F1F7F1]">
                  <h2 className="text-xl font-bold text-[#252B25] mb-4">
                    {lang === 'rw' ? 'Intambwe zo Kwinjira' : 'Registration Process (Step-by-Step)'}
                  </h2>
                  <ol className="space-y-3 text-sm sm:text-base text-[#252B25]">
                    <li>
                      <strong className="text-[#26733E]">1.</strong>{' '}
                      {lang === 'rw'
                        ? 'Soma ibisabwa n’amakuru y’ibanze kuri uru rubuga.'
                        : 'Review the verified requirements, activities, and cost status on this page.'}
                    </li>
                    <li>
                      <strong className="text-[#26733E]">2.</strong>{' '}
                      {lang === 'rw'
                        ? 'Ohereza amazina yawe na nimero ya telefone mu ifishi yo kwinjira.'
                        : 'Submit your full name and Rwandan phone number in the short interest form.'}
                    </li>
                    <li>
                      <strong className="text-[#26733E]">3.</strong>{' '}
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
                <section className="p-6 rounded-lg border border-[#E9E7E1] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={req.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#252B25] mb-3">{req.title}</h2>
                  <p className="text-sm sm:text-base text-[#647067] leading-relaxed whitespace-pre-line">{req.body}</p>
                </section>

                <section className="p-6 rounded-lg border border-[#E9E7E1] bg-white">
                  <div className="mb-2">
                    <VerificationBadgeText status={costs.status} lang={lang} />
                  </div>
                  <h2 className="text-xl font-bold text-[#252B25] mb-3">{costs.title}</h2>
                  <p className="text-sm sm:text-base text-[#647067] leading-relaxed whitespace-pre-line">{costs.body}</p>
                </section>
              </>
            )}

            <section className="p-6 rounded-lg border border-[#E9E7E1] bg-white">
              <div className="mb-2">
                <VerificationBadgeText status={training.status} lang={lang} />
              </div>
              <h2 className="text-xl font-bold text-[#252B25] mb-3">{training.title}</h2>
              <p className="text-sm sm:text-base text-[#647067] leading-relaxed whitespace-pre-line">{training.body}</p>
            </section>

            <section className="p-6 rounded-lg border border-[#E9E7E1] bg-white">
              <div className="mb-2">
                <VerificationBadgeText status={comp.status} lang={lang} />
              </div>
              <h2 className="text-xl font-bold text-[#252B25] mb-3">{comp.title}</h2>
              <p className="text-sm sm:text-base text-[#647067] leading-relaxed whitespace-pre-line">{comp.body}</p>
            </section>

            {joiningFaqs.length > 0 && (
              <section className="pt-4">
                <h2 className="text-xl font-bold text-[#252B25] mb-4">{t.home.faqTitle}</h2>
                <div className="space-y-3">
                  {joiningFaqs.map((faq) => (
                    <details key={faq.id} className="group border border-[#E9E7E1] rounded-lg p-4 bg-white">
                      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold text-[#252B25]">
                        <span>{lang === 'rw' && faq.question_rw ? faq.question_rw : faq.question_en}</span>
                        <ChevronDown className="w-4 h-4 text-[#647067] shrink-0 group-open:rotate-180 transition-transform" />
                      </summary>
                      <p className="mt-2.5 pt-2.5 border-t border-[#E9E7E1] text-sm text-[#647067] leading-relaxed">
                        {lang === 'rw' && faq.answer_rw ? faq.answer_rw : faq.answer_en}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Short Joining Application Form */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="border border-[#E9E7E1] rounded-lg p-6 bg-white">
              <div className="mb-5 pb-4 border-b border-[#E9E7E1]">
                <h2 className="text-xl font-bold text-[#252B25]">{t.join.formTitle}</h2>
                <p className="text-sm text-[#647067] mt-1">{t.join.formSubtitle}</p>
              </div>
              <JoiningForm />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};
