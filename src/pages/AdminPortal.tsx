import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandMark, formatKes, formatUsd, tierLabel } from '../components/BrandMark';

export function AdminPortal({
  route,
  navigate,
}: {
  route: string;
  navigate: (path: string) => void;
}) {
  const { user, apiFetch, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [overview, setOverview] = useState<any | null>(null);
  const [membersData, setMembersData] = useState<any | null>(null);
  const [providersData, setProvidersData] = useState<any | null>(null);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [subsData, setSubsData] = useState<any | null>(null);
  const [plansData, setPlansData] = useState<any | null>(null);
  const [paymentsData, setPaymentsData] = useState<any | null>(null);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [referralsData, setReferralsData] = useState<any | null>(null);
  const [settingsList, setSettingsList] = useState<any[]>([]);

  // Forms
  const [newProvider, setNewProvider] = useState({
    name: '',
    websiteUrl: '',
    sourceUrl: '',
    classification: 'verified',
    partnershipNotes: '',
  });
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    categoryId: 1,
    providerId: 1,
    instructions: '',
    rewardUsd: '2.00',
    availablePositions: '25',
    deadlineAt: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    minTier: 'verified',
    submissionRequirements: 'Submit completed evidence summary and reference.',
  });
  const [manualRate, setManualRate] = useState('130.00');
  const [manualRateNotes, setManualRateNotes] = useState('');
  const [newContract, setNewContract] = useState({
    clientName: '',
    title: '',
    revenueType: 'managed_project',
    totalValueUsd: '1000',
    commissionPct: '10',
  });
  const [newAffiliate, setNewAffiliate] = useState({
    name: '',
    category: 'AI Tools',
    websiteUrl: 'https://',
    slug: '',
    commissionRateDesc: '15% CPA',
    disclosureText: 'Disclosed authorized affiliate partner.',
  });

  const loadTab = useCallback(async () => {
    try {
      if (route === '/admin') {
        setOverview(await apiFetch('/api/admin/overview'));
      } else if (route === '/admin/members' || route === '/admin/roles') {
        setMembersData(await apiFetch('/api/admin/members'));
      } else if (route === '/admin/providers' || route === '/admin/categories') {
        setProvidersData(await apiFetch('/api/admin/providers'));
      } else if (route === '/admin/jobs') {
        const [jRes, pRes] = await Promise.all([
          apiFetch('/api/admin/jobs'),
          apiFetch('/api/admin/providers'),
        ]);
        setJobsList(jRes.jobs || []);
        setProvidersData(pRes);
        if (pRes.categories?.[0] && pRes.providers?.[0]) {
          setNewJob((prev) => ({
            ...prev,
            categoryId: prev.categoryId || pRes.categories[0].id,
            providerId: prev.providerId || pRes.providers[0].id,
          }));
        }
      } else if (route === '/admin/submissions' || route === '/admin/allocations') {
        setSubsData(await apiFetch('/api/admin/submissions'));
      } else if (route === '/admin/plans' || route === '/admin/exchange-rates') {
        setPlansData(await apiFetch('/api/admin/plans-and-rates'));
      } else if (route === '/admin/payments' || route === '/admin/subscriptions') {
        setPaymentsData(await apiFetch('/api/admin/payments'));
      } else if (route === '/admin/withdrawals') {
        const res = await apiFetch('/api/admin/withdrawals');
        setWithdrawalsList(res.withdrawals || []);
      } else if (
        route === '/admin/referrals' ||
        route === '/admin/affiliates' ||
        route === '/admin/projects'
      ) {
        setReferralsData(await apiFetch('/api/admin/referrals-overview'));
      } else if (route === '/admin/settings') {
        const res = await apiFetch('/api/admin/settings');
        setSettingsList(res.settings || []);
      }
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  }, [apiFetch, route]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  const navItems = [
    { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    { path: '/admin/members', label: 'Members & Roles', icon: Users },
    { path: '/admin/jobs', label: 'Jobs Management', icon: Briefcase },
    { path: '/admin/providers', label: 'Providers & Verification', icon: ShieldCheck },
    { path: '/admin/categories', label: 'Job Categories', icon: Layers },
    { path: '/admin/submissions', label: 'Submissions QA & Allocations', icon: CheckCircle2 },
    { path: '/admin/plans', label: 'Plans & Pricing Settings', icon: DollarSign },
    { path: '/admin/exchange-rates', label: 'USD/KES Exchange Rates', icon: Globe },
    { path: '/admin/payments', label: 'M-Pesa Payments & Refunds', icon: CreditCard },
    { path: '/admin/withdrawals', label: 'Withdrawals Payouts', icon: Wallet },
    { path: '/admin/referrals', label: 'Referral Controls', icon: Share2 },
    { path: '/admin/affiliates', label: 'Affiliate Partners', icon: Activity },
    { path: '/admin/projects', label: 'Project Contracts (10%)', icon: FileText },
    { path: '/admin/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#F6F8FB] text-[#0B1528]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1528] text-slate-200 flex flex-col transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <button type="button" onClick={() => navigate('/')}>
            <BrandMark light />
          </button>
          <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-white/10 text-xs">
          <div className="font-semibold text-white">Administrator Portal</div>
          <div className="text-amber-300 capitalize mt-0.5">{user?.roleSlug.replace('_', ' ')}</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = route === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left ${
                  active ? 'bg-[#2563EB] text-white font-semibold' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/10 text-left"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Member Portal</span>
            </button>
            {(user?.roleSlug === 'owner' || user?.roleSlug === 'finance_admin') && (
              <button
                type="button"
                onClick={() => navigate('/owner')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-300 hover:bg-white/10 text-left font-semibold"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Owner Revenue Dashboard</span>
              </button>
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-semibold">
              Admin Operations · {navItems.find((i) => i.path === route)?.label || 'Overview'}
            </div>
          </div>
          {user?.roleSlug === 'admin' && (
            <span className="text-xs text-slate-500">
              Restricted: Owner Financial Controls require Owner role
            </span>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto space-y-6">
          {banner && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
                banner.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{banner.text}</span>
              <button type="button" onClick={() => setBanner(null)} className="text-xs underline">
                Close
              </button>
            </div>
          )}

          {/* OVERVIEW */}
          {route === '/admin' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Registered Members</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {overview.stats.totalMembers}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {overview.stats.paidMembers} active paid
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Published Jobs</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {overview.stats.publishedJobs}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {overview.stats.totalJobs} total records
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Pending Submissions QA</div>
                  <div className="font-mono-num text-2xl font-bold text-[#2563EB] mt-1">
                    {overview.stats.pendingSubmissions}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Pending Withdrawals / STK</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {overview.stats.pendingWithdrawals} / {overview.stats.pendingPayments}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="font-display font-bold text-base mb-3">Admin Alerts</h2>
                  <div className="divide-y divide-slate-100 text-xs">
                    {overview.notifications.map((n: any) => (
                      <div key={n.id} className="py-2.5">
                        <div className="font-semibold text-[#0B1528]">{n.title}</div>
                        <div className="text-slate-600 mt-0.5">{n.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="font-display font-bold text-base mb-3">Recent Audit Logs</h2>
                  <div className="divide-y divide-slate-100 text-xs">
                    {overview.auditLogs.map((a: any) => (
                      <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold">{a.action}</span> · {a.entityType} #
                          {a.entityId}
                        </div>
                        <span className="text-slate-400 font-mono-num">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEMBERS & ROLES */}
          {(route === '/admin/members' || route === '/admin/roles') && membersData && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
              <h1 className="font-display text-xl font-bold mb-4">Members & Role Governance</h1>
              <table className="w-full text-sm text-left">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Tier</th>
                    <th className="py-2">Approved Jobs</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {membersData.members.map((m: any) => (
                    <tr key={m.id}>
                      <td className="py-3">
                        <div className="font-semibold">{m.fullName}</div>
                        <div className="text-slate-500">{m.email}</div>
                      </td>
                      <td className="py-3">{tierLabel(m.membershipTier)}</td>
                      <td className="py-3 font-mono-num">
                        {m.completedApprovedJobs} {m.achievement50Jobs ? '· 50+ Badge' : ''}
                      </td>
                      <td className="py-3">
                        {user?.roleSlug === 'owner' ? (
                          <select
                            value={m.roleSlug}
                            onChange={async (e) => {
                              await apiFetch(`/api/admin/members/${m.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ roleSlug: e.target.value }),
                              });
                              loadTab();
                            }}
                            className="px-2 py-1 border border-slate-200 rounded bg-white"
                          >
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                            <option value="finance_admin">finance_admin</option>
                            <option value="owner">owner</option>
                          </select>
                        ) : (
                          <span className="capitalize">{m.roleSlug}</span>
                        )}
                      </td>
                      <td className="py-3 capitalize">{m.status}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/members/${m.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                status: m.status === 'active' ? 'suspended' : 'active',
                              }),
                            });
                            loadTab();
                          }}
                          className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50"
                        >
                          {m.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* JOBS MANAGEMENT */}
          {route === '/admin/jobs' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/jobs', {
                    method: 'POST',
                    body: JSON.stringify({
                      ...newJob,
                      categoryId: Number(newJob.categoryId),
                      providerId: Number(newJob.providerId),
                      rewardUsd: Number(newJob.rewardUsd),
                      availablePositions: Number(newJob.availablePositions),
                    }),
                  });
                  setBanner({ type: 'ok', text: 'New job published to marketplace.' });
                  loadTab();
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h1 className="font-display text-xl font-bold">Create & Publish Opportunity</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    required
                    placeholder="Job Title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <select
                    value={newJob.categoryId}
                    onChange={(e) => setNewJob({ ...newJob, categoryId: Number(e.target.value) })}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {(providersData?.categories || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newJob.providerId}
                    onChange={(e) => setNewJob({ ...newJob, providerId: Number(e.target.value) })}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {(providersData?.providers || []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.classification})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Reward (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newJob.rewardUsd}
                      onChange={(e) => setNewJob({ ...newJob, rewardUsd: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Positions</label>
                    <input
                      type="number"
                      value={newJob.availablePositions}
                      onChange={(e) => setNewJob({ ...newJob, availablePositions: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Min Tier</label>
                    <select
                      value={newJob.minTier}
                      onChange={(e) => {
                        const nextTier = e.target.value;
                        const currentVal = Number(newJob.rewardUsd || 0);
                        const adjustedReward =
                          nextTier === 'free'
                            ? '0.01'
                            : currentVal < 2
                            ? '2.00'
                            : newJob.rewardUsd;
                        setNewJob({ ...newJob, minTier: nextTier, rewardUsd: adjustedReward });
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="free">Free Member ($0.01–$0.10)</option>
                      <option value="verified">Verified Member ($2.00+)</option>
                      <option value="pro">Pro Worker ($2.00+)</option>
                      <option value="top_rated">Top-Rated Worker ($2.00+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={newJob.deadlineAt}
                      onChange={(e) => setNewJob({ ...newJob, deadlineAt: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea
                    required
                    rows={2}
                    placeholder="Job description"
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                  <textarea
                    required
                    rows={2}
                    placeholder="Worker step-by-step instructions"
                    value={newJob.instructions}
                    onChange={(e) => setNewJob({ ...newJob, instructions: e.target.value })}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg"
                >
                  Publish Job
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
                <h2 className="font-display font-bold text-lg mb-4">All Marketplace Jobs</h2>
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2">Code / Title</th>
                      <th className="py-2">Provider</th>
                      <th className="py-2">Tier</th>
                      <th className="py-2 text-right">Reward</th>
                      <th className="py-2 text-right">Filled</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobsList.map((j) => (
                      <tr key={j.id}>
                        <td className="py-3">
                          <div className="font-semibold text-[#0B1528]">{j.title}</div>
                          <div className="text-slate-500">
                            {j.jobCode} · {j.categoryName} {j.isSample ? '· Sample' : ''}
                          </div>
                        </td>
                        <td className="py-3">
                          {j.providerName} ({j.providerClassification})
                        </td>
                        <td className="py-3">{tierLabel(j.minTier)}</td>
                        <td className="py-3 text-right font-mono-num text-[#16A34A] font-semibold">
                          {formatUsd(j.rewardUsd)}
                        </td>
                        <td className="py-3 text-right font-mono-num">
                          {j.filledPositions}/{j.availablePositions}
                        </td>
                        <td className="py-3 capitalize">{j.status}</td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const next = j.status === 'published' ? 'paused' : 'published';
                              await apiFetch(`/api/admin/jobs/${j.id}/status`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: next }),
                              });
                              loadTab();
                            }}
                            className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50"
                          >
                            {j.status === 'published' ? 'Pause' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/jobs/${j.id}/duplicate`, {
                                method: 'POST',
                              });
                              loadTab();
                            }}
                            className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50"
                          >
                            Duplicate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROVIDERS & CATEGORIES */}
          {(route === '/admin/providers' || route === '/admin/categories') && providersData && (
            <div className="space-y-6">
              {route === '/admin/providers' && (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await apiFetch('/api/admin/providers', {
                        method: 'POST',
                        body: JSON.stringify(newProvider),
                      });
                      setNewProvider({
                        name: '',
                        websiteUrl: '',
                        sourceUrl: '',
                        classification: 'verified',
                        partnershipNotes: '',
                      });
                      loadTab();
                    }}
                    className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                  >
                    <div>
                      <label className="block text-xs font-semibold mb-1">Provider Name</label>
                      <input
                        required
                        value={newProvider.name}
                        onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Source URL</label>
                      <input
                        value={newProvider.sourceUrl}
                        onChange={(e) =>
                          setNewProvider({ ...newProvider, sourceUrl: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Classification</label>
                      <select
                        value={newProvider.classification}
                        onChange={(e) =>
                          setNewProvider({ ...newProvider, classification: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="unverified">Unverified Provider</option>
                        <option value="verified">Verified Provider</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg h-10"
                    >
                      Register Provider
                    </button>
                  </form>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
                    <h2 className="font-display font-bold text-lg mb-4">Job Providers</h2>
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2">Provider</th>
                          <th className="py-2">Classification</th>
                          <th className="py-2">Verification</th>
                          <th className="py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {providersData.providers.map((p: any) => (
                          <tr key={p.id}>
                            <td className="py-3 font-semibold">{p.name}</td>
                            <td className="py-3 capitalize">{p.classification}</td>
                            <td className="py-3 capitalize">{p.verificationStatus}</td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/providers/${p.id}/verify`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      status: 'verified',
                                      evidenceSummary: 'Source URL & domain audit passed.',
                                    }),
                                  });
                                  loadTab();
                                }}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/providers/${p.id}/verify`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      status: 'suspended',
                                      evidenceSummary: 'Suspended by administrator.',
                                    }),
                                  });
                                  loadTab();
                                }}
                                className="px-2.5 py-1 border border-slate-200 rounded"
                              >
                                Suspend
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {route === '/admin/categories' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h1 className="font-display text-xl font-bold mb-4">
                    17 Configured Marketplace Categories
                  </h1>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {providersData.categories.map((c: any) => (
                      <div key={c.id} className="p-4 border border-slate-200 rounded-lg">
                        <div className="font-bold text-sm">{c.name}</div>
                        <div className="text-slate-500 mt-1">{c.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBMISSIONS QA & ALLOCATIONS */}
          {(route === '/admin/submissions' || route === '/admin/allocations') && subsData && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h1 className="font-display text-xl font-bold mb-4">
                  Worker Submissions Quality Review
                </h1>
                {subsData.submissions.length === 0 ? (
                  <p className="text-sm text-slate-500">No submissions queued yet.</p>
                ) : (
                  <div className="space-y-4">
                    {subsData.submissions.map((s: any) => (
                      <div key={s.id} className="p-4 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm">{s.jobTitle}</div>
                            <div className="text-xs text-slate-500">
                              Worker: {s.workerName} ({s.workerEmail}) · Reward:{' '}
                              <span className="font-mono-num text-[#16A34A] font-semibold">
                                {formatUsd(s.rewardUsd)}
                              </span>{' '}
                              · Status: <span className="capitalize font-semibold">{s.status}</span>
                            </div>
                          </div>
                          {['submitted', 'under_review', 'correction_requested'].includes(s.status) && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/submissions/${s.id}/review`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      decision: 'approved',
                                      feedback: 'QA passed. Approved for USD worker payout.',
                                    }),
                                  });
                                  setBanner({
                                    type: 'ok',
                                    text: `Submission #${s.id} approved and USD earnings credited.`,
                                  });
                                  loadTab();
                                }}
                                className="px-3 py-1.5 bg-[#16A34A] text-white text-xs font-semibold rounded-lg"
                              >
                                Approve & Credit USD
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/submissions/${s.id}/review`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      decision: 'correction_requested',
                                      feedback: 'Please expand your evaluation notes and resubmit.',
                                    }),
                                  });
                                  loadTab();
                                }}
                                className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg"
                              >
                                Request Correction
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/submissions/${s.id}/review`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      decision: 'rejected',
                                      feedback: 'Submission did not meet rubric requirements.',
                                    }),
                                  });
                                  loadTab();
                                }}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700">
                          {s.textContent}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PLANS & EXCHANGE RATES */}
          {(route === '/admin/plans' || route === '/admin/exchange-rates') && plansData && (
            <div className="space-y-6">
              {route === '/admin/plans' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h1 className="font-display text-xl font-bold">
                    Membership Tiers, USD Pricing & Billing Intervals
                  </h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plansData.plans.map((p: any) => (
                      <div key={p.id} className="p-4 border border-slate-200 rounded-xl space-y-2">
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="font-mono-num text-xl font-bold">{formatUsd(p.priceUsd)}</div>
                        <div className="text-xs text-slate-500">
                          Interval: {p.billingIntervalDays} days · Weekly limit:{' '}
                          {p.weeklyJobLimit < 0 ? 'Unlimited' : p.weeklyJobLimit}
                        </div>
                        {p.slug !== 'free' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const nextPrice = Number(p.priceUsd);
                              await apiFetch(`/api/admin/plans/${p.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  priceUsd: nextPrice,
                                  billingIntervalDays: p.billingIntervalDays,
                                }),
                              });
                              setBanner({ type: 'ok', text: `Saved ${p.name} pricing.` });
                            }}
                            className="text-xs text-[#2563EB] font-semibold"
                          >
                            Verify Config
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <h2 className="font-display font-bold text-base pt-4">
                    Configurable Commission & Minimum Payout Rules
                  </h2>
                  <div className="divide-y divide-slate-100 text-xs">
                    {plansData.pricingSettings.map((s: any) => (
                      <div key={s.key} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold">{s.key}</div>
                          <div className="text-slate-500">{s.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num font-bold text-sm">{s.valueText}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const next = window.prompt(`Update ${s.key}`, s.valueText);
                              if (!next) return;
                              await apiFetch(`/api/admin/pricing-settings/${s.key}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ valueNumeric: Number(next) }),
                              });
                              loadTab();
                            }}
                            className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {route === '/admin/exchange-rates' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display text-xl font-bold">
                        USD / KES Exchange Rate Management
                      </h1>
                      <p className="text-xs text-slate-600 mt-1">
                        Every M-Pesa STK Push captures and freezes its transaction-specific USD/KES rate.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await apiFetch('/api/admin/exchange-rates/refresh', {
                          method: 'POST',
                        });
                        setBanner({
                          type: 'ok',
                          text: `Active USD/KES rate refreshed: ${r.rate.rate.toFixed(2)} (${r.rate.source}).`,
                        });
                        loadTab();
                      }}
                      className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Fetch Live Rate
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await apiFetch('/api/admin/exchange-rates/manual', {
                        method: 'POST',
                        body: JSON.stringify({
                          rate: Number(manualRate),
                          notes: manualRateNotes,
                        }),
                      });
                      setBanner({ type: 'ok', text: 'Manual fallback USD/KES rate activated.' });
                      loadTab();
                    }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Manual Fallback Rate (1 USD = KES)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualRate}
                        onChange={(e) => setManualRate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Reason / Notes</label>
                      <input
                        value={manualRateNotes}
                        onChange={(e) => setManualRateNotes(e.target.value)}
                        placeholder="Treasury benchmark update"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0B1528] text-white text-xs font-semibold rounded-lg h-10"
                    >
                      Save Manual Rate
                    </button>
                  </form>

                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2">Rate (USD/KES)</th>
                        <th className="py-2">Source</th>
                        <th className="py-2">Notes</th>
                        <th className="py-2">Active</th>
                        <th className="py-2 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plansData.exchangeRates.map((r: any) => (
                        <tr key={r.id}>
                          <td className="py-2.5 font-mono-num font-bold">
                            {Number(r.rate).toFixed(4)}
                          </td>
                          <td className="py-2.5 uppercase">{r.source}</td>
                          <td className="py-2.5 text-slate-600">{r.notes}</td>
                          <td className="py-2.5">{r.isActive ? 'Active' : 'Historical'}</td>
                          <td className="py-2.5 text-right font-mono-num text-slate-500">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS, RECONCILIATION & REFUNDS */}
          {(route === '/admin/payments' || route === '/admin/subscriptions') && paymentsData && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
              <h1 className="font-display text-xl font-bold mb-1">
                M-Pesa Subscription Transactions & Reconciliation
              </h1>
              <p className="text-xs text-slate-600 mb-4">
                Memberships activate only after confirmed payment callback. Refunds automatically reverse associated referral commissions.
              </p>
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">USD / KES (Rate)</th>
                    <th className="py-2">Phone</th>
                    <th className="py-2">Receipt / Checkout ID</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentsData.transactions.map((t: any) => (
                    <tr key={t.id}>
                      <td className="py-3">
                        <div className="font-semibold">{t.memberName}</div>
                        <div className="text-slate-500">{t.memberEmail}</div>
                      </td>
                      <td className="py-3 capitalize">{t.planSlug}</td>
                      <td className="py-3 font-mono-num">
                        {formatUsd(t.amountUsd)} · {formatKes(t.amountKes)} (@
                        {Number(t.exchangeRate).toFixed(2)})
                      </td>
                      <td className="py-3 font-mono-num">{t.phoneNumber}</td>
                      <td className="py-3 font-mono-num">
                        {t.mpesaReceiptNumber || t.checkoutRequestId}
                      </td>
                      <td className="py-3 capitalize font-semibold">{t.status}</td>
                      <td className="py-3 text-right space-x-1.5">
                        {t.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/payments/${t.id}/reconcile-sandbox`, {
                                  method: 'POST',
                                  body: JSON.stringify({ outcome: 'confirm' }),
                                });
                                setBanner({
                                  type: 'ok',
                                  text: 'Sandbox callback confirmed. Subscription activated & referral commission awarded.',
                                });
                                loadTab();
                              }}
                              className="px-2.5 py-1 bg-[#16A34A] text-white rounded"
                            >
                              Confirm (Sandbox)
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/payments/${t.id}/reconcile-sandbox`, {
                                  method: 'POST',
                                  body: JSON.stringify({ outcome: 'cancel' }),
                                });
                                loadTab();
                              }}
                              className="px-2.5 py-1 border border-slate-300 rounded"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {t.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/payments/${t.id}/refund`, {
                                method: 'POST',
                                body: JSON.stringify({ reason: 'Admin refund & commission reversal' }),
                              });
                              setBanner({
                                type: 'ok',
                                text: 'Transaction refunded and any referral commission reversed.',
                              });
                              loadTab();
                            }}
                            className="px-2.5 py-1 bg-red-600 text-white rounded"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* WITHDRAWALS */}
          {route === '/admin/withdrawals' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
              <h1 className="font-display text-xl font-bold mb-4">
                Worker & Referral Withdrawal Processing
              </h1>
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Ledger</th>
                    <th className="py-2">Amount (USD / KES)</th>
                    <th className="py-2">M-Pesa Phone</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Process</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawalsList.map((w) => (
                    <tr key={w.id}>
                      <td className="py-3 font-semibold">{w.memberName}</td>
                      <td className="py-3 capitalize">{w.ledgerType.replace('_', ' ')}</td>
                      <td className="py-3 font-mono-num">
                        {formatUsd(w.amountUsd)} ({formatKes(w.amountKes)})
                      </td>
                      <td className="py-3 font-mono-num">{w.phoneNumber}</td>
                      <td className="py-3 capitalize font-semibold">{w.status}</td>
                      <td className="py-3 text-right space-x-2">
                        {w.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                const ref = `MPESA-OUT-${Date.now().toString().slice(-6)}`;
                                await apiFetch(`/api/admin/withdrawals/${w.id}/process`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    status: 'paid',
                                    transactionReference: ref,
                                    adminNote: 'Paid via M-Pesa B2C',
                                  }),
                                });
                                loadTab();
                              }}
                              className="px-2.5 py-1 bg-[#16A34A] text-white rounded"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/withdrawals/${w.id}/process`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    status: 'rejected',
                                    adminNote: 'Verification check failed',
                                  }),
                                });
                                loadTab();
                              }}
                              className="px-2.5 py-1 border border-red-300 text-red-700 rounded"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REFERRALS, AFFILIATES, PROJECTS */}
          {route === '/admin/referrals' && referralsData && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold mb-3">
                  Referral Commissions & Fraud Prevention
                </h1>
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2">Referrer ID</th>
                      <th className="py-2">Referred ID</th>
                      <th className="py-2 text-right">Sub USD</th>
                      <th className="py-2 text-right">Commission USD</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referralsData.commissions.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-2.5 font-mono-num">#{c.referrerUserId}</td>
                        <td className="py-2.5 font-mono-num">#{c.referredUserId}</td>
                        <td className="py-2.5 text-right font-mono-num">
                          {formatUsd(c.baseAmountUsd)}
                        </td>
                        <td className="py-2.5 text-right font-mono-num text-[#16A34A] font-semibold">
                          {formatUsd(c.commissionAmountUsd)} ({c.commissionRatePct}%)
                        </td>
                        <td className="py-2.5 capitalize">{c.status}</td>
                        <td className="py-2.5 text-right space-x-2">
                          {c.status !== 'reversed' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/referrals/commissions/${c.id}/reverse`, {
                                  method: 'POST',
                                  body: JSON.stringify({ reason: 'Admin fraud reversal' }),
                                });
                                loadTab();
                              }}
                              className="px-2.5 py-1 border border-red-300 text-red-700 rounded"
                            >
                              Reverse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {route === '/admin/affiliates' && referralsData && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/affiliates', {
                    method: 'POST',
                    body: JSON.stringify(newAffiliate),
                  });
                  setBanner({ type: 'ok', text: 'Affiliate partner added.' });
                  loadTab();
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
              >
                <input
                  required
                  placeholder="Partner Name"
                  value={newAffiliate.name}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, name: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  required
                  placeholder="Target URL (https://...)"
                  value={newAffiliate.websiteUrl}
                  onChange={(e) =>
                    setNewAffiliate({ ...newAffiliate, websiteUrl: e.target.value })
                  }
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  required
                  placeholder="Link Slug"
                  value={newAffiliate.slug}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, slug: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg h-10"
                >
                  Add Affiliate Partner
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-display font-bold text-lg mb-3">
                  Authorized Affiliate Partners
                </h2>
                <div className="divide-y divide-slate-100 text-xs">
                  {referralsData.affiliatePartners.map((p: any) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm">
                          {p.name} · {p.category}
                        </div>
                        <div className="text-slate-500">{p.disclosureText}</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const amt = window.prompt('Record earned affiliate commission (USD)', '25');
                          if (!amt) return;
                          await apiFetch(`/api/admin/affiliates/${p.id}/commission`, {
                            method: 'POST',
                            body: JSON.stringify({ amountUsd: Number(amt) }),
                          });
                          setBanner({ type: 'ok', text: 'Affiliate revenue recorded.' });
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg"
                      >
                        Record Commission
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {route === '/admin/projects' && referralsData && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/project-contracts', {
                    method: 'POST',
                    body: JSON.stringify({
                      ...newContract,
                      totalValueUsd: Number(newContract.totalValueUsd),
                      commissionPct: Number(newContract.commissionPct),
                      agreementVerified: true,
                    }),
                  });
                  setBanner({ type: 'ok', text: 'Managed project contract recorded.' });
                  loadTab();
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
              >
                <input
                  required
                  placeholder="Client Name"
                  value={newContract.clientName}
                  onChange={(e) => setNewContract({ ...newContract, clientName: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <input
                  required
                  placeholder="Project Title"
                  value={newContract.title}
                  onChange={(e) => setNewContract({ ...newContract, title: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <select
                  value={newContract.revenueType}
                  onChange={(e) => setNewContract({ ...newContract, revenueType: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="managed_project">Managed Project (10%)</option>
                  <option value="corporate">Corporate Partnership</option>
                  <option value="sponsored_placement">Sponsored Placement</option>
                </select>
                <input
                  type="number"
                  placeholder="Value USD"
                  value={newContract.totalValueUsd}
                  onChange={(e) =>
                    setNewContract({ ...newContract, totalValueUsd: e.target.value })
                  }
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-num"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg h-10"
                >
                  Record Contract
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
                <h2 className="font-display font-bold text-lg mb-3">
                  Managed Project Contracts & Platform Commissions
                </h2>
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2">Code / Client</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 text-right">Total Value</th>
                      <th className="py-2 text-right">Worker Payout</th>
                      <th className="py-2 text-right">Platform Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referralsData.projectContracts.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-2.5">
                          <div className="font-semibold">{c.title}</div>
                          <div className="text-slate-500">
                            {c.contractCode} · {c.clientName} {c.isSample ? '· Sample' : ''}
                          </div>
                        </td>
                        <td className="py-2.5 capitalize">{c.revenueType.replace('_', ' ')}</td>
                        <td className="py-2.5 text-right font-mono-num">
                          {formatUsd(c.totalValueUsd)}
                        </td>
                        <td className="py-2.5 text-right font-mono-num">
                          {formatUsd(c.workerPayoutUsd)}
                        </td>
                        <td className="py-2.5 text-right font-mono-num text-[#16A34A] font-bold">
                          {formatUsd(c.platformCommissionUsd)} ({c.commissionPct}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {route === '/admin/settings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h1 className="font-display text-xl font-bold">Platform & Content Settings</h1>
              {settingsList.map((s) => (
                <div key={s.key} className="p-4 border border-slate-200 rounded-lg text-xs">
                  <div className="font-bold text-sm">{s.key}</div>
                  <pre className="mt-2 p-3 bg-slate-50 rounded overflow-x-auto font-mono-num">
                    {JSON.stringify(s.valueJson, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
