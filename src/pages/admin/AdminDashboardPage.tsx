import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
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
  completedApplications: number;
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
  const [stats, setStats] = useState<OverviewStats | null>(null);
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

  return (
    <>
      <SeoHead title="Admin Dashboard | NN Market Rwanda" description="Protected operations console." noIndex />
      <div className="min-h-screen bg-[#FBF7EF]">
        <header className="bg-white border-b border-[#E9E7E1]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-base sm:text-lg font-bold text-[#A87936] whitespace-nowrap">
                NN Market Rwanda Admin
              </span>
              <Link to="/" className="text-xs font-semibold text-[#26733E] hover:underline whitespace-nowrap">
                View Public Site
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-[#647067]">{adminUser?.email}</span>
              <button
                type="button"
                onClick={() => setAdminSession(null, null)}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-md border border-[#E9E7E1] text-xs font-semibold text-[#252B25] hover:bg-[#FBF7EF]"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Tab Bar */}
          <nav aria-label="Admin sections" className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 min-h-[40px] rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#26733E] text-white'
                    : 'bg-white border border-[#E9E7E1] text-[#252B25] hover:border-[#A87936]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Products', val: stats.totalProducts },
                    { label: 'Published Products', val: stats.publishedProducts },
                    { label: 'Unavailable Products', val: stats.unavailableProducts },
                    { label: 'Total Requests', val: stats.totalRequests },
                    { label: 'New Requests', val: stats.newRequests },
                    { label: 'Requests Contacted', val: stats.contactedRequests },
                    { label: 'Completed Requests', val: stats.completedRequests },
                    { label: 'Total Joining Apps', val: stats.totalApplications },
                    { label: 'New Joining Apps', val: stats.newApplications },
                    { label: 'Completed Joining', val: stats.completedApplications },
                  ].map((item) => (
                    <div key={item.label} className="bg-white border border-[#E9E7E1] rounded-lg p-4">
                      <div className="text-xs text-[#647067] mb-1">{item.label}</div>
                      <div className="text-2xl font-bold text-[#252B25] tabular-nums">{item.val}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#647067]">Loading database metrics...</p>
              )}

              <section className="bg-white border border-[#E9E7E1] rounded-lg p-6">
                <h2 className="text-base font-bold text-[#252B25] mb-4">Recent Administrative Activity</h2>
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-[#647067]">No administrative actions recorded yet.</p>
                ) : (
                  <div className="divide-y divide-[#E9E7E1] text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                        <span className="font-semibold text-[#252B25]">
                          {log.action} <span className="font-normal text-[#647067]">({log.entity_type})</span>
                        </span>
                        <span className="text-[#647067] tabular-nums">
                          {new Date(log.created_at).toLocaleString()}
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
      </div>
    </>
  );
};
