import crypto from 'node:crypto';
import { Router } from 'express';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  adminSettings,
  affiliateCommissions,
  affiliateLinks,
  affiliatePartners,
  auditLogs,
  earnings,
  exchangeRates,
  expenses,
  financialLedger,
  jobAllocations,
  jobCategories,
  jobProviders,
  jobs,
  jobSubmissions,
  membershipPlans,
  notifications,
  pricingSettings,
  projectCommissions,
  projectContracts,
  providerVerifications,
  referralCodes,
  referralCommissions,
  referralRelationships,
  referralWalletTransactions,
  roles,
  submissionReviews,
  subscriptions,
  subscriptionTransactions,
  users,
  withdrawals,
  workerPerformance,
} from '../../src/db/schema.ts';
import { AuthRequest, requireAuth, requireRole } from '../../src/middleware/auth.ts';
import { refreshLiveUsdKesRate, setManualUsdKesRate } from '../services/exchangeRate.ts';
import { confirmSubscriptionPayment, refundSubscriptionTransaction } from '../services/mpesa.ts';

const router = Router();
router.use(requireAuth);
router.use(requireRole(['admin', 'finance_admin', 'owner']));

router.get('/overview', async (_req: AuthRequest, res) => {
  try {
    const [
      memberCounts,
      jobCounts,
      pendingSubmissions,
      pendingWithdrawals,
      pendingPayments,
      recentNotifs,
      recentAudits,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          paid: sql<number>`COUNT(*) FILTER (WHERE ${users.membershipTier} != 'free')::int`,
        })
        .from(users),
      db
        .select({
          total: sql<number>`count(*)::int`,
          published: sql<number>`COUNT(*) FILTER (WHERE ${jobs.status} = 'published')::int`,
        })
        .from(jobs),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobSubmissions)
        .where(sql`${jobSubmissions.status} IN ('submitted', 'under_review')`),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(withdrawals)
        .where(eq(withdrawals.status, 'pending')),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionTransactions)
        .where(eq(subscriptionTransactions.status, 'pending')),
      db
        .select()
        .from(notifications)
        .where(eq(notifications.targetRole, 'admin'))
        .orderBy(desc(notifications.createdAt))
        .limit(12),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(15),
    ]);

    return res.json({
      stats: {
        totalMembers: memberCounts[0]?.total ?? 0,
        paidMembers: memberCounts[0]?.paid ?? 0,
        totalJobs: jobCounts[0]?.total ?? 0,
        publishedJobs: jobCounts[0]?.published ?? 0,
        pendingSubmissions: pendingSubmissions[0]?.count ?? 0,
        pendingWithdrawals: pendingWithdrawals[0]?.count ?? 0,
        pendingPayments: pendingPayments[0]?.count ?? 0,
      },
      notifications: recentNotifs,
      auditLogs: recentAudits,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ error: 'Unable to load admin overview.' });
  }
});

// Members Management
router.get('/members', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        fullName: users.fullName,
        roleSlug: users.roleSlug,
        status: users.status,
        membershipTier: users.membershipTier,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        completedApprovedJobs: users.completedApprovedJobs,
        achievement50Jobs: users.achievement50Jobs,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const allRoles = await db.select().from(roles);
    return res.json({ members: rows, roles: allRoles });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load members.' });
  }
});

router.patch('/members/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const actor = req.authUser!;
    const status = typeof req.body?.status === 'string' ? req.body.status : undefined;
    const roleSlug = typeof req.body?.roleSlug === 'string' ? req.body.roleSlug : undefined;

    if (roleSlug && actor.roleSlug !== 'owner') {
      return res.status(403).json({ error: 'Only the Platform Owner can modify user roles.' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status && ['active', 'suspended'].includes(status)) updates.status = status;
    if (roleSlug && ['member', 'admin', 'finance_admin', 'owner'].includes(roleSlug)) {
      const [r] = await db.select().from(roles).where(eq(roles.slug, roleSlug)).limit(1);
      updates.roleSlug = roleSlug;
      if (r) updates.roleId = r.id;
    }

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    await db.insert(auditLogs).values({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'member_updated',
      entityType: 'user',
      entityId: String(id),
      detailsJson: updates,
    });

    return res.json({ member: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update member.' });
  }
});

// Categories & Providers
router.get('/providers', async (_req, res) => {
  try {
    const [providers, verifications, categories] = await Promise.all([
      db.select().from(jobProviders).orderBy(desc(jobProviders.createdAt)),
      db.select().from(providerVerifications).orderBy(desc(providerVerifications.verifiedAt)),
      db.select().from(jobCategories).orderBy(jobCategories.sortOrder),
    ]);
    return res.json({ providers, verifications, categories });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load providers.' });
  }
});

router.post('/providers', async (req: AuthRequest, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Provider name is required.' });

    const [created] = await db
      .insert(jobProviders)
      .values({
        name,
        websiteUrl: req.body?.websiteUrl || null,
        sourceUrl: req.body?.sourceUrl || null,
        classification: req.body?.classification === 'verified' ? 'verified' : 'unverified',
        verificationStatus: req.body?.classification === 'verified' ? 'verified' : 'pending',
        reliabilityScore: Number(req.body?.reliabilityScore ?? 85),
        partnershipNotes: req.body?.partnershipNotes || null,
        contactEmail: req.body?.contactEmail || null,
        isSample: Boolean(req.body?.isSample),
      })
      .returning();

    await db.insert(auditLogs).values({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'provider_created',
      entityType: 'job_provider',
      entityId: String(created.id),
      detailsJson: { name, classification: created.classification },
    });

    return res.status(201).json({ provider: created });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create provider.' });
  }
});

router.post('/providers/:id/verify', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || 'verified');
    const evidenceSummary = String(req.body?.evidenceSummary || '').trim();
    if (!evidenceSummary) {
      return res.status(400).json({ error: 'Verification evidence summary is required.' });
    }

    const classification = status === 'verified' ? 'verified' : 'unverified';
    const [updated] = await db
      .update(jobProviders)
      .set({
        classification,
        verificationStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(jobProviders.id, id))
      .returning();

    const [log] = await db
      .insert(providerVerifications)
      .values({
        providerId: id,
        verifiedByUserId: req.authUser!.id,
        status,
        evidenceSummary,
        evidenceUrl: req.body?.evidenceUrl || null,
        sourceCheckNotes: req.body?.sourceCheckNotes || null,
      })
      .returning();

    return res.json({ provider: updated, verification: log });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update provider verification.' });
  }
});

// Jobs CRUD + Status + Duplicate
router.get('/jobs', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        categoryId: jobs.categoryId,
        providerId: jobs.providerId,
        sourceUrl: jobs.sourceUrl,
        instructions: jobs.instructions,
        requiredSkillsJson: jobs.requiredSkillsJson,
        difficulty: jobs.difficulty,
        estimatedDuration: jobs.estimatedDuration,
        rewardUsd: jobs.rewardUsd,
        availablePositions: jobs.availablePositions,
        filledPositions: jobs.filledPositions,
        deadlineAt: jobs.deadlineAt,
        minTier: jobs.minTier,
        eligibleTiersJson: jobs.eligibleTiersJson,
        submissionRequirements: jobs.submissionRequirements,
        paymentConditions: jobs.paymentConditions,
        status: jobs.status,
        isFeatured: jobs.isFeatured,
        isSponsored: jobs.isSponsored,
        isSample: jobs.isSample,
        categoryName: jobCategories.name,
        providerName: jobProviders.name,
        providerClassification: jobProviders.classification,
      })
      .from(jobs)
      .innerJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
      .innerJoin(jobProviders, eq(jobs.providerId, jobProviders.id))
      .orderBy(desc(jobs.createdAt));

    return res.json({ jobs: rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load admin jobs.' });
  }
});

const jobSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(10),
  categoryId: z.number().int().positive(),
  providerId: z.number().int().positive(),
  sourceUrl: z.string().optional(),
  instructions: z.string().min(5),
  requiredSkills: z.array(z.string()).default([]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  estimatedDuration: z.string().default('30 mins'),
  rewardUsd: z.number().positive(),
  availablePositions: z.number().int().positive(),
  deadlineAt: z.string(),
  minTier: z.enum(['free', 'verified', 'pro', 'top_rated']).default('free'),
  submissionRequirements: z.string().min(4),
  paymentConditions: z.string().default('Paid in USD upon QA approval.'),
  status: z.string().default('published'),
  isFeatured: z.boolean().default(false),
  isSponsored: z.boolean().default(false),
  isSample: z.boolean().default(false),
});

function tiersForMin(minTier: string): string[] {
  if (minTier === 'top_rated') return ['top_rated'];
  if (minTier === 'pro') return ['pro', 'top_rated'];
  if (minTier === 'verified') return ['verified', 'pro', 'top_rated'];
  return ['free', 'verified', 'pro', 'top_rated'];
}

router.post('/jobs', async (req: AuthRequest, res) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid job payload.' });
    }
    const d = parsed.data;
    if (d.minTier === 'free' && d.rewardUsd > 0.1) {
      return res.status(400).json({
        error: 'Free-tier micro-tasks are capped at $0.10 USD (e.g. $0.01 per task).',
      });
    }
    if (d.minTier !== 'free' && d.rewardUsd < 2) {
      return res.status(400).json({
        error: 'Tasks paying $2.00 or higher — and all Verified, Pro, or Top-Rated tasks — must pay at least $2.00 USD.',
      });
    }
    const jobCode = `WRK-${Date.now().toString().slice(-5)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const [created] = await db
      .insert(jobs)
      .values({
        jobCode,
        title: d.title,
        description: d.description,
        categoryId: d.categoryId,
        providerId: d.providerId,
        sourceUrl: d.sourceUrl || null,
        instructions: d.instructions,
        requiredSkillsJson: d.requiredSkills,
        difficulty: d.difficulty,
        estimatedDuration: d.estimatedDuration,
        rewardUsd: d.rewardUsd.toFixed(2),
        availablePositions: d.availablePositions,
        publishedAt: d.status === 'published' ? new Date() : null,
        deadlineAt: new Date(d.deadlineAt),
        minTier: d.minTier,
        eligibleTiersJson: tiersForMin(d.minTier),
        submissionRequirements: d.submissionRequirements,
        paymentConditions: d.paymentConditions,
        status: d.status,
        isFeatured: d.isFeatured,
        isSponsored: d.isSponsored,
        isSample: d.isSample,
        createdByUserId: req.authUser!.id,
      })
      .returning();

    await db.insert(auditLogs).values({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'job_created',
      entityType: 'job',
      entityId: String(created.id),
      detailsJson: { jobCode, title: d.title, rewardUsd: d.rewardUsd },
    });

    return res.status(201).json({ job: created });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({ error: 'Unable to create job.' });
  }
});

router.patch('/jobs/:id/status', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '');
    const allowed = ['draft', 'pending_verification', 'approved', 'published', 'paused', 'closed', 'expired'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid job status.' });

    const [updated] = await db
      .update(jobs)
      .set({
        status,
        publishedAt: status === 'published' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();

    return res.json({ job: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update job status.' });
  }
});

router.post('/jobs/:id/duplicate', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [orig] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!orig) return res.status(404).json({ error: 'Job not found.' });

    const [copy] = await db
      .insert(jobs)
      .values({
        ...orig,
        id: undefined,
        jobCode: `${orig.jobCode}-CPY-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        title: `${orig.title} (Copy)`,
        filledPositions: 0,
        status: 'draft',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByUserId: req.authUser!.id,
      })
      .returning();

    return res.status(201).json({ job: copy });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to duplicate job.' });
  }
});

// Submissions & QA Review
router.get('/submissions', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: jobSubmissions.id,
        jobId: jobSubmissions.jobId,
        userId: jobSubmissions.userId,
        submissionType: jobSubmissions.submissionType,
        textContent: jobSubmissions.textContent,
        externalReference: jobSubmissions.externalReference,
        attachmentName: jobSubmissions.attachmentName,
        notes: jobSubmissions.notes,
        status: jobSubmissions.status,
        submittedAt: jobSubmissions.submittedAt,
        jobTitle: jobs.title,
        rewardUsd: jobs.rewardUsd,
        isSample: jobs.isSample,
        workerName: users.fullName,
        workerEmail: users.email,
      })
      .from(jobSubmissions)
      .innerJoin(jobs, eq(jobSubmissions.jobId, jobs.id))
      .innerJoin(users, eq(jobSubmissions.userId, users.id))
      .orderBy(desc(jobSubmissions.submittedAt));

    const allocations = await db
      .select({
        id: jobAllocations.id,
        weekKey: jobAllocations.weekKey,
        membershipTierAtAllocation: jobAllocations.membershipTierAtAllocation,
        status: jobAllocations.status,
        allocatedAt: jobAllocations.allocatedAt,
        jobTitle: jobs.title,
        workerName: users.fullName,
      })
      .from(jobAllocations)
      .innerJoin(jobs, eq(jobAllocations.jobId, jobs.id))
      .innerJoin(users, eq(jobAllocations.userId, users.id))
      .orderBy(desc(jobAllocations.allocatedAt))
      .limit(50);

    return res.json({ submissions: rows, allocations });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load submissions.' });
  }
});

router.post('/submissions/:id/review', async (req: AuthRequest, res) => {
  try {
    const submissionId = Number(req.params.id);
    const decision = String(req.body?.decision || '');
    const feedback = String(req.body?.feedback || '').trim();
    if (!['approved', 'rejected', 'correction_requested'].includes(decision) || !feedback) {
      return res.status(400).json({ error: 'Decision and reviewer feedback are required.' });
    }

    const result = await db.transaction(async (tx) => {
      const [sub] = await tx
        .select()
        .from(jobSubmissions)
        .where(eq(jobSubmissions.id, submissionId))
        .limit(1);
      if (!sub) throw new Error('Submission not found.');

      const [jobRow] = await tx.select().from(jobs).where(eq(jobs.id, sub.jobId)).limit(1);
      if (!jobRow) throw new Error('Job not found.');

      const [updatedSub] = await tx
        .update(jobSubmissions)
        .set({ status: decision, updatedAt: new Date() })
        .where(eq(jobSubmissions.id, submissionId))
        .returning();

      await tx.insert(submissionReviews).values({
        submissionId,
        reviewerUserId: req.authUser!.id,
        decision,
        feedback,
      });

      if (decision === 'approved') {
        const rewardNum = Number(jobRow.rewardUsd);
        const [earning] = await tx
          .insert(earnings)
          .values({
            userId: sub.userId,
            jobId: sub.jobId,
            submissionId: sub.id,
            amountUsd: rewardNum.toFixed(2),
            status: 'approved',
            isSample: jobRow.isSample,
            approvedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning();

        if (earning) {
          const [updatedUser] = await tx
            .update(users)
            .set({
              completedApprovedJobs: sql`${users.completedApprovedJobs} + 1`,
              achievement50Jobs: sql`CASE WHEN ${users.completedApprovedJobs} + 1 >= 50 THEN true ELSE ${users.achievement50Jobs} END`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, sub.userId))
            .returning();

          await tx
            .update(workerPerformance)
            .set({
              totalApproved: sql`${workerPerformance.totalApproved} + 1`,
              currentStreak: sql`${workerPerformance.currentStreak} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(workerPerformance.userId, sub.userId));

          await tx.insert(financialLedger).values({
            entryNumber: `FL-WRK-${earning.id}-${Date.now()}`,
            ledgerScope: 'worker_earnings',
            category: 'approved_task_payout_liability',
            direction: 'credit',
            amountUsd: rewardNum.toFixed(2),
            referenceId: `SUB-${sub.id}`,
            description: `Worker earnings approved for "${jobRow.title}"`,
            isSample: jobRow.isSample,
            recordedByUserId: req.authUser!.id,
          });

          await tx.insert(notifications).values({
            userId: sub.userId,
            targetRole: 'member',
            category: 'earnings',
            title: `Submission approved: +$${rewardNum.toFixed(2)} USD`,
            message: `Your work on "${jobRow.title}" was approved (${feedback}).${
              updatedUser.completedApprovedJobs === 50
                ? ' Achievement unlocked: 50 Jobs Completed badge!'
                : ''
            }`,
            linkPath: '/portal/earnings',
          });
        }
      } else {
        if (decision === 'rejected') {
          await tx
            .update(workerPerformance)
            .set({
              totalRejected: sql`${workerPerformance.totalRejected} + 1`,
              currentStreak: 0,
              updatedAt: new Date(),
            })
            .where(eq(workerPerformance.userId, sub.userId));
        }

        await tx.insert(notifications).values({
          userId: sub.userId,
          targetRole: 'member',
          category: 'submission',
          title:
            decision === 'rejected'
              ? `Submission rejected: ${jobRow.title}`
              : `Correction requested: ${jobRow.title}`,
          message: `Reviewer feedback: ${feedback}`,
          linkPath: '/portal/my-submissions',
        });
      }

      return updatedSub;
    });

    return res.json({ submission: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to review submission.' });
  }
});

// Membership Plans & Pricing Settings
router.get('/plans-and-rates', async (_req, res) => {
  try {
    const [plans, settings, rates] = await Promise.all([
      db.select().from(membershipPlans).orderBy(membershipPlans.sortOrder),
      db.select().from(pricingSettings),
      db.select().from(exchangeRates).orderBy(desc(exchangeRates.createdAt)).limit(25),
    ]);
    return res.json({ plans, pricingSettings: settings, exchangeRates: rates });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load plans and rates.' });
  }
});

router.patch('/plans/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const priceUsd = Number(req.body?.priceUsd);
    const billingIntervalDays = Number(req.body?.billingIntervalDays);
    const weeklyJobLimit = Number(req.body?.weeklyJobLimit);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (Number.isFinite(priceUsd) && priceUsd >= 0) updates.priceUsd = priceUsd.toFixed(2);
    if (Number.isInteger(billingIntervalDays) && billingIntervalDays > 0) {
      updates.billingIntervalDays = billingIntervalDays;
    }
    if (Number.isInteger(weeklyJobLimit)) {
      updates.weeklyJobLimit = weeklyJobLimit;
    }

    const [updated] = await db
      .update(membershipPlans)
      .set(updates)
      .where(eq(membershipPlans.id, id))
      .returning();

    await db.insert(auditLogs).values({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'membership_plan_updated',
      entityType: 'membership_plan',
      entityId: String(id),
      detailsJson: updates,
    });

    return res.json({ plan: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update membership plan.' });
  }
});

router.patch('/pricing-settings/:key', async (req: AuthRequest, res) => {
  try {
    const key = req.params.key;
    const val = Number(req.body?.valueNumeric);
    if (!Number.isFinite(val) || val < 0) {
      return res.status(400).json({ error: 'Valid numeric value required.' });
    }
    const [updated] = await db
      .update(pricingSettings)
      .set({
        valueText: val.toFixed(2),
        valueNumeric: val.toFixed(4),
        updatedByUserId: req.authUser!.id,
        updatedAt: new Date(),
      })
      .where(eq(pricingSettings.key, key))
      .returning();

    return res.json({ setting: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update pricing setting.' });
  }
});

router.post('/exchange-rates/refresh', async (req: AuthRequest, res) => {
  try {
    const rate = await refreshLiveUsdKesRate(req.authUser!.id);
    return res.json({ rate });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to refresh live rate.' });
  }
});

router.post('/exchange-rates/manual', async (req: AuthRequest, res) => {
  try {
    const rateVal = Number(req.body?.rate);
    const notes = String(req.body?.notes || 'Manual rate override');
    if (!Number.isFinite(rateVal) || rateVal < 50 || rateVal > 500) {
      return res.status(400).json({ error: 'Enter a valid USD/KES rate between 50 and 500.' });
    }
    const rate = await setManualUsdKesRate(rateVal, notes, req.authUser!.id);
    return res.json({ rate });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to save manual rate.' });
  }
});

// Payments, Reconciliation & Refunds
router.get('/payments', async (_req, res) => {
  try {
    const [txs, subs] = await Promise.all([
      db
        .select({
          id: subscriptionTransactions.id,
          userId: subscriptionTransactions.userId,
          planSlug: subscriptionTransactions.planSlug,
          paymentMethod: subscriptionTransactions.paymentMethod,
          amountUsd: subscriptionTransactions.amountUsd,
          amountKes: subscriptionTransactions.amountKes,
          exchangeRate: subscriptionTransactions.exchangeRate,
          phoneNumber: subscriptionTransactions.phoneNumber,
          checkoutRequestId: subscriptionTransactions.checkoutRequestId,
          mpesaReceiptNumber: subscriptionTransactions.mpesaReceiptNumber,
          status: subscriptionTransactions.status,
          isRenewal: subscriptionTransactions.isRenewal,
          isSample: subscriptionTransactions.isSample,
          initiatedAt: subscriptionTransactions.initiatedAt,
          confirmedAt: subscriptionTransactions.confirmedAt,
          refundedAt: subscriptionTransactions.refundedAt,
          memberName: users.fullName,
          memberEmail: users.email,
        })
        .from(subscriptionTransactions)
        .innerJoin(users, eq(subscriptionTransactions.userId, users.id))
        .orderBy(desc(subscriptionTransactions.createdAt))
        .limit(100),
      db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          planSlug: subscriptions.planSlug,
          status: subscriptions.status,
          amountUsd: subscriptions.amountUsd,
          startsAt: subscriptions.startsAt,
          expiresAt: subscriptions.expiresAt,
          memberName: users.fullName,
        })
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.userId, users.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(50),
    ]);

    return res.json({ transactions: txs, subscriptions: subs });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load payment records.' });
  }
});

router.post('/payments/:id/reconcile-sandbox', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const outcome = String(req.body?.outcome || 'confirm');
    const [tx] = await db
      .select()
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.id, id))
      .limit(1);
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

    const resultCode = outcome === 'confirm' ? 0 : outcome === 'cancel' ? 1032 : 1;
    const receipt =
      outcome === 'confirm'
        ? `SBX${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`
        : undefined;

    const result = await confirmSubscriptionPayment({
      checkoutRequestId: tx.checkoutRequestId,
      resultCode,
      mpesaReceiptNumber: receipt,
      callbackPayload: {
        source: 'admin_sandbox_reconciliation',
        reconciledBy: req.authUser!.email,
        outcome,
      },
      isSample: true,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to reconcile payment.' });
  }
});

router.post('/payments/:id/refund', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || 'Administrator refund');
    const refunded = await refundSubscriptionTransaction({
      transactionId: id,
      reason,
      actorUserId: req.authUser!.id,
    });
    return res.json({ transaction: refunded });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Refund failed.' });
  }
});

// Withdrawals (Worker & Referral)
router.get('/withdrawals', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: withdrawals.id,
        userId: withdrawals.userId,
        ledgerType: withdrawals.ledgerType,
        amountUsd: withdrawals.amountUsd,
        amountKes: withdrawals.amountKes,
        exchangeRate: withdrawals.exchangeRate,
        phoneNumber: withdrawals.phoneNumber,
        status: withdrawals.status,
        transactionReference: withdrawals.transactionReference,
        adminNote: withdrawals.adminNote,
        requestedAt: withdrawals.requestedAt,
        processedAt: withdrawals.processedAt,
        memberName: users.fullName,
        memberEmail: users.email,
      })
      .from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .orderBy(desc(withdrawals.requestedAt));

    return res.json({ withdrawals: rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load withdrawals.' });
  }
});

router.post('/withdrawals/:id/process', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '');
    const transactionReference = String(req.body?.transactionReference || '').trim();
    const adminNote = String(req.body?.adminNote || '').trim();

    if (!['approved', 'paid', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid withdrawal status.' });
    }
    if (status === 'paid' && !transactionReference) {
      return res.status(400).json({ error: 'M-Pesa payout reference is required when marking Paid.' });
    }

    const updated = await db.transaction(async (tx) => {
      const [w] = await tx.select().from(withdrawals).where(eq(withdrawals.id, id)).limit(1);
      if (!w) throw new Error('Withdrawal not found.');

      const [next] = await tx
        .update(withdrawals)
        .set({
          status,
          transactionReference: transactionReference || w.transactionReference,
          adminNote: adminNote || w.adminNote,
          reviewedByUserId: req.authUser!.id,
          processedAt: status === 'paid' || status === 'rejected' ? new Date() : w.processedAt,
        })
        .where(eq(withdrawals.id, id))
        .returning();

      if (status === 'paid' && w.ledgerType === 'referral_commissions') {
        const amt = Number(w.amountUsd);
        const walletAgg = await tx
          .select({
            bal: sql<string>`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`,
          })
          .from(referralWalletTransactions)
          .where(eq(referralWalletTransactions.userId, w.userId));
        const currentBal = Number(walletAgg[0]?.bal ?? 0);
        await tx.insert(referralWalletTransactions).values({
          userId: w.userId,
          withdrawalId: w.id,
          entryType: 'debit',
          amountUsd: amt.toFixed(2),
          balanceAfterUsd: Math.max(0, currentBal - amt).toFixed(2),
          description: `Referral payout via M-Pesa (${transactionReference})`,
        });
      }

      await tx.insert(notifications).values({
        userId: w.userId,
        targetRole: 'member',
        category: 'withdrawal',
        title: `Withdrawal ${status}`,
        message: `Your $${Number(w.amountUsd).toFixed(2)} USD (${w.ledgerType.replace('_', ' ')}) request is now ${status}${
          transactionReference ? ` (Ref: ${transactionReference})` : ''
        }.`,
        linkPath: '/portal/withdrawals',
      });

      return next;
    });

    return res.json({ withdrawal: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to process withdrawal.' });
  }
});

// Referrals & Affiliates & Managed Projects
router.get('/referrals-overview', async (_req, res) => {
  try {
    const [relationships, commissions, partners, links, contracts] = await Promise.all([
      db
        .select({
          id: referralRelationships.id,
          referrerUserId: referralRelationships.referrerUserId,
          referredUserId: referralRelationships.referredUserId,
          referralCode: referralRelationships.referralCode,
          status: referralRelationships.status,
          createdAt: referralRelationships.createdAt,
          referredEmail: users.email,
          referredName: users.fullName,
        })
        .from(referralRelationships)
        .innerJoin(users, eq(referralRelationships.referredUserId, users.id))
        .orderBy(desc(referralRelationships.createdAt)),
      db
        .select()
        .from(referralCommissions)
        .orderBy(desc(referralCommissions.createdAt)),
      db.select().from(affiliatePartners).orderBy(desc(affiliatePartners.createdAt)),
      db.select().from(affiliateLinks),
      db.select().from(projectContracts).orderBy(desc(projectContracts.createdAt)),
    ]);

    return res.json({ relationships, commissions, affiliatePartners: partners, affiliateLinks: links, projectContracts: contracts });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load referral & partner overview.' });
  }
});

router.post('/referrals/commissions/:id/reverse', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || 'Fraudulent or invalid referral activity');

    const updated = await db.transaction(async (tx) => {
      const [comm] = await tx
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.id, id))
        .limit(1);
      if (!comm) throw new Error('Commission not found.');
      if (comm.status === 'reversed') throw new Error('Already reversed.');

      const [next] = await tx
        .update(referralCommissions)
        .set({ status: 'reversed', reversedAt: new Date(), reversalReason: reason })
        .where(eq(referralCommissions.id, id))
        .returning();

      const amt = Number(comm.commissionAmountUsd);
      const walletAgg = await tx
        .select({
          bal: sql<string>`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`,
        })
        .from(referralWalletTransactions)
        .where(eq(referralWalletTransactions.userId, comm.referrerUserId));
      const currentBal = Number(walletAgg[0]?.bal ?? 0);

      await tx.insert(referralWalletTransactions).values({
        userId: comm.referrerUserId,
        commissionId: comm.id,
        entryType: 'reversal',
        amountUsd: amt.toFixed(2),
        balanceAfterUsd: (currentBal - amt).toFixed(2),
        description: `Admin reversal: ${reason}`,
      });

      return next;
    });

    return res.json({ commission: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to reverse commission.' });
  }
});

router.post('/referrals/suspend-code/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.userId);
    const suspend = Boolean(req.body?.suspend ?? true);
    await db
      .update(referralCodes)
      .set({ isSuspended: suspend })
      .where(eq(referralCodes.userId, userId));
    return res.json({ updated: true, isSuspended: suspend });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update referral code status.' });
  }
});

router.post('/affiliates', async (req: AuthRequest, res) => {
  try {
    const { name, category, websiteUrl, disclosureText, commissionRateDesc, slug, campaignName } =
      req.body || {};
    if (!name || !websiteUrl || !slug) {
      return res.status(400).json({ error: 'Name, website URL, and slug are required.' });
    }
    const [partner] = await db
      .insert(affiliatePartners)
      .values({
        name,
        category: category || 'Digital Services',
        websiteUrl,
        disclosureText: disclosureText || 'Disclosed authorized affiliate partnership.',
        commissionRateDesc: commissionRateDesc || '10% CPA',
        agreementStatus: 'active',
      })
      .returning();

    const [link] = await db
      .insert(affiliateLinks)
      .values({
        partnerId: partner.id,
        slug,
        targetUrl: websiteUrl,
        campaignName: campaignName || name,
      })
      .returning();

    return res.status(201).json({ partner, link });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to add affiliate partner.' });
  }
});

router.post('/affiliates/:id/commission', async (req: AuthRequest, res) => {
  try {
    const partnerId = Number(req.params.id);
    const amountUsd = Number(req.body?.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return res.status(400).json({ error: 'Valid USD commission amount required.' });
    }
    const [comm] = await db
      .insert(affiliateCommissions)
      .values({
        partnerId,
        amountUsd: amountUsd.toFixed(2),
        status: 'earned',
      })
      .returning();

    await db.insert(financialLedger).values({
      entryNumber: `FL-AFF-${comm.id}-${Date.now()}`,
      ledgerScope: 'platform_revenue',
      category: 'affiliate_commission',
      direction: 'credit',
      amountUsd: amountUsd.toFixed(2),
      referenceId: `AFF-${comm.id}`,
      description: `Affiliate partner #${partnerId} earned commission`,
      recordedByUserId: req.authUser!.id,
    });

    return res.status(201).json({ commission: comm });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to record affiliate commission.' });
  }
});

router.post('/project-contracts', async (req: AuthRequest, res) => {
  try {
    const clientName = String(req.body?.clientName || '').trim();
    const title = String(req.body?.title || '').trim();
    const revenueType = String(req.body?.revenueType || 'managed_project');
    const totalValueUsd = Number(req.body?.totalValueUsd);
    const commissionPct = Number(req.body?.commissionPct ?? 10);
    const agreementVerified = Boolean(req.body?.agreementVerified ?? true);

    if (!clientName || !title || !Number.isFinite(totalValueUsd) || totalValueUsd <= 0) {
      return res.status(400).json({ error: 'Client name, title, and valid USD contract value required.' });
    }
    if (!agreementVerified) {
      return res.status(400).json({ error: 'Managed project commissions require a verified agreement.' });
    }

    const platformCommissionUsd = Number(((totalValueUsd * commissionPct) / 100).toFixed(2));
    const workerPayoutUsd = Number((totalValueUsd - platformCommissionUsd).toFixed(2));
    const contractCode = `PRJ-${Date.now().toString().slice(-6)}`;

    const [contract] = await db
      .insert(projectContracts)
      .values({
        contractCode,
        clientName,
        title,
        revenueType,
        totalValueUsd: totalValueUsd.toFixed(2),
        workerPayoutUsd: workerPayoutUsd.toFixed(2),
        commissionPct: commissionPct.toFixed(2),
        platformCommissionUsd: platformCommissionUsd.toFixed(2),
        agreementVerified,
        status: 'completed',
        isSample: false,
      })
      .returning();

    await db.insert(projectCommissions).values({
      contractId: contract.id,
      amountUsd: platformCommissionUsd.toFixed(2),
      status: 'realized',
    });

    await db.insert(financialLedger).values({
      entryNumber: `FL-PRJ-${contract.id}-${Date.now()}`,
      ledgerScope: 'platform_revenue',
      category: revenueType,
      direction: 'credit',
      amountUsd: platformCommissionUsd.toFixed(2),
      referenceId: contractCode,
      description: `${commissionPct}% platform commission on "${title}" ($${totalValueUsd.toFixed(2)} contract)`,
      recordedByUserId: req.authUser!.id,
    });

    return res.status(201).json({ contract });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to record managed project contract.' });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    const rows = await db.select().from(adminSettings);
    return res.json({ settings: rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load settings.' });
  }
});

router.patch('/settings/:key', async (req: AuthRequest, res) => {
  try {
    const key = req.params.key;
    const [updated] = await db
      .update(adminSettings)
      .set({
        valueText: req.body?.valueText ?? 'updated',
        valueJson: req.body?.valueJson ?? {},
        updatedByUserId: req.authUser!.id,
        updatedAt: new Date(),
      })
      .where(eq(adminSettings.key, key))
      .returning();

    return res.json({ setting: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update settings.' });
  }
});

export default router;
