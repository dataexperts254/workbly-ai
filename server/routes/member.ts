import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  earnings,
  jobAllocations,
  jobApplications,
  jobCategories,
  jobProviders,
  jobs,
  jobSubmissions,
  membershipPlans,
  notifications,
  pricingSettings,
  profiles,
  referralClicks,
  referralCodes,
  referralCommissions,
  referralRelationships,
  referralWalletTransactions,
  submissionReviews,
  subscriptions,
  subscriptionTransactions,
  users,
  withdrawals,
  workerPerformance,
} from '../../src/db/schema.ts';
import { hashPassword, verifyPassword } from '../../src/lib/auth-session.ts';
import { AuthRequest, requireAuth } from '../../src/middleware/auth.ts';
import {
  allocateJobToMember,
  getWeeklyAllowanceSummary,
  isTierEligibleForJob,
} from '../services/allocation.ts';
import { getActiveUsdKesRate } from '../services/exchangeRate.ts';
import { initiateDarajaStkPush, normalizeKenyaPhone } from '../services/mpesa.ts';

const router = Router();
router.use(requireAuth);

async function getMemberBalances(userId: number) {
  const [workerEarnedRow, workerWithdrawnRow, refEarnedRow, refWithdrawnRow] = await Promise.all([
    db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN ${earnings.status} IN ('approved','available','withdrawn') THEN ${earnings.amountUsd} ELSE 0 END), 0)`,
        pending: sql<string>`COALESCE(SUM(CASE WHEN ${earnings.status} = 'pending' THEN ${earnings.amountUsd} ELSE 0 END), 0)`,
        approved: sql<string>`COALESCE(SUM(CASE WHEN ${earnings.status} IN ('approved','available') THEN ${earnings.amountUsd} ELSE 0 END), 0)`,
      })
      .from(earnings)
      .where(eq(earnings.userId, userId)),
    db
      .select({
        reserved: sql<string>`COALESCE(SUM(CASE WHEN ${withdrawals.status} IN ('pending','approved','processing','paid') THEN ${withdrawals.amountUsd} ELSE 0 END), 0)`,
      })
      .from(withdrawals)
      .where(and(eq(withdrawals.userId, userId), eq(withdrawals.ledgerType, 'worker_earnings'))),
    db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN ${referralCommissions.status} IN ('approved','available','withdrawn') THEN ${referralCommissions.commissionAmountUsd} ELSE 0 END), 0)`,
        pending: sql<string>`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'pending' THEN ${referralCommissions.commissionAmountUsd} ELSE 0 END), 0)`,
        approved: sql<string>`COALESCE(SUM(CASE WHEN ${referralCommissions.status} IN ('approved','available') THEN ${referralCommissions.commissionAmountUsd} ELSE 0 END), 0)`,
      })
      .from(referralCommissions)
      .where(eq(referralCommissions.referrerUserId, userId)),
    db
      .select({
        reserved: sql<string>`COALESCE(SUM(CASE WHEN ${withdrawals.status} IN ('pending','approved','processing','paid') THEN ${withdrawals.amountUsd} ELSE 0 END), 0)`,
      })
      .from(withdrawals)
      .where(and(eq(withdrawals.userId, userId), eq(withdrawals.ledgerType, 'referral_commissions'))),
  ]);

  const workerTotal = Number(workerEarnedRow[0]?.total ?? 0);
  const workerPending = Number(workerEarnedRow[0]?.pending ?? 0);
  const workerApproved = Number(workerEarnedRow[0]?.approved ?? 0);
  const workerReserved = Number(workerWithdrawnRow[0]?.reserved ?? 0);
  const workerAvailable = Math.max(0, Number((workerApproved - workerReserved).toFixed(2)));

  const refTotal = Number(refEarnedRow[0]?.total ?? 0);
  const refPending = Number(refEarnedRow[0]?.pending ?? 0);
  const refApproved = Number(refEarnedRow[0]?.approved ?? 0);
  const refReserved = Number(refWithdrawnRow[0]?.reserved ?? 0);
  const refAvailable = Math.max(0, Number((refApproved - refReserved).toFixed(2)));

  return {
    worker: {
      totalEarningsUsd: workerTotal,
      pendingEarningsUsd: workerPending,
      approvedEarningsUsd: workerApproved,
      withdrawnOrPendingUsd: workerReserved,
      availableWithdrawalUsd: workerAvailable,
    },
    referral: {
      totalEarningsUsd: refTotal,
      pendingCommissionsUsd: refPending,
      approvedCommissionsUsd: refApproved,
      withdrawnOrPendingUsd: refReserved,
      availableReferralBalanceUsd: refAvailable,
    },
  };
}

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const [allowance, balances, perfRows, subCounts, refCodeRows, refStats, recentNotifs, allJobs] =
      await Promise.all([
        getWeeklyAllowanceSummary(user.id, user.membershipTier),
        getMemberBalances(user.id),
        db.select().from(workerPerformance).where(eq(workerPerformance.userId, user.id)).limit(1),
        db
          .select({
            status: jobSubmissions.status,
            count: sql<number>`count(*)::int`,
          })
          .from(jobSubmissions)
          .where(eq(jobSubmissions.userId, user.id))
          .groupBy(jobSubmissions.status),
        db.select().from(referralCodes).where(eq(referralCodes.userId, user.id)).limit(1),
        db
          .select({
            totalRegistrations: sql<number>`count(*)::int`,
          })
          .from(referralRelationships)
          .where(eq(referralRelationships.referrerUserId, user.id)),
        db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, user.id))
          .orderBy(desc(notifications.createdAt))
          .limit(8),
        db
          .select({
            id: jobs.id,
            jobCode: jobs.jobCode,
            title: jobs.title,
            rewardUsd: jobs.rewardUsd,
            difficulty: jobs.difficulty,
            estimatedDuration: jobs.estimatedDuration,
            deadlineAt: jobs.deadlineAt,
            minTier: jobs.minTier,
            eligibleTiersJson: jobs.eligibleTiersJson,
            isSample: jobs.isSample,
            categoryName: jobCategories.name,
            providerName: jobProviders.name,
            providerClassification: jobProviders.classification,
          })
          .from(jobs)
          .innerJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
          .innerJoin(jobProviders, eq(jobs.providerId, jobProviders.id))
          .where(eq(jobs.status, 'published'))
          .orderBy(desc(jobs.isFeatured), desc(jobs.createdAt))
          .limit(12),
      ]);

    const paidRefCountRows = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${referralCommissions.referredUserId})::int` })
      .from(referralCommissions)
      .where(and(eq(referralCommissions.referrerUserId, user.id), sql`${referralCommissions.status} != 'reversed'`));

    const subCountMap = new Map(subCounts.map((s) => [s.status, s.count]));
    const pendingSubmissions =
      (subCountMap.get('submitted') ?? 0) +
      (subCountMap.get('under_review') ?? 0) +
      (subCountMap.get('correction_requested') ?? 0);
    const approvedSubmissions = (subCountMap.get('approved') ?? 0) + (subCountMap.get('paid') ?? 0);
    const rejectedSubmissions = subCountMap.get('rejected') ?? 0;

    const recommendedJobs = allJobs
      .filter((j) =>
        isTierEligibleForJob({
          userTier: user.membershipTier,
          allowVerifiedProviders: allowance.allowVerifiedProviders,
          allowProExclusive: allowance.allowProExclusive,
          allowTopRatedExclusive: allowance.allowTopRatedExclusive,
          providerClassification: j.providerClassification,
          jobMinTier: j.minTier,
          eligibleTiers: j.eligibleTiersJson || [],
        }).eligible
      )
      .slice(0, 6);

    const recentEarnings = await db
      .select({
        earnedAt: earnings.earnedAt,
        amountUsd: earnings.amountUsd,
      })
      .from(earnings)
      .where(eq(earnings.userId, user.id))
      .orderBy(desc(earnings.earnedAt))
      .limit(30);

    return res.json({
      user,
      allowance,
      balances,
      performance: perfRows[0] ?? {
        totalAllocated: 0,
        totalSubmitted: 0,
        totalApproved: 0,
        totalRejected: 0,
        approvalRate: '100.00',
        currentStreak: 0,
      },
      submissionStats: {
        pending: pendingSubmissions,
        approved: approvedSubmissions,
        rejected: rejectedSubmissions,
      },
      referralSummary: {
        code: refCodeRows[0]?.code || '',
        totalRegistrations: refStats[0]?.totalRegistrations ?? 0,
        paidReferrals: paidRefCountRows[0]?.count ?? 0,
      },
      recommendedJobs,
      availableJobsCount: allJobs.length,
      notifications: recentNotifs,
      recentEarnings,
    });
  } catch (error) {
    console.error('Member dashboard error:', error);
    return res.status(500).json({ error: 'Unable to load member dashboard.' });
  }
});

router.get('/jobs', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const allowance = await getWeeklyAllowanceSummary(user.id, user.membershipTier);

    const [rows, myAllocations] = await Promise.all([
      db
        .select({
          id: jobs.id,
          jobCode: jobs.jobCode,
          title: jobs.title,
          description: jobs.description,
          instructions: jobs.instructions,
          submissionRequirements: jobs.submissionRequirements,
          paymentConditions: jobs.paymentConditions,
          requiredSkillsJson: jobs.requiredSkillsJson,
          difficulty: jobs.difficulty,
          estimatedDuration: jobs.estimatedDuration,
          rewardUsd: jobs.rewardUsd,
          availablePositions: jobs.availablePositions,
          filledPositions: jobs.filledPositions,
          deadlineAt: jobs.deadlineAt,
          minTier: jobs.minTier,
          eligibleTiersJson: jobs.eligibleTiersJson,
          isFeatured: jobs.isFeatured,
          isSample: jobs.isSample,
          categoryName: jobCategories.name,
          categorySlug: jobCategories.slug,
          providerName: jobProviders.name,
          providerClassification: jobProviders.classification,
        })
        .from(jobs)
        .innerJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
        .innerJoin(jobProviders, eq(jobs.providerId, jobProviders.id))
        .where(eq(jobs.status, 'published'))
        .orderBy(desc(jobs.isFeatured), desc(jobs.createdAt)),
      db.select().from(jobAllocations).where(eq(jobAllocations.userId, user.id)),
    ]);

    const allocatedJobIds = new Set(myAllocations.map((a) => a.jobId));

    const enriched = rows.map((job) => {
      const check = isTierEligibleForJob({
        userTier: user.membershipTier,
        allowVerifiedProviders: allowance.allowVerifiedProviders,
        allowProExclusive: allowance.allowProExclusive,
        allowTopRatedExclusive: allowance.allowTopRatedExclusive,
        providerClassification: job.providerClassification,
        jobMinTier: job.minTier,
        eligibleTiers: job.eligibleTiersJson || [],
      });
      return {
        ...job,
        isEligible: check.eligible,
        ineligibilityReason: check.reason || null,
        isAllocatedToMe: allocatedJobIds.has(job.id),
      };
    });

    return res.json({ allowance, jobs: enriched });
  } catch (error) {
    console.error('Member jobs error:', error);
    return res.status(500).json({ error: 'Unable to load available jobs.' });
  }
});

router.post('/jobs/:id/allocate', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const jobId = Number(req.params.id);
    if (!Number.isInteger(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID.' });
    }

    const result = await allocateJobToMember({
      userId: user.id,
      membershipTier: user.membershipTier,
      jobId,
    });

    const allowance = await getWeeklyAllowanceSummary(user.id, user.membershipTier);
    return res.status(201).json({ ...result, allowance });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to allocate job.' });
  }
});

router.get('/work', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const [allocations, applications, submissions] = await Promise.all([
      db
        .select({
          allocationId: jobAllocations.id,
          weekKey: jobAllocations.weekKey,
          allocationStatus: jobAllocations.status,
          allocatedAt: jobAllocations.allocatedAt,
          jobId: jobs.id,
          jobCode: jobs.jobCode,
          title: jobs.title,
          instructions: jobs.instructions,
          submissionRequirements: jobs.submissionRequirements,
          rewardUsd: jobs.rewardUsd,
          deadlineAt: jobs.deadlineAt,
          isSample: jobs.isSample,
          categoryName: jobCategories.name,
          providerName: jobProviders.name,
          providerClassification: jobProviders.classification,
        })
        .from(jobAllocations)
        .innerJoin(jobs, eq(jobAllocations.jobId, jobs.id))
        .innerJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
        .innerJoin(jobProviders, eq(jobs.providerId, jobProviders.id))
        .where(eq(jobAllocations.userId, user.id))
        .orderBy(desc(jobAllocations.allocatedAt)),
      db
        .select({
          id: jobApplications.id,
          jobId: jobApplications.jobId,
          status: jobApplications.status,
          coverNote: jobApplications.coverNote,
          appliedAt: jobApplications.appliedAt,
          jobTitle: jobs.title,
          rewardUsd: jobs.rewardUsd,
        })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(eq(jobApplications.userId, user.id))
        .orderBy(desc(jobApplications.appliedAt)),
      db
        .select({
          id: jobSubmissions.id,
          jobId: jobSubmissions.jobId,
          submissionType: jobSubmissions.submissionType,
          textContent: jobSubmissions.textContent,
          externalReference: jobSubmissions.externalReference,
          attachmentName: jobSubmissions.attachmentName,
          notes: jobSubmissions.notes,
          status: jobSubmissions.status,
          submittedAt: jobSubmissions.submittedAt,
          jobTitle: jobs.title,
          rewardUsd: jobs.rewardUsd,
        })
        .from(jobSubmissions)
        .innerJoin(jobs, eq(jobSubmissions.jobId, jobs.id))
        .where(eq(jobSubmissions.userId, user.id))
        .orderBy(desc(jobSubmissions.submittedAt)),
    ]);

    const reviews = await db
      .select()
      .from(submissionReviews)
      .orderBy(desc(submissionReviews.reviewedAt));

    const reviewBySubId = new Map<number, (typeof reviews)[0]>();
    for (const r of reviews) {
      if (!reviewBySubId.has(r.submissionId)) {
        reviewBySubId.set(r.submissionId, r);
      }
    }

    return res.json({
      allocations,
      applications,
      submissions: submissions.map((s) => ({
        ...s,
        latestReview: reviewBySubId.get(s.id) ?? null,
      })),
    });
  } catch (error) {
    console.error('Member work error:', error);
    return res.status(500).json({ error: 'Unable to load your workspace.' });
  }
});

const submissionSchema = z.object({
  jobId: z.number().int().positive(),
  submissionType: z.enum(['text', 'document', 'image', 'file', 'external_ref']).default('text'),
  textContent: z.string().min(10, 'Please provide task deliverable details (minimum 10 characters).'),
  externalReference: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/submissions', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid submission.' });
    }

    const [alloc] = await db
      .select()
      .from(jobAllocations)
      .where(and(eq(jobAllocations.jobId, parsed.data.jobId), eq(jobAllocations.userId, user.id)))
      .limit(1);

    if (!alloc) {
      return res.status(403).json({ error: 'You must allocate this job before submitting work.' });
    }

    const [appRow] = await db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, parsed.data.jobId), eq(jobApplications.userId, user.id)))
      .limit(1);

    const [created] = await db
      .insert(jobSubmissions)
      .values({
        jobId: parsed.data.jobId,
        userId: user.id,
        applicationId: appRow?.id ?? null,
        submissionType: parsed.data.submissionType,
        textContent: parsed.data.textContent.trim(),
        externalReference: parsed.data.externalReference?.trim() || null,
        attachmentName: parsed.data.attachmentName?.trim() || null,
        attachmentUrl: parsed.data.attachmentUrl?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: 'submitted',
      })
      .returning();

    await db
      .update(jobAllocations)
      .set({ status: 'completed' })
      .where(eq(jobAllocations.id, alloc.id));

    await db
      .update(workerPerformance)
      .set({
        totalSubmitted: sql`${workerPerformance.totalSubmitted} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(workerPerformance.userId, user.id));

    await db.insert(notifications).values({
      userId: null,
      targetRole: 'admin',
      category: 'submission',
      title: 'New task submission awaiting QA review',
      message: `${user.fullName} submitted work for Job #${parsed.data.jobId}.`,
      linkPath: '/admin/submissions',
    });

    return res.status(201).json({ submission: created });
  } catch (error) {
    console.error('Submit work error:', error);
    return res.status(500).json({ error: 'Failed to record submission.' });
  }
});

router.get('/earnings', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const [balances, earningRows, withdrawalRows, rateInfo, minWorkerSetting, minRefSetting] =
      await Promise.all([
        getMemberBalances(user.id),
        db
          .select({
            id: earnings.id,
            jobId: earnings.jobId,
            submissionId: earnings.submissionId,
            amountUsd: earnings.amountUsd,
            status: earnings.status,
            isSample: earnings.isSample,
            earnedAt: earnings.earnedAt,
            approvedAt: earnings.approvedAt,
            jobTitle: jobs.title,
          })
          .from(earnings)
          .innerJoin(jobs, eq(earnings.jobId, jobs.id))
          .where(eq(earnings.userId, user.id))
          .orderBy(desc(earnings.earnedAt)),
        db
          .select()
          .from(withdrawals)
          .where(eq(withdrawals.userId, user.id))
          .orderBy(desc(withdrawals.requestedAt)),
        getActiveUsdKesRate(),
        db.select().from(pricingSettings).where(eq(pricingSettings.key, 'min_worker_withdrawal_usd')).limit(1),
        db.select().from(pricingSettings).where(eq(pricingSettings.key, 'min_referral_withdrawal_usd')).limit(1),
      ]);

    return res.json({
      balances,
      earnings: earningRows,
      withdrawals: withdrawalRows,
      exchangeRate: rateInfo,
      minimums: {
        workerUsd: Number(minWorkerSetting[0]?.valueNumeric ?? 5),
        referralUsd: Number(minRefSetting[0]?.valueNumeric ?? 2),
      },
    });
  } catch (error) {
    console.error('Member earnings error:', error);
    return res.status(500).json({ error: 'Unable to load earnings ledger.' });
  }
});

const withdrawalSchema = z.object({
  ledgerType: z.enum(['worker_earnings', 'referral_commissions']),
  amountUsd: z.number().positive(),
  phoneNumber: z.string().min(9),
});

router.post('/withdrawals', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const parsed = withdrawalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid withdrawal request.' });
    }

    const phone254 = normalizeKenyaPhone(parsed.data.phoneNumber);
    if (!phone254) {
      return res.status(400).json({ error: 'Enter a valid Kenyan M-Pesa phone number (e.g. 0712345678 or 254712345678).' });
    }

    const balances = await getMemberBalances(user.id);
    const available =
      parsed.data.ledgerType === 'worker_earnings'
        ? balances.worker.availableWithdrawalUsd
        : balances.referral.availableReferralBalanceUsd;

    const minKey =
      parsed.data.ledgerType === 'worker_earnings'
        ? 'min_worker_withdrawal_usd'
        : 'min_referral_withdrawal_usd';
    const [minSetting] = await db
      .select()
      .from(pricingSettings)
      .where(eq(pricingSettings.key, minKey))
      .limit(1);
    const minUsd = Number(minSetting?.valueNumeric ?? 2);

    if (parsed.data.amountUsd < minUsd) {
      return res.status(400).json({ error: `Minimum withdrawal for this ledger is $${minUsd.toFixed(2)} USD.` });
    }
    if (parsed.data.amountUsd > available) {
      return res.status(400).json({ error: `Requested amount exceeds available balance ($${available.toFixed(2)} USD).` });
    }

    const rateInfo = await getActiveUsdKesRate();
    const amountKes = Number((parsed.data.amountUsd * rateInfo.rate).toFixed(2));

    const [created] = await db
      .insert(withdrawals)
      .values({
        userId: user.id,
        ledgerType: parsed.data.ledgerType,
        amountUsd: parsed.data.amountUsd.toFixed(2),
        amountKes: amountKes.toFixed(2),
        exchangeRate: rateInfo.rate.toFixed(4),
        phoneNumber: phone254,
        payoutMethod: 'mpesa',
        status: 'pending',
      })
      .returning();

    await db.insert(notifications).values({
      userId: null,
      targetRole: 'admin',
      category: 'withdrawal',
      title: `New ${parsed.data.ledgerType === 'worker_earnings' ? 'Worker' : 'Referral'} withdrawal request`,
      message: `${user.fullName} requested $${parsed.data.amountUsd.toFixed(2)} USD (KES ${amountKes.toFixed(2)}) to ${phone254}.`,
      linkPath:
        parsed.data.ledgerType === 'worker_earnings' ? '/admin/withdrawals' : '/admin/referrals',
    });

    return res.status(201).json({ withdrawal: created });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    return res.status(500).json({ error: 'Unable to submit withdrawal request.' });
  }
});

router.get('/membership', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const [plans, rateInfo, history, transactions] = await Promise.all([
      db.select().from(membershipPlans).where(eq(membershipPlans.isActive, true)).orderBy(membershipPlans.sortOrder),
      getActiveUsdKesRate(),
      db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)),
      db
        .select()
        .from(subscriptionTransactions)
        .where(eq(subscriptionTransactions.userId, user.id))
        .orderBy(desc(subscriptionTransactions.createdAt)),
    ]);

    return res.json({
      currentTier: user.membershipTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      plans,
      exchangeRate: rateInfo,
      subscriptions: history,
      transactions,
    });
  } catch (error) {
    console.error('Membership fetch error:', error);
    return res.status(500).json({ error: 'Unable to load membership details.' });
  }
});

const subscribeSchema = z.object({
  planSlug: z.enum(['verified', 'pro', 'top_rated']),
  phoneNumber: z.string().min(9),
  autoRenewAuthorized: z.boolean().default(false),
});

router.post('/subscriptions/initiate', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Select a valid paid plan and M-Pesa phone number.' });
    }

    const phone254 = normalizeKenyaPhone(parsed.data.phoneNumber);
    if (!phone254) {
      return res.status(400).json({
        error: 'Enter a valid Kenyan M-Pesa phone number (e.g. 0712345678 or 254712345678).',
      });
    }

    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.slug, parsed.data.planSlug))
      .limit(1);

    if (!plan || !plan.isActive || Number(plan.priceUsd) <= 0) {
      return res.status(404).json({ error: 'Selected membership plan is unavailable.' });
    }

    const rateInfo = await getActiveUsdKesRate();
    const amountUsd = Number(plan.priceUsd);
    const amountKes = Math.max(1, Math.round(amountUsd * rateInfo.rate));
    const isRenewal = user.membershipTier === plan.slug;

    const stk = await initiateDarajaStkPush({
      phone254,
      amountKes,
      accountReference: `WORKABY-${plan.slug.toUpperCase()}`,
      description: `Workaby AI ${plan.name}`,
    });

    const [pendingSub] = await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        planId: plan.id,
        planSlug: plan.slug,
        status: 'pending',
        billingIntervalDays: plan.billingIntervalDays,
        amountUsd: amountUsd.toFixed(2),
        autoRenewAuthorized: parsed.data.autoRenewAuthorized,
      })
      .returning();

    const [txRow] = await db
      .insert(subscriptionTransactions)
      .values({
        userId: user.id,
        subscriptionId: pendingSub.id,
        planSlug: plan.slug,
        paymentMethod: 'mpesa_stk',
        amountUsd: amountUsd.toFixed(2),
        amountKes: amountKes.toFixed(2),
        exchangeRate: rateInfo.rate.toFixed(4),
        exchangeRateId: rateInfo.id,
        phoneNumber: phone254,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId,
        status: 'pending',
        isRenewal,
        isSample: stk.mode !== 'live',
      })
      .returning();

    return res.status(201).json({
      transaction: txRow,
      stkMode: stk.mode,
      customerMessage: stk.customerMessage,
      display: {
        amountUsd,
        amountKes,
        exchangeRate: rateInfo.rate,
        phone254,
      },
    });
  } catch (error: any) {
    console.error('Subscription initiate error:', error);
    return res.status(500).json({ error: error.message || 'Unable to initiate M-Pesa payment.' });
  }
});

router.get('/subscriptions/tx/:id', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid transaction ID.' });

    const [tx] = await db
      .select()
      .from(subscriptionTransactions)
      .where(and(eq(subscriptionTransactions.id, id), eq(subscriptionTransactions.userId, user.id)))
      .limit(1);

    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
    return res.json({ transaction: tx });
  } catch (error) {
    console.error('Tx status error:', error);
    return res.status(500).json({ error: 'Unable to check payment status.' });
  }
});

router.post('/subscriptions/downgrade', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    await db
      .update(users)
      .set({ membershipTier: 'free', subscriptionExpiresAt: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await db
      .update(subscriptions)
      .set({ status: 'cancelled', cancelledAt: new Date(), autoRenewAuthorized: false })
      .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')));

    return res.json({
      membershipTier: 'free',
      message: 'Downgraded to Free Member. All earnings, referral balances, and work history are preserved.',
    });
  } catch (error) {
    console.error('Downgrade error:', error);
    return res.status(500).json({ error: 'Unable to downgrade subscription.' });
  }
});

router.get('/referrals', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const [codeRow, clicksRow, relationships, commissions, walletTx, balances, rateSetting] =
      await Promise.all([
        db.select().from(referralCodes).where(eq(referralCodes.userId, user.id)).limit(1),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(referralClicks)
          .where(eq(referralClicks.referrerUserId, user.id)),
        db
          .select({
            id: referralRelationships.id,
            referredUserId: referralRelationships.referredUserId,
            status: referralRelationships.status,
            attributionExpiresAt: referralRelationships.attributionExpiresAt,
            createdAt: referralRelationships.createdAt,
            referredName: users.fullName,
            referredTier: users.membershipTier,
          })
          .from(referralRelationships)
          .innerJoin(users, eq(referralRelationships.referredUserId, users.id))
          .where(eq(referralRelationships.referrerUserId, user.id))
          .orderBy(desc(referralRelationships.createdAt)),
        db
          .select({
            id: referralCommissions.id,
            referredUserId: referralCommissions.referredUserId,
            commissionRatePct: referralCommissions.commissionRatePct,
            baseAmountUsd: referralCommissions.baseAmountUsd,
            commissionAmountUsd: referralCommissions.commissionAmountUsd,
            retainedAmountUsd: referralCommissions.retainedAmountUsd,
            status: referralCommissions.status,
            isRenewal: referralCommissions.isRenewal,
            isSample: referralCommissions.isSample,
            createdAt: referralCommissions.createdAt,
            referredName: users.fullName,
          })
          .from(referralCommissions)
          .innerJoin(users, eq(referralCommissions.referredUserId, users.id))
          .where(eq(referralCommissions.referrerUserId, user.id))
          .orderBy(desc(referralCommissions.createdAt)),
        db
          .select()
          .from(referralWalletTransactions)
          .where(eq(referralWalletTransactions.userId, user.id))
          .orderBy(desc(referralWalletTransactions.createdAt)),
        getMemberBalances(user.id),
        db.select().from(pricingSettings).where(eq(pricingSettings.key, 'referral_commission_pct')).limit(1),
      ]);

    const freeReferrals = relationships.filter((r) => r.referredTier === 'free').length;
    const paidSubscriberIds = new Set(
      commissions.filter((c) => c.status !== 'reversed').map((c) => c.referredUserId)
    );
    const activePaidSubscribers = relationships.filter((r) => r.referredTier !== 'free').length;

    return res.json({
      referralCode: codeRow[0]?.code || '',
      isSuspended: codeRow[0]?.isSuspended ?? false,
      commissionPct: Number(rateSetting[0]?.valueNumeric ?? 10),
      stats: {
        totalClicks: clicksRow[0]?.count ?? 0,
        totalRegistrations: relationships.length,
        verifiedRegistrations: relationships.filter((r) => r.status === 'active').length,
        freeReferrals,
        paidReferrals: paidSubscriberIds.size,
        activeReferredSubscribers: activePaidSubscribers,
        conversionRatePct:
          relationships.length > 0
            ? Number(((paidSubscriberIds.size / relationships.length) * 100).toFixed(1))
            : 0,
      },
      wallet: balances.referral,
      relationships,
      commissions,
      walletTransactions: walletTx,
    });
  } catch (error) {
    console.error('Member referrals error:', error);
    return res.status(500).json({ error: 'Unable to load referral dashboard.' });
  }
});

router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return res.json({ notifications: rows });
  } catch (error) {
    console.error('Notifications error:', error);
    return res.status(500).json({ error: 'Unable to load notifications.' });
  }
});

router.post('/notifications/read', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to mark notifications read.' });
  }
});

router.patch('/profile', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : undefined;
    const county = typeof req.body?.county === 'string' ? req.body.county.trim() : undefined;
    const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim() : undefined;
    const preferredPayoutPhone =
      typeof req.body?.preferredPayoutPhone === 'string'
        ? req.body.preferredPayoutPhone.trim()
        : undefined;
    const skills = Array.isArray(req.body?.skills) ? req.body.skills.map(String) : undefined;

    if (fullName) {
      await db
        .update(users)
        .set({ fullName, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    await db
      .insert(profiles)
      .values({
        userId: user.id,
        phone: phone ?? null,
        county: county ?? 'Nairobi',
        bio: bio ?? null,
        preferredPayoutPhone: preferredPayoutPhone ?? null,
        skillsJson: skills ?? [],
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          ...(phone !== undefined ? { phone } : {}),
          ...(county !== undefined ? { county } : {}),
          ...(bio !== undefined ? { bio } : {}),
          ...(preferredPayoutPhone !== undefined ? { preferredPayoutPhone } : {}),
          ...(skills !== undefined ? { skillsJson: skills } : {}),
          updatedAt: new Date(),
        },
      });

    return res.json({ updated: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Unable to update profile.' });
  }
});

router.post('/security/password', async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (dbUser?.passwordHash && dbUser?.passwordSalt) {
      if (!verifyPassword(currentPassword, dbUser.passwordHash, dbUser.passwordSalt)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    const { hash, salt } = hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: hash, passwordSalt: salt, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return res.json({ updated: true });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ error: 'Unable to update password.' });
  }
});

export default router;
