import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Product, ProductRequestConfirmation } from '../types';
import { validateAndNormalizeRwandaPhone, validateCustomerName } from '../utils/validation';

interface ProductRequestFormProps {
  attachedProduct?: Product | null;
  availableProducts?: Product[];
}

export const ProductRequestForm: React.FC<ProductRequestFormProps> = ({
  attachedProduct = null,
  availableProducts = [],
}) => {
  const { lang, t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(attachedProduct?.id || '');
  const [message, setMessage] = useState('');
  const [consentProcessing, setConsentProcessing] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const attachedName = attachedProduct
    ? lang === 'rw' && attachedProduct.name_rw
      ? attachedProduct.name_rw
      : attachedProduct.name_en
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const errors: Record<string, string> = {};
    const nameCheck = validateCustomerName(name);
    if (!nameCheck.valid) {
      errors.name =
        nameCheck.errorCode === 'REQUIRED' ? t.requestForm.errors.nameRequired : t.requestForm.errors.nameShort;
    }

    const phoneCheck = validateAndNormalizeRwandaPhone(phone);
    if (!phoneCheck.valid) {
      errors.phone =
        phoneCheck.errorCode === 'REQUIRED' ? t.requestForm.errors.phoneRequired : t.requestForm.errors.phoneInvalid;
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
      const res = await fetch('/api/public/product-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameCheck.cleaned,
          phone,
          productId: attachedProduct ? attachedProduct.id : selectedProductId || null,
          message,
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

      const confirmation = data as ProductRequestConfirmation;
      navigate('/request/confirmed', { state: { confirmation } });
    } catch {
      setSubmitError(t.requestForm.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {attachedProduct && attachedName && (
        <div className="p-3.5 rounded-md bg-[#FBF7EF] border border-[#E9E7E1]">
          <div className="text-xs font-medium text-[#647067]">{t.requestForm.attachedProductLabel}</div>
          <div className="text-sm font-semibold text-[#252B25] mt-0.5">{attachedName}</div>
        </div>
      )}

      {/* Honeypot anti-spam field hidden from real users */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website_url">Website</label>
        <input
          id="website_url"
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="req-name" className="block text-sm font-semibold text-[#252B25] mb-1.5">
          {t.requestForm.nameLabel} <span className="text-[#C0392B]">*</span>
        </label>
        <input
          id="req-name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.requestForm.namePlaceholder}
          className="w-full min-h-[46px] px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] placeholder:text-[#647067]/70 focus:border-[#26733E]"
        />
        {fieldErrors.name && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-[#C0392B]">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="req-phone" className="block text-sm font-semibold text-[#252B25] mb-1.5">
          {t.requestForm.phoneLabel} <span className="text-[#C0392B]">*</span>
        </label>
        <input
          id="req-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.requestForm.phonePlaceholder}
          className="w-full min-h-[46px] px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] placeholder:text-[#647067]/70 focus:border-[#26733E]"
        />
        <p className="mt-1 text-xs text-[#647067]">{t.requestForm.phoneHelp}</p>
        {fieldErrors.phone && (
          <p role="alert" className="mt-1 text-xs font-medium text-[#C0392B]">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      {!attachedProduct && (
        <div>
          <label htmlFor="req-product" className="block text-sm font-semibold text-[#252B25] mb-1.5">
            {t.requestForm.productSelectLabel}
          </label>
          <select
            id="req-product"
            name="productId"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full min-h-[46px] px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] focus:border-[#26733E]"
          >
            <option value="">{t.requestForm.productSelectDefault}</option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {lang === 'rw' && p.name_rw ? p.name_rw : p.name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="req-message" className="block text-sm font-semibold text-[#252B25] mb-1.5">
          {t.requestForm.messageLabel}
        </label>
        <textarea
          id="req-message"
          name="message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.requestForm.messagePlaceholder}
          className="w-full px-3.5 py-2.5 text-base bg-white border border-[#E9E7E1] rounded-md text-[#252B25] placeholder:text-[#647067]/70 focus:border-[#26733E]"
        />
      </div>

      <div className="p-3.5 rounded-md bg-[#F1F7F1] border border-[#E9E7E1] space-y-2.5">
        <p className="text-xs text-[#647067] leading-relaxed">{t.requestForm.consentNotice}</p>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentProcessing}
            onChange={(e) => setConsentProcessing(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#26733E] shrink-0"
          />
          <span className="text-xs font-medium text-[#252B25]">
            {t.requestForm.consentRequiredLabel} <span className="text-[#C0392B]">*</span>
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
          <span className="text-xs text-[#647067]">{t.requestForm.marketingOptInLabel}</span>
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
        {submitting ? t.requestForm.submitting : t.requestForm.submitButton}
      </button>
    </form>
  );
};
