import { Router } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  affiliateCommissions,
  auditLogs,
  earnings,
  expenses,
  financialLedger,
  projectContracts,
  referralCommissions,
  referralRelationships,
  subscriptionTransactions,
  users,
} from '../../src/db/schema.ts';
import type { AuthRequest } from '../../src/middleware/auth.ts';
import { requireAuth, requireRole } from '../../src/middleware/auth.ts';

const router = Router();
router.use(requireAuth);
// Strictly deny ordinary 'admin' and 'member' roles
router.use(requireRole(['owner', 'finance_admin']));

function getPeriodStart(period: string): Date | null {
  const now = Date.now();
  switch (period) {
    case 'daily':
      return new Date(now - 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case 'quarterly':
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case 'annual':
      return new Date(now - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const period = String(req.query.period || 'all');
    const includeSample = req.query.includeSample !== 'false';
    const since = getPeriodStart(period);

    const txConditions = [eq(subscriptionTransactions.status, 'confirmed')];
    if (since) txConditions.push(gte(subscriptionTransactions.confirmedAt, since));
    if (!includeSample) txConditions.push(eq(subscriptionTransactions.isSample, false));

    const expConditions = [];
    if (since) expConditions.push(gte(expenses.incurredAt, since));
    if (!includeSample) expConditions.push(eq(expenses.isSample, false));

    const contractConditions = [];
    if (since) contractConditions.push(gte(projectContracts.createdAt, since));
    if (!includeSample) contractConditions.push(eq(projectContracts.isSample, false));

    const earningConditions = [sql`${earnings.status} IN ('approved','available','withdrawn')`];
    if (since) earningConditions.push(gte(earnings.earnedAt, since));
    if (!includeSample) earningConditions.push(eq(earnings.isSample, false));

    const [
      confirmedSubs,
      refComms,
      allContracts,
      allAffiliateComms,
      allExpenses,
      workerLiabilities,
      ledgerEntries,
      totalUsersRow,
      totalReferralsRow,
    ] = await Promise.all([
      db.select().from(subscriptionTransactions).where(and(...txConditions)),
      db.select().from(referralCommissions),
      db
        .select()
        .from(projectContracts)
        .where(contractConditions.length ? and(...contractConditions) : undefined),
      db.select().from(affiliateCommissions),
      db
        .select()
        .from(expenses)
        .where(expConditions.length ? and(...expConditions) : undefined)
        .orderBy(desc(expenses.incurredAt)),
      db
        .select({
          total: sql<string>`COALESCE(SUM(${earnings.amountUsd}), 0)`,
          unpaid: sql<string>`COALESCE(SUM(CASE WHEN ${earnings.status} IN ('approved','available') THEN ${earnings.amountUsd} ELSE 0 END), 0)`,
        })
        .from(earnings)
        .where(and(...earningConditions)),
      db.select().from(financialLedger).orderBy(desc(financialLedger.occurredAt)).limit(100),
      db
        .select({
          total: sql<number>`count(*)::int`,
          paying: sql<number>`COUNT(*) FILTER (WHERE ${users.membershipTier} != 'free')::int`,
        })
        .from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(referralRelationships),
    ]);

    const filteredComms = refComms.filter((c) => {
      if (!includeSample && c.isSample) return false;
      if (since && new Date(c.createdAt) < since) return false;
      return true;
    });

    const commBySubTxId = new Map(filteredComms.map((c) => [c.subscriptionTransactionId, c]));

    let verifiedRevenue = 0;
    let proRevenue = 0;
    let topRatedRevenue = 0;
    let referralDrivenSubRevenue = 0;
    let nonReferralSubRevenue = 0;
    let recurringReferredSubRevenue = 0;
    let renewalCount = 0;

    for (const tx of confirmedSubs) {
      const amt = Number(tx.amountUsd);
      if (tx.planSlug === 'verified') verifiedRevenue += amt;
      else if (tx.planSlug === 'pro') proRevenue += amt;
      else if (tx.planSlug === 'top_rated') topRatedRevenue += amt;

      if (tx.isRenewal) renewalCount += 1;

      if (commBySubTxId.has(tx.id)) {
        referralDrivenSubRevenue += amt;
        if (tx.isRenewal) recurringReferredSubRevenue += amt;
      } else {
        nonReferralSubRevenue += amt;
      }
    }

    const totalSubscriptionRevenue = verifiedRevenue + proRevenue + topRatedRevenue;

    let projectCommissionRevenue = 0;
    let corporateRevenue = 0;
    let sponsoredPlacementRevenue = 0;
    for (const c of allContracts) {
      const amt = Number(c.platformCommissionUsd);
      if (c.revenueType === 'corporate') corporateRevenue += amt;
      else if (c.revenueType === 'sponsored_placement') sponsoredPlacementRevenue += amt;
      else projectCommissionRevenue += amt;
    }

    const affiliateRevenue = allAffiliateComms
      .filter((a) => a.status !== 'pending')
      .reduce((acc, a) => acc + Number(a.amountUsd), 0);

    const grossRevenue =
      totalSubscriptionRevenue +
      projectCommissionRevenue +
      corporateRevenue +
      affiliateRevenue +
      sponsoredPlacementRevenue;

    const totalReferralCommissionsPaidOrAvailable = filteredComms
      .filter((c) => c.status !== 'reversed' && c.status !== 'pending')
      .reduce((acc, c) => acc + Number(c.commissionAmountUsd), 0);

    const totalReferralCommissionsPending = filteredComms
      .filter((c) => c.status === 'pending')
      .reduce((acc, c) => acc + Number(c.commissionAmountUsd), 0);

    const netRevenueRetainedFromReferrals = Math.max(
      0,
      referralDrivenSubRevenue - totalReferralCommissionsPaidOrAvailable
    );

    const operatingExpensesTotal = allExpenses.reduce((acc, e) => acc + Number(e.amountUsd), 0);
    const workerPaymentLiabilities = Number(workerLiabilities[0]?.total ?? 0);
    const unpaidWorkerLiabilities = Number(workerLiabilities[0]?.unpaid ?? 0);

    const netOperatingContribution =
      grossRevenue - totalReferralCommissionsPaidOrAvailable - workerPaymentLiabilities;
    const netProfit = netOperatingContribution - operatingExpensesTotal;
    const profitMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // Top-performing referrers
    const referrerStatsMap = new Map<
      number,
      { referrerUserId: number; grossSalesUsd: number; commissionUsd: number; conversions: number }
    >();
    for (const c of filteredComms) {
      if (c.status === 'reversed') continue;
      const cur = referrerStatsMap.get(c.referrerUserId) || {
        referrerUserId: c.referrerUserId,
        grossSalesUsd: 0,
        commissionUsd: 0,
        conversions: 0,
      };
      cur.grossSalesUsd += Number(c.baseAmountUsd);
      cur.commissionUsd += Number(c.commissionAmountUsd);
      cur.conversions += 1;
      referrerStatsMap.set(c.referrerUserId, cur);
    }

    const topReferrerIds = Array.from(referrerStatsMap.keys());
    const referrerUsers =
      topReferrerIds.length > 0
        ? await db
            .select({ id: users.id, fullName: users.fullName, email: users.email })
            .from(users)
        : [];
    const userMap = new Map(referrerUsers.map((u) => [u.id, u]));

    const topReferrers = Array.from(referrerStatsMap.values())
      .sort((a, b) => b.grossSalesUsd - a.grossSalesUsd)
      .slice(0, 8)
      .map((r) => ({
        ...r,
        name: userMap.get(r.referrerUserId)?.fullName || `Member #${r.referrerUserId}`,
        email: userMap.get(r.referrerUserId)?.email || '',
      }));

    const totalUsers = totalUsersRow[0]?.total ?? 0;
    const payingMembers = totalUsersRow[0]?.paying ?? 0;
    const totalReferrals = totalReferralsRow[0]?.count ?? 0;
    const paidReferralCount = new Set(
      filteredComms.filter((c) => c.status !== 'reversed').map((c) => c.referredUserId)
    ).size;

    const marketingSpend = allExpenses
      .filter((e) => e.category === 'marketing')
      .reduce((acc, e) => acc + Number(e.amountUsd), 0);

    // Clear forecast clearly separated from actuals
    const avgQuarterlySubPrice = payingMembers > 0 ? totalSubscriptionRevenue / Math.max(1, confirmedSubs.length) : 6.0;
    const projectedQuarterlyRenewals = Math.round(payingMembers * 0.78);
    const forecastNextQuarterSubRevenue = Number(
      ((payingMembers + Math.max(2, Math.round(totalUsers * 0.12))) * avgQuarterlySubPrice).toFixed(2)
    );
    const forecastReferralRevenue = Number((forecastNextQuarterSubRevenue * 0.25).toFixed(2));
    const forecastOperatingExpenses = Number(
      (operatingExpensesTotal > 0 ? operatingExpensesTotal : 45).toFixed(2)
    );
    const forecastPotentialProfit = Number(
      (
        forecastNextQuarterSubRevenue -
        forecastReferralRevenue * 0.1 -
        forecastOperatingExpenses
      ).toFixed(2)
    );

    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {};
    for (const e of allExpenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amountUsd);
    }

    return res.json({
      period,
      includeSample,
      revenueOverview: {
        totalSubscriptionRevenue: Number(totalSubscriptionRevenue.toFixed(2)),
        verifiedMemberRevenue: Number(verifiedRevenue.toFixed(2)),
        proWorkerRevenue: Number(proRevenue.toFixed(2)),
        topRatedRevenue: Number(topRatedRevenue.toFixed(2)),
        referralDrivenSubscriptionRevenue: Number(referralDrivenSubRevenue.toFixed(2)),
        nonReferralSubscriptionRevenue: Number(nonReferralSubRevenue.toFixed(2)),
        projectCommissionRevenue: Number(projectCommissionRevenue.toFixed(2)),
        corporateRevenue: Number(corporateRevenue.toFixed(2)),
        affiliateRevenue: Number(affiliateRevenue.toFixed(2)),
        sponsoredPlacementRevenue: Number(sponsoredPlacementRevenue.toFixed(2)),
        grossRevenue: Number(grossRevenue.toFixed(2)),
      },
      referralRevenue: {
        totalReferredSubscriptionSales: Number(referralDrivenSubRevenue.toFixed(2)),
        totalReferralCommissionsPaid: Number(totalReferralCommissionsPaidOrAvailable.toFixed(2)),
        totalReferralCommissionsPending: Number(totalReferralCommissionsPending.toFixed(2)),
        netRevenueRetainedFromReferrals: Number(netRevenueRetainedFromReferrals.toFixed(2)),
        recurringReferredSubscriptionRevenue: Number(recurringReferredSubRevenue.toFixed(2)),
        referralConversionRatePct:
          totalReferrals > 0 ? Number(((paidReferralCount / totalReferrals) * 100).toFixed(1)) : 0,
        topReferrers,
      },
      profitability: {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        totalReferralCommissions: Number(totalReferralCommissionsPaidOrAvailable.toFixed(2)),
        workerPaymentLiabilities: Number(workerPaymentLiabilities.toFixed(2)),
        unpaidWorkerLiabilities: Number(unpaidWorkerLiabilities.toFixed(2)),
        totalOperatingExpenses: Number(operatingExpensesTotal.toFixed(2)),
        netOperatingContribution: Number(netOperatingContribution.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        profitMarginPct: Number(profitMarginPct.toFixed(1)),
      },
      unitEconomics: {
        totalUsers,
        payingMembers,
        membershipConversionRatePct:
          totalUsers > 0 ? Number(((payingMembers / totalUsers) * 100).toFixed(1)) : 0,
        subscriptionRenewalRatePct:
          confirmedSubs.length > 0
            ? Number(((renewalCount / confirmedSubs.length) * 100).toFixed(1))
            : 0,
        revenuePerPayingMemberUsd:
          payingMembers > 0 ? Number((totalSubscriptionRevenue / payingMembers).toFixed(2)) : 0,
        customerAcquisitionCostUsd:
          payingMembers > 0 && marketingSpend > 0
            ? Number((marketingSpend / payingMembers).toFixed(2))
            : null,
      },
      forecast: {
        isForecast: true,
        disclaimer:
          'Estimated projection based on active subscriptions and historical rates — strictly separate from realized accounting ledger results.',
        projectedQuarterlyRenewals,
        estimatedFutureSubscriptionRevenueUsd: forecastNextQuarterSubRevenue,
        estimatedReferralRevenueUsd: forecastReferralRevenue,
        estimatedOperatingExpensesUsd: forecastOperatingExpenses,
        estimatedPotentialProfitUsd: forecastPotentialProfit,
      },
      expenses: allExpenses,
      expenseByCategory,
      ledgerEntries,
    });
  } catch (error) {
    console.error('Owner dashboard error:', error);
    return res.status(500).json({ error: 'Unable to load owner financial analytics.' });
  }
});

const expenseSchema = z.object({
  category: z.enum([
    'referral_commissions',
    'worker_payments',
    'payment_processing',
    'hosting',
    'software',
    'marketing',
    'operational',
    'refunds',
    'other',
  ]),
  vendor: z.string().min(2),
  description: z.string().min(3),
  amountUsd: z.number().positive(),
  incurredAt: z.string().optional(),
});

router.post('/expenses', async (req: AuthRequest, res) => {
  try {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid expense.' });
    }

    const d = parsed.data;
    const occurred = d.incurredAt ? new Date(d.incurredAt) : new Date();

    const [created] = await db
      .insert(expenses)
      .values({
        category: d.category,
        vendor: d.vendor.trim(),
        description: d.description.trim(),
        amountUsd: d.amountUsd.toFixed(2),
        incurredAt: occurred,
        recordedByUserId: req.authUser!.id,
        isSample: false,
      })
      .returning();

    await db.insert(financialLedger).values({
      entryNumber: `FL-EXP-${created.id}-${Date.now()}`,
      ledgerScope: 'business_expenses',
      category: d.category,
      direction: 'debit',
      amountUsd: d.amountUsd.toFixed(2),
      referenceId: `EXP-${created.id}`,
      description: `${d.vendor}: ${d.description}`,
      isSample: false,
      recordedByUserId: req.authUser!.id,
      occurredAt: occurred,
    });

    await db.insert(auditLogs).values({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'expense_recorded',
      entityType: 'expense',
      entityId: String(created.id),
      detailsJson: { category: d.category, amountUsd: d.amountUsd, vendor: d.vendor },
    });

    return res.status(201).json({ expense: created });
  } catch (error) {
    console.error('Create expense error:', error);
    return res.status(500).json({ error: 'Unable to record expense.' });
  }
});

router.get('/reports/export', async (req: AuthRequest, res) => {
  try {
    const reportType = String(req.query.type || 'ledger');
    let csv = '';

    if (reportType === 'expenses') {
      const rows = await db.select().from(expenses).orderBy(desc(expenses.incurredAt));
      csv = 'ID,Category,Vendor,Description,Amount_USD,Incurred_At,Is_Sample\n';
      for (const r of rows) {
        csv += `${r.id},"${r.category}","${r.vendor.replace(/"/g, '""')}","${r.description.replace(/"/g, '""')}",${r.amountUsd},${new Date(r.incurredAt).toISOString()},${r.isSample}\n`;
      }
    } else if (reportType === 'referrals') {
      const rows = await db
        .select()
        .from(referralCommissions)
        .orderBy(desc(referralCommissions.createdAt));
      csv =
        'ID,Referrer_ID,Referred_ID,Sub_Tx_ID,Rate_Pct,Base_USD,Commission_USD,Retained_USD,Status,Is_Renewal,Created_At\n';
      for (const r of rows) {
        csv += `${r.id},${r.referrerUserId},${r.referredUserId},${r.subscriptionTransactionId},${r.commissionRatePct},${r.baseAmountUsd},${r.commissionAmountUsd},${r.retainedAmountUsd},${r.status},${r.isRenewal},${new Date(r.createdAt).toISOString()}\n`;
      }
    } else {
      const rows = await db
        .select()
        .from(financialLedger)
        .orderBy(desc(financialLedger.occurredAt));
      csv =
        'Entry_Number,Ledger_Scope,Category,Direction,Amount_USD,Amount_KES,Exchange_Rate,Reference_ID,Description,Is_Sample,Occurred_At\n';
      for (const r of rows) {
        csv += `"${r.entryNumber}","${r.ledgerScope}","${r.category}","${r.direction}",${r.amountUsd},${r.amountKes ?? ''},${r.exchangeRate ?? ''},"${r.referenceId ?? ''}","${r.description.replace(/"/g, '""')}",${r.isSample},${new Date(r.occurredAt).toISOString()}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="workabyai-${reportType}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to export CSV report.' });
  }
});

export default router;
