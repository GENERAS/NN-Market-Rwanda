import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface RequestRow {
  id: string;
  reference_code: string;
  customer_name: string;
  phone_normalized: string;
  product_name_snapshot: string;
  message: string;
  source_page: string;
  status: string;
  internal_notes: string;
  created_at: string;
  whatsapp_customer_url: string | null;
}

interface ApplicationRow {
  id: string;
  reference_code: string;
  full_name: string;
  phone_normalized: string;
  question: string;
  status: string;
  referral_clicked: number;
  internal_notes: string;
  created_at: string;
  whatsapp_customer_url: string | null;
}

interface CustomerRow {
  phone_normalized: string;
  latest_name: string;
  request_count: number;
  application_count: number;
  marketing_opt_in: number;
  last_activity: string;
}

export const AdminLeadsTab: React.FC<{
  mode: 'requests' | 'applications' | 'customers';
  onDataChanged: () => void;
}> = ({ mode, onDataChanged }) => {
  const { adminToken } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      if (mode === 'requests') {
        const params = new URLSearchParams({ q: search, status: statusFilter });
        const res = await fetch(`/api/admin/requests?${params}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const data = await res.json();
        setRequests(data.items || []);
        const map: Record<string, string> = {};
        for (const r of data.items || []) map[r.id] = r.internal_notes || '';
        setNotesDraft(map);
      } else if (mode === 'applications') {
        const params = new URLSearchParams({ q: search, status: statusFilter });
        const res = await fetch(`/api/admin/applications?${params}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const data = await res.json();
        setApplications(data.items || []);
        const map: Record<string, string> = {};
        for (const a of data.items || []) map[a.id] = a.internal_notes || '';
        setNotesDraft(map);
      } else {
        const res = await fetch('/api/admin/customers', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const data = await res.json();
        setCustomers(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [adminToken, mode, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateRequest(id: string, status: string) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/requests/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status, internal_notes: notesDraft[id] || '' }),
    });
    if (res.ok) {
      setNotice('Request updated.');
      await load();
      onDataChanged();
    }
  }

  async function updateApplication(id: string, status: string) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status, internal_notes: notesDraft[id] || '' }),
    });
    if (res.ok) {
      setNotice('Joining application updated.');
      await load();
      onDataChanged();
    }
  }

  if (mode === 'customers') {
    return (
      <section className="bg-white border border-[#E9E7E1] rounded-lg p-6">
        <h2 className="text-lg font-bold text-[#252B25] mb-1">Customer Directory</h2>
        <p className="text-xs text-[#647067] mb-5">
          Private record of customers grouped by normalized Rwandan phone number. Never exposed publicly.
        </p>

        {loading ? (
          <p className="text-sm text-[#647067]">Loading customers...</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-[#647067]">No customer inquiries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E9E7E1] text-xs text-[#647067]">
                  <th className="py-2.5 pr-4 font-semibold">Name</th>
                  <th className="py-2.5 pr-4 font-semibold">Phone</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Requests</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Joining</th>
                  <th className="py-2.5 pr-4 font-semibold">Marketing Consent</th>
                  <th className="py-2.5 font-semibold">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E7E1]">
                {customers.map((c) => (
                  <tr key={c.phone_normalized}>
                    <td className="py-3 pr-4 font-semibold text-[#252B25]">{c.latest_name}</td>
                    <td className="py-3 pr-4 tabular-nums text-[#252B25]">{c.phone_normalized}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{c.request_count}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{c.application_count}</td>
                    <td className="py-3 pr-4 text-xs">
                      {c.marketing_opt_in === 1 ? 'Opted in' : 'Request response only'}
                    </td>
                    <td className="py-3 text-xs text-[#647067] tabular-nums">
                      {new Date(c.last_activity).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const statuses =
    mode === 'requests'
      ? ['New', 'Contacted', 'Processing', 'Completed', 'Cancelled']
      : ['New', 'Contacted', 'Referral link shared', 'External application submitted', 'Completed', 'Not proceeding'];

  return (
    <section className="bg-white border border-[#E9E7E1] rounded-lg p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#252B25]">
            {mode === 'requests' ? 'Product Requests' : 'Joining Applications'}
          </h2>
          <p className="text-xs text-[#647067]">
            Update follow-up status, store private internal notes, and message customers via WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ref, phone..."
            className="min-h-[40px] px-3 py-1.5 text-sm border border-[#E9E7E1] rounded-md"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[40px] px-3 py-1.5 text-sm border border-[#E9E7E1] rounded-md"
          >
            <option value="all">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-md bg-[#F1F7F1] border border-[#26733E]/30 text-xs font-medium text-[#26733E]">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#647067]">Loading records...</p>
      ) : mode === 'requests' ? (
        requests.length === 0 ? (
          <p className="text-sm text-[#647067]">No product requests match this filter.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="p-4 rounded-lg border border-[#E9E7E1] bg-[#FBF7EF]/40 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#A87936] tabular-nums">
                      {r.reference_code} · {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="text-base font-bold text-[#252B25]">
                      {r.customer_name} — <span className="tabular-nums text-[#26733E]">{r.phone_normalized}</span>
                    </div>
                    <div className="text-xs text-[#647067]">
                      Product: <strong>{r.product_name_snapshot}</strong> · Source: {r.source_page}
                    </div>
                    {r.message && <p className="text-sm text-[#252B25] mt-1.5">“{r.message}”</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      aria-label={`Status for ${r.reference_code}`}
                      value={r.status}
                      onChange={(e) => updateRequest(r.id, e.target.value)}
                      className="min-h-[40px] px-3 py-1.5 text-sm bg-white border border-[#E9E7E1] rounded-md font-medium"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {r.whatsapp_customer_url && (
                      <a
                        href={r.whatsapp_customer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-md bg-[#26733E] text-white text-xs font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={notesDraft[r.id] || ''}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Private internal notes (never shown publicly)..."
                    className="flex-1 min-h-[38px] px-3 py-1.5 text-xs bg-white border border-[#E9E7E1] rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => updateRequest(r.id, r.status)}
                    className="px-4 py-1.5 min-h-[38px] rounded-md bg-white border border-[#E9E7E1] text-xs font-semibold text-[#252B25] hover:border-[#26733E]"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : applications.length === 0 ? (
        <p className="text-sm text-[#647067]">No joining applications match this filter.</p>
      ) : (
        <div className="space-y-4">
          {applications.map((a) => (
            <div key={a.id} className="p-4 rounded-lg border border-[#E9E7E1] bg-[#FBF7EF]/40 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#A87936] tabular-nums">
                    {a.reference_code} · {new Date(a.created_at).toLocaleString()}
                  </div>
                  <div className="text-base font-bold text-[#252B25]">
                    {a.full_name} — <span className="tabular-nums text-[#26733E]">{a.phone_normalized}</span>
                  </div>
                  <div className="text-xs text-[#647067]">
                    Referral link clicked: <strong>{a.referral_clicked === 1 ? 'Yes' : 'Not yet'}</strong>
                  </div>
                  {a.question && <p className="text-sm text-[#252B25] mt-1.5">“{a.question}”</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    aria-label={`Status for ${a.reference_code}`}
                    value={a.status}
                    onChange={(e) => updateApplication(a.id, e.target.value)}
                    className="min-h-[40px] px-3 py-1.5 text-sm bg-white border border-[#E9E7E1] rounded-md font-medium"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {a.whatsapp_customer_url && (
                    <a
                      href={a.whatsapp_customer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-md bg-[#26733E] text-white text-xs font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={notesDraft[a.id] || ''}
                  onChange={(e) => setNotesDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                  placeholder="Private internal notes (only mark Completed when verified)..."
                  className="flex-1 min-h-[38px] px-3 py-1.5 text-xs bg-white border border-[#E9E7E1] rounded-md"
                />
                <button
                  type="button"
                  onClick={() => updateApplication(a.id, a.status)}
                  className="px-4 py-1.5 min-h-[38px] rounded-md bg-white border border-[#E9E7E1] text-xs font-semibold text-[#252B25] hover:border-[#26733E]"
                >
                  Save Note
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
