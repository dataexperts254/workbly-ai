import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adminSettings,
  affiliateLinks,
  affiliatePartners,
  exchangeRates,
  jobCategories,
  jobProviders,
  jobs,
  membershipPlans,
  permissions,
  pricingSettings,
  projectCommissions,
  projectContracts,
  rolePermissions,
  roles,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runIdempotentSeed().catch((err) => {
      seedPromise = null;
      console.error('Seed check error:', err);
      throw err;
    });
  }
  return seedPromise;
}

async function runIdempotentSeed(): Promise<void> {
  // 1. Seed Roles
  const roleSeeds = [
    {
      slug: 'member',
      name: 'Member',
      description: 'Standard marketplace worker with tier-based job allocation and referral access.',
    },
    {
      slug: 'admin',
      name: 'Administrator',
      description: 'Operations administrator managing jobs, providers, submissions, and member support. Restricted from Owner financial ledger controls.',
    },
    {
      slug: 'finance_admin',
      name: 'Financial Administrator',
      description: 'Authorized financial controller with access to payouts, ledger reconciliation, and owner revenue dashboards.',
    },
    {
      slug: 'owner',
      name: 'Platform Owner',
      description: 'Full marketplace owner access including revenue analytics, profitability, expenses, pricing, and RBAC governance.',
    },
  ];

  for (const r of roleSeeds) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }

  // 2. Seed Permissions
  const permSeeds = [
    { code: 'jobs.manage', name: 'Manage Jobs', category: 'marketplace', description: 'Create, edit, publish, pause, and close jobs' },
    { code: 'providers.verify', name: 'Verify Providers', category: 'marketplace', description: 'Register, verify, and suspend job providers' },
    { code: 'submissions.review', name: 'Review Submissions', category: 'operations', description: 'Approve, reject, and request corrections on worker tasks' },
    { code: 'withdrawals.process', name: 'Process Withdrawals', category: 'finance', description: 'Approve and reconcile worker and referral M-Pesa payouts' },
    { code: 'referrals.manage', name: 'Manage Referrals', category: 'growth', description: 'Review referral conversions and reverse fraudulent commissions' },
    { code: 'owner.revenue.view', name: 'Owner Revenue Dashboard', category: 'owner', description: 'Access owner gross/retained revenue, expenses, and net profit reports' },
    { code: 'owner.pricing.edit', name: 'Edit Pricing & Rates', category: 'owner', description: 'Modify subscription USD pricing, commission rates, and exchange rate overrides' },
  ];

  for (const p of permSeeds) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }

  const allRoles = await db.select().from(roles);
  const allPerms = await db.select().from(permissions);
  const roleMap = new Map(allRoles.map((r) => [r.slug, r.id]));
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  const assignPerm = async (roleSlug: string, permCode: string) => {
    const rId = roleMap.get(roleSlug);
    const pId = permMap.get(permCode);
    if (rId && pId) {
      await db.insert(rolePermissions).values({ roleId: rId, permissionId: pId }).onConflictDoNothing();
    }
  };

  for (const code of ['jobs.manage', 'providers.verify', 'submissions.review', 'withdrawals.process', 'referrals.manage']) {
    await assignPerm('admin', code);
    await assignPerm('finance_admin', code);
    await assignPerm('owner', code);
  }
  for (const code of ['owner.revenue.view', 'owner.pricing.edit']) {
    await assignPerm('finance_admin', code);
    await assignPerm('owner', code);
  }

  // 3. Seed 4 Membership Plans (All prices in USD, Quarterly default = 90 days)
  const planSeeds = [
    {
      slug: 'free',
      name: 'Free Member',
      audienceLabel: 'For new workers getting started',
      description: 'Start with 2 micro-tasks per week ($0.01–$0.02 per task) from unverified providers. Upgrade to Verified for $2.00+ jobs.',
      priceUsd: '0.00',
      billingIntervalDays: 90,
      weeklyJobLimit: 2,
      allowVerifiedProviders: false,
      allowProExclusive: false,
      allowTopRatedExclusive: false,
      featuresJson: [
        '2 micro-task opportunities per week ($0.01–$0.02)',
        'Access to unverified-provider starter tasks',
        'Basic member dashboard & work history',
        'Submission & USD earnings tracking',
        '10% referral programme access',
      ],
      sortOrder: 1,
    },
    {
      slug: 'verified',
      name: 'Verified Member',
      audienceLabel: 'For consistent weekly earners',
      description: 'Unlock verified-provider jobs paying from $2.00+ per task and at least 10 eligible tasks every week. Converted from KSh 299/mo reference.',
      priceUsd: '6.90',
      billingIntervalDays: 90,
      weeklyJobLimit: 10,
      allowVerifiedProviders: true,
      allowProExclusive: false,
      allowTopRatedExclusive: false,
      featuresJson: [
        'At least 10 verified jobs per week ($2.00+ per task)',
        'Access to Verified & Unverified providers',
        'Premium AI & research categories',
        'Priority job notifications & recommendations',
        'Enhanced earnings dashboard & analytics',
      ],
      sortOrder: 2,
    },
    {
      slug: 'pro',
      name: 'Pro Worker',
      audienceLabel: 'For dedicated digital specialists',
      description: 'Priority access to Pro-exclusive AI evaluation, annotation, and high-reward projects at $5 per quarter.',
      priceUsd: '5.00',
      billingIntervalDays: 90,
      weeklyJobLimit: 10,
      allowVerifiedProviders: true,
      allowProExclusive: true,
      allowTopRatedExclusive: false,
      featuresJson: [
        'All Verified Member benefits included',
        'At least 10 eligible jobs per week',
        'Access to Pro-exclusive jobs',
        'Priority consideration on selected projects',
        'Advanced work analytics & priority support',
      ],
      sortOrder: 3,
    },
    {
      slug: 'top_rated',
      name: 'Top-Rated Worker',
      audienceLabel: 'For full-access power earners',
      description: 'Unlimited eligible opportunities, highest-paying verified client tasks, and Top-Rated badge at $8 per quarter.',
      priceUsd: '8.00',
      billingIntervalDays: 90,
      weeklyJobLimit: -1,
      allowVerifiedProviders: true,
      allowProExclusive: true,
      allowTopRatedExclusive: true,
      featuresJson: [
        'All Pro Worker benefits included',
        'Unlimited eligible opportunities weekly',
        'Top-Rated membership badge & priority queue',
        'Exclusive enterprise & managed projects',
        'Highest tier access & priority support',
      ],
      sortOrder: 4,
    },
  ];

  for (const plan of planSeeds) {
    await db.insert(membershipPlans).values(plan).onConflictDoNothing();
  }

  // 4. Pricing Settings
  const settingSeeds = [
    { key: 'referral_commission_pct', valueText: '10.00', valueNumeric: '10.0000', description: 'Default referral commission percentage on eligible subscription payments.' },
    { key: 'referral_attribution_days', valueText: '90', valueNumeric: '90.0000', description: 'Referral attribution window in days from registration.' },
    { key: 'project_commission_pct', valueText: '10.00', valueNumeric: '10.0000', description: 'Managed client-funded project commission percentage.' },
    { key: 'min_worker_withdrawal_usd', valueText: '5.00', valueNumeric: '5.0000', description: 'Minimum USD balance required for worker job earnings withdrawal.' },
    { key: 'min_referral_withdrawal_usd', valueText: '2.00', valueNumeric: '2.0000', description: 'Minimum USD balance required for referral commission withdrawal.' },
    { key: 'default_billing_interval_days', valueText: '90', valueNumeric: '90.0000', description: 'Default paid subscription billing interval in days (Quarterly = 90).' },
  ];

  for (const s of settingSeeds) {
    await db.insert(pricingSettings).values(s).onConflictDoNothing();
  }

  // 5. Initial Exchange Rate if none exists
  const rateCount = await db.select({ count: sql<number>`count(*)::int` }).from(exchangeRates);
  if ((rateCount[0]?.count ?? 0) === 0) {
    await db.insert(exchangeRates).values({
      baseCurrency: 'USD',
      quoteCurrency: 'KES',
      rate: '129.5000',
      source: 'manual',
      notes: 'Initial Kenya launch reference rate ($1 USD = KES 129.50)',
      isActive: true,
    });
  }

  // 6. All 17 Job Categories
  const categorySeeds = [
    { slug: 'online-surveys', name: 'Online Surveys', description: 'Consumer research questionnaires, product feedback studies, and East Africa market pulse surveys.', iconName: 'ClipboardList', isPremium: false, sortOrder: 1 },
    { slug: 'ai-training', name: 'AI Training', description: 'Structured prompt engineering, instruction following, and RLHF model alignment workflows.', iconName: 'Cpu', isPremium: true, sortOrder: 2 },
    { slug: 'ai-data-annotation', name: 'AI Data Annotation', description: 'Precision bounding boxes, entity tagging, and multimodal dataset annotation.', iconName: 'Tags', isPremium: true, sortOrder: 3 },
    { slug: 'ai-response-evaluation', name: 'AI Response Evaluation', description: 'Side-by-side LLM response grading for factuality, reasoning clarity, and safety.', iconName: 'CheckSquare', isPremium: true, sortOrder: 4 },
    { slug: 'ai-model-testing', name: 'AI Model Testing', description: 'Adversarial edge-case testing, hallucination audits, and multilingual benchmark QA.', iconName: 'ShieldCheck', isPremium: true, sortOrder: 5 },
    { slug: 'data-collection', name: 'Data Collection', description: 'Verified public registry gathering, Swahili/English voice prompts, and structured field datasets.', iconName: 'Database', isPremium: false, sortOrder: 6 },
    { slug: 'data-labelling', name: 'Data Labelling', description: 'Classification, sentiment tagging, and taxonomy mapping for machine learning pipelines.', iconName: 'Layers', isPremium: false, sortOrder: 7 },
    { slug: 'transcription', name: 'Transcription', description: 'Clean verbatim and timestamped audio-to-text transcription in English, Swahili, and Sheng.', iconName: 'Mic', isPremium: false, sortOrder: 8 },
    { slug: 'content-writing', name: 'Content Writing', description: 'Technical documentation, localized SaaS guides, and editorial copywriting assignments.', iconName: 'PenTool', isPremium: false, sortOrder: 9 },
    { slug: 'research-assistance', name: 'Research Assistance', description: 'Literature synthesis, market sizing briefs, and cited secondary research support.', iconName: 'Search', isPremium: true, sortOrder: 10 },
    { slug: 'academic-tutoring', name: 'Academic Tutoring', description: 'Legitimate tutoring, structured editing, study guide review, and learning assistance.', iconName: 'GraduationCap', isPremium: true, sortOrder: 11 },
    { slug: 'virtual-assistance', name: 'Virtual Assistance', description: 'Inbox triage, calendar operations, CRM hygiene, and remote executive support.', iconName: 'Headphones', isPremium: false, sortOrder: 12 },
    { slug: 'data-entry', name: 'Data Entry', description: 'High-accuracy spreadsheet normalization, invoice digitization, and catalog updates.', iconName: 'Table', isPremium: false, sortOrder: 13 },
    { slug: 'image-annotation', name: 'Image Annotation', description: 'Polygon segmentation, OCR verification, and retail shelf recognition tagging.', iconName: 'Image', isPremium: true, sortOrder: 14 },
    { slug: 'video-annotation', name: 'Video Annotation', description: 'Temporal action tracking, frame-level object labeling, and scene event tagging.', iconName: 'Video', isPremium: true, sortOrder: 15 },
    { slug: 'translation', name: 'Translation', description: 'Human-reviewed Swahili, Kikuyu, Luo, and French-English localization tasks.', iconName: 'Languages', isPremium: true, sortOrder: 16 },
    { slug: 'other-online-freelance-tasks', name: 'Other Online Freelance Tasks', description: 'Curated micro-projects, QA usability tests, and specialized digital operations.', iconName: 'Briefcase', isPremium: false, sortOrder: 17 },
  ];

  for (const c of categorySeeds) {
    await db.insert(jobCategories).values(c).onConflictDoNothing();
  }

  // 7. Sample Providers & Sample Jobs (Explicitly tagged isSample: true)
  const providerCount = await db.select({ count: sql<number>`count(*)::int` }).from(jobProviders);
  if ((providerCount[0]?.count ?? 0) === 0) {
    const insertedProviders = await db
      .insert(jobProviders)
      .values([
        {
          name: 'Savannah AI Labs (Sample Verified)',
          websiteUrl: 'https://example.com/savannah-ai',
          sourceUrl: 'https://example.com/savannah-ai/partner-program',
          classification: 'verified',
          verificationStatus: 'verified',
          reliabilityScore: 98,
          partnershipNotes: 'Sample verified partner for AI response evaluation and Swahili NLP datasets.',
          contactEmail: 'ops@savannah-sample.example',
          isSample: true,
        },
        {
          name: 'Nairobi Digital Research Panel (Sample Unverified)',
          websiteUrl: 'https://example.com/nairobi-panel',
          sourceUrl: 'https://example.com/nairobi-panel/surveys',
          classification: 'unverified',
          verificationStatus: 'pending',
          reliabilityScore: 82,
          partnershipNotes: 'Sample unverified open-web survey aggregator accessible to Free Members.',
          contactEmail: 'panel@nairobi-sample.example',
          isSample: true,
        },
        {
          name: 'Equinox Vision Datasets (Sample Verified)',
          websiteUrl: 'https://example.com/equinox-vision',
          sourceUrl: 'https://example.com/equinox-vision/tasks',
          classification: 'verified',
          verificationStatus: 'verified',
          reliabilityScore: 95,
          partnershipNotes: 'Sample verified enterprise computer vision & video annotation partner.',
          contactEmail: 'datasets@equinox-sample.example',
          isSample: true,
        },
        {
          name: 'KaziMicro Open Tasks (Sample Unverified)',
          websiteUrl: 'https://example.com/kazimicro',
          sourceUrl: 'https://example.com/kazimicro/feed',
          classification: 'unverified',
          verificationStatus: 'pending',
          reliabilityScore: 79,
          partnershipNotes: 'Sample unverified micro-task feed for Free tier onboarding.',
          contactEmail: 'tasks@kazimicro-sample.example',
          isSample: true,
        },
      ])
      .returning();

    const catRows = await db.select().from(jobCategories);
    const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));

    const verifiedSavannah = insertedProviders[0].id;
    const unverifiedPanel = insertedProviders[1].id;
    const verifiedEquinox = insertedProviders[2].id;
    const unverifiedKazi = insertedProviders[3].id;

    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const sampleJobs = [
      // Only 2 Free-tier micro-tasks paying very small amounts ($0.01 - $0.02)
      {
        jobCode: 'WRK-SAMPLE-101',
        title: 'Quick 3-Question Mobile Checkout Poll',
        description: 'Answer 3 rapid multiple-choice questions on mobile wallet checkout speed in Kenya.',
        categoryId: catBySlug.get('online-surveys')!,
        providerId: unverifiedPanel,
        sourceUrl: 'https://example.com/nairobi-panel/quick-poll',
        instructions: 'Select your answers for all 3 prompts and paste your poll completion code.',
        requiredSkillsJson: ['Basic English', 'Attention to Detail'],
        difficulty: 'beginner',
        estimatedDuration: '3 mins',
        rewardUsd: '0.01',
        availablePositions: 50,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['free', 'verified', 'pro', 'top_rated'],
        minTier: 'free',
        submissionRequirements: 'Submit poll completion code.',
        paymentConditions: 'Free micro-task · Paid in USD upon QA check.',
        status: 'published',
        isFeatured: true,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-102',
        title: 'Single Receipt Total Verification Tag',
        description: 'Verify total amount and merchant category on 2 anonymized retail receipt snippets.',
        categoryId: catBySlug.get('data-entry')!,
        providerId: unverifiedKazi,
        sourceUrl: 'https://example.com/kazimicro/receipt-tag',
        instructions: 'Confirm receipt total matches printed subtotal and select retail category.',
        requiredSkillsJson: ['Basic Typing', 'Accuracy'],
        difficulty: 'beginner',
        estimatedDuration: '5 mins',
        rewardUsd: '0.02',
        availablePositions: 40,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['free', 'verified', 'pro', 'top_rated'],
        minTier: 'free',
        submissionRequirements: 'Paste verified receipt total and category.',
        paymentConditions: 'Free micro-task · 100% accuracy required.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },

      // 14 Verification-required tasks starting from $2.00+
      {
        jobCode: 'WRK-SAMPLE-203',
        title: 'East Africa Mobile Money UX Benchmark Survey',
        description: 'Complete an in-depth 25-question verified research evaluation covering mobile banking workflows.',
        categoryId: catBySlug.get('online-surveys')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/fintech-benchmark',
        instructions: 'Provide detailed written justifications on checkout friction, USSD fallback, and confirmation clarity.',
        requiredSkillsJson: ['Kenyan Fintech Familiarity', 'Written English', 'Product Feedback'],
        difficulty: 'beginner',
        estimatedDuration: '20 mins',
        rewardUsd: '2.00',
        availablePositions: 60,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit survey completion ID and 3-sentence usability summary.',
        paymentConditions: 'Verified Member+ · Paid in USD upon QA review.',
        status: 'published',
        isFeatured: true,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-204',
        title: 'Swahili Customer Support Intent Classification (50 Utterances)',
        description: 'Label 50 anonymized Kenyan telecom and fintech support chats into structured intent and sentiment classes.',
        categoryId: catBySlug.get('data-labelling')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/swahili-intent',
        instructions: 'Assign one primary intent tag and sentiment score (Positive, Neutral, Negative) per utterance.',
        requiredSkillsJson: ['Fluent Swahili', 'Data Labelling', 'Consistency'],
        difficulty: 'beginner',
        estimatedDuration: '25 mins',
        rewardUsd: '2.50',
        availablePositions: 55,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit labeled batch reference ID and summary count.',
        paymentConditions: 'Verified Partner · Paid in USD upon QA check.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-211',
        title: 'Spoken Swahili & Sheng Voice Prompt Recording Batch',
        description: 'Record 25 short natural voice commands for East African speech-recognition model training.',
        categoryId: catBySlug.get('data-collection')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/voice-prompts',
        instructions: 'Record in a quiet indoor setting following the exact prompt sheet without background noise.',
        requiredSkillsJson: ['Clear Speech', 'Swahili / Sheng Fluency', 'Audio Hygiene'],
        difficulty: 'beginner',
        estimatedDuration: '30 mins',
        rewardUsd: '3.00',
        availablePositions: 50,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit audio batch upload ID and recording device note.',
        paymentConditions: 'Verified Partner · Clean audio SNR check required.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-205',
        title: 'Wholesale Invoice Digitization & Ledger Reconciliation (40 Rows)',
        description: 'Transcribe and validate 40 multi-line supplier invoices into standardized SKU, tax, and USD/KES fields.',
        categoryId: catBySlug.get('data-entry')!,
        providerId: verifiedEquinox,
        sourceUrl: 'https://example.com/equinox-vision/invoice-batch',
        instructions: 'Verify VAT subtotals and format dates in ISO YYYY-MM-DD before submitting.',
        requiredSkillsJson: ['Spreadsheets', 'Accounting Accuracy', 'Data Entry'],
        difficulty: 'beginner',
        estimatedDuration: '35 mins',
        rewardUsd: '3.25',
        availablePositions: 45,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Upload formatted CSV summary or paste verified reconciliation table.',
        paymentConditions: 'Verified Partner · 98% field accuracy required.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-206',
        title: 'Supermarket Shelf SKU Bounding-Box Annotation',
        description: 'Draw tight bounding boxes and brand labels across 35 Kenyan retail shelf photographs.',
        categoryId: catBySlug.get('ai-data-annotation')!,
        providerId: verifiedEquinox,
        sourceUrl: 'https://example.com/equinox-vision/shelf-sku',
        instructions: 'Box every visible beverage and consumer goods pack using the provided taxonomy codes.',
        requiredSkillsJson: ['Bounding Boxes', 'Visual Precision', 'Taxonomy QA'],
        difficulty: 'intermediate',
        estimatedDuration: '40 mins',
        rewardUsd: '4.00',
        availablePositions: 40,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit batch completion ID and occluded-item notes.',
        paymentConditions: 'Verified Partner · Paid upon IoU QA.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-207',
        title: 'SaaS Helpdesk Knowledge-Base Localization (EN to SW)',
        description: 'Translate and localize 12 concise cloud-software support articles into natural Kenyan Swahili.',
        categoryId: catBySlug.get('translation')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/sw-localization',
        instructions: 'Preserve UI button labels in English brackets while adapting explanations into clear formal Swahili.',
        requiredSkillsJson: ['Fluent Swahili', 'Technical Translation', 'Localization'],
        difficulty: 'intermediate',
        estimatedDuration: '45 mins',
        rewardUsd: '4.50',
        availablePositions: 35,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Paste translated markdown articles or document link.',
        paymentConditions: 'Verified Partner · Human linguistic QA.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-212',
        title: 'Remote CRM Hygiene & Lead Enrichment Operations',
        description: 'Verify business website URLs, LinkedIn handles, and operating hours for 60 East Africa B2B listings.',
        categoryId: catBySlug.get('virtual-assistance')!,
        providerId: verifiedEquinox,
        sourceUrl: 'https://example.com/equinox-vision/crm-ops',
        instructions: 'Flag closed entities and update verified contact emails directly in the sheet template.',
        requiredSkillsJson: ['Web Research', 'CRM Operations', 'Attention to Detail'],
        difficulty: 'beginner',
        estimatedDuration: '40 mins',
        rewardUsd: '3.75',
        availablePositions: 40,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit enriched sheet URL and verification count.',
        paymentConditions: 'Verified Partner · Spot-checked by QA.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-213',
        title: 'Technical Product Guide Copywriting (800 Words)',
        description: 'Draft a clear step-by-step onboarding article covering mobile payment reconciliation for SMEs.',
        categoryId: catBySlug.get('content-writing')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/sme-guide',
        instructions: 'Write 100% original structured prose with subheadings, numbered steps, and zero AI filler.',
        requiredSkillsJson: ['Editorial Writing', 'Fintech Literacy', 'Clarity'],
        difficulty: 'intermediate',
        estimatedDuration: '50 mins',
        rewardUsd: '5.00',
        availablePositions: 30,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Paste article draft or shared doc URL.',
        paymentConditions: 'Verified Partner · Editorial originality check.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-103',
        title: 'Swahili-English Audio Transcription (15-Min Segment)',
        description: 'Produce clean verbatim transcripts for code-switched Kenyan business podcast audio clips.',
        categoryId: catBySlug.get('transcription')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/swahili-transcription',
        instructions: 'Include speaker labels (Speaker 1, Speaker 2) and timestamps every 60 seconds.',
        requiredSkillsJson: ['Fluent English', 'Fluent Swahili', 'Audio Transcription'],
        difficulty: 'intermediate',
        estimatedDuration: '45 mins',
        rewardUsd: '5.50',
        availablePositions: 30,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Paste full timestamped transcript text or document link.',
        paymentConditions: 'Verified Partner · Approved after reviewer spot-check.',
        status: 'published',
        isFeatured: true,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-208',
        title: 'East Africa Cloud & Payments Pricing Research Brief',
        description: 'Compile an attributed comparison table of 10 regional SaaS & payment gateway fee structures.',
        categoryId: catBySlug.get('research-assistance')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/pricing-brief',
        instructions: 'Cite official pricing URLs and retrieval dates for every provider listed.',
        requiredSkillsJson: ['Secondary Research', 'Citation Discipline', 'Structured Tables'],
        difficulty: 'intermediate',
        estimatedDuration: '55 mins',
        rewardUsd: '6.00',
        availablePositions: 25,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit structured comparison table and source URLs.',
        paymentConditions: 'Verified Partner · Paid upon citation verification.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-209',
        title: 'Urban Street Pedestrian Action Video Labeling (20 Clips)',
        description: 'Track pedestrian crossing events and vehicle turn signals frame-by-frame across 20 short clips.',
        categoryId: catBySlug.get('video-annotation')!,
        providerId: verifiedEquinox,
        sourceUrl: 'https://example.com/equinox-vision/video-events',
        instructions: 'Mark start/end timestamps for every pedestrian yield and lane-change event.',
        requiredSkillsJson: ['Video Annotation', 'Temporal Precision', 'Event Tagging'],
        difficulty: 'intermediate',
        estimatedDuration: '60 mins',
        rewardUsd: '6.50',
        availablePositions: 25,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit clip batch ID and timestamp QA summary.',
        paymentConditions: 'Verified Partner · Frame tolerance +/- 3 frames.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-210',
        title: 'STEM Calculus & Python Study Guide Review',
        description: 'Audit worked university calculus and introductory Python exercises for step-by-step clarity.',
        categoryId: catBySlug.get('academic-tutoring')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/stem-tutoring',
        instructions: 'Verify algebraic derivations, test Python snippets, and write clear hint explanations.',
        requiredSkillsJson: ['Calculus / Python', 'Pedagogical Clarity', 'Technical Editing'],
        difficulty: 'intermediate',
        estimatedDuration: '60 mins',
        rewardUsd: '7.00',
        availablePositions: 20,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit annotated solution review and correction notes.',
        paymentConditions: 'Verified Partner · Senior academic QA.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-201',
        title: 'LLM Reasoning & Factuality Side-by-Side Evaluation',
        description: 'Compare two AI assistant answers across 12 African legal and financial literacy prompts and score clarity, grounding, and tone.',
        categoryId: catBySlug.get('ai-response-evaluation')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/eval-batch-201',
        instructions: 'Evaluate Model A vs Model B using the 5-point rubric. Justify every preference with at least 40 words citing factual accuracy.',
        requiredSkillsJson: ['Critical Reasoning', 'Fact-Checking', 'Rubric Grading'],
        difficulty: 'intermediate',
        estimatedDuration: '50 mins',
        rewardUsd: '8.50',
        availablePositions: 35,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Submit completed evaluation table and justification notes.',
        paymentConditions: 'Verified Partner · Paid in USD upon QA review.',
        status: 'published',
        isFeatured: true,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-202',
        title: 'AgriTech Crop Leaf Image Polygon Annotation',
        description: 'Annotate 40 high-resolution maize and coffee leaf images for blight detection training datasets.',
        categoryId: catBySlug.get('image-annotation')!,
        providerId: verifiedEquinox,
        sourceUrl: 'https://example.com/equinox-vision/crop-polygon',
        instructions: 'Draw tight polygon boundaries around affected leaf lesions and classify severity (Mild, Moderate, Severe).',
        requiredSkillsJson: ['Image Annotation', 'Visual Precision', 'Taxonomy Following'],
        difficulty: 'intermediate',
        estimatedDuration: '60 mins',
        rewardUsd: '9.00',
        availablePositions: 25,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['verified', 'pro', 'top_rated'],
        minTier: 'verified',
        submissionRequirements: 'Provide annotation batch ID and QA summary notes.',
        paymentConditions: 'Verified Partner · IoU >= 0.85 required.',
        status: 'published',
        isFeatured: false,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-301',
        title: 'Pro Exclusive: Swahili RLHF Instruction Prompt Authoring',
        description: 'Author 15 high-complexity multi-turn Swahili prompts and gold-standard reference responses for enterprise AI alignment.',
        categoryId: catBySlug.get('ai-training')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/pro-rlhf',
        instructions: 'Each prompt must test reasoning, summarization, or localized Kenyan context without copying public benchmarks.',
        requiredSkillsJson: ['Native Swahili', 'Prompt Engineering', 'Editorial Writing'],
        difficulty: 'advanced',
        estimatedDuration: '90 mins',
        rewardUsd: '14.00',
        availablePositions: 20,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['pro', 'top_rated'],
        minTier: 'pro',
        submissionRequirements: 'Submit 15 prompt-response pairs in structured markdown or attachment reference.',
        paymentConditions: 'Pro-Exclusive Verified Project · Paid upon senior QA sign-off.',
        status: 'published',
        isFeatured: true,
        isSponsored: true,
        isSample: true,
      },
      {
        jobCode: 'WRK-SAMPLE-401',
        title: 'Top-Rated Exclusive: Adversarial AI Safety Red-Teaming',
        description: 'Conduct structured robustness testing on multilingual financial advisor models and document failure modes.',
        categoryId: catBySlug.get('ai-model-testing')!,
        providerId: verifiedSavannah,
        sourceUrl: 'https://example.com/savannah-ai/top-rated-redteam',
        instructions: 'Test 20 edge-case scenarios across English and Swahili, recording exact prompts, model outputs, and severity ratings.',
        requiredSkillsJson: ['AI Red-Teaming', 'Structured QA', 'Risk Categorization'],
        difficulty: 'advanced',
        estimatedDuration: '2 hours',
        rewardUsd: '22.00',
        availablePositions: 15,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ['top_rated'],
        minTier: 'top_rated',
        submissionRequirements: 'Submit structured safety evaluation log and evidence summary.',
        paymentConditions: 'Top-Rated Exclusive · Priority payout upon verification.',
        status: 'published',
        isFeatured: true,
        isSponsored: true,
        isSample: true,
      },
    ];

    await db.insert(jobs).values(sampleJobs).onConflictDoNothing();
  }

  // 8. Affiliate Partners (Legitimate disclosed affiliate links)
  const partnerCount = await db.select({ count: sql<number>`count(*)::int` }).from(affiliatePartners);
  if ((partnerCount[0]?.count ?? 0) === 0) {
    const insertedPartners = await db
      .insert(affiliatePartners)
      .values([
        {
          name: 'Grammarly Productivity Suite',
          category: 'Productivity Software',
          websiteUrl: 'https://www.grammarly.com',
          disclosureText: 'Workaby AI earns an authorized affiliate commission if you subscribe through our partner link.',
          commissionRateDesc: '20% CPA on Pro upgrades',
          agreementStatus: 'active',
          isActive: true,
        },
        {
          name: 'Coursera AI & Data Skills',
          category: 'Educational Platforms',
          websiteUrl: 'https://www.coursera.org',
          disclosureText: 'Disclosed educational affiliate partner helping Kenyan workers upskill in AI annotation and data analysis.',
          commissionRateDesc: '15% qualified course enrollment commission',
          agreementStatus: 'active',
          isActive: true,
        },
      ])
      .returning();

    await db.insert(affiliateLinks).values([
      {
        partnerId: insertedPartners[0].id,
        slug: 'grammarly-writers',
        targetUrl: 'https://www.grammarly.com',
        campaignName: 'Content Writers & QA Reviewers Toolkit',
      },
      {
        partnerId: insertedPartners[1].id,
        slug: 'coursera-ai-track',
        targetUrl: 'https://www.coursera.org',
        campaignName: 'AI Data & Prompt Engineering Upskilling',
      },
    ]);
  }

  // 9. Sample Managed Project Contract (10% Commission example: $1,000 -> $900 worker / $100 platform)
  const contractCount = await db.select({ count: sql<number>`count(*)::int` }).from(projectContracts);
  if ((contractCount[0]?.count ?? 0) === 0) {
    const [contract] = await db
      .insert(projectContracts)
      .values({
        contractCode: 'PRJ-SAMPLE-001',
        clientName: 'Savannah AI Labs (Sample Contract)',
        title: 'East Africa Multilingual Evaluation Sprint',
        revenueType: 'managed_project',
        totalValueUsd: '1000.00',
        workerPayoutUsd: '900.00',
        commissionPct: '10.00',
        platformCommissionUsd: '100.00',
        agreementVerified: true,
        status: 'completed',
        isSample: true,
      })
      .returning();

    await db.insert(projectCommissions).values({
      contractId: contract.id,
      amountUsd: '100.00',
      status: 'realized',
    });
  }

  // 10. General Admin Settings & Website Content
  const defaultAdminSettings = [
    {
      key: 'platform_identity',
      valueText: 'Workaby AI',
      category: 'general',
      valueJson: {
        name: 'Workaby AI',
        tagline: 'Your Gateway to Online Work.',
        primaryCurrency: 'USD',
        mpesaCurrency: 'KES',
        timezone: 'Africa/Nairobi',
        supportEmail: 'support@workaby.ke',
      },
    },
    {
      key: 'homepage_faq',
      valueText: 'FAQ Items',
      category: 'content',
      valueJson: {
        items: [
          {
            q: 'How do membership prices and M-Pesa payments work?',
            a: 'All Workaby AI prices, job rewards, and earnings are displayed in USD. When paying for a quarterly membership via M-Pesa, the live USD/KES exchange rate is applied and the exact KES amount is sent via Safaricom STK Push.',
          },
          {
            q: 'How does the 10% referral commission work?',
            a: 'Every member gets a unique referral code. When a referred member confirms a paid quarterly subscription ($5 Pro Worker or $8 Top-Rated, plus renewals/upgrades), you earn 10% in your Referral Wallet.',
          },
          {
            q: 'What is the difference between Top-Rated membership and the 50 Jobs Completed badge?',
            a: 'Top-Rated Worker is a paid $8/quarter membership tier granting unlimited eligible job access. Completing 50 approved tasks earns a separate 50 Jobs Completed achievement badge.',
          },
          {
            q: 'Can ordinary members post jobs?',
            a: 'No. Workaby AI centrally sources, verifies, and publishes all marketplace opportunities through authorized administrators to protect worker quality and payment integrity.',
          },
        ],
      },
    },
  ];

  for (const s of defaultAdminSettings) {
    await db.insert(adminSettings).values(s).onConflictDoNothing();
  }
}
