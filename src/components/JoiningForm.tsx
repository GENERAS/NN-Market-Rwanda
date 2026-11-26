import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JoiningConfirmation } from '../types';
import { validateAndNormalizeRwandaPhone, validateCustomerName, validateOptionalEmail } from '../utils/validation';

export const JoiningForm: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [consentProcessing, setConsentProcessing] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const errors: Record<string, string> = {};
    const nameCheck = validateCustomerName(fullName);
    if (!nameCheck.valid) {
      errors.fullName =
        nameCheck.errorCode === 'REQUIRED' ? t.requestForm.errors.nameRequired : t.requestForm.errors.nameShort;
    }

    const phoneCheck = validateAndNormalizeRwandaPhone(phone);
    if (!phoneCheck.valid) {
      errors.phone =
        phoneCheck.errorCode === 'REQUIRED' ? t.requestForm.errors.phoneRequired : t.requestForm.errors.phoneInvalid;
    }

    const emailCheck = validateOptionalEmail(email);
    if (!emailCheck.valid) {
      errors.email = t.requestForm.errors.emailInvalid;
    }

    if (!consentProcessing) {
      errors.consentProcessing = t.requestForm.errors.consentRequired;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/joining-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: nameCheck.cleaned,
          phone,
          email: emailCheck.normalized,
          question,
          sourcePage: location.pathname,
          consentProcessing,
          consentMarketing,
          website_url: honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error || t.requestForm.errors.generic });
        } else {
          setSubmitError(data.error || t.requestForm.errors.generic);
        }
        return;
      }

      const confirmation = data as JoiningConfirmation;
      navigate('/join/confirmed', { state: { confirmation } });
    } catch {
      setSubmitError(t.requestForm.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="join_website_url">Website</label>
        <input
          id="join_website_url"
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="join-name" className="block text-sm font-semibold text-[#252B25] mb-1.5">
          {t.join.nameLabel} <span className="text-[#C0392B]">*</span>
        </label>
        <input
          id="join-name"
          name="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t.join.namePlaceholder}
          className="w-full min-h-[46px] px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] placeholder:text-[#647067]/70 focus:border-[#26733E]"
        />
        {fieldErrors.fullName && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-[#C0392B]">
            {fieldErrors.fullName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="join-phone" className="block text-sm font-semibold text-[#252B25] mb-1.5">
          {t.join.phoneLabel} <span className="text-[#C0392B]">*</span>
        </label>
        <input
          id="join-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.join.phonePlaceholder}
          className="w-full min-h-[46px] px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] placeholder:text-[#647067]/70 focus:border-[#26733E]"
        />
        <p className="mt-1 text-xs text-[#647067]">{t.requestForm.phoneHelp}</p>
        {fieldErrors.phone && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#C0392B]">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="join-email" className="block text-sm font-semibold text-[#252B25] mb-1.5">
          {t.join.emailLabel}
        </label>
        <input
          id="join-email"
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.join.emailPlaceholder}
          className="w-full min-h-[46px] px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] placeholder:text-[#647067]/70 focus:border-[#26733E]"
        />
        <p className="mt-1 text-xs text-[#647067]">{t.requestForm.emailHelp}</p>
        {fieldErrors.email && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#C0392B]">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="join-question" className="block text-sm font-semibold text-[#252B25] mb-1.5">
          {t.join.questionLabel}
        </label>
        <textarea
          id="join-question"
          name="question"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.join.questionPlaceholder}
          className="w-full px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] placeholder:text-[#647067]/70 focus:border-[#26733E]"
        />
      </div>

      <div className="p-3.5 rounded-md bg-[#FBF7EF] border border-[#E9E7E1] space-y-2.5">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentProcessing}
            onChange={(e) => setConsentProcessing(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#26733E] shrink-0"
          />
          <span className="text-xs font-medium text-[#252B25]">
            {t.join.consentRequiredLabel} <span className="text-[#C0392B]">*</span>
          </span>
        </label>
        {fieldErrors.consentProcessing && (
          <p role="alert" className="text-xs font-medium text-[#C0392B]">
            {fieldErrors.consentProcessing}
          </p>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentMarketing}
            onChange={(e) => setConsentMarketing(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#26733E] shrink-0"
          />
          <span className="text-xs text-[#647067]">{t.join.marketingOptInLabel}</span>
        </label>
      </div>

      {submitError && (
        <div role="alert" className="p-3 rounded-md bg-red-50 border border-[#C0392B]/30 text-sm text-[#C0392B]">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-[48px] px-6 py-3 text-base font-semibold text-white bg-[#26733E] hover:bg-[#1e5c31] disabled:opacity-60 rounded-md transition-colors"
      >
        {submitting ? t.join.submitting : t.join.submitButton}
      </button>
    </form>
  );
};
