import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Unlock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SeoHead } from '../../components/SeoHead';

async function parseJsonSafe(res: Response): Promise<{ ok: boolean; data: Record<string, unknown> | null }> {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    return { ok: false, data: null };
  }
  try {
    const data = (await res.json()) as Record<string, unknown>;
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  }
}

export const AdminAuthPage: React.FC = () => {
  const { setAdminSession } = useApp();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [adminLocked, setAdminLocked] = useState(false);

  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/auth/status')
      .then(async (r) => {
        const parsed = await parseJsonSafe(r);
        if (!active) return;
        if (r.ok && parsed.ok && parsed.data) {
          setNeedsSetup(Boolean(parsed.data.needsSetup));
          setAdminLocked(Boolean(parsed.data.adminLocked));
        } else {
          setAdminLocked(false);
        }
      })
      .catch(() => {
        if (active) setAdminLocked(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const endpoint = needsSetup ? '/api/admin/auth/setup' : '/api/admin/auth/login';
      const body = needsSetup
        ? { fullName, email: identifier, phone, password }
        : { identifier, email: identifier, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const parsed = await parseJsonSafe(res);
      if (!parsed.ok || !parsed.data) {
        setError(`Admin service returned HTTP ${res.status}. Please refresh or retry.`);
        return;
      }
      if (!res.ok) {
        setError(String(parsed.data.error || 'Authentication failed.'));
        return;
      }
      setAdminSession(
        String(parsed.data.token),
        parsed.data.user as { id: string; email: string; fullName: string; phoneNormalized?: string; role: string }
      );
    } catch {
      setError('Unable to reach the admin authentication endpoint.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreliveEnter() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/prelive-enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const parsed = await parseJsonSafe(res);
      if (!parsed.ok || !parsed.data) {
        setError(`Admin service returned HTTP ${res.status}. Please refresh or retry.`);
        return;
      }
      if (!res.ok) {
        setError(String(parsed.data.error || 'Could not enter admin console.'));
        return;
      }
      setAdminSession(
        String(parsed.data.token),
        parsed.data.user as { id: string; email: string; fullName: string; phoneNormalized?: string; role: string }
      );
    } catch {
      setError('Unable to reach the admin authentication endpoint.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SeoHead title="Admin Sign In | NN Market Rwanda" description="Protected administration portal." noIndex />
      <div className="min-h-screen bg-[#FBF7EF] flex flex-col justify-center px-4 py-12">
        <div className="max-w-md w-full mx-auto bg-white border border-[#E9E7E1] rounded-lg p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-md bg-[#F1F7F1] text-[#26733E] flex items-center justify-center">
              {adminLocked ? (
                <Lock className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Unlock className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#252B25]">
                {checking ? 'Checking Portal...' : needsSetup ? 'Create Admin Account' : 'Admin Sign In'}
              </h1>
              <p className="text-xs text-[#647067]">NN Market Rwanda Operations</p>
            </div>
          </div>

          {!checking && (
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {needsSetup && (
                  <div className="p-3 rounded-md bg-[#F1F7F1] border border-[#E9E7E1] text-xs text-[#252B25]">
                    First-time setup: create your administrator credentials to manage products, customer requests, and private contact settings.
                  </div>
                )}

                {needsSetup && (
                  <div>
                    <label htmlFor="adm-name" className="block text-sm font-semibold text-[#252B25] mb-1">
                      Full Name
                    </label>
                    <input
                      id="adm-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Marketing Agent Name"
                      className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="adm-identifier" className="block text-sm font-semibold text-[#252B25] mb-1">
                    {needsSetup ? 'Admin Email' : 'Admin Email or Phone Number'}
                  </label>
                  <input
                    id="adm-identifier"
                    type={needsSetup ? 'email' : 'text'}
                    required={!needsSetup}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={needsSetup ? 'agent@example.com' : 'Email or 07XXXXXXXX'}
                    className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
                  />
                </div>

                {needsSetup && (
                  <div>
                    <label htmlFor="adm-phone" className="block text-sm font-semibold text-[#252B25] mb-1">
                      Admin Phone Number (Optional)
                    </label>
                    <input
                      id="adm-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="adm-pass" className="block text-sm font-semibold text-[#252B25] mb-1">
                    {needsSetup ? 'Password (min 6 characters)' : 'Password'}
                  </label>
                  <input
                    id="adm-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
                  />
                </div>

                {error && (
                  <div role="alert" className="p-3 rounded-md bg-red-50 border border-[#C0392B]/30 text-xs text-[#C0392B]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[46px] px-5 py-2.5 rounded-md bg-[#26733E] hover:bg-[#1e5c31] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? 'Signing in...' : needsSetup ? 'Create Admin & Enter' : 'Sign In'}
                </button>
              </form>

              {!adminLocked && !needsSetup && (
                <div className="pt-4 border-t border-[#E9E7E1] space-y-2.5">
                  <p className="text-xs text-[#647067] leading-relaxed">
                    Pre-live mode is active: admin access is unlocked so you can enter and update credentials anytime before going live.
                  </p>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePreliveEnter}
                    className="w-full min-h-[44px] px-4 py-2 rounded-md border border-[#26733E] bg-[#F1F7F1] hover:bg-[#e5f1e5] text-[#26733E] text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    Enter Admin (Pre-Live Unlocked)
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#E9E7E1] text-center">
            <Link to="/" className="text-xs font-semibold text-[#A87936] hover:underline">
              Return to Public Website
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
