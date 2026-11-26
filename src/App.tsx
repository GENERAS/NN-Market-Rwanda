import React, { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { JoinHubPage } from './pages/JoinPages';
import { JoinConfirmedPage, RequestConfirmedPage } from './pages/ConfirmationPages';
import { AboutPage, FaqPage, LegalPage, RequestAndContactPage } from './pages/StaticAndInfoPages';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { SeoHead } from './components/SeoHead';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
};

const NotFoundPage: React.FC = () => (
  <>
    <SeoHead title="Page Not Found | NN Market Rwanda" description="Requested page could not be found." noIndex />
    <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-20 text-center">
      <h1 className="text-3xl font-bold text-[#252B25] mb-3">Page Not Found</h1>
      <p className="text-base text-[#647067] mb-6">
        The page you are looking for is unavailable or has moved.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          to="/"
          className="px-5 py-3 min-h-[44px] rounded-md bg-[#26733E] text-white text-sm font-semibold"
        >
          Back to Home
        </Link>
        <Link
          to="/products"
          className="px-5 py-3 min-h-[44px] rounded-md bg-[#FBF7EF] border border-[#E9E7E1] text-[#252B25] text-sm font-semibold"
        >
          Browse Products
        </Link>
      </div>
    </div>
  </>
);

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/admin/*" element={<AdminDashboardPage />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/categories/:categorySlug" element={<ProductsPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/join" element={<JoinHubPage section="overview" />} />
                  <Route path="/join/requirements" element={<JoinHubPage section="requirements" />} />
                  <Route path="/join/how-it-works" element={<JoinHubPage section="how-it-works" />} />
                  <Route path="/join/confirmed" element={<JoinConfirmedPage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/request" element={<RequestAndContactPage mode="request" />} />
                  <Route path="/request/confirmed" element={<RequestConfirmedPage />} />
                  <Route path="/contact" element={<RequestAndContactPage mode="contact" />} />
                  <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
                  <Route path="/terms" element={<LegalPage type="terms" />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
