import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang, t, bootstrap } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        ? 'text-[#26733E] border-[#26733E]'
        : 'text-[#252B25] border-transparent hover:text-[#A87936]'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#252B25]">
      {/* Slim static utility strip for independent notice + visible bilingual selector */}
      <div className="bg-[#FBF7EF] border-b border-[#E9E7E1]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-xs">
          <p className="text-[#647067] truncate">{t.independentTopNotice}</p>
          <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Language selector">
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                lang === 'en'
                  ? 'bg-[#26733E] text-white'
                  : 'text-[#252B25] hover:bg-[#E9E7E1]'
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
                  ? 'bg-[#26733E] text-white'
                  : 'text-[#252B25] hover:bg-[#E9E7E1]'
              }`}
            >
              Kinyarwanda
            </button>
          </div>
        </div>
      </div>

      {/* Strict 3-zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E9E7E1]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            className="text-lg sm:text-xl font-bold tracking-tight text-[#A87936] whitespace-nowrap shrink-0"
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
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/request"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-[#26733E] hover:bg-[#1e5c31] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.requestAction}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-[#E9E7E1] text-[#252B25] hover:bg-[#FBF7EF]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[#E9E7E1] bg-white px-4 py-4 space-y-2"
          >
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-[#252B25] hover:bg-[#F1F7F1]"
            >
              {t.nav.home}
            </Link>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-[#252B25] hover:bg-[#F1F7F1]"
            >
              {t.nav.products}
            </Link>
            <Link
              to="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-[#252B25] hover:bg-[#F1F7F1]"
            >
              {t.nav.join}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-[#252B25] hover:bg-[#F1F7F1]"
            >
              {t.nav.faq}
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-md text-base font-medium text-[#252B25] hover:bg-[#F1F7F1]"
            >
              {t.nav.about}
            </Link>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/request"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-3 min-h-[44px] rounded-md text-sm font-semibold text-white bg-[#26733E]"
              >
                {t.nav.requestAction}
              </Link>
              <Link
                to="/join"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-3 min-h-[44px] rounded-md text-sm font-semibold text-[#A87936] bg-[#FBF7EF] border border-[#E9E7E1]"
              >
                {t.nav.join}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Quiet, transparent Footer */}
      <footer className="bg-[#FBF7EF] border-t border-[#E9E7E1] mt-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#E9E7E1]">
            <div className="md:col-span-5">
              <div className="text-lg font-bold text-[#A87936] mb-3">{siteName}</div>
              <p className="text-sm text-[#647067] leading-relaxed">{disclosureText}</p>
            </div>

            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold text-[#252B25] mb-3">{t.footer.quickLinks}</h2>
              <ul className="space-y-2 text-sm text-[#647067]">
                <li>
                  <Link to="/products" className="hover:text-[#26733E]">
                    {t.nav.products}
                  </Link>
                </li>
                <li>
                  <Link to="/request" className="hover:text-[#26733E]">
                    {t.nav.requestAction}
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-[#26733E]">
                    {t.nav.faq}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#26733E]">
                    {t.nav.about}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h2 className="text-sm font-semibold text-[#252B25] mb-3">{t.footer.joiningLinks}</h2>
              <ul className="space-y-2 text-sm text-[#647067]">
                <li>
                  <Link to="/join" className="hover:text-[#26733E]">
                    {t.nav.join}
                  </Link>
                </li>
                <li>
                  <Link to="/join/requirements" className="hover:text-[#26733E]">
                    {t.join.navRequirements}
                  </Link>
                </li>
                <li>
                  <Link to="/join/how-it-works" className="hover:text-[#26733E]">
                    {t.join.navHowItWorks}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold text-[#252B25] mb-3">{t.footer.legalLinks}</h2>
              <ul className="space-y-2 text-sm text-[#647067]">
                <li>
                  <Link to="/contact" className="hover:text-[#26733E]">
                    {t.footer.contactLink}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-[#26733E]">
                    {t.footer.privacyLink}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#26733E]">
                    {t.footer.termsLink}
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-[#A87936]">
                    {t.footer.adminLink}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#647067]">
            <p>{t.footer.rights}</p>
            <p>{t.productDetail.medicalNoticeBody}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
