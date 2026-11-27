import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  SlidersHorizontal,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SeoHead } from '../../components/SeoHead';
import { AdminAuthPage } from './AdminAuthPage';
import { AdminProductsTab } from './AdminProductsTab';
import { AdminLeadsTab } from './AdminLeadsTab';
import { AdminContentSettingsTab } from './AdminContentSettingsTab';

type AdminTab = 'overview' | 'products' | 'requests' | 'applications' | 'customers' | 'content' | 'settings';

interface OverviewStats {
  totalProducts: number;
  publishedProducts: number;
  unavailableProducts: number;
  totalRequests: number;
  newRequests: number;
  contactedRequests: number;
  completedRequests: number;
  totalApplications: number;
  newApplications: number;
  referralClickCount: number;
  completedApplications: number;
  totalSiteViews: number;
  productViews: number;
  totalCustomers: number;
  repeatCustomerCount: number;
  emailsCollectedCount: number;
  requestConversionRate: number;
  salesConversionRate: number;
  referralClickRate: number;
  referralCompletionRate: number;
}

interface TopRequestedProduct {
  product_name: string;
  request_count: number;
  completed_count: number;
}

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { adminToken, adminUser, setAdminSession, refreshBootstrap } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [moreOpen, setMoreOpen] = useState(false);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopRequestedProduct[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  const loadOverview = useCallback(async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status === 401) {
      setAdminSession(null, null);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
      setTopProducts(data.topRequestedProducts || []);
      setAuditLogs(data.recentAudit || []);
    }
  }, [adminToken, setAdminSession]);

  useEffect(() => {
    if (adminToken) {
      loadOverview();
    }
  }, [adminToken, loadOverview]);

  if (!adminToken) {
    return <AdminAuthPage />;
  }

  const handleDataChanged = () => {
    loadOverview();
    refreshBootstrap();
  };

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products & Categories' },
    { id: 'requests', label: 'Product Requests' },
    { id: 'applications', label: 'Joining Applications' },
    { id: 'customers', label: 'Customers' },
    { id: 'content', label: 'Content & FAQs' },
    { id: 'settings', label: 'Settings & Referral' },
  ];

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMoreOpen(false);
  };

  const isMoreActive = activeTab === 'customers' || activeTab === 'content' || activeTab === 'settings';

  return (
    <>
      <SeoHead title="Admin Dashboard | NN Market Rwanda" description="Protected operations console." noIndex />
      <div className="min-h-screen bg-[#F9F5EC] pb-[76px] md:pb-8">
        <header className="sticky top-0 z-30 bg-white border-b border-[#E5DEC9]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm sm:text-lg font-bold text-[#9C661F] truncate">
                NN Market Admin
              </span>
              <Link to="/" className="text-xs font-semibold text-[#1F5138] hover:underline whitespace-nowrap shrink-0">
                Public Site
              </Link>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline text-xs text-[#5C6760]">{adminUser?.email}</span>
              <button
                type="button"
                onClick={() => setAdminSession(null, null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-md border border-[#E5DEC9] text-xs font-semibold text-[#1E2420] hover:bg-[#F9F5EC]"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Desktop Tab Bar */}
          <nav aria-label="Admin sections" className="hidden md:flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`px-4 py-2 min-h-[40px] rounded-md text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1F5138] text-white'
                    : 'bg-white border border-[#E5DEC9] text-[#1E2420] hover:border-[#9C661F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <div className="space-y-5">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {[
                      { label: 'Total Products', val: stats.totalProducts },
                      { label: 'Published', val: stats.publishedProducts },
                      { label: 'Unavailable', val: stats.unavailableProducts },
                      { label: 'Total Requests', val: stats.totalRequests },
                      { label: 'New Requests', val: stats.newRequests },
                      { label: 'Contacted', val: stats.contactedRequests },
                      { label: 'Completed Sales', val: stats.completedRequests },
                      { label: 'Joining Apps', val: stats.totalApplications },
                      { label: 'New Joining', val: stats.newApplications },
                      { label: 'Completed Join', val: stats.completedApplications },
                    ].map((item) => (
                      <div key={item.label} className="bg-white border border-[#E5DEC9] rounded-xl p-3.5 sm:p-4">
                        <div className="text-xs text-[#5C6760] mb-1 truncate">{item.label}</div>
                        <div className="text-xl sm:text-2xl font-bold text-[#1E2420] tabular-nums">{item.val}</div>
                      </div>
                    ))}
                  </div>

                  <section className="bg-white border border-[#E5DEC9] rounded-xl p-4 sm:p-6">
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-[#1E2420]">Business Funnel &amp; Conversion Metrics</h2>
                      <p className="text-xs text-[#5C6760]">
                        Measured from anonymous site views, requests, referral clicks, and verified completions.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      {[
                        { label: 'Total Site Views', val: String(stats.totalSiteViews) },
                        { label: 'Product Views', val: String(stats.productViews) },
                        { label: 'Request Rate', val: `${stats.requestConversionRate}%` },
                        { label: 'Sales Completion', val: `${stats.salesConversionRate}%` },
                        { label: 'Referral Clicks', val: String(stats.referralClickCount) },
                        { label: 'Referral Click Rate', val: `${stats.referralClickRate}%` },
                        { label: 'Join Completion', val: `${stats.referralCompletionRate}%` },
                        {
                          label: 'Customers / Repeat',
                          val: `${stats.totalCustomers} (${stats.repeatCustomerCount} repeat)`,
                        },
                        { label: 'Emails Collected', val: String(stats.emailsCollectedCount) },
                      ].map((metric) => (
                        <div key={metric.label} className="p-3.5 rounded-lg bg-[#EEF5F0]/60 border border-[#E5DEC9]">
                          <div className="text-xs text-[#5C6760] mb-1 truncate">{metric.label}</div>
                          <div className="text-base sm:text-xl font-bold text-[#1F5138] tabular-nums">{metric.val}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white border border-[#E5DEC9] rounded-xl p-4 sm:p-6">
                    <h2 className="text-base font-bold text-[#1E2420] mb-3">Most Requested Products</h2>
                    {topProducts.length === 0 ? (
                      <p className="text-sm text-[#5C6760]">No product requests recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-[#E5DEC9] text-sm">
                        {topProducts.map((tp) => (
                          <div key={tp.product_name} className="py-2.5 flex items-center justify-between gap-4">
                            <span className="font-semibold text-[#1E2420]">{tp.product_name}</span>
                            <span className="text-xs text-[#5C6760] tabular-nums shrink-0">
                              {tp.request_count} requests · {tp.completed_count || 0} completed
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <p className="text-sm text-[#5C6760]">Loading database metrics...</p>
              )}

              <section className="bg-white border border-[#E5DEC9] rounded-xl p-4 sm:p-6">
                <h2 className="text-base font-bold text-[#1E2420] mb-4">Recent Administrative Activity</h2>
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-[#5C6760]">No administrative actions recorded yet.</p>
                ) : (
                  <div className="divide-y divide-[#E5DEC9] text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                        <span className="font-semibold text-[#1E2420]">
                          {log.action} <span className="font-normal text-[#5C6760]">({log.entity_type})</span>
                        </span>
                        <span className="text-[#5C6760] tabular-nums shrink-0">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'products' && <AdminProductsTab onDataChanged={handleDataChanged} />}
          {activeTab === 'requests' && <AdminLeadsTab mode="requests" onDataChanged={handleDataChanged} />}
          {activeTab === 'applications' && <AdminLeadsTab mode="applications" onDataChanged={handleDataChanged} />}
          {activeTab === 'customers' && <AdminLeadsTab mode="customers" onDataChanged={handleDataChanged} />}
          {activeTab === 'content' && <AdminContentSettingsTab mode="content" onDataChanged={handleDataChanged} />}
          {activeTab === 'settings' && <AdminContentSettingsTab mode="settings" onDataChanged={handleDataChanged} />}
        </div>

        {/* Mobile Admin Overflow Popover for Customers / Content / Settings */}
        {moreOpen && (
          <div className="md:hidden fixed bottom-[66px] right-2 z-40 w-56 bg-white border border-[#E5DEC9] rounded-xl shadow-lg p-1.5 space-y-1">
            {[
              { id: 'customers' as AdminTab, label: 'Customers Directory' },
              { id: 'content' as AdminTab, label: 'Content & FAQs' },
              { id: 'settings' as AdminTab, label: 'Settings & Referral' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`w-full text-left px-3 py-2.5 min-h-[42px] rounded-md text-xs font-semibold ${
                  activeTab === item.id ? 'bg-[#EEF5F0] text-[#1F5138]' : 'text-[#1E2420] hover:bg-[#F9F5EC]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Bottom Admin Navigation */}
        <nav
          aria-label="Mobile admin navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[62px] pb-safe bg-white border-t border-[#E5DEC9] flex items-stretch justify-around px-1"
        >
          <button
            type="button"
            onClick={() => selectTab('overview')}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              activeTab === 'overview' ? 'text-[#1F5138]' : 'text-[#5C6760]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => selectTab('products')}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              activeTab === 'products' ? 'text-[#1F5138]' : 'text-[#5C6760]'
            }`}
          >
            <Package className="w-5 h-5" aria-hidden="true" />
            <span>Products</span>
          </button>
          <button
            type="button"
            onClick={() => selectTab('requests')}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              activeTab === 'requests' ? 'text-[#1F5138]' : 'text-[#5C6760]'
            }`}
          >
            <ClipboardList className="w-5 h-5" aria-hidden="true" />
            <span>Requests</span>
          </button>
          <button
            type="button"
            onClick={() => selectTab('applications')}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              activeTab === 'applications' ? 'text-[#1F5138]' : 'text-[#5C6760]'
            }`}
          >
            <UserPlus className="w-5 h-5" aria-hidden="true" />
            <span>Joining</span>
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              isMoreActive || moreOpen ? 'text-[#1F5138]' : 'text-[#5C6760]'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </>
  );
};
