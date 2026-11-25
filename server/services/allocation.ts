import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../src/db/index.ts';
import {
  jobAllocations,
  jobApplications,
  jobProviders,
  jobs,
  membershipPlans,
  notifications,
  workerPerformance,
} from '../../src/db/schema.ts';

/**
 * Computes the current ISO week key (e.g., "2026-W48") in Africa/Nairobi (EAT, UTC+3).
 */
export function getNairobiWeekKey(date = new Date()): string {
  const nairobiStr = date.toLocaleString('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = nairobiStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function getWeeklyAllowanceSummary(userId: number, membershipTier: string) {
  const weekKey = getNairobiWeekKey();
  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.slug, membershipTier))
    .limit(1);

  const weeklyLimit = plan?.weeklyJobLimit ?? 2; // -1 means unlimited
  const usedRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobAllocations)
    .where(and(eq(jobAllocations.userId, userId), eq(jobAllocations.weekKey, weekKey)));

  const usedThisWeek = usedRows[0]?.count ?? 0;

  return {
    weekKey,
    timezone: 'Africa/Nairobi',
    weeklyLimit,
    isUnlimited: weeklyLimit < 0,
    usedThisWeek,
    remainingThisWeek: weeklyLimit < 0 ? null : Math.max(0, weeklyLimit - usedThisWeek),
    allowVerifiedProviders: plan?.allowVerifiedProviders ?? false,
    allowProExclusive: plan?.allowProExclusive ?? false,
    allowTopRatedExclusive: plan?.allowTopRatedExclusive ?? false,
  };
}

export function isTierEligibleForJob(params: {
  userTier: string;
  allowVerifiedProviders: boolean;
  allowProExclusive: boolean;
  allowTopRatedExclusive: boolean;
  providerClassification: string;
  jobMinTier: string;
  eligibleTiers: string[];
}): { eligible: boolean; reason?: string } {
  if (params.providerClassification === 'verified' && !params.allowVerifiedProviders) {
    return {
      eligible: false,
      reason: 'Verified-provider opportunities require Verified Member, Pro Worker, or Top-Rated membership.',
    };
  }
  if (params.jobMinTier === 'pro' && !params.allowProExclusive) {
    return {
      eligible: false,
      reason: 'This opportunity is reserved for Pro Worker and Top-Rated members.',
    };
  }
  if (params.jobMinTier === 'top_rated' && !params.allowTopRatedExclusive) {
    return {
      eligible: false,
      reason: 'This exclusive opportunity is reserved for Top-Rated members.',
    };
  }
  if (params.eligibleTiers.length > 0 && !params.eligibleTiers.includes(params.userTier)) {
    return {
      eligible: false,
      reason: `Your current ${params.userTier.replace('_', ' ')} tier is not eligible for this job.`,
    };
  }
  return { eligible: true };
}

export async function allocateJobToMember(params: {
  userId: number;
  membershipTier: string;
  jobId: number;
}) {
  const weekKey = getNairobiWeekKey();

  return await db.transaction(async (tx) => {
    const [plan] = await tx
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.slug, params.membershipTier))
      .limit(1);

    const weeklyLimit = plan?.weeklyJobLimit ?? 2;

    const [jobRow] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.id, params.jobId))
      .limit(1);

    if (!jobRow) {
      throw new Error('Job not found.');
    }
    if (jobRow.status !== 'published') {
      throw new Error(`This job is currently ${jobRow.status.replace('_', ' ')} and cannot be allocated.`);
    }
    if (new Date(jobRow.deadlineAt).getTime() < Date.now()) {
      throw new Error('This job deadline has passed.');
    }
    if (jobRow.filledPositions >= jobRow.availablePositions) {
      throw new Error('All available positions for this job have been allocated.');
    }

    const [provider] = await tx
      .select()
      .from(jobProviders)
      .where(eq(jobProviders.id, jobRow.providerId))
      .limit(1);

    if (!provider || provider.verificationStatus === 'suspended') {
      throw new Error('The provider for this job is currently suspended.');
    }

    const eligibility = isTierEligibleForJob({
      userTier: params.membershipTier,
      allowVerifiedProviders: plan?.allowVerifiedProviders ?? false,
      allowProExclusive: plan?.allowProExclusive ?? false,
      allowTopRatedExclusive: plan?.allowTopRatedExclusive ?? false,
      providerClassification: provider.classification,
      jobMinTier: jobRow.minTier,
      eligibleTiers: jobRow.eligibleTiersJson || [],
    });

    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Membership tier not eligible.');
    }

    // Prevent duplicate allocation
    const existingAlloc = await tx
      .select()
      .from(jobAllocations)
      .where(and(eq(jobAllocations.jobId, params.jobId), eq(jobAllocations.userId, params.userId)))
      .limit(1);

    if (existingAlloc[0]) {
      throw new Error('You have already allocated this opportunity to your workspace.');
    }

    // Enforce weekly allowance
    if (weeklyLimit >= 0) {
      const usedRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(jobAllocations)
        .where(and(eq(jobAllocations.userId, params.userId), eq(jobAllocations.weekKey, weekKey)));

      const used = usedRows[0]?.count ?? 0;
      if (used >= weeklyLimit) {
        throw new Error(
          `Weekly job allowance reached (${used}/${weeklyLimit} for ${weekKey} Africa/Nairobi). Upgrade your membership for higher weekly limits.`
        );
      }
    }

    const [allocation] = await tx
      .insert(jobAllocations)
      .values({
        jobId: params.jobId,
        userId: params.userId,
        weekKey,
        membershipTierAtAllocation: params.membershipTier,
        status: 'allocated',
      })
      .returning();

    const [application] = await tx
      .insert(jobApplications)
      .values({
        jobId: params.jobId,
        userId: params.userId,
        allocationId: allocation.id,
        status: 'accepted',
        coverNote: 'Allocated via Workaby AI weekly allocation engine.',
      })
      .onConflictDoNothing()
      .returning();

    const nextFilled = jobRow.filledPositions + 1;
    const nextStatus = nextFilled >= jobRow.availablePositions ? 'fully_allocated' : 'published';

    await tx
      .update(jobs)
      .set({
        filledPositions: nextFilled,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobRow.id));

    await tx
      .insert(workerPerformance)
      .values({ userId: params.userId, totalAllocated: 1 })
      .onConflictDoUpdate({
        target: workerPerformance.userId,
        set: {
          totalAllocated: sql`${workerPerformance.totalAllocated} + 1`,
          updatedAt: new Date(),
        },
      });

    await tx.insert(notifications).values({
      userId: params.userId,
      targetRole: 'member',
      category: 'allocation',
      title: `Job allocated: ${jobRow.title}`,
      message: `Allocated under ${weekKey} (${params.membershipTier.replace('_', ' ')}). Reward: $${Number(jobRow.rewardUsd).toFixed(2)} USD upon QA approval.`,
      linkPath: '/portal/my-jobs',
    });

    return { allocation, application };
  });
}
