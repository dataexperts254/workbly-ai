import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Bell,
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  FileCheck,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Share2,
  Shield,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandMark, formatKes, formatUsd, tierLabel } from '../components/BrandMark';
import { SimpleBarChart } from '../components/Charts';

export function MemberPortal({
  route,
  navigate,
}: {
  route: string;
  navigate: (path: string) => void;
}) {
  const { user, apiFetch, logout, refreshUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboard, setDashboard] = useState<any | null>(null);
  const [availJobs, setAvailJobs] = useState<{ allowance: any; jobs: any[] } | null>(null);
  const [workData, setWorkData] = useState<any | null>(null);
  const [earningsData, setEarningsData] = useState<any | null>(null);
  const [membershipData, setMembershipData] = useState<any | null>(null);
  const [referralData, setReferralData] = useState<any | null>(null);
  const [notifs, setNotifs] = useState<any[]>([]);

  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Submission modal state
  const [submitJob, setSubmitJob] = useState<any | null>(null);
  const [subForm, setSubForm] = useState({
    submissionType: 'text',
    textContent: '',
    externalReference: '',
    attachmentName: '',
    notes: '',
  });

  // Withdrawal form state
  const [wdForm, setWdForm] = useState({
    ledgerType: 'worker_earnings' as 'worker_earnings' | 'referral_commissions',
    amountUsd: '',
    phoneNumber: '',
  });

  // M-Pesa Subscription checkout state
  const [stkPhone, setStkPhone] = useState('');
  const [stkAutoRenew, setStkAutoRenew] = useState(false);
  const [activeStkTx, setActiveStkTx] = useState<any | null>(null);

  // Profile / Security forms
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.profile?.phone || '',
    county: user?.profile?.county || 'Nairobi',
    bio: user?.profile?.bio || '',
    preferredPayoutPhone: user?.profile?.preferredPayoutPhone || '',
    skillsText: (user?.profile?.skillsJson || []).join(', '),
  });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [copiedLink, setCopiedLink] = useState(false);

  const loadSection = useCallback(async () => {
    try {
      if (route === '/portal') {
        const d = await apiFetch('/api/member/dashboard');
        setDashboard(d);
      } else if (route === '/portal/jobs') {
        const d = await apiFetch('/api/member/jobs');
        setAvailJobs(d);
      } else if (
        route === '/portal/my-jobs' ||
        route === '/portal/my-applications' ||
        route === '/portal/my-submissions'
      ) {
        const d = await apiFetch('/api/member/work');
        setWorkData(d);
      } else if (route === '/portal/earnings' || route === '/portal/withdrawals') {
        const d = await apiFetch('/api/member/earnings');
        setEarningsData(d);
      } else if (route === '/portal/membership' || route === '/portal/payments') {
        const d = await apiFetch('/api/member/membership');
        setMembershipData(d);
      } else if (
        route === '/portal/referrals' ||
        route === '/portal/referral-wallet' ||
        route === '/portal/referral-history'
      ) {
        const d = await apiFetch('/api/member/referrals');
        setReferralData(d);
      } else if (route === '/portal/notifications') {
        const d = await apiFetch('/api/member/notifications');
        setNotifs(d.notifications || []);
      }
    } catch (err: any) {
      setBannerMsg({ type: 'err', text: err.message || 'Failed to load data.' });
    }
  }, [apiFetch, route]);

  useEffect(() => {
    loadSection();
  }, [loadSection]);

  // Poll pending M-Pesa transaction status
  useEffect(() => {
    if (!activeStkTx || activeStkTx.status !== 'pending') return;
    const timer = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/member/subscriptions/tx/${activeStkTx.id}`);
        if (res.transaction && res.transaction.status !== 'pending') {
          setActiveStkTx(res.transaction);
          await refreshUser();
          await loadSection();
        }
      } catch {
        // ignore transient poll error
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [activeStkTx, apiFetch, loadSection, refreshUser]);

  const handleAllocate = async (jobId: number) => {
    setBannerMsg(null);
    try {
      await apiFetch(`/api/member/jobs/${jobId}/allocate`, { method: 'POST' });
      setBannerMsg({
        type: 'ok',
        text: 'Opportunity allocated to your workspace. Open My Jobs to review instructions and submit work.',
      });
      await loadSection();
    } catch (err: any) {
      setBannerMsg({ type: 'err', text: err.message });
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitJob) return;
    setBannerMsg(null);
    try {
      await apiFetch('/api/member/submissions', {
        method: 'POST',
        body: JSON.stringify({
          jobId: submitJob.jobId,
          ...subForm,
        }),
      });
      setSubmitJob(null);
      setSubForm({
        submissionType: 'text',
        textContent: '',
        externalReference: '',
        attachmentName: '',
        notes: '',
      });
      setBannerMsg({
        type: 'ok',
        text: 'Work submitted for administrator QA review. Earnings are credited once approved.',
      });
      await loadSection();
    } catch (err: any) {
      setBannerMsg({ type: 'err', text: err.message });
    }
  };

  const handleInitiateMpesa = async (planSlug: 'verified' | 'pro' | 'top_rated') => {
    setBannerMsg(null);
    try {
      const res = await apiFetch('/api/member/subscriptions/initiate', {
        method: 'POST',
        body: JSON.stringify({
          planSlug,
          phoneNumber: stkPhone || user?.profile?.phone || '',
          autoRenewAuthorized: stkAutoRenew,
        }),
      });
      setActiveStkTx(res.transaction);
      setBannerMsg({
        type: 'ok',
        text: `${res.customerMessage} (${formatUsd(res.display.amountUsd)} = ${formatKes(
          res.display.amountKes
        )}).`,
      });
      await loadSection();
    } catch (err: any) {
      setBannerMsg({ type: 'err', text: err.message });
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerMsg(null);
    try {
      await apiFetch('/api/member/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          ledgerType: wdForm.ledgerType,
          amountUsd: Number(wdForm.amountUsd),
          phoneNumber: wdForm.phoneNumber,
        }),
      });
      setWdForm({ ...wdForm, amountUsd: '' });
      setBannerMsg({
        type: 'ok',
        text: 'Withdrawal request submitted. An administrator will process and record your M-Pesa payout reference.',
      });
      await loadSection();
    } catch (err: any) {
      setBannerMsg({ type: 'err', text: err.message });
    }
  };

  const navItems = [
    { path: '/portal', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/portal/jobs', label: 'Available Jobs', icon: Briefcase },
    { path: '/portal/my-jobs', label: 'My Jobs', icon: FileCheck },
    { path: '/portal/my-applications', label: 'My Applications', icon: CheckCircle2 },
    { path: '/portal/my-submissions', label: 'My Submissions', icon: TrendingUp },
    { path: '/portal/earnings', label: 'Worker Earnings', icon: DollarSign },
    { path: '/portal/withdrawals', label: 'Withdrawals', icon: Wallet },
    { path: '/portal/membership', label: 'Membership', icon: CreditCard },
    { path: '/portal/payments', label: 'Payment History', icon: CreditCard },
    { path: '/portal/referrals', label: 'Referral Dashboard', icon: Share2 },
    { path: '/portal/referral-wallet', label: 'Referral Wallet', icon: Wallet },
    { path: '/portal/referral-history', label: 'Referral History', icon: Share2 },
    { path: '/portal/notifications', label: 'Notifications', icon: Bell },
    { path: '/portal/profile', label: 'Profile Settings', icon: User },
    { path: '/portal/security', label: 'Security Settings', icon: Lock },
  ];

  const referralUrl = `${window.location.origin}/register?ref=${
    referralData?.referralCode || user?.referralCode || ''
  }`;

  return (
    <div className="min-h-screen flex bg-[#F6F8FB] text-[#0B1528]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1528] text-slate-200 flex flex-col transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <button type="button" onClick={() => navigate('/')}>
            <BrandMark light />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-white/10 text-xs">
          <div className="font-semibold text-white truncate">{user?.fullName}</div>
          <div className="text-blue-300 mt-0.5">{tierLabel(user?.membershipTier || 'free')}</div>
          {user?.achievement50Jobs && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-emerald-300">
              <Award className="w-3.5 h-3.5" /> 50 Jobs Completed Badge
            </div>
          )}
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left ${
                  active
                    ? 'bg-[#2563EB] text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {(user?.roleSlug === 'admin' ||
            user?.roleSlug === 'finance_admin' ||
            user?.roleSlug === 'owner') && (
            <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-300 hover:bg-white/10 text-left font-semibold"
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Admin Portal</span>
              </button>
              {(user?.roleSlug === 'owner' || user?.roleSlug === 'finance_admin') && (
                <button
                  type="button"
                  onClick={() => navigate('/owner')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-300 hover:bg-white/10 text-left font-semibold"
                >
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>Owner Revenue</span>
                </button>
              )}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-semibold text-[#0B1528]">
              Member Portal · {navItems.find((n) => n.path === route)?.label || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => navigate('/portal/membership')}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg whitespace-nowrap shrink-0"
            >
              {user?.membershipTier === 'top_rated' ? 'Top-Rated Active' : 'Upgrade Plan'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1240px] w-full mx-auto space-y-6">
          {bannerMsg && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-3 ${
                bannerMsg.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{bannerMsg.text}</span>
              <button type="button" onClick={() => setBannerMsg(null)} className="text-xs underline">
                Dismiss
              </button>
            </div>
          )}

          {/* 1. MEMBER DASHBOARD */}
          {route === '/portal' && dashboard && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#0B1528]">
                    Welcome back, {dashboard.user.fullName}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Current tier: <span className="font-semibold">{tierLabel(dashboard.user.membershipTier)}</span>
                    {dashboard.user.subscriptionExpiresAt
                      ? ` · Expires ${new Date(dashboard.user.subscriptionExpiresAt).toLocaleDateString()}`
                      : ' · No expiry (Free tier)'}
                    {' · '}
                    50-Job Achievement: {dashboard.user.completedApprovedJobs}/50 approved tasks
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/portal/jobs')}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg"
                  >
                    Browse Eligible Jobs ({dashboard.availableJobsCount})
                  </button>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Weekly Allowance ({dashboard.allowance.weekKey})</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {dashboard.allowance.isUnlimited
                      ? `${dashboard.allowance.usedThisWeek} / Unlimited`
                      : `${dashboard.allowance.usedThisWeek} / ${dashboard.allowance.weeklyLimit}`}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Timezone: Africa/Nairobi</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Worker Available Balance</div>
                  <div className="font-mono-num text-2xl font-bold text-[#16A34A] mt-1">
                    {formatUsd(dashboard.balances.worker.availableWithdrawalUsd)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Total earned: {formatUsd(dashboard.balances.worker.totalEarningsUsd)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Referral Wallet Balance</div>
                  <div className="font-mono-num text-2xl font-bold text-[#2563EB] mt-1">
                    {formatUsd(dashboard.balances.referral.availableReferralBalanceUsd)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Paid referrals: {dashboard.referralSummary.paidReferrals} · Code:{' '}
                    {dashboard.referralSummary.code}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Submissions Status</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    {dashboard.submissionStats.approved} Approved
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {dashboard.submissionStats.pending} pending · {dashboard.submissionStats.rejected} rejected
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="font-display font-bold text-base mb-4">
                    Recommended Eligible Opportunities
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {dashboard.recommendedJobs.map((j: any) => (
                      <div key={j.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-500">
                            {j.categoryName} · {j.providerClassification}
                          </div>
                          <div className="font-semibold text-sm text-[#0B1528]">{j.title}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono-num font-bold text-sm text-[#16A34A]">
                            {formatUsd(j.rewardUsd)}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate('/portal/jobs')}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            Allocate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h2 className="font-display font-bold text-base">Recent Approved Earnings (USD)</h2>
                  <SimpleBarChart
                    data={(dashboard.recentEarnings || []).slice(0, 7).map((e: any, idx: number) => ({
                      label: `Task ${idx + 1}`,
                      value: Number(e.amountUsd),
                    }))}
                    primaryColor="#16A34A"
                    primaryLabel="Worker Earning"
                  />
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                    Share your referral link to earn 10% on member subscriptions:
                    <div className="mt-1 font-mono-num text-[#2563EB] truncate">{referralUrl}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. AVAILABLE JOBS */}
          {route === '/portal/jobs' && availJobs && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold">Weekly Job Allocation Engine</h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Week {availJobs.allowance.weekKey} (Africa/Nairobi) · Used{' '}
                    <span className="font-mono-num font-semibold">
                      {availJobs.allowance.usedThisWeek}
                    </span>{' '}
                    of{' '}
                    <span className="font-mono-num font-semibold">
                      {availJobs.allowance.isUnlimited
                        ? 'Unlimited'
                        : availJobs.allowance.weeklyLimit}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/portal/membership')}
                  className="px-3.5 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Upgrade Weekly Limit
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {availJobs.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs text-slate-500 mb-1.5">
                        {job.jobCode} · {job.categoryName} ·{' '}
                        {job.providerClassification === 'verified'
                          ? 'Verified Provider'
                          : 'Unverified Provider'}
                        {job.isSample ? ' · Sample' : ''}
                      </div>
                      <h2 className="font-display font-bold text-lg text-[#0B1528]">{job.title}</h2>
                      <p className="text-xs text-slate-600 mt-2">{job.description}</p>
                      <div className="mt-3 text-xs text-slate-500">
                        Openings: {job.availablePositions - job.filledPositions}/{job.availablePositions}{' '}
                        · Duration: {job.estimatedDuration} · Tier: {tierLabel(job.minTier)}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="font-mono-num text-lg font-bold text-[#16A34A]">
                        {formatUsd(job.rewardUsd)}
                      </span>
                      {job.isAllocatedToMe ? (
                        <button
                          type="button"
                          onClick={() => navigate('/portal/my-jobs')}
                          className="px-4 py-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg"
                        >
                          Allocated · Open in My Jobs
                        </button>
                      ) : job.isEligible ? (
                        <button
                          type="button"
                          onClick={() => handleAllocate(job.id)}
                          className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg"
                        >
                          Allocate Opportunity
                        </button>
                      ) : (
                        <span className="text-xs text-amber-700 font-medium text-right max-w-[220px]">
                          {job.ineligibilityReason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MY JOBS / APPLICATIONS / SUBMISSIONS */}
          {(route === '/portal/my-jobs' ||
            route === '/portal/my-applications' ||
            route === '/portal/my-submissions') &&
            workData && (
              <div className="space-y-6">
                {route === '/portal/my-jobs' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h1 className="font-display text-xl font-bold mb-4">
                      My Allocated Jobs
                    </h1>
                    {workData.allocations.length === 0 ? (
                      <div className="text-sm text-slate-500 py-8 text-center">
                        No jobs allocated yet. Visit Available Jobs to claim an opportunity.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {workData.allocations.map((a: any) => (
                          <div
                            key={a.allocationId}
                            className="p-5 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="text-xs text-slate-500">
                                {a.jobCode} · Week {a.weekKey} · {a.categoryName} · Status:{' '}
                                {a.allocationStatus}
                              </div>
                              <div className="font-display font-bold text-base text-[#0B1528] mt-1">
                                {a.title}
                              </div>
                              <div className="text-xs text-slate-600 mt-1">{a.instructions}</div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono-num font-bold text-[#16A34A]">
                                {formatUsd(a.rewardUsd)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSubmitJob(a)}
                                className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg"
                              >
                                Submit Deliverable
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {route === '/portal/my-applications' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h1 className="font-display text-xl font-bold mb-4">My Applications</h1>
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                          <th className="py-2.5">Job Title</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Reward (USD)</th>
                          <th className="py-2.5 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workData.applications.map((app: any) => (
                          <tr key={app.id}>
                            <td className="py-3 font-medium">{app.jobTitle}</td>
                            <td className="py-3 capitalize">{app.status}</td>
                            <td className="py-3 text-right font-mono-num text-[#16A34A]">
                              {formatUsd(app.rewardUsd)}
                            </td>
                            <td className="py-3 text-right text-xs text-slate-500">
                              {new Date(app.appliedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {route === '/portal/my-submissions' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h1 className="font-display text-xl font-bold mb-4">
                      My Work Submissions & QA Reviews
                    </h1>
                    {workData.submissions.length === 0 ? (
                      <p className="text-sm text-slate-500 py-6 text-center">
                        No submissions yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {workData.submissions.map((s: any) => (
                          <div key={s.id} className="p-4 border border-slate-200 rounded-xl">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold text-sm">{s.jobTitle}</div>
                              <div className="text-xs font-semibold capitalize text-[#2563EB]">
                                {s.status.replace('_', ' ')} · {formatUsd(s.rewardUsd)}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-2">{s.textContent}</p>
                            {s.latestReview && (
                              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                <span className="font-semibold">Reviewer Feedback: </span>
                                {s.latestReview.feedback}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* 4. WORKER EARNINGS & WITHDRAWALS */}
          {(route === '/portal/earnings' || route === '/portal/withdrawals') && earningsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Total Worker Job Earnings</div>
                  <div className="font-mono-num text-2xl font-bold text-[#0B1528] mt-1">
                    {formatUsd(earningsData.balances.worker.totalEarningsUsd)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Available Worker Balance</div>
                  <div className="font-mono-num text-2xl font-bold text-[#16A34A] mt-1">
                    {formatUsd(earningsData.balances.worker.availableWithdrawalUsd)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Available Referral Wallet (Separate)</div>
                  <div className="font-mono-num text-2xl font-bold text-[#2563EB] mt-1">
                    {formatUsd(earningsData.balances.referral.availableReferralBalanceUsd)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">Active Exchange Rate</div>
                  <div className="font-mono-num text-2xl font-bold mt-1">
                    KES {earningsData.exchangeRate.rate.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="font-display font-bold text-lg mb-2">Request M-Pesa Withdrawal</h2>
                  <p className="text-xs text-slate-600 mb-4">
                    Worker job earnings and referral commissions are held in strictly separated ledgers. Minimum worker payout: ${earningsData.minimums.workerUsd.toFixed(2)} · Referral: ${earningsData.minimums.referralUsd.toFixed(2)}.
                  </p>
                  <form onSubmit={handleRequestWithdrawal} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Source Ledger</label>
                      <select
                        value={wdForm.ledgerType}
                        onChange={(e) =>
                          setWdForm({
                            ...wdForm,
                            ledgerType: e.target.value as 'worker_earnings' | 'referral_commissions',
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="worker_earnings">
                          Worker Job Earnings ({formatUsd(earningsData.balances.worker.availableWithdrawalUsd)})
                        </option>
                        <option value="referral_commissions">
                          Referral Commissions Wallet ({formatUsd(earningsData.balances.referral.availableReferralBalanceUsd)})
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Amount (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={wdForm.amountUsd}
                        onChange={(e) => setWdForm({ ...wdForm, amountUsd: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-num"
                      />
                      {wdForm.amountUsd && (
                        <div className="text-xs text-slate-500 mt-1 font-mono-num">
                          Est. payout: {formatKes(Number(wdForm.amountUsd) * earningsData.exchangeRate.rate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">M-Pesa Phone Number</label>
                      <input
                        required
                        placeholder="0712345678"
                        value={wdForm.phoneNumber}
                        onChange={(e) => setWdForm({ ...wdForm, phoneNumber: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
                    >
                      Submit Withdrawal Request
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
                  <h2 className="font-display font-bold text-lg mb-4">
                    {route === '/portal/earnings' ? 'Approved Earnings Ledger' : 'Withdrawal History'}
                  </h2>
                  {route === '/portal/earnings' ? (
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                          <th className="py-2">Task</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Amount (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {earningsData.earnings.map((e: any) => (
                          <tr key={e.id}>
                            <td className="py-2.5 font-medium">{e.jobTitle}</td>
                            <td className="py-2.5 capitalize">{e.status}</td>
                            <td className="py-2.5 text-right font-mono-num text-[#16A34A]">
                              {formatUsd(e.amountUsd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                          <th className="py-2">Ledger</th>
                          <th className="py-2">USD / KES</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {earningsData.withdrawals.map((w: any) => (
                          <tr key={w.id}>
                            <td className="py-2.5 capitalize text-xs">{w.ledgerType.replace('_', ' ')}</td>
                            <td className="py-2.5 font-mono-num text-xs">
                              {formatUsd(w.amountUsd)} ({formatKes(w.amountKes)})
                            </td>
                            <td className="py-2.5 capitalize text-xs">{w.status}</td>
                            <td className="py-2.5 font-mono-num text-xs">
                              {w.transactionReference || 'Pending'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. MEMBERSHIP & M-PESA PAYMENT HISTORY */}
          {(route === '/portal/membership' || route === '/portal/payments') && membershipData && (
            <div className="space-y-6">
              {route === '/portal/membership' && (
                <>
                  <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display text-xl font-bold">
                        Current Plan: {tierLabel(membershipData.currentTier)}
                      </h1>
                      <p className="text-xs text-slate-600 mt-1">
                        Live Exchange Rate: $1.00 USD = KES {membershipData.exchangeRate.rate.toFixed(2)} ·
                        Subscriptions activate strictly after confirmed Safaricom M-Pesa payment callback.
                      </p>
                    </div>
                    {membershipData.currentTier !== 'free' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch('/api/member/subscriptions/downgrade', { method: 'POST' });
                          await refreshUser();
                          await loadSection();
                        }}
                        className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Downgrade to Free Member
                      </button>
                    )}
                  </div>

                  {/* M-Pesa STK Checkout Inputs */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        M-Pesa Phone Number (for STK Push in KES)
                      </label>
                      <input
                        value={stkPhone}
                        onChange={(e) => setStkPhone(e.target.value)}
                        placeholder="e.g. 0712345678 or 254712345678"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-num"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-600 py-2">
                      <input
                        type="checkbox"
                        checked={stkAutoRenew}
                        onChange={(e) => setStkAutoRenew(e.target.checked)}
                      />
                      <span>Authorize quarterly renewal reminders & explicit renewal preference</span>
                    </label>
                  </div>

                  {activeStkTx && (
                    <div className="bg-[#0B1528] text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-blue-300">
                          M-Pesa STK Reference: {activeStkTx.checkoutRequestId}
                        </div>
                        <div className="font-semibold text-sm mt-1">
                          Status: <span className="uppercase">{activeStkTx.status}</span> ·{' '}
                          {formatUsd(activeStkTx.amountUsd)} ({formatKes(activeStkTx.amountKes)} @{' '}
                          {Number(activeStkTx.exchangeRate).toFixed(2)})
                        </div>
                      </div>
                      {activeStkTx.status === 'confirmed' && (
                        <span className="text-xs text-emerald-300 font-semibold">
                          Receipt: {activeStkTx.mpesaReceiptNumber}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {membershipData.plans.map((plan: any) => {
                      const usd = Number(plan.priceUsd);
                      const kes = Math.round(usd * membershipData.exchangeRate.rate);
                      const isCurrent = membershipData.currentTier === plan.slug;
                      return (
                        <div
                          key={plan.id}
                          className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                        >
                          <div>
                            <h2 className="font-display font-bold text-lg">{plan.name}</h2>
                            <div className="mt-2 font-mono-num text-2xl font-bold">
                              {formatUsd(usd)}
                              <span className="text-xs font-normal text-slate-500">
                                {usd === 0 ? '' : ` / ${plan.billingIntervalDays}d`}
                              </span>
                            </div>
                            {usd > 0 && (
                              <div className="text-xs font-mono-num text-[#16A34A] mt-0.5">
                                Pay {formatKes(kes)} via M-Pesa
                              </div>
                            )}
                            <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                              {(plan.featuresJson || []).map((f: string) => (
                                <li key={f} className="flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {usd > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleInitiateMpesa(plan.slug)}
                              className="mt-5 w-full py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg"
                            >
                              {isCurrent ? `Renew ${plan.name} (${formatKes(kes)})` : `Pay ${formatKes(kes)} via M-Pesa`}
                            </button>
                          ) : (
                            <div className="mt-5 text-center text-xs text-slate-500 py-2">
                              {isCurrent ? 'Current Active Plan' : 'Default Starter Tier'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
                <h2 className="font-display font-bold text-lg mb-4">
                  Subscription & M-Pesa Payment History
                </h2>
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="py-2">Plan</th>
                      <th className="py-2">Amount (USD)</th>
                      <th className="py-2">Paid (KES)</th>
                      <th className="py-2">Rate</th>
                      <th className="py-2">Receipt / Ref</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-num text-xs">
                    {membershipData.transactions.map((tx: any) => (
                      <tr key={tx.id}>
                        <td className="py-2.5 font-sans font-medium capitalize">
                          {tx.planSlug.replace('_', ' ')}
                        </td>
                        <td className="py-2.5">{formatUsd(tx.amountUsd)}</td>
                        <td className="py-2.5">{formatKes(tx.amountKes)}</td>
                        <td className="py-2.5">{Number(tx.exchangeRate).toFixed(2)}</td>
                        <td className="py-2.5">{tx.mpesaReceiptNumber || tx.checkoutRequestId}</td>
                        <td className="py-2.5 font-sans capitalize">{tx.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. REFERRAL DASHBOARD, WALLET, HISTORY */}
          {(route === '/portal/referrals' ||
            route === '/portal/referral-wallet' ||
            route === '/portal/referral-history') &&
            referralData && (
              <div className="space-y-6">
                <div className="bg-[#0B1528] text-white rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-indigo-300">
                      Your Unique Referral Link ({referralData.commissionPct}% Commission on Eligible Paid Subscriptions & Renewals)
                    </div>
                    <div className="font-mono-num text-sm sm:text-base font-semibold mt-1 break-all">
                      {referralUrl}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(referralUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedLink ? 'Copied!' : 'Copy Referral Link'}
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Clicks</div>
                    <div className="font-mono-num text-xl font-bold mt-1">
                      {referralData.stats.totalClicks}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Registrations</div>
                    <div className="font-mono-num text-xl font-bold mt-1">
                      {referralData.stats.totalRegistrations}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Paid Referrals</div>
                    <div className="font-mono-num text-xl font-bold text-[#2563EB] mt-1">
                      {referralData.stats.paidReferrals}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Conversion Rate</div>
                    <div className="font-mono-num text-xl font-bold mt-1">
                      {referralData.stats.conversionRatePct}%
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs text-slate-500">Available Referral Wallet</div>
                    <div className="font-mono-num text-xl font-bold text-[#16A34A] mt-1">
                      {formatUsd(referralData.wallet.availableReferralBalanceUsd)}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
                  <h2 className="font-display font-bold text-lg mb-4">
                    Referral Commission History
                  </h2>
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-slate-200 text-xs text-slate-500">
                      <tr>
                        <th className="py-2">Referred Member</th>
                        <th className="py-2">Type</th>
                        <th className="py-2 text-right">Sub Paid</th>
                        <th className="py-2 text-right">Your {referralData.commissionPct}%</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {referralData.commissions.map((c: any) => (
                        <tr key={c.id}>
                          <td className="py-2.5 font-medium">{c.referredName}</td>
                          <td className="py-2.5">{c.isRenewal ? 'Renewal' : 'First Purchase'}</td>
                          <td className="py-2.5 text-right font-mono-num">
                            {formatUsd(c.baseAmountUsd)}
                          </td>
                          <td className="py-2.5 text-right font-mono-num text-[#16A34A] font-semibold">
                            {formatUsd(c.commissionAmountUsd)}
                          </td>
                          <td className="py-2.5 capitalize">{c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* 7. NOTIFICATIONS */}
          {route === '/portal/notifications' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-display text-xl font-bold">Notifications</h1>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch('/api/member/notifications/read', { method: 'POST' });
                    await loadSection();
                  }}
                  className="text-xs font-semibold text-[#2563EB]"
                >
                  Mark all as read
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {notifs.map((n) => (
                  <div key={n.id} className="py-3.5">
                    <div className="text-sm font-semibold text-[#0B1528]">{n.title}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. PROFILE & SECURITY SETTINGS */}
          {route === '/portal/profile' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch('/api/member/profile', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    ...profileForm,
                    skills: profileForm.skillsText
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }),
                });
                await refreshUser();
                setBannerMsg({ type: 'ok', text: 'Profile updated successfully.' });
              }}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-4"
            >
              <h1 className="font-display text-xl font-bold">Profile Settings</h1>
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">County</label>
                  <input
                    value={profileForm.county}
                    onChange={(e) => setProfileForm({ ...profileForm, county: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  value={profileForm.skillsText}
                  onChange={(e) => setProfileForm({ ...profileForm, skillsText: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-lg"
              >
                Save Profile
              </button>
            </form>
          )}

          {route === '/portal/security' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch('/api/member/security/password', {
                  method: 'POST',
                  body: JSON.stringify(pwdForm),
                });
                setPwdForm({ currentPassword: '', newPassword: '' });
                setBannerMsg({ type: 'ok', text: 'Password updated.' });
              }}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg space-y-4"
            >
              <h1 className="font-display text-xl font-bold">Security Settings</h1>
              <div>
                <label className="block text-xs font-semibold mb-1">Current Password</label>
                <input
                  type="password"
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">New Password</label>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-lg"
              >
                Update Password
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Work Submission Modal */}
      {submitJob && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">
                Submit Deliverable: {submitJob.title}
              </h2>
              <button type="button" onClick={() => setSubmitJob(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitWork} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Submission Format</label>
                <select
                  value={subForm.submissionType}
                  onChange={(e) => setSubForm({ ...subForm, submissionType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="text">Text / Structured Output</option>
                  <option value="document">Document</option>
                  <option value="image">Image Evidence</option>
                  <option value="file">File Attachment</option>
                  <option value="external_ref">External Task Reference</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Deliverable Content / Summary
                </label>
                <textarea
                  required
                  rows={4}
                  value={subForm.textContent}
                  onChange={(e) => setSubForm({ ...subForm, textContent: e.target.value })}
                  placeholder="Paste completed work output, findings, or verification details..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    External Reference / ID
                  </label>
                  <input
                    value={subForm.externalReference}
                    onChange={(e) => setSubForm({ ...subForm, externalReference: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Attachment Filename
                  </label>
                  <input
                    value={subForm.attachmentName}
                    onChange={(e) => setSubForm({ ...subForm, attachmentName: e.target.value })}
                    placeholder="e.g. batch_output.csv"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Worker Notes</label>
                <input
                  value={subForm.notes}
                  onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitJob(null)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#16A34A] hover:bg-emerald-700 text-white rounded-lg"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
