import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SeoHead } from '../../components/SeoHead';

export const AdminAuthPage: React.FC = () => {
  const { setAdminSession } = useApp();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/auth/status')
      .then((r) => r.json())
      .then((d) => {
        setNeedsSetup(Boolean(d.needsSetup));
      })
      .catch(() => {})
      .finally(() => setChecking(false));
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      setAdminSession(data.token, data.user);
    } catch {
      setError('Network error while authenticating.');
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
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#252B25]">
                {checking ? 'Checking Portal...' : needsSetup ? 'Create Admin Account' : 'Admin Sign In'}
              </h1>
              <p className="text-xs text-[#647067]">NN Market Rwanda Operations</p>
            </div>
          </div>

          {!checking && (
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
                  placeholder={needsSetup ? 'agent@example.com' : 'agent@example.com or 07XXXXXXXX'}
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
                    placeholder="07XXXXXXXX (defaults to configured admin number)"
                    className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
                  />
                </div>
              )}

              <div>
                <label htmlFor="adm-pass" className="block text-sm font-semibold text-[#252B25] mb-1">
                  {needsSetup ? 'Password (min 8 characters)' : 'Password'}
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
