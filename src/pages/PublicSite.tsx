import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  Menu,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandMark, formatKes, formatUsd, tierLabel } from '../components/BrandMark';

interface PublicOverview {
  plans: any[];
  categories: any[];
  exchangeRate: { rate: number; source: string; createdAt: string };
  referralCommissionPct: number;
  featuredJobs: any[];
  affiliatePartners: any[];
  faq: { q: string; a: string }[];
  stats: {
    registeredMembers: number;
    activePublishedJobs: number;
    sampleJobsIncluded: number;
    totalCategories: number;
  };
}

export function PublicSite({
  route,
  navigate,
}: {
  route: string;
  navigate: (path: string) => void;
}) {
  const {
    user,
    pendingReferralCode,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
  } = useAuth();

  const [overview, setOverview] = useState<PublicOverview | null>(null);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Auth form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCounty, setAuthCounty] = useState('Nairobi');
  const [authRefCode, setAuthRefCode] = useState(pendingReferralCode || '');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    if (pendingReferralCode) {
      setAuthRefCode(pendingReferralCode);
    }
  }, [pendingReferralCode]);

  useEffect(() => {
    fetch('/api/public/overview')
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
      .then((d) => {
        if (d) setOverview(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route.startsWith('/categories/')) {
      const slug = route.replace('/categories/', '').split('?')[0];
      setSelectedCategorySlug(slug);
    } else if (route === '/jobs') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') || '';
      if (cat) setSelectedCategorySlug(cat);
    }
  }, [route]);

  useEffect(() => {
    if (route === '/jobs' || route.startsWith('/categories/')) {
      const q = new URLSearchParams();
      if (selectedCategorySlug) q.set('category', selectedCategorySlug);
      if (searchQuery) q.set('search', searchQuery);
      if (selectedTierFilter) q.set('tier', selectedTierFilter);
      if (verifiedOnly) q.set('verified', 'true');
      fetch(`/api/public/jobs?${q.toString()}`)
        .then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
        .then((d) => {
          if (d) setJobsList(d.jobs || []);
        })
        .catch(() => {});
    }
  }, [route, selectedCategorySlug, searchQuery, selectedTierFilter, verifiedOnly]);

  useEffect(() => {
    if (route.startsWith('/jobs/')) {
      const id = route.replace('/jobs/', '').split('?')[0];
      fetch(`/api/public/jobs/${id}`)
        .then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
        .then((d) => setSelectedJob(d?.job || null))
        .catch(() => setSelectedJob(null));
    }
  }, [route]);

  const handleAffiliateClick = async (slug: string) => {
    try {
      const r = await fetch(`/api/public/affiliates/go/${slug}`);
      const d = await r.json();
      if (d.redirectUrl) {
        const a = document.createElement('a');
        a.href = d.redirectUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
    } catch {
      // ignore
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const u = await loginWithEmail(authEmail, authPassword);
      navigate(u.roleSlug === 'owner' ? '/owner' : u.roleSlug === 'admin' ? '/admin' : '/portal');
    } catch (err: any) {
      setAuthError(err.message || 'Sign in failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const u = await registerWithEmail({
        email: authEmail,
        password: authPassword,
        fullName: authName,
        phone: authPhone,
        county: authCounty,
        referralCode: authRefCode || undefined,
      });
      navigate(u.roleSlug === 'owner' ? '/owner' : '/portal');
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const u = await loginWithGoogle(authRefCode || undefined);
      navigate(u.roleSlug === 'owner' ? '/owner' : u.roleSlug === 'admin' ? '/admin' : '/portal');
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    setAuthSubmitting(true);
    try {
      const resp = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail }),
      });
      const text = await resp.text();
      const d = text && resp.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : {};
      if (!resp.ok) {
        setAuthError(d.error || `Request failed (${resp.status}).`);
      } else {
        setAuthMessage(d.message || 'Password reset request processed.');
      }
    } catch {
      setAuthError('Unable to send reset request.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const rate = overview?.exchangeRate?.rate ?? 129.5;
  const plans = overview?.plans ?? [];
  const categories = overview?.categories ?? [];
  const featuredJobs = overview?.featuredJobs ?? [];

  const isHome = route === '/';

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111418]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header
        className={`sticky top-0 z-40 backdrop-blur transition-colors ${
          isHome
            ? 'bg-[#D7FEFF]/95 border-b border-[#BCEFF2]/60'
            : 'bg-white/95 border-b border-slate-200'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left focus-visible:outline-2 focus-visible:outline-[#111418] rounded"
          >
            <BrandMark />
          </button>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#111418]/80">
            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className={`hover:text-[#111418] transition-colors whitespace-nowrap shrink-0 py-1 ${
                route.startsWith('/jobs') ? 'text-[#111418] font-semibold underline underline-offset-4' : ''
              }`}
            >
              Browse Jobs
            </button>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className={`hover:text-[#111418] transition-colors whitespace-nowrap shrink-0 py-1 ${
                route.startsWith('/categories') ? 'text-[#111418] font-semibold underline underline-offset-4' : ''
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => navigate('/membership')}
              className={`hover:text-[#111418] transition-colors whitespace-nowrap shrink-0 py-1 ${
                route === '/membership' ? 'text-[#111418] font-semibold underline underline-offset-4' : ''
              }`}
            >
              Membership
            </button>
            <button
              type="button"
              onClick={() => navigate('/referrals')}
              className={`hover:text-[#111418] transition-colors whitespace-nowrap shrink-0 py-1 ${
                route === '/referrals' ? 'text-[#111418] font-semibold underline underline-offset-4' : ''
              }`}
            >
              Referrals
            </button>
            <button
              type="button"
              onClick={() => navigate('/how-it-works')}
              className={`hover:text-[#111418] transition-colors whitespace-nowrap shrink-0 py-1 ${
                route === '/how-it-works' ? 'text-[#111418] font-semibold underline underline-offset-4' : ''
              }`}
            >
              How It Works
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    user.roleSlug === 'owner'
                      ? '/owner'
                      : user.roleSlug === 'admin'
                      ? '/admin'
                      : '/portal'
                  )
                }
                className="px-4 py-2 text-sm font-semibold text-white bg-[#111418] hover:bg-[#1E293B] rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                Open Workspace
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-[#111418] border border-[#111418]/25 hover:border-[#111418]/50 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#111418] hover:bg-[#1E293B] rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Sign up
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-[#111418] hover:bg-black/5"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            {[
              { label: 'Browse Jobs', path: '/jobs' },
              { label: 'Categories', path: '/categories' },
              { label: 'Membership Plans', path: '/membership' },
              { label: 'Referral Programme', path: '/referrals' },
              { label: 'How It Works', path: '/how-it-works' },
              { label: 'Log in', path: '/login' },
            ].map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {route === '/' && (
          <>
            {/* Centered Pale-Cyan Hero Fold */}
            <section className="bg-[#D7FEFF] text-[#111418]">
              <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pt-16 pb-24 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 text-center">
                <div className="inline-block p-[1px] rounded-full bg-gradient-to-r from-[#22D3EE] to-[#A3E635] mb-8">
                  <div className="bg-[#E4FFFF] px-5 py-2 rounded-full text-xs sm:text-sm font-medium text-[#111418] inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 tabular-nums">
                    <span>{overview?.stats.totalCategories ?? 17} work categories</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span>$1 = KES {rate.toFixed(2)} M-Pesa</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span>{overview?.referralCommissionPct ?? 10}% referral commission</span>
                  </div>
                </div>

                <h1 className="font-display text-4xl sm:text-6xl lg:text-[64px] font-semibold tracking-tight leading-[1.06] text-[#111418] text-balance max-w-4xl mx-auto">
                  Get paid for AI &amp; online work
                </h1>

                <p className="mt-6 text-base sm:text-lg text-[#1E293B] leading-relaxed max-w-xl mx-auto">
                  Workaby AI provides curated opportunities in AI training, data annotation, surveys, and remote digital tasks — priced in USD with M-Pesa checkout.
                </p>

                <div className="mt-9 flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate(user ? '/portal' : '/register')}
                    className="px-8 py-4 bg-[#111418] hover:bg-[#1E293B] text-white font-semibold text-base rounded-2xl transition-colors whitespace-nowrap shrink-0"
                  >
                    {user ? 'Open Workspace' : 'Sign up now'}
                  </button>
                </div>
              </div>
            </section>

            {/* Trending Opportunities */}
            <section className="bg-white py-14 sm:py-16">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#111418]">
                      Trending opportunities
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      All rewards displayed in USD. Sample opportunities are clearly marked during marketplace onboarding.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/jobs')}
                    className="text-sm font-semibold text-[#111418] hover:text-[#2563EB] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    View all opportunities <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featuredJobs.map((job) => (
                    <article
                      key={job.id}
                      className="bg-[#F8FAFC] hover:bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="font-medium text-slate-700">{job.categoryName}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {job.providerClassification === 'verified'
                              ? 'Verified Provider'
                              : 'Unverified Provider'}
                          </span>
                          {job.isSample && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-indigo-700 font-medium">Sample Opportunity</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-bold text-[#111418] leading-snug">
                          {job.title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                          {job.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-mono-num text-lg font-bold text-[#16A34A]">
                            {formatUsd(job.rewardUsd)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {tierLabel(job.minTier)} · {job.estimatedDuration}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="px-3.5 py-2 text-xs font-semibold text-[#111418] bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap shrink-0"
                        >
                          View Details
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* Job Categories (All 17) */}
            <section className="bg-[#F8FAFC] border-y border-slate-200 py-16">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#111418]">
                      17 Specialized Work Categories
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      From AI response evaluation and data annotation to Swahili transcription and legitimate academic tutoring.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/categories')}
                    className="text-sm font-semibold text-[#111418] hover:text-[#2563EB] whitespace-nowrap shrink-0"
                  >
                    Explore all 17 categories
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.slice(0, 9).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => navigate(`/categories/${cat.slug}`)}
                      className="text-left p-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-[#111418]">{cat.name}</span>
                        <span className="font-mono-num text-xs text-slate-500">
                          {cat.openJobsCount} open
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                        {cat.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528] mb-8">
                How Workaby AI Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    step: '01. Create Free Account',
                    desc: 'Register in under a minute and immediately start as a Free Member with 2 weekly job allocations and a unique referral code.',
                  },
                  {
                    step: '02. Select Membership Tier',
                    desc: 'Upgrade via M-Pesa STK Push in KES using real-time USD/KES conversion to unlock Verified, Pro ($5/qtr), or Top-Rated ($8/qtr) tasks.',
                  },
                  {
                    step: '03. Allocate & Submit Tasks',
                    desc: 'Claim weekly opportunities aligned with your tier, follow structured briefs, and submit text, files, or external task proofs.',
                  },
                  {
                    step: '04. Earn USD & Withdraw',
                    desc: 'Administrator QA approves quality work into your USD Worker Ledger, kept strictly separate from your 10% Referral Wallet.',
                  },
                ].map((item) => (
                  <div key={item.step} className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="font-display font-bold text-base text-[#0B1528]">{item.step}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Membership Plans */}
            <section className="bg-white border-y border-slate-200 py-16">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
                <div className="max-w-2xl mb-10">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                    Transparent Quarterly Memberships in USD
                  </h2>
                  <p className="text-sm text-slate-600 mt-2">
                    Prices are displayed in USD. M-Pesa checkout converts to KES at the active exchange rate ($1 = KES {rate.toFixed(2)}). Top-Rated is a paid membership tier, separate from the 50 Jobs Completed achievement badge.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {plans.map((plan) => {
                    const usd = Number(plan.priceUsd);
                    const kes = Math.round(usd * rate);
                    const isHighlighted = plan.slug === 'pro' || plan.slug === 'top_rated';
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl p-6 flex flex-col justify-between border ${
                          plan.slug === 'top_rated'
                            ? 'bg-[#0B1528] text-white border-[#0B1528]'
                            : isHighlighted
                            ? 'bg-white border-[#2563EB]'
                            : 'bg-[#F6F8FB] border-slate-200'
                        }`}
                      >
                        <div>
                          <div
                            className={`text-xs font-medium ${
                              plan.slug === 'top_rated' ? 'text-blue-300' : 'text-slate-500'
                            }`}
                          >
                            {plan.audienceLabel}
                          </div>
                          <h3 className="font-display text-xl font-bold mt-1">{plan.name}</h3>
                          <div className="mt-4 flex items-baseline gap-2">
                            <span className="font-mono-num text-3xl font-bold">
                              {formatUsd(usd)}
                            </span>
                            <span
                              className={`text-xs ${
                                plan.slug === 'top_rated' ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {usd === 0 ? 'forever' : `/ ${plan.billingIntervalDays} days`}
                            </span>
                          </div>
                          {usd > 0 && (
                            <div
                              className={`text-xs font-mono-num mt-1 ${
                                plan.slug === 'top_rated' ? 'text-emerald-300' : 'text-slate-600'
                              }`}
                            >
                              Approx. {formatKes(kes)} via M-Pesa
                            </div>
                          )}
                          <p
                            className={`text-xs mt-3 leading-relaxed ${
                              plan.slug === 'top_rated' ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            {plan.description}
                          </p>
                          <ul className="mt-5 space-y-2 text-xs">
                            {(plan.featuresJson || []).map((feat: string) => (
                              <li key={feat} className="flex items-start gap-2">
                                <Check
                                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                                    plan.slug === 'top_rated' ? 'text-emerald-400' : 'text-[#16A34A]'
                                  }`}
                                />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(user ? '/portal/membership' : '/register')}
                          className={`mt-6 w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                            plan.slug === 'top_rated'
                              ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                              : 'bg-[#0B1528] hover:bg-[#16233B] text-white'
                          }`}
                        >
                          {usd === 0 ? 'Start Free' : `Select ${plan.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Referral Programme Promotional Section */}
            <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16">
              <div className="bg-[#0B1528] text-white rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch border border-[#16233B]">
                <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
                  <p className="text-xs font-medium text-indigo-300 mb-2">
                    Workaby AI Referral & Affiliate Programme
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                    Earn by Sharing Opportunities.
                  </h2>
                  <p className="mt-4 text-slate-300 text-base leading-relaxed max-w-xl">
                    Invite friends to Workaby AI and earn 10% commission on eligible subscription payments they make — including initial upgrades and recurring quarterly renewals.
                  </p>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="font-mono-num text-lg font-bold text-emerald-400">
                        $0.50 / referral
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        On every confirmed $5.00 Pro Worker subscription & renewal
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="font-mono-num text-lg font-bold text-emerald-400">
                        $0.80 / referral
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        On every confirmed $8.00 Top-Rated subscription & renewal
                      </div>
                    </div>
                  </div>
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => navigate(user ? '/portal/referrals' : '/register')}
                      className="px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      Start Referring <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-5 min-h-[240px]">
                  <img
                    src="/src/assets/images/referral_network_visual_1795621116249.jpg"
                    alt="Workaby AI referral commission architecture"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </section>

            {/* Why Choose Workaby AI + Authorized Affiliate Disclosure */}
            <section className="bg-white border-y border-slate-200 py-16">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-5">
                  <div className="rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src="/src/assets/images/about_proxyai_team_1795621116415.jpg"
                      alt="Kenyan digital specialists collaborating at Workaby AI"
                      referrerPolicy="no-referrer"
                      className="w-full h-72 object-cover"
                    />
                  </div>
                </div>
                <div className="lg:col-span-7 space-y-5">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                    Why Choose Workaby AI
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Unlike unmoderated job boards, Workaby AI centrally sources, verifies, and structures every opportunity. Ordinary members cannot post unvetted listings, ensuring clear instructions, USD accounting transparency, and reliable M-Pesa payouts.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-xl border border-slate-200">
                      <div className="font-semibold text-[#0B1528]">Strict Ledger Separation</div>
                      <div className="text-xs text-slate-600 mt-1">
                        Worker job earnings, referral commissions, and platform subscription revenue are accounted separately.
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200">
                      <div className="font-semibold text-[#0B1528]">Africa/Nairobi Weekly Engine</div>
                      <div className="text-xs text-slate-600 mt-1">
                        Fair server-side weekly allocations reset automatically on East Africa Time.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section className="max-w-[960px] mx-auto px-4 sm:px-6 py-16">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528] mb-8">
                Frequently Asked Questions
              </h2>
              <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-xl">
                {(overview?.faq || []).map((item) => (
                  <div key={item.q} className="p-6">
                    <h3 className="font-display font-bold text-base text-[#0B1528]">{item.q}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Browse Jobs & Category Landing Page */}
        {(route === '/jobs' || route.startsWith('/categories/')) && (
          <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-[#0B1528]">
                {selectedCategorySlug
                  ? categories.find((c) => c.slug === selectedCategorySlug)?.name || 'Category Jobs'
                  : 'Browse Online Work Opportunities'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {selectedCategorySlug
                  ? categories.find((c) => c.slug === selectedCategorySlug)?.description
                  : 'Filter active opportunities by category, membership tier, and provider verification.'}
              </p>
            </div>

            {/* Search & Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search AI evaluation, surveys, transcription..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <select
                value={selectedCategorySlug}
                onChange={(e) => setSelectedCategorySlug(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">All 17 Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedTierFilter}
                onChange={(e) => setSelectedTierFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">All Membership Tiers</option>
                <option value="free">Free Member</option>
                <option value="verified">Verified Member</option>
                <option value="pro">Pro Worker</option>
                <option value="top_rated">Top-Rated Worker</option>
              </select>
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                />
                <span>Verified Providers Only</span>
              </label>
            </div>

            {jobsList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <p className="text-sm text-slate-600">
                  No published opportunities match those filters right now.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategorySlug('');
                    setSearchQuery('');
                    setSelectedTierFilter('');
                    setVerifiedOnly(false);
                  }}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] rounded-lg"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {jobsList.map((job) => (
                  <article
                    key={job.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="font-medium text-slate-700">{job.categoryName}</span>
                        <span>·</span>
                        <span>
                          {job.providerClassification === 'verified'
                            ? 'Verified Provider'
                            : 'Unverified Provider'}
                        </span>
                        {job.isSample && (
                          <>
                            <span>·</span>
                            <span className="text-indigo-700 font-medium">Sample</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#0B1528]">
                        {job.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{job.description}</p>
                      <div className="mt-3 text-xs text-slate-500">
                        {job.availablePositions - job.filledPositions} of {job.availablePositions}{' '}
                        positions open · {job.difficulty}
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-mono-num text-lg font-bold text-[#16A34A]">
                          {formatUsd(job.rewardUsd)}
                        </div>
                        <div className="text-xs text-slate-500">{tierLabel(job.minTier)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1528] hover:bg-[#16233B] rounded-lg"
                      >
                        View Details
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Categories Directory */}
        {route === '/categories' && (
          <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
            <h1 className="font-display text-3xl font-bold text-[#0B1528]">
              Marketplace Job Categories
            </h1>
            <p className="text-sm text-slate-600 mt-1 mb-8">
              Explore all 17 centrally managed digital work verticals on Workaby AI.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/categories/${cat.slug}`)}
                  className="text-left bg-white border border-slate-200 hover:border-[#2563EB] rounded-xl p-6 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display font-bold text-lg text-[#0B1528]">{cat.name}</h2>
                    <span className="font-mono-num text-xs text-[#2563EB] font-semibold">
                      {cat.openJobsCount} open
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{cat.description}</p>
                  <div className="mt-4 text-xs text-slate-500">
                    {cat.isPremium ? 'Includes Verified & Premium Tasks' : 'Open to Free & Paid Tiers'}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Job Detail Page */}
        {route.startsWith('/jobs/') && (
          <section className="max-w-[960px] mx-auto px-4 sm:px-6 py-12">
            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className="text-sm text-[#2563EB] font-medium mb-6 inline-flex items-center gap-1"
            >
              Back to Browse Jobs
            </button>
            {!selectedJob ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
                Loading job details...
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <div className="text-xs text-slate-500 mb-2">
                      {selectedJob.jobCode} · {selectedJob.categoryName} ·{' '}
                      {selectedJob.providerName} (
                      {selectedJob.providerClassification === 'verified'
                        ? 'Verified Provider'
                        : 'Unverified Provider'}
                      )
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                      {selectedJob.title}
                    </h1>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="font-mono-num text-3xl font-bold text-[#16A34A]">
                      {formatUsd(selectedJob.rewardUsd)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Min tier: {tierLabel(selectedJob.minTier)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Difficulty</div>
                    <div className="font-semibold capitalize">{selectedJob.difficulty}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Est. Duration</div>
                    <div className="font-semibold">{selectedJob.estimatedDuration}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Positions Remaining</div>
                    <div className="font-mono-num font-semibold">
                      {selectedJob.availablePositions - selectedJob.filledPositions} /{' '}
                      {selectedJob.availablePositions}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Deadline</div>
                    <div className="font-semibold">
                      {new Date(selectedJob.deadlineAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="font-display font-bold text-base text-[#0B1528]">Description</h2>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {selectedJob.description}
                  </p>
                </div>

                <div>
                  <h2 className="font-display font-bold text-base text-[#0B1528]">Instructions</h2>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {selectedJob.instructions}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-lg bg-[#F6F8FB] border border-slate-200">
                    <div className="text-xs font-semibold text-slate-700">
                      Submission Requirements
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {selectedJob.submissionRequirements}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#F6F8FB] border border-slate-200">
                    <div className="text-xs font-semibold text-slate-700">Payment Conditions</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {selectedJob.paymentConditions}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    Required skills: {(selectedJob.requiredSkillsJson || []).join(', ')}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(user ? '/portal/jobs' : '/register')}
                    className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
                  >
                    {user ? 'Open in Member Portal to Allocate' : 'Join to Allocate This Task'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Membership Plans Page */}
        {route === '/membership' && (
          <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 space-y-10">
            <div>
              <h1 className="font-display text-3xl font-bold text-[#0B1528]">
                Membership Plans & Quarterly Pricing
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                All prices displayed in USD. M-Pesa STK Push charges the live KES equivalent ($1 = KES {rate.toFixed(2)}).
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan) => {
                const usd = Number(plan.priceUsd);
                const kes = Math.round(usd * rate);
                return (
                  <div
                    key={plan.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs text-slate-500">{plan.audienceLabel}</div>
                      <h2 className="font-display text-xl font-bold mt-1">{plan.name}</h2>
                      <div className="mt-4 font-mono-num text-3xl font-bold text-[#0B1528]">
                        {formatUsd(usd)}
                        <span className="text-xs font-normal text-slate-500 ml-1">
                          {usd === 0 ? '/ free' : `/ ${plan.billingIntervalDays} days`}
                        </span>
                      </div>
                      {usd > 0 && (
                        <div className="text-xs font-mono-num text-[#16A34A] mt-1">
                          M-Pesa checkout: {formatKes(kes)}
                        </div>
                      )}
                      <p className="text-xs text-slate-600 mt-3">{plan.description}</p>
                      <ul className="mt-4 space-y-2 text-xs text-slate-700">
                        {(plan.featuresJson || []).map((f: string) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-[#16A34A] shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(user ? '/portal/membership' : '/register')}
                      className="mt-6 w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
                    >
                      {user ? 'Manage in Portal' : 'Get Started'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Comparison Matrix */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Feature / Limit</th>
                    <th className="py-3.5 px-4 font-semibold">Free Member</th>
                    <th className="py-3.5 px-4 font-semibold">Verified Member</th>
                    <th className="py-3.5 px-4 font-semibold">Pro Worker</th>
                    <th className="py-3.5 px-4 font-semibold">Top-Rated Worker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  <tr>
                    <td className="py-3 px-4 font-medium">Quarterly Price (USD)</td>
                    <td className="py-3 px-4 font-mono-num">$0.00</td>
                    <td className="py-3 px-4 font-mono-num">
                      {formatUsd(plans.find((p) => p.slug === 'verified')?.priceUsd ?? 6.9)}
                    </td>
                    <td className="py-3 px-4 font-mono-num">$5.00</td>
                    <td className="py-3 px-4 font-mono-num">$8.00</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Weekly Job Allowance (EAT)</td>
                    <td className="py-3 px-4">2 jobs / week</td>
                    <td className="py-3 px-4">10 jobs / week</td>
                    <td className="py-3 px-4">10 jobs / week</td>
                    <td className="py-3 px-4 font-semibold text-[#16A34A]">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Unverified Provider Jobs</td>
                    <td className="py-3 px-4">Yes</td>
                    <td className="py-3 px-4">Yes</td>
                    <td className="py-3 px-4">Yes</td>
                    <td className="py-3 px-4">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Verified Provider Jobs</td>
                    <td className="py-3 px-4 text-slate-400">No</td>
                    <td className="py-3 px-4">Yes</td>
                    <td className="py-3 px-4">Yes</td>
                    <td className="py-3 px-4">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Pro-Exclusive & Top-Rated Tasks</td>
                    <td className="py-3 px-4 text-slate-400">No</td>
                    <td className="py-3 px-4 text-slate-400">No</td>
                    <td className="py-3 px-4">Pro Exclusive</td>
                    <td className="py-3 px-4 font-semibold">All Exclusive</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">10% Referral Programme</td>
                    <td className="py-3 px-4">Included</td>
                    <td className="py-3 px-4">Included</td>
                    <td className="py-3 px-4">Included</td>
                    <td className="py-3 px-4">Included</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Referral Programme + Authorized Affiliate Partners Page */}
        {route === '/referrals' && (
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 space-y-10">
            <div className="bg-[#0B1528] text-white rounded-2xl p-8 sm:p-10">
              <h1 className="font-display text-3xl font-bold">
                Earn by Sharing Opportunities.
              </h1>
              <p className="mt-3 text-slate-300 max-w-2xl text-sm sm:text-base">
                Invite friends to Workaby AI with your unique referral link and earn {overview?.referralCommissionPct ?? 10}% commission on every confirmed paid subscription, upgrade, and quarterly renewal they complete within your attribution window.
              </p>
              <button
                type="button"
                onClick={() => navigate(user ? '/portal/referrals' : '/register')}
                className="mt-6 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
              >
                {user ? 'Open Referral Dashboard' : 'Start Referring'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-display font-bold text-lg text-[#0B1528]">
                  Single-Level Commission Breakdown
                </h2>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Commissions are calculated exclusively on confirmed M-Pesa subscription payments and reversed if refunded.
                </p>
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="py-2 text-left">Plan Purchased</th>
                      <th className="py-2 text-right">Sub Price</th>
                      <th className="py-2 text-right">Your 10%</th>
                      <th className="py-2 text-right">Retained</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-num">
                    <tr>
                      <td className="py-2.5 font-sans">Pro Worker (Quarterly)</td>
                      <td className="py-2.5 text-right">$5.00</td>
                      <td className="py-2.5 text-right text-[#16A34A] font-semibold">$0.50</td>
                      <td className="py-2.5 text-right">$4.50</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-sans">Top-Rated (Quarterly)</td>
                      <td className="py-2.5 text-right">$8.00</td>
                      <td className="py-2.5 text-right text-[#16A34A] font-semibold">$0.80</td>
                      <td className="py-2.5 text-right">$7.20</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-display font-bold text-lg text-[#0B1528]">
                  Authorized Partner Tools (Affiliate Disclosure)
                </h2>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Workaby AI maintains disclosed partnerships with vetted digital tools that help remote workers improve quality.
                </p>
                <div className="space-y-3">
                  {(overview?.affiliatePartners || []).map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-sm text-[#0B1528]">
                          {p.partnerName} · {p.category}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.disclosureText}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAffiliateClick(p.slug)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1 shrink-0"
                      >
                        Visit <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* How It Works / About / FAQ / Contact / Legal */}
        {route === '/how-it-works' && (
          <section className="max-w-[960px] mx-auto px-4 sm:px-6 py-12 space-y-6">
            <h1 className="font-display text-3xl font-bold text-[#0B1528]">
              How Workaby AI Operates
            </h1>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                Workaby AI connects Kenyan and global remote workers with centrally vetted online tasks across 17 digital categories. Unlike open classifieds, administrators verify providers, validate instructions, and audit task submissions before releasing USD earnings.
              </p>
              <p>
                Weekly job allocations reset automatically on the Africa/Nairobi schedule based on your active membership tier: Free Members receive 2 jobs/week (unverified providers), Verified & Pro Workers receive 10 jobs/week including verified providers, and Top-Rated Members access unlimited eligible opportunities.
              </p>
            </div>
          </section>
        )}

        {route === '/about' && (
          <section className="max-w-[960px] mx-auto px-4 sm:px-6 py-12 space-y-6">
            <h1 className="font-display text-3xl font-bold text-[#0B1528]">About Workaby AI</h1>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <img
                src="/src/assets/images/about_proxyai_team_1795621116415.jpg"
                alt="Workaby AI Nairobi team"
                referrerPolicy="no-referrer"
                className="w-full h-64 object-cover"
              />
              <div className="p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
                <p>
                  Built for Kenya with international scalability, Workaby AI standardizes online work reporting in USD while supporting seamless Safaricom M-Pesa KES checkouts.
                </p>
                <p>
                  Our platform enforces strict ledger isolation between worker job earnings, referral commissions, and platform operating revenue so worker balances are always protected and transparent.
                </p>
              </div>
            </div>
          </section>
        )}

        {route === '/faq' && (
          <section className="max-w-[960px] mx-auto px-4 sm:px-6 py-12">
            <h1 className="font-display text-3xl font-bold text-[#0B1528] mb-6">
              Frequently Asked Questions
            </h1>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {(overview?.faq || []).map((item) => (
                <div key={item.q} className="p-6">
                  <h2 className="font-display font-bold text-base text-[#0B1528]">{item.q}</h2>
                  <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {route === '/contact' && (
          <section className="max-w-[680px] mx-auto px-4 sm:px-6 py-12">
            <h1 className="font-display text-3xl font-bold text-[#0B1528] mb-2">
              Contact Workaby AI Support
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              Questions regarding M-Pesa billing, provider verification, or managed client projects? Send our operations team a message.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch('/api/public/contact', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(contactForm),
                });
                setContactSent(true);
              }}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              {contactSent && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  Message received. Our Nairobi support team has been notified.
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
              >
                Send Message
              </button>
            </form>
          </section>
        )}

        {route === '/privacy' && (
          <section className="max-w-[880px] mx-auto px-4 sm:px-6 py-12">
            <h1 className="font-display text-3xl font-bold text-[#0B1528] mb-4">
              Privacy Policy (Kenya Data Protection Act Compliance)
            </h1>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                Workaby AI processes member registration details, M-Pesa phone numbers, and task submissions strictly for marketplace fulfillment, fraud prevention, and payout reconciliation in accordance with the Kenya Data Protection Act, 2019.
              </p>
              <p>
                Financial ledgers, M-Pesa transaction receipts, and identity details are encrypted at rest and never exposed to other ordinary members. Members may update or request deletion of profile records from Profile Settings.
              </p>
            </div>
          </section>
        )}

        {route === '/terms' && (
          <section className="max-w-[880px] mx-auto px-4 sm:px-6 py-12">
            <h1 className="font-display text-3xl font-bold text-[#0B1528] mb-4">
              Terms and Conditions
            </h1>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                Membership subscriptions are billed quarterly (90 days default) in USD and settled in KES via Safaricom M-Pesa STK Push. Memberships activate only upon confirmed payment callback and are never auto-charged without explicit authorization.
              </p>
              <p>
                Referral commissions (10% default) apply strictly to confirmed eligible paid subscriptions and renewals within the configured attribution window. Self-referrals, duplicate accounts, or fraudulent registrations result in commission reversal and account suspension.
              </p>
            </div>
          </section>
        )}

        {/* Login, Registration, Forgot Password */}
        {(route === '/login' || route === '/register' || route === '/forgot-password') && (
          <section className="max-w-[460px] mx-auto px-4 py-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-7">
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-[#0B1528]">
                  {route === '/login'
                    ? 'Sign in to Workaby AI'
                    : route === '/register'
                    ? 'Create Your Free Account'
                    : 'Reset Password'}
                </h1>
                {route !== '/login' && (
                  <p className="text-xs text-slate-600 mt-1">
                    {route === '/register'
                      ? 'Every new member starts as a Free Member with 2 weekly tasks and a unique referral code.'
                      : 'Enter your account email to request a password reset.'}
                  </p>
                )}
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {authError}
                </div>
              )}
              {authMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {authMessage}
                </div>
              )}

              {route !== '/forgot-password' && (
                <>
                  <button
                    type="button"
                    disabled={authSubmitting}
                    onClick={handleGoogleAuth}
                    className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-semibold text-[#0B1528] flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                    Continue with Google
                  </button>
                  <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span>or use email</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </>
              )}

              {route === '/login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
                  >
                    {authSubmitting ? 'Signing in...' : 'Sign In'}
                  </button>
                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-[#2563EB] hover:underline"
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="text-slate-600 hover:text-[#0B1528]"
                    >
                      Need an account? Join free
                    </button>
                  </div>
                </form>
              )}

              {route === '/register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Wanjiku Kamau"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        M-Pesa Phone
                      </label>
                      <input
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="0712345678"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        County / City
                      </label>
                      <input
                        value={authCounty}
                        onChange={(e) => setAuthCounty(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Referral Code (Optional)
                    </label>
                    <input
                      value={authRefCode}
                      onChange={(e) => setAuthRefCode(e.target.value.toUpperCase())}
                      placeholder="e.g. WRKBY123"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono-num"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
                  >
                    {authSubmitting ? 'Creating Account...' : 'Create Free Account'}
                  </button>
                  <div className="text-center text-xs pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-slate-600 hover:text-[#0B1528]"
                    >
                      Already registered? Sign in
                    </button>
                  </div>
                </form>
              )}

              {route === '/forgot-password' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg"
                  >
                    Request Password Reset
                  </button>
                  <div className="text-center text-xs">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-[#2563EB] hover:underline"
                    >
                      Return to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-[#0B1528] text-slate-300 border-t border-[#16233B]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <BrandMark light />
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Your Gateway to Online Work. Primary display currency: USD ($). M-Pesa checkout currency: KES. Operating timezone: Africa/Nairobi.
            </p>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Marketplace</div>
            <div className="space-y-2 text-xs">
              <button type="button" onClick={() => navigate('/jobs')} className="block hover:text-white">
                Browse Jobs
              </button>
              <button type="button" onClick={() => navigate('/categories')} className="block hover:text-white">
                Job Categories
              </button>
              <button type="button" onClick={() => navigate('/membership')} className="block hover:text-white">
                Membership Plans
              </button>
              <button type="button" onClick={() => navigate('/referrals')} className="block hover:text-white">
                Referral Programme
              </button>
            </div>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Company</div>
            <div className="space-y-2 text-xs">
              <button type="button" onClick={() => navigate('/how-it-works')} className="block hover:text-white">
                How It Works
              </button>
              <button type="button" onClick={() => navigate('/about')} className="block hover:text-white">
                About Workaby AI
              </button>
              <button type="button" onClick={() => navigate('/faq')} className="block hover:text-white">
                FAQ
              </button>
              <button type="button" onClick={() => navigate('/contact')} className="block hover:text-white">
                Contact Support
              </button>
            </div>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Legal & Compliance</div>
            <div className="space-y-2 text-xs">
              <button type="button" onClick={() => navigate('/privacy')} className="block hover:text-white">
                Privacy Policy
              </button>
              <button type="button" onClick={() => navigate('/terms')} className="block hover:text-white">
                Terms & Conditions
              </button>
              <button type="button" onClick={() => navigate('/login')} className="block hover:text-white">
                Member Sign In
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 px-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Workaby AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
