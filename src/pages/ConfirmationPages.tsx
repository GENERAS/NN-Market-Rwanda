import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ExternalLink, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JoiningConfirmation, ProductRequestConfirmation } from '../types';
import { SeoHead } from '../components/SeoHead';

export const RequestConfirmedPage: React.FC = () => {
  const { t, lang, bootstrap } = useApp();
  const location = useLocation();
  const state = location.state as { confirmation?: ProductRequestConfirmation } | null;
  const confirmation = state?.confirmation;

  const successTitle =
    lang === 'rw'
      ? bootstrap?.settings?.request_success_title_rw || t.requestForm.success.title
      : bootstrap?.settings?.request_success_title_en || t.requestForm.success.title;

  const successBody =
    lang === 'rw'
      ? bootstrap?.settings?.request_success_body_rw || t.requestForm.success.body
      : bootstrap?.settings?.request_success_body_en || t.requestForm.success.body;

  if (!confirmation) {
    return (
      <>
        <SeoHead title="Product Request | NN Market Rwanda" description="Submit a product request." noIndex />
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#1E2420] mb-3">{t.requestForm.heading}</h1>
          <p className="text-sm text-[#5C6760] mb-6">
            {lang === 'rw'
              ? 'Nyamuneka zuza ifishi y’ubusabe kugira ngo uhabwe nimero ya referansi n’ubufasha kuri WhatsApp.'
              : 'Please submit a product request form first to receive your reference number and authorized contact option.'}
          </p>
          <Link
            to="/request"
            className="inline-flex items-center justify-center px-6 py-3 min-h-[46px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-sm font-semibold"
          >
            {t.nav.requestAction}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SeoHead title="Request Received | NN Market Rwanda" description="Your product request has been recorded." noIndex />
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="border border-[#E5DEC9] rounded-xl p-6 sm:p-8 bg-white">
          <div className="w-12 h-12 rounded-full bg-[#EEF5F0] text-[#1F5138] flex items-center justify-center mb-5">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E2420] mb-3">{successTitle}</h1>
          <p className="text-base text-[#5C6760] leading-relaxed mb-6">
            {confirmation.whatsappUrl ? successBody : t.requestForm.success.bodyNoWhatsapp}
          </p>

          <dl className="p-4 rounded-lg bg-[#F9F5EC] border border-[#E5DEC9] space-y-2 mb-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#5C6760]">{t.requestForm.success.referenceLabel}</dt>
              <dd className="font-bold text-[#1E2420] tabular-nums">{confirmation.referenceCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#5C6760]">{t.requestForm.success.productLabel}</dt>
              <dd className="font-semibold text-[#1E2420]">{confirmation.productName}</dd>
            </div>
          </dl>

          {confirmation.whatsappUrl ? (
            <div className="space-y-3">
              <a
                href={confirmation.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-base font-semibold transition-colors"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                {t.requestForm.success.whatsappButton}
              </a>
              <p className="text-xs text-[#5C6760]">{t.requestForm.success.whatsappNote}</p>
            </div>
          ) : null}

          <div className="mt-6 pt-5 border-t border-[#E5DEC9] flex flex-wrap gap-4">
            <Link to="/products" className="text-sm font-semibold text-[#9C661F] hover:underline">
              {t.requestForm.success.browseMore}
            </Link>
            <Link to="/" className="text-sm font-semibold text-[#5C6760] hover:underline">
              {t.nav.home}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export const JoinConfirmedPage: React.FC = () => {
  const { t, lang, bootstrap } = useApp();
  const location = useLocation();
  const state = location.state as { confirmation?: JoiningConfirmation } | null;
  const confirmation = state?.confirmation;

  const successTitle =
    lang === 'rw'
      ? bootstrap?.settings?.join_success_title_rw || t.join.success.title
      : bootstrap?.settings?.join_success_title_en || t.join.success.title;

  const successBody =
    lang === 'rw'
      ? bootstrap?.settings?.join_success_body_rw || t.join.success.body
      : bootstrap?.settings?.join_success_body_en || t.join.success.body;

  if (!confirmation) {
    return (
      <>
        <SeoHead title="Join N-Nutrition | NN Market Rwanda" description="Submit joining interest." noIndex />
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#1E2420] mb-3">{t.join.title}</h1>
          <p className="text-sm text-[#5C6760] mb-6">
            {lang === 'rw'
              ? 'Nyamuneka zuza ifishi yo kwinjira mbere yo gukomeza.'
              : 'Please submit your joining interest form first to record your reference and access the referral step.'}
          </p>
          <Link
            to="/join"
            className="inline-flex items-center justify-center px-6 py-3 min-h-[46px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-sm font-semibold"
          >
            {t.nav.join}
          </Link>
        </div>
      </>
    );
  }

  const handleReferralClick = () => {
    fetch(`/api/public/joining-applications/${encodeURIComponent(confirmation.referenceCode)}/referral-click`, {
      method: 'POST',
    }).catch(() => {
      // non-blocking analytics update
    });
  };

  return (
    <>
      <SeoHead title="Joining Interest Recorded | NN Market Rwanda" description="Next steps for joining N-Nutrition." noIndex />
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="border border-[#E5DEC9] rounded-xl p-6 sm:p-8 bg-white">
          <div className="w-12 h-12 rounded-full bg-[#EEF5F0] text-[#1F5138] flex items-center justify-center mb-5">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E2420] mb-3">{successTitle}</h1>
          <p className="text-base text-[#5C6760] leading-relaxed mb-6">{successBody}</p>

          <dl className="p-4 rounded-lg bg-[#F9F5EC] border border-[#E5DEC9] space-y-2 mb-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#5C6760]">{t.join.success.referenceLabel}</dt>
              <dd className="font-bold text-[#1E2420] tabular-nums">{confirmation.referenceCode}</dd>
            </div>
          </dl>

          {confirmation.referralUrl ? (
            <div className="space-y-3">
              <a
                href={confirmation.referralUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleReferralClick}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-base font-semibold transition-colors"
              >
                {t.join.success.continueButton}
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
              <p className="text-xs text-[#5C6760] leading-relaxed">{t.join.success.externalNotice}</p>
              {confirmation.assistanceWhatsappUrl && (
                <a
                  href={confirmation.assistanceWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md bg-[#F9F5EC] hover:bg-[#f0e9da] border border-[#E5DEC9] text-[#1E2420] text-sm font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#1F5138]" aria-hidden="true" />
                  {t.join.success.assistanceButton}
                </a>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[#F9F5EC] border border-[#E5DEC9] space-y-3">
              <h2 className="text-sm font-semibold text-[#1E2420]">{t.join.success.missingLinkTitle}</h2>
              <p className="text-xs sm:text-sm text-[#5C6760]">{t.join.success.missingLinkBody}</p>
              {confirmation.assistanceWhatsappUrl && (
                <a
                  href={confirmation.assistanceWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-sm font-semibold"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  {t.join.success.assistanceButton}
                </a>
              )}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-[#E5DEC9] flex flex-wrap gap-4">
            <Link to="/join/requirements" className="text-sm font-semibold text-[#9C661F] hover:underline">
              {t.join.navRequirements}
            </Link>
            <Link to="/" className="text-sm font-semibold text-[#5C6760] hover:underline">
              {t.nav.home}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
