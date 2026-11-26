import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ContentBlock, Faq } from '../../types';

export const AdminContentSettingsTab: React.FC<{
  mode: 'content' | 'settings';
  onDataChanged: () => void;
}> = ({ mode, onDataChanged }) => {
  const { adminToken } = useApp();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newFaq, setNewFaq] = useState({
    scope: 'general',
    question_en: '',
    question_rw: '',
    answer_en: '',
    answer_rw: '',
  });

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      if (mode === 'content') {
        const [cRes, fRes] = await Promise.all([
          fetch('/api/admin/content', { headers: { Authorization: `Bearer ${adminToken}` } }),
          fetch('/api/admin/faqs', { headers: { Authorization: `Bearer ${adminToken}` } }),
        ]);
        const cData = await cRes.json();
        const fData = await fRes.json();
        setBlocks(cData.items || []);
        setFaqs(fData.items || []);
      } else {
        const sRes = await fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const sData = await sRes.json();
        setSettings(sData.settings || {});
      }
    } finally {
      setLoading(false);
    }
  }, [adminToken, mode]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBlock(block: ContentBlock) {
    if (!adminToken) return;
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/content/${block.key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(block),
    });
    if (!res.ok) {
      setError('Could not save content block.');
      return;
    }
    setNotice(`Saved "${block.key}" content.`);
    onDataChanged();
  }

  async function addFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    const res = await fetch('/api/admin/faqs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newFaq),
    });
    if (res.ok) {
      setNewFaq({ scope: 'general', question_en: '', question_rw: '', answer_en: '', answer_rw: '' });
      setNotice('FAQ added.');
      await load();
      onDataChanged();
    }
  }

  async function deleteFaq(id: string) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/faqs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      setNotice('FAQ deleted.');
      await load();
      onDataChanged();
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    setError(null);
    setNotice(null);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not save settings.');
      return;
    }
    setNotice('Settings saved securely.');
    onDataChanged();
  }

  if (loading) return <p className="text-sm text-[#647067]">Loading...</p>;

  if (mode === 'settings') {
    return (
      <form onSubmit={saveSettings} className="space-y-6">
        {notice && (
          <div className="p-3.5 rounded-md bg-[#F1F7F1] border border-[#26733E]/30 text-sm text-[#26733E] font-medium">
            {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="p-3.5 rounded-md bg-red-50 border border-[#C0392B]/30 text-sm text-[#C0392B]">
            {error}
          </div>
        )}

        {/* Private Contact & Referral Settings */}
        <section className="bg-white border border-[#E9E7E1] rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#252B25]">Private Contact &amp; Referral Settings</h2>
            <p className="text-xs text-[#647067]">
              Strictly protected at the server level. Never returned in public page loads; only revealed after a visitor submits a valid request or joining application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#252B25] mb-1">
                Agent WhatsApp Number (Rwanda)
              </label>
              <input
                type="tel"
                value={settings.agent_whatsapp || ''}
                onChange={(e) => setSettings({ ...settings, agent_whatsapp: e.target.value })}
                placeholder="+250 788 123 456"
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#252B25] mb-1">
                Agent Phone Number (Rwanda)
              </label>
              <input
                type="tel"
                value={settings.agent_phone || ''}
                onChange={(e) => setSettings({ ...settings, agent_phone: e.target.value })}
                placeholder="+250 788 123 456"
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#252B25] mb-1">
                N_NUTRITION_REFERRAL_URL (External Registration Link)
              </label>
              <input
                type="url"
                value={settings.n_nutrition_referral_url || ''}
                onChange={(e) => setSettings({ ...settings, n_nutrition_referral_url: e.target.value })}
                placeholder="https://..."
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#252B25] mb-1">Private Business Email</label>
              <input
                type="email"
                value={settings.business_email || ''}
                onChange={(e) => setSettings({ ...settings, business_email: e.target.value })}
                placeholder="agent@example.com"
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>
          </div>
        </section>

        {/* Public General & SEO Settings */}
        <section className="bg-white border border-[#E9E7E1] rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#252B25]">Public Website &amp; SEO Defaults</h2>
            <p className="text-xs text-[#647067]">Displayed publicly across storefront pages and metadata.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#252B25] mb-1">Website Name</label>
              <input
                type="text"
                value={settings.site_name || ''}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#252B25] mb-1">Agent Display Identity</label>
              <input
                type="text"
                value={settings.agent_display_name || ''}
                onChange={(e) => setSettings({ ...settings, agent_display_name: e.target.value })}
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#252B25] mb-1">Default SEO Title</label>
              <input
                type="text"
                value={settings.seo_default_title || ''}
                onChange={(e) => setSettings({ ...settings, seo_default_title: e.target.value })}
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#252B25] mb-1">Default SEO Description</label>
              <textarea
                rows={2}
                value={settings.seo_default_description || ''}
                onChange={(e) => setSettings({ ...settings, seo_default_description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#252B25] mb-1">Request Confirmation Title (EN)</label>
              <input
                type="text"
                value={settings.request_success_title_en || ''}
                onChange={(e) => setSettings({ ...settings, request_success_title_en: e.target.value })}
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#252B25] mb-1">Request Confirmation Title (RW)</label>
              <input
                type="text"
                value={settings.request_success_title_rw || ''}
                onChange={(e) => setSettings({ ...settings, request_success_title_rw: e.target.value })}
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 min-h-[44px] rounded-md bg-[#26733E] text-white text-sm font-semibold"
            >
              Save All Settings
            </button>
          </div>
        </section>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      {notice && (
        <div className="p-3.5 rounded-md bg-[#F1F7F1] border border-[#26733E]/30 text-sm text-[#26733E] font-medium">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="p-3.5 rounded-md bg-red-50 border border-[#C0392B]/30 text-sm text-[#C0392B]">
          {error}
        </div>
      )}

      {/* Website Content Blocks */}
      <section className="bg-white border border-[#E9E7E1] rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#252B25]">Editable Bilingual Website Content</h2>
          <p className="text-xs text-[#647067]">
            Update Homepage, Joining Requirements, Costs, About, Privacy Policy, and Terms without modifying code.
          </p>
        </div>

        <div className="space-y-6">
          {blocks.map((block, idx) => (
            <div key={block.key} className="p-4 rounded-lg border border-[#E9E7E1] bg-[#FBF7EF]/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#A87936]">
                  {block.section.toUpperCase()} · {block.key}
                </span>
                <select
                  value={block.verification_status}
                  onChange={(e) => {
                    const next = [...blocks];
                    next[idx] = { ...block, verification_status: e.target.value as ContentBlock['verification_status'] };
                    setBlocks(next);
                  }}
                  className="min-h-[36px] px-2.5 py-1 text-xs bg-white border border-[#E9E7E1] rounded"
                >
                  <option value="verified">Verified</option>
                  <option value="awaiting_confirmation">Awaiting confirmation</option>
                  <option value="not_available">Not currently available</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={block.title_en}
                  onChange={(e) => {
                    const next = [...blocks];
                    next[idx] = { ...block, title_en: e.target.value };
                    setBlocks(next);
                  }}
                  placeholder="Title (EN)"
                  className="min-h-[38px] px-3 py-1.5 text-sm bg-white border border-[#E9E7E1] rounded"
                />
                <input
                  type="text"
                  value={block.title_rw}
                  onChange={(e) => {
                    const next = [...blocks];
                    next[idx] = { ...block, title_rw: e.target.value };
                    setBlocks(next);
                  }}
                  placeholder="Title (RW)"
                  className="min-h-[38px] px-3 py-1.5 text-sm bg-white border border-[#E9E7E1] rounded"
                />
                <textarea
                  rows={3}
                  value={block.body_en}
                  onChange={(e) => {
                    const next = [...blocks];
                    next[idx] = { ...block, body_en: e.target.value };
                    setBlocks(next);
                  }}
                  placeholder="Body (EN)"
                  className="px-3 py-2 text-xs bg-white border border-[#E9E7E1] rounded"
                />
                <textarea
                  rows={3}
                  value={block.body_rw}
                  onChange={(e) => {
                    const next = [...blocks];
                    next[idx] = { ...block, body_rw: e.target.value };
                    setBlocks(next);
                  }}
                  placeholder="Body (RW)"
                  className="px-3 py-2 text-xs bg-white border border-[#E9E7E1] rounded"
                />
              </div>

              <button
                type="button"
                onClick={() => saveBlock(block)}
                className="px-4 py-2 min-h-[38px] rounded bg-[#26733E] text-white text-xs font-semibold"
              >
                Save {block.key}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs Management */}
      <section className="bg-white border border-[#E9E7E1] rounded-lg p-6 space-y-5">
        <h2 className="text-lg font-bold text-[#252B25]">FAQ Management</h2>
        <form onSubmit={addFaq} className="p-4 rounded-lg bg-[#FBF7EF] border border-[#E9E7E1] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={newFaq.scope}
              onChange={(e) => setNewFaq({ ...newFaq, scope: e.target.value })}
              className="min-h-[40px] px-3 py-1.5 text-sm bg-white border border-[#E9E7E1] rounded"
            >
              <option value="general">General</option>
              <option value="joining">Joining</option>
            </select>
            <input
              type="text"
              required
              value={newFaq.question_en}
              onChange={(e) => setNewFaq({ ...newFaq, question_en: e.target.value })}
              placeholder="Question (English)"
              className="min-h-[40px] px-3 py-1.5 text-sm bg-white border border-[#E9E7E1] rounded"
            />
            <input
              type="text"
              value={newFaq.question_rw}
              onChange={(e) => setNewFaq({ ...newFaq, question_rw: e.target.value })}
              placeholder="Question (Kinyarwanda)"
              className="min-h-[40px] px-3 py-1.5 text-sm bg-white border border-[#E9E7E1] rounded"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <textarea
              rows={2}
              required
              value={newFaq.answer_en}
              onChange={(e) => setNewFaq({ ...newFaq, answer_en: e.target.value })}
              placeholder="Answer (English)"
              className="px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded"
            />
            <textarea
              rows={2}
              value={newFaq.answer_rw}
              onChange={(e) => setNewFaq({ ...newFaq, answer_rw: e.target.value })}
              placeholder="Answer (Kinyarwanda)"
              className="px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 min-h-[40px] rounded bg-[#26733E] text-white text-xs font-semibold"
          >
            Add FAQ
          </button>
        </form>

        <div className="divide-y divide-[#E9E7E1]">
          {faqs.map((faq) => (
            <div key={faq.id} className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-[#A87936]">{faq.scope}</div>
                <div className="text-sm font-semibold text-[#252B25]">{faq.question_en}</div>
                <div className="text-xs text-[#647067] mt-0.5">{faq.answer_en}</div>
              </div>
              <button
                type="button"
                onClick={() => deleteFaq(faq.id)}
                className="text-xs font-semibold text-[#C0392B] hover:underline shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
