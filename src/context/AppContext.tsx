import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Language, PublicBootstrap } from '../types';
import { getTranslations } from '../i18n/translations';
import { fetchPublicBootstrap } from '../utils/publicCatalogClient';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phoneNormalized?: string;
  role: string;
}

interface AppContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: ReturnType<typeof getTranslations>;
  bootstrap: PublicBootstrap | null;
  loadingBootstrap: boolean;
  bootstrapError: string | null;
  refreshBootstrap: () => Promise<void>;
  adminToken: string | null;
  adminUser: AdminUser | null;
  setAdminSession: (token: string | null, user: AdminUser | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = window.localStorage.getItem('nn_lang');
      return saved === 'rw' ? 'rw' : 'en';
    } catch {
      return 'en';
    }
  });

  const [bootstrap, setBootstrap] = useState<PublicBootstrap | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  // Admin auth token held strictly in React memory (never persisted to localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem('nn_lang', next);
    } catch {
      // ignore storage failure
    }
  }, []);

  const refreshBootstrap = useCallback(async () => {
    setLoadingBootstrap(true);
    setBootstrapError(null);
    try {
      const data = await fetchPublicBootstrap();
      setBootstrap(data);
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoadingBootstrap(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  const setAdminSession = useCallback((token: string | null, user: AdminUser | null) => {
    setAdminToken(token);
    setAdminUser(user);
  }, []);

  const t = getTranslations(lang);

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        bootstrap,
        loadingBootstrap,
        bootstrapError,
        refreshBootstrap,
        adminToken,
        adminUser,
        setAdminSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
