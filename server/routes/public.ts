import { Router } from 'express';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../src/db/index.ts';
import {
  adminSettings,
  affiliateClicks,
  affiliateLinks,
  affiliatePartners,
  jobCategories,
  jobProviders,
  jobs,
  membershipPlans,
  notifications,
  pricingSettings,
  referralClicks,
  referralCodes,
  users,
} from '../../src/db/schema.ts';
import { hashIp } from '../../src/lib/auth-session.ts';
import { getActiveUsdKesRate } from '../services/exchangeRate.ts';

const router = Router();

router.get('/overview', async (_req, res) => {
  try {
    const [plans, categories, rateInfo, commissionSetting, featuredJobs, partnerLinks, faqSetting, memberStats, jobStats] =
      await Promise.all([
        db.select().from(membershipPlans).where(eq(membershipPlans.isActive, true)).orderBy(membershipPlans.sortOrder),
        db.select().from(jobCategories).where(eq(jobCategories.isActive, true)).orderBy(jobCategories.sortOrder),
        getActiveUsdKesRate(),
        db.select().from(pricingSettings).where(eq(pricingSettings.key, 'referral_commission_pct')).limit(1),
        db
          .select({
            id: jobs.id,
            jobCode: jobs.jobCode,
            title: jobs.title,
            description: jobs.description,
            difficulty: jobs.difficulty,
            estimatedDuration: jobs.estimatedDuration,
            rewardUsd: jobs.rewardUsd,
            availablePositions: jobs.availablePositions,
            filledPositions: jobs.filledPositions,
            deadlineAt: jobs.deadlineAt,
            minTier: jobs.minTier,
            isFeatured: jobs.isFeatured,
            isSponsored: jobs.isSponsored,
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
          .orderBy(desc(jobs.isFeatured), desc(jobs.createdAt))
          .limit(6),
        db
          .select({
            id: affiliateLinks.id,
            slug: affiliateLinks.slug,
            campaignName: affiliateLinks.campaignName,
            partnerName: affiliatePartners.name,
            category: affiliatePartners.category,
            disclosureText: affiliatePartners.disclosureText,
          })
          .from(affiliateLinks)
          .innerJoin(affiliatePartners, eq(affiliateLinks.partnerId, affiliatePartners.id))
          .where(eq(affiliatePartners.isActive, true)),
        db.select().from(adminSettings).where(eq(adminSettings.key, 'homepage_faq')).limit(1),
        db.select({ count: sql<number>`count(*)::int` }).from(users),
        db
          .select({
            count: sql<number>`count(*)::int`,
            sampleCount: sql<number>`COUNT(*) FILTER (WHERE ${jobs.isSample} = true)::int`,
          })
          .from(jobs)
          .where(eq(jobs.status, 'published')),
      ]);

    const categoryCounts = await db
      .select({
        categoryId: jobs.categoryId,
        openCount: sql<number>`count(*)::int`,
      })
      .from(jobs)
      .where(eq(jobs.status, 'published'))
      .groupBy(jobs.categoryId);

    const countMap = new Map(categoryCounts.map((c) => [c.categoryId, c.openCount]));

    return res.json({
      plans,
      categories: categories.map((c) => ({ ...c, openJobsCount: countMap.get(c.id) ?? 0 })),
      exchangeRate: rateInfo,
      referralCommissionPct: Number(commissionSetting[0]?.valueNumeric ?? 10),
      featuredJobs,
      affiliatePartners: partnerLinks,
      faq: (faqSetting[0]?.valueJson as { items?: { q: string; a: string }[] } | undefined)?.items ?? [],
      stats: {
        registeredMembers: memberStats[0]?.count ?? 0,
        activePublishedJobs: jobStats[0]?.count ?? 0,
        sampleJobsIncluded: jobStats[0]?.sampleCount ?? 0,
        totalCategories: categories.length,
      },
    });
  } catch (error) {
    console.error('Public overview error:', error);
    return res.status(500).json({ error: 'Unable to load marketplace overview.' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const tier = typeof req.query.tier === 'string' ? req.query.tier.trim() : '';
    const verifiedOnly = req.query.verified === 'true';

    const conditions = [eq(jobs.status, 'published')];
    if (categorySlug) {
      conditions.push(eq(jobCategories.slug, categorySlug));
    }
    if (tier) {
      conditions.push(eq(jobs.minTier, tier));
    }
    if (verifiedOnly) {
      conditions.push(eq(jobProviders.classification, 'verified'));
    }
    if (search) {
      conditions.push(
        or(ilike(jobs.title, `%${search}%`), ilike(jobs.description, `%${search}%`))!
      );
    }

    const rows = await db
      .select({
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        difficulty: jobs.difficulty,
        estimatedDuration: jobs.estimatedDuration,
        rewardUsd: jobs.rewardUsd,
        availablePositions: jobs.availablePositions,
        filledPositions: jobs.filledPositions,
        publishedAt: jobs.publishedAt,
        deadlineAt: jobs.deadlineAt,
        minTier: jobs.minTier,
        eligibleTiersJson: jobs.eligibleTiersJson,
        requiredSkillsJson: jobs.requiredSkillsJson,
        isFeatured: jobs.isFeatured,
        isSponsored: jobs.isSponsored,
        isSample: jobs.isSample,
        categoryId: jobCategories.id,
        categoryName: jobCategories.name,
        categorySlug: jobCategories.slug,
        providerName: jobProviders.name,
        providerClassification: jobProviders.classification,
        providerReliability: jobProviders.reliabilityScore,
      })
      .from(jobs)
      .innerJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
      .innerJoin(jobProviders, eq(jobs.providerId, jobProviders.id))
      .where(and(...conditions))
      .orderBy(desc(jobs.isFeatured), desc(jobs.createdAt));

    return res.json({ jobs: rows });
  } catch (error) {
    console.error('Public jobs error:', error);
    return res.status(500).json({ error: 'Unable to fetch jobs.' });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid job ID.' });
    }

    const [row] = await db
      .select({
        id: jobs.id,
        jobCode: jobs.jobCode,
        title: jobs.title,
        description: jobs.description,
        instructions: jobs.instructions,
        requiredSkillsJson: jobs.requiredSkillsJson,
        difficulty: jobs.difficulty,
        estimatedDuration: jobs.estimatedDuration,
        rewardUsd: jobs.rewardUsd,
        availablePositions: jobs.availablePositions,
        filledPositions: jobs.filledPositions,
        publishedAt: jobs.publishedAt,
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
        categorySlug: jobCategories.slug,
        providerName: jobProviders.name,
        providerClassification: jobProviders.classification,
        providerReliability: jobProviders.reliabilityScore,
      })
      .from(jobs)
      .innerJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
      .innerJoin(jobProviders, eq(jobs.providerId, jobProviders.id))
      .where(eq(jobs.id, id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    return res.json({ job: row });
  } catch (error) {
    console.error('Public job detail error:', error);
    return res.status(500).json({ error: 'Unable to load job details.' });
  }
});

router.post('/referrals/track-click', async (req, res) => {
  try {
    const rawCode = String(req.body?.code || '').trim().toUpperCase();
    if (!rawCode) return res.status(400).json({ error: 'Missing referral code.' });

    const [codeRow] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, rawCode))
      .limit(1);

    await db.insert(referralClicks).values({
      referralCode: rawCode,
      referrerUserId: codeRow?.userId ?? null,
      ipHash: hashIp(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    });

    return res.json({ tracked: true, valid: Boolean(codeRow && !codeRow.isSuspended) });
  } catch (error) {
    console.error('Track referral click error:', error);
    return res.status(500).json({ error: 'Unable to track referral.' });
  }
});

router.get('/affiliates/go/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const [link] = await db
      .select({
        id: affiliateLinks.id,
        partnerId: affiliateLinks.partnerId,
        targetUrl: affiliateLinks.targetUrl,
      })
      .from(affiliateLinks)
      .innerJoin(affiliatePartners, eq(affiliateLinks.partnerId, affiliatePartners.id))
      .where(and(eq(affiliateLinks.slug, slug), eq(affiliatePartners.isActive, true)))
      .limit(1);

    if (!link) {
      return res.status(404).json({ error: 'Affiliate link not found.' });
    }

    const parsed = new URL(link.targetUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return res.status(400).json({ error: 'Invalid target URL.' });
    }

    await db.insert(affiliateClicks).values({
      linkId: link.id,
      partnerId: link.partnerId,
    });

    return res.json({ redirectUrl: parsed.toString() });
  } catch (error) {
    console.error('Affiliate redirect error:', error);
    return res.status(500).json({ error: 'Unable to resolve affiliate partner link.' });
  }
});

router.post('/contact', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    await db.insert(notifications).values({
      userId: null,
      targetRole: 'admin',
      category: 'contact',
      title: `Contact inquiry: ${subject || 'General'}`,
      message: `From ${name} (${email}): ${message.slice(0, 300)}`,
      linkPath: '/admin/notifications',
    });

    return res.json({ submitted: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to submit contact message.' });
  }
});

export default router;
