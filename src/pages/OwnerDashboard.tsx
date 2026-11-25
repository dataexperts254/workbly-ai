import React, { useCallback, useEffect, useState } from 'react';
import {
  Download,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandMark, formatUsd } from '../components/BrandMark';
import { BreakdownBar, SimpleBarChart } from '../components/Charts';

export function OwnerDashboard({ navigate }: { navigate: (path: string) => void }) {
  const { user, token, apiFetch, logout } = useAuth();
  const [period, setPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'>('all');
  const [includeSample, setIncludeSample] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    category: 'hosting',
    vendor: '',
    description: '',
    amountUsd: '',
  });

  const loadOwnerData = useCallback(async () => {
    setError('');
    try {
      const res = await apiFetch(
        `/api/owner/dashboard?period=${period}&includeSample=${includeSample}`
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Access denied.');
    }
  }, [apiFetch, period, includeSample]);

  useEffect(() => {
    loadOwnerData();
  }, [loadOwnerData]);

  const handleDownloadCsv = async (type: 'ledger' | 'expenses' | 'referrals') => {
    try {
      const resp = await fetch(`/api/owner/reports/export?type=${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workabyai-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0B1528]">
            Owner Financial Access Restricted
          </h1>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/portal')}
            className="px-5 py-2 bg-[#0B1528] text-white text-xs font-semibold rounded-lg"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#0B1528]">
      {/* Top Bar */}
      <header className="bg-[#0B1528] text-white border-b border-[#16233B]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => navigate('/')}>
              <BrandMark light />
            </button>
            <span className="hidden sm:inline text-xs text-emerald-300 font-semibold">
              Platform Owner Financial & Profitability Console
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg inline-flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" /> Admin Portal
            </button>
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg inline-flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Member View
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="px-3 py-1.5 text-slate-300 hover:text-white inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Filter & Export Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0B1528]">
              Owner Revenue, Retention & Net Profit (USD)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Signed in as {user?.email} ({user?.roleSlug}) · Unpaid worker liabilities and referral commissions are strictly excluded from net profit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              {(['all', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium ${
                    period === p ? 'bg-white text-[#0B1528] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={includeSample}
                onChange={(e) => setIncludeSample(e.target.checked)}
              />
              <span>Include Sample Records</span>
            </label>

            <button
              type="button"
              onClick={() => handleDownloadCsv('ledger')}
              className="px-3 py-1.5 bg-[#0B1528] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Ledger CSV
            </button>
            <button
              type="button"
              onClick={() => handleDownloadCsv('referrals')}
              className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Referrals CSV
            </button>
          </div>
        </div>

        {data && (
          <>
            {/* Top-line Profitability Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs text-slate-500">Total Gross Revenue</div>
                <div className="font-mono-num text-2xl font-bold text-[#0B1528] mt-1">
                  {formatUsd(data.profitability.grossRevenue)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs text-slate-500">Referral Commissions</div>
                <div className="font-mono-num text-2xl font-bold text-[#2563EB] mt-1">
                  -{formatUsd(data.profitability.totalReferralCommissions)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs text-slate-500">Worker Liabilities</div>
                <div className="font-mono-num text-2xl font-bold text-amber-600 mt-1">
                  -{formatUsd(data.profitability.workerPaymentLiabilities)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-xs text-slate-500">Operating Expenses</div>
                <div className="font-mono-num text-2xl font-bold text-slate-700 mt-1">
                  -{formatUsd(data.profitability.totalOperatingExpenses)}
                </div>
              </div>
              <div className="bg-[#0B1528] text-white border border-[#0B1528] rounded-xl p-5">
                <div className="text-xs text-slate-300">Net Profit & Margin</div>
                <div className="font-mono-num text-2xl font-bold text-emerald-400 mt-1">
                  {formatUsd(data.profitability.netProfit)}
                </div>
                <div className="text-xs font-mono-num text-slate-300 mt-0.5">
                  Margin: {data.profitability.profitMarginPct}%
                </div>
              </div>
            </div>

            {/* Revenue Breakdown + Referral Retention */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <h2 className="font-display font-bold text-lg">
                  Gross Revenue Breakdown by Stream (USD)
                </h2>
                <BreakdownBar
                  segments={[
                    {
                      label: 'Verified Member',
                      value: data.revenueOverview.verifiedMemberRevenue,
                      color: '#0B1528',
                    },
                    {
                      label: 'Pro Worker ($5)',
                      value: data.revenueOverview.proWorkerRevenue,
                      color: '#2563EB',
                    },
                    {
                      label: 'Top-Rated ($8)',
                      value: data.revenueOverview.topRatedRevenue,
                      color: '#4F46E5',
                    },
                    {
                      label: 'Project Commissions',
                      value: data.revenueOverview.projectCommissionRevenue,
                      color: '#16A34A',
                    },
                    {
                      label: 'Corporate / Sponsored / Affiliate',
                      value:
                        data.revenueOverview.corporateRevenue +
                        data.revenueOverview.sponsoredPlacementRevenue +
                        data.revenueOverview.affiliateRevenue,
                      color: '#0D9488',
                    },
                  ]}
                />

                <SimpleBarChart
                  data={[
                    { label: 'Verified', value: data.revenueOverview.verifiedMemberRevenue },
                    { label: 'Pro ($5)', value: data.revenueOverview.proWorkerRevenue },
                    { label: 'Top-Rated ($8)', value: data.revenueOverview.topRatedRevenue },
                    { label: 'Projects (10%)', value: data.revenueOverview.projectCommissionRevenue },
                    { label: 'Affiliates', value: data.revenueOverview.affiliateRevenue },
                  ]}
                  primaryColor="#2563EB"
                  primaryLabel="Revenue USD"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-500">Referral-Driven Subs</div>
                    <div className="font-mono-num font-bold text-sm">
                      {formatUsd(data.revenueOverview.referralDrivenSubscriptionRevenue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Non-Referral Subs</div>
                    <div className="font-mono-num font-bold text-sm">
                      {formatUsd(data.revenueOverview.nonReferralSubscriptionRevenue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Revenue / Paying Member</div>
                    <div className="font-mono-num font-bold text-sm">
                      {formatUsd(data.unitEconomics.revenuePerPayingMemberUsd)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display font-bold text-lg">
                  Referral Revenue & Owner Retention
                </h2>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">Referred Subscription Sales</div>
                    <div className="font-mono-num text-lg font-bold mt-1">
                      {formatUsd(data.referralRevenue.totalReferredSubscriptionSales)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-emerald-800">Owner Retained Revenue</div>
                    <div className="font-mono-num text-lg font-bold text-[#16A34A] mt-1">
                      {formatUsd(data.referralRevenue.netRevenueRetainedFromReferrals)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">Recurring Referred Revenue</div>
                    <div className="font-mono-num text-base font-bold mt-1">
                      {formatUsd(data.referralRevenue.recurringReferredSubscriptionRevenue)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">Referral Conversion Rate</div>
                    <div className="font-mono-num text-base font-bold mt-1">
                      {data.referralRevenue.referralConversionRatePct}%
                    </div>
                  </div>
                </div>

                <h3 className="font-semibold text-xs text-slate-700 pt-2">
                  Top-Performing Referrers
                </h3>
                {data.referralRevenue.topReferrers.length === 0 ? (
                  <p className="text-xs text-slate-500">No referral conversions recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {data.referralRevenue.topReferrers.map((r: any) => (
                      <div key={r.referrerUserId} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{r.name}</div>
                          <div className="text-slate-500">{r.conversions} conversions</div>
                        </div>
                        <div className="text-right font-mono-num">
                          <div className="font-bold">{formatUsd(r.grossSalesUsd)} sales</div>
                          <div className="text-[#2563EB]">{formatUsd(r.commissionUsd)} comm</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expense Management + Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg">
                    Operating Expense Management
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv('expenses')}
                    className="text-xs font-semibold text-[#2563EB] inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Expenses CSV
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await apiFetch('/api/owner/expenses', {
                      method: 'POST',
                      body: JSON.stringify({
                        ...expenseForm,
                        amountUsd: Number(expenseForm.amountUsd),
                      }),
                    });
                    setExpenseForm({ category: 'hosting', vendor: '', description: '', amountUsd: '' });
                    loadOwnerData();
                  }}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end p-3.5 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="hosting">Hosting</option>
                    <option value="payment_processing">Payment Processing</option>
                    <option value="software">Software Subscriptions</option>
                    <option value="marketing">Marketing</option>
                    <option value="operational">Operational</option>
                    <option value="worker_payments">Worker Payments</option>
                    <option value="referral_commissions">Referral Commissions</option>
                    <option value="refunds">Refunds</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    required
                    placeholder="Vendor"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                  <input
                    required
                    placeholder="Description"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="USD"
                    value={expenseForm.amountUsd}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amountUsd: e.target.value })}
                    className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white font-mono-num"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2">Category</th>
                        <th className="py-2">Vendor / Description</th>
                        <th className="py-2 text-right">Amount (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.expenses.slice(0, 12).map((e: any) => (
                        <tr key={e.id}>
                          <td className="py-2 capitalize">{e.category.replace('_', ' ')}</td>
                          <td className="py-2">
                            <span className="font-semibold">{e.vendor}</span> · {e.description}
                          </td>
                          <td className="py-2 text-right font-mono-num">
                            {formatUsd(e.amountUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Forecast Module (Clearly Distinguished from Actuals) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#4F46E5]" />
                  <h2 className="font-display font-bold text-lg">
                    Quarterly Revenue Forecast (Projected)
                  </h2>
                </div>
                <p className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  {data.forecast.disclaimer}
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Projected Quarterly Renewals</span>
                    <span className="font-mono-num font-bold">
                      {data.forecast.projectedQuarterlyRenewals} members
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Est. Subscription Revenue</span>
                    <span className="font-mono-num font-bold">
                      {formatUsd(data.forecast.estimatedFutureSubscriptionRevenueUsd)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Est. Referral-Driven Revenue</span>
                    <span className="font-mono-num font-bold">
                      {formatUsd(data.forecast.estimatedReferralRevenueUsd)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Est. Operating Expenses</span>
                    <span className="font-mono-num font-bold">
                      -{formatUsd(data.forecast.estimatedOperatingExpensesUsd)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold">Projected Potential Profit</span>
                    <span className="font-mono-num font-bold text-[#16A34A]">
                      {formatUsd(data.forecast.estimatedPotentialProfitUsd)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting Ledger Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
              <h2 className="font-display font-bold text-lg mb-4">
                Separated Accounting Ledger Entries
              </h2>
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2">Entry #</th>
                    <th className="py-2">Ledger Scope</th>
                    <th className="py-2">Direction</th>
                    <th className="py-2 text-right">USD</th>
                    <th className="py-2 text-right">KES (Rate)</th>
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.ledgerEntries.slice(0, 25).map((l: any) => (
                    <tr key={l.id}>
                      <td className="py-2.5 font-mono-num">{l.entryNumber}</td>
                      <td className="py-2.5 capitalize">{l.ledgerScope.replace('_', ' ')}</td>
                      <td className="py-2.5 uppercase font-semibold">{l.direction}</td>
                      <td className="py-2.5 text-right font-mono-num font-bold">
                        {formatUsd(l.amountUsd)}
                      </td>
                      <td className="py-2.5 text-right font-mono-num text-slate-500">
                        {l.amountKes ? `${l.amountKes} (@${Number(l.exchangeRate).toFixed(2)})` : '—'}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {l.description} {l.isSample ? '(Sample)' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
