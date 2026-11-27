import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { HelpCircle, Home, Menu, MessageSquarePlus, ShoppingBag, UserPlus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang, t, bootstrap } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const siteName = bootstrap?.settings?.site_name || t.brand;
  const disclosureBlock = bootstrap?.content?.disclosure;
  const disclosureText =
    lang === 'rw' && disclosureBlock?.body_rw
      ? disclosureBlock.body_rw
      : disclosureBlock?.body_en ||
        'NN Market Rwanda is an independently operated marketing and customer-assistance platform run by an N-Nutrition marketing agent. We are not the official corporate website of N-Nutrition & Market.';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 border-b-2 ${
      isActive
        ? 'text-[#1F5138] border-[#1F5138]'
        : 'text-[#1E2420] border-transparent hover:text-[#9C661F]'
    }`;

  const isPathMatch = (prefix: string) => {
    if (prefix === '/') return location.pathname === '/';
    if (prefix === '/products') {
      return location.pathname.startsWith('/products') || location.pathname.startsWith('/categories');
    }
    return location.pathname.startsWith(prefix);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1E2420] pb-[68px] md:pb-0">
      {/* Slim static utility strip for independent notice + visible bilingual selector */}
      <div className="bg-[#F9F5EC] border-b border-[#E5DEC9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-xs">
          <p className="text-[#5C6760] truncate">{t.independentTopNotice}</p>
          <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Language selector">
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                lang === 'en'
                  ? 'bg-[#1F5138] text-white'
                  : 'text-[#1E2420] hover:bg-[#E5DEC9]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('rw')}
              aria-pressed={lang === 'rw'}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                lang === 'rw'
                  ? 'bg-[#1F5138] text-white'
                  : 'text-[#1E2420] hover:bg-[#E5DEC9]'
              }`}
            >
              Kinyarwanda
            </button>
          </div>
        </div>
      </div>

      {/* Strict 3-zone Top Bar (compact h-14 on mobile to stay well under 15% sticky cap with bottom nav) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E5DEC9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            className="text-lg sm:text-xl font-bold tracking-tight text-[#1F5138] whitespace-nowrap shrink-0"
          >
            {siteName}
          </Link>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <NavLink to="/" end className={navLinkClass}>
              {t.nav.home}
            </NavLink>
            <NavLink to="/products" className={navLinkClass}>
              {t.nav.products}
            </NavLink>
            <NavLink to="/join" className={navLinkClass}>
              {t.nav.join}
            </NavLink>
            <NavLink to="/faq" className={navLinkClass}>
              {t.nav.faq}
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              {t.nav.about}
            </NavLink>
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/request"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-[#1F5138] hover:bg-[#173D2A] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.requestAction}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-[#E5DEC9] text-[#1E2420] hover:bg-[#F9F5EC]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer for Secondary Links */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[#E5DEC9] bg-white px-4 py-4 space-y-2"
          >
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 min-h-[44px] rounded-md text-base font-medium text-[#1E2420] hover:bg-[#EEF5F0]"
            >
              {t.nav.home}
            </Link>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 min-h-[44px] rounded-md text-base font-medium text-[#1E2420] hover:bg-[#EEF5F0]"
            >
              {t.nav.products}
            </Link>
            <Link
              to="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 min-h-[44px] rounded-md text-base font-medium text-[#1E2420] hover:bg-[#EEF5F0]"
            >
              {t.nav.join}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 min-h-[44px] rounded-md text-base font-medium text-[#1E2420] hover:bg-[#EEF5F0]"
            >
              {t.nav.faq}
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 min-h-[44px] rounded-md text-base font-medium text-[#1E2420] hover:bg-[#EEF5F0]"
            >
              {t.nav.about}
            </Link>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/request"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-3 min-h-[44px] rounded-md text-sm font-semibold text-white bg-[#1F5138]"
              >
                {t.nav.requestAction}
              </Link>
              <Link
                to="/join"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-3 min-h-[44px] rounded-md text-sm font-semibold text-[#9C661F] bg-[#F9F5EC] border border-[#E5DEC9]"
              >
                {t.join.topCta}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Quiet, transparent Footer */}
      <footer className="bg-[#F9F5EC] border-t border-[#E5DEC9] mt-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#E5DEC9]">
            <div className="md:col-span-5">
              <div className="text-lg font-bold text-[#1F5138] mb-3">{siteName}</div>
              <p className="text-sm text-[#5C6760] leading-relaxed">{disclosureText}</p>
            </div>

            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold text-[#1E2420] mb-3">{t.footer.quickLinks}</h2>
              <ul className="space-y-2 text-sm text-[#5C6760]">
                <li>
                  <Link to="/products" className="hover:text-[#1F5138]">
                    {t.nav.products}
                  </Link>
                </li>
                <li>
                  <Link to="/request" className="hover:text-[#1F5138]">
                    {t.nav.requestAction}
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-[#1F5138]">
                    {t.nav.faq}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#1F5138]">
                    {t.nav.about}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h2 className="text-sm font-semibold text-[#1E2420] mb-3">{t.footer.joiningLinks}</h2>
              <ul className="space-y-2 text-sm text-[#5C6760]">
                <li>
                  <Link to="/join" className="hover:text-[#1F5138]">
                    {t.nav.join}
                  </Link>
                </li>
                <li>
                  <Link to="/join/requirements" className="hover:text-[#1F5138]">
                    {t.join.navRequirements}
                  </Link>
                </li>
                <li>
                  <Link to="/join/how-it-works" className="hover:text-[#1F5138]">
                    {t.join.navHowItWorks}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold text-[#1E2420] mb-3">{t.footer.legalLinks}</h2>
              <ul className="space-y-2 text-sm text-[#5C6760]">
                <li>
                  <Link to="/contact" className="hover:text-[#1F5138]">
                    {t.footer.contactLink}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-[#1F5138]">
                    {t.footer.privacyLink}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#1F5138]">
                    {t.footer.termsLink}
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-[#9C661F]">
                    {t.footer.adminLink}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#5C6760]">
            <p>{t.footer.rights}</p>
            <p>{t.productDetail.medicalNoticeBody}</p>
          </div>
        </div>
      </footer>

      {/* Fixed Mobile Bottom Navigation Bar (one-handed thumb access for zero-tech users) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[62px] bg-white/95 backdrop-blur-md border-t border-[#E5DEC9] pb-safe"
      >
        <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
          <Link
            to="/"
            aria-current={isPathMatch('/') ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[11px] transition-colors whitespace-nowrap ${
              isPathMatch('/') ? 'bg-[#EEF5F0] text-[#1F5138] font-bold' : 'text-[#5C6760] font-medium'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>{t.nav.bottomHome}</span>
          </Link>

          <Link
            to="/products"
            aria-current={isPathMatch('/products') ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[11px] transition-colors whitespace-nowrap ${
              isPathMatch('/products') ? 'bg-[#EEF5F0] text-[#1F5138] font-bold' : 'text-[#5C6760] font-medium'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>{t.nav.bottomProducts}</span>
          </Link>

          <Link
            to="/request"
            aria-current={isPathMatch('/request') ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[11px] transition-colors whitespace-nowrap ${
              isPathMatch('/request') ? 'bg-[#EEF5F0] text-[#1F5138] font-bold' : 'text-[#1F5138] font-semibold'
            }`}
          >
            <MessageSquarePlus className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>{t.nav.bottomRequest}</span>
          </Link>

          <Link
            to="/join"
            aria-current={isPathMatch('/join') ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[11px] transition-colors whitespace-nowrap ${
              isPathMatch('/join') ? 'bg-[#EEF5F0] text-[#1F5138] font-bold' : 'text-[#5C6760] font-medium'
            }`}
          >
            <UserPlus className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>{t.nav.bottomJoin}</span>
          </Link>

          <Link
            to="/faq"
            aria-current={isPathMatch('/faq') ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[11px] transition-colors whitespace-nowrap ${
              isPathMatch('/faq') ? 'bg-[#EEF5F0] text-[#1F5138] font-bold' : 'text-[#5C6760] font-medium'
            }`}
          >
            <HelpCircle className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>{t.nav.bottomHelp}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};
