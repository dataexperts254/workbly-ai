import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Roles & Permissions
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(), // 'member' | 'admin' | 'finance_admin' | 'owner'
  name: text('name').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: serial('id').primaryKey(),
    roleId: integer('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: integer('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [uniqueIndex('role_perm_unique_idx').on(table.roleId, table.permissionId)]
);

// 2. Users & Profiles
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    passwordSalt: text('password_salt'),
    resetTokenHash: text('reset_token_hash'),
    resetTokenExpiresAt: timestamp('reset_token_expires_at'),
    fullName: text('full_name').notNull().default('Workaby AI Member'),
    roleId: integer('role_id').references(() => roles.id),
    roleSlug: text('role_slug').notNull().default('member'),
    status: text('status').notNull().default('active'), // 'active' | 'suspended'
    membershipTier: text('membership_tier').notNull().default('free'), // 'free' | 'verified' | 'pro' | 'top_rated'
    subscriptionExpiresAt: timestamp('subscription_expires_at'),
    completedApprovedJobs: integer('completed_approved_jobs').notNull().default(0),
    achievement50Jobs: boolean('achievement_50_jobs').notNull().default(false),
    isSample: boolean('is_sample').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('users_role_slug_idx').on(table.roleSlug),
    index('users_membership_tier_idx').on(table.membershipTier),
  ]
);

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  phone: text('phone'),
  country: text('country').notNull().default('Kenya'),
  county: text('county').default('Nairobi'),
  timezone: text('timezone').notNull().default('Africa/Nairobi'),
  bio: text('bio'),
  skillsJson: jsonb('skills_json').$type<string[]>().default([]).notNull(),
  avatarUrl: text('avatar_url'),
  preferredPayoutPhone: text('preferred_payout_phone'),
  dataPrivacyConsent: boolean('data_privacy_consent').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Membership Plans, Subscriptions, Exchange Rates, Pricing Settings
export const membershipPlans = pgTable('membership_plans', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(), // 'free' | 'verified' | 'pro' | 'top_rated'
  name: text('name').notNull(),
  audienceLabel: text('audience_label').notNull(),
  description: text('description').notNull(),
  priceUsd: numeric('price_usd', { precision: 10, scale: 2 }).notNull(),
  billingIntervalDays: integer('billing_interval_days').notNull().default(90),
  weeklyJobLimit: integer('weekly_job_limit').notNull().default(2), // -1 means unlimited
  allowVerifiedProviders: boolean('allow_verified_providers').notNull().default(false),
  allowProExclusive: boolean('allow_pro_exclusive').notNull().default(false),
  allowTopRatedExclusive: boolean('allow_top_rated_exclusive').notNull().default(false),
  featuresJson: jsonb('features_json').$type<string[]>().default([]).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    planId: integer('plan_id')
      .references(() => membershipPlans.id)
      .notNull(),
    planSlug: text('plan_slug').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'active' | 'expired' | 'cancelled'
    billingIntervalDays: integer('billing_interval_days').notNull().default(90),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    startsAt: timestamp('starts_at'),
    expiresAt: timestamp('expires_at'),
    autoRenewAuthorized: boolean('auto_renew_authorized').notNull().default(false),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('subscriptions_user_status_idx').on(table.userId, table.status)]
);

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: serial('id').primaryKey(),
    baseCurrency: text('base_currency').notNull().default('USD'),
    quoteCurrency: text('quote_currency').notNull().default('KES'),
    rate: numeric('rate', { precision: 12, scale: 4 }).notNull(),
    source: text('source').notNull().default('manual'), // 'auto' | 'manual' | 'api'
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    recordedByUserId: integer('recorded_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('exchange_rates_active_idx').on(table.isActive, table.createdAt)]
);

export const subscriptionTransactions = pgTable(
  'subscription_transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    subscriptionId: integer('subscription_id').references(() => subscriptions.id),
    planSlug: text('plan_slug').notNull(),
    paymentMethod: text('payment_method').notNull().default('mpesa_stk'),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    amountKes: numeric('amount_kes', { precision: 12, scale: 2 }).notNull(),
    exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 }).notNull(),
    exchangeRateId: integer('exchange_rate_id').references(() => exchangeRates.id),
    phoneNumber: text('phone_number').notNull(),
    checkoutRequestId: text('checkout_request_id').notNull().unique(),
    merchantRequestId: text('merchant_request_id'),
    mpesaReceiptNumber: text('mpesa_receipt_number').unique(),
    status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded'
    isRenewal: boolean('is_renewal').notNull().default(false),
    isSample: boolean('is_sample').notNull().default(false),
    callbackPayloadJson: jsonb('callback_payload_json').$type<Record<string, unknown> | null>(),
    initiatedAt: timestamp('initiated_at').defaultNow().notNull(),
    confirmedAt: timestamp('confirmed_at'),
    refundedAt: timestamp('refunded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sub_tx_user_status_idx').on(table.userId, table.status),
    index('sub_tx_confirmed_at_idx').on(table.confirmedAt),
  ]
);

export const pricingSettings = pgTable('pricing_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  valueText: text('value_text').notNull(),
  valueNumeric: numeric('value_numeric', { precision: 12, scale: 4 }),
  description: text('description').notNull(),
  updatedByUserId: integer('updated_by_user_id').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Job Categories, Providers, Jobs
export const jobCategories = pgTable('job_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  iconName: text('icon_name').notNull().default('Briefcase'),
  isPremium: boolean('is_premium').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const jobProviders = pgTable('job_providers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  websiteUrl: text('website_url'),
  sourceUrl: text('source_url'),
  classification: text('classification').notNull().default('unverified'), // 'unverified' | 'verified'
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'verified' | 'suspended'
  reliabilityScore: integer('reliability_score').notNull().default(80),
  partnershipNotes: text('partnership_notes'),
  contactEmail: text('contact_email'),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const providerVerifications = pgTable('provider_verifications', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id')
    .references(() => jobProviders.id, { onDelete: 'cascade' })
    .notNull(),
  verifiedByUserId: integer('verified_by_user_id')
    .references(() => users.id)
    .notNull(),
  status: text('status').notNull(), // 'verified' | 'suspended' | 'rejected'
  evidenceSummary: text('evidence_summary').notNull(),
  evidenceUrl: text('evidence_url'),
  sourceCheckNotes: text('source_check_notes'),
  verifiedAt: timestamp('verified_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    jobCode: text('job_code').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    categoryId: integer('category_id')
      .references(() => jobCategories.id)
      .notNull(),
    providerId: integer('provider_id')
      .references(() => jobProviders.id)
      .notNull(),
    sourceUrl: text('source_url'),
    instructions: text('instructions').notNull(),
    requiredSkillsJson: jsonb('required_skills_json').$type<string[]>().default([]).notNull(),
    difficulty: text('difficulty').notNull().default('beginner'), // 'beginner' | 'intermediate' | 'advanced'
    estimatedDuration: text('estimated_duration').notNull().default('30 mins'),
    rewardUsd: numeric('reward_usd', { precision: 10, scale: 2 }).notNull(),
    availablePositions: integer('available_positions').notNull().default(25),
    filledPositions: integer('filled_positions').notNull().default(0),
    publishedAt: timestamp('published_at'),
    deadlineAt: timestamp('deadline_at').notNull(),
    eligibleTiersJson: jsonb('eligible_tiers_json')
      .$type<string[]>()
      .default(['free', 'verified', 'pro', 'top_rated'])
      .notNull(),
    minTier: text('min_tier').notNull().default('free'), // 'free' | 'verified' | 'pro' | 'top_rated'
    submissionRequirements: text('submission_requirements').notNull(),
    paymentConditions: text('payment_conditions').notNull().default('Paid in USD upon QA approval.'),
    status: text('status').notNull().default('published'), // 'draft' | 'pending_verification' | 'approved' | 'published' | 'fully_allocated' | 'paused' | 'closed' | 'expired'
    isFeatured: boolean('is_featured').notNull().default(false),
    isSponsored: boolean('is_sponsored').notNull().default(false),
    isSample: boolean('is_sample').notNull().default(false),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('jobs_status_cat_idx').on(table.status, table.categoryId),
    index('jobs_min_tier_idx').on(table.minTier),
  ]
);

// 5. Job Allocations, Applications, Submissions, Reviews, Performance
export const jobAllocations = pgTable(
  'job_allocations',
  {
    id: serial('id').primaryKey(),
    jobId: integer('job_id')
      .references(() => jobs.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    weekKey: text('week_key').notNull(), // Africa/Nairobi ISO week e.g. '2026-W48'
    membershipTierAtAllocation: text('membership_tier_at_allocation').notNull(),
    status: text('status').notNull().default('allocated'), // 'allocated' | 'completed' | 'released'
    allocatedAt: timestamp('allocated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('job_alloc_user_job_unique_idx').on(table.jobId, table.userId),
    index('job_alloc_user_week_idx').on(table.userId, table.weekKey),
  ]
);

export const jobApplications = pgTable(
  'job_applications',
  {
    id: serial('id').primaryKey(),
    jobId: integer('job_id')
      .references(() => jobs.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    allocationId: integer('allocation_id').references(() => jobAllocations.id),
    status: text('status').notNull().default('accepted'), // 'applied' | 'accepted' | 'in_progress' | 'rejected' | 'withdrawn'
    coverNote: text('cover_note'),
    appliedAt: timestamp('applied_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('job_app_user_job_unique_idx').on(table.jobId, table.userId)]
);

export const jobSubmissions = pgTable(
  'job_submissions',
  {
    id: serial('id').primaryKey(),
    jobId: integer('job_id')
      .references(() => jobs.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    applicationId: integer('application_id').references(() => jobApplications.id),
    submissionType: text('submission_type').notNull().default('text'), // 'text' | 'document' | 'image' | 'file' | 'external_ref'
    textContent: text('text_content').notNull(),
    externalReference: text('external_reference'),
    attachmentName: text('attachment_name'),
    attachmentUrl: text('attachment_url'),
    notes: text('notes'),
    status: text('status').notNull().default('submitted'), // 'submitted' | 'under_review' | 'approved' | 'rejected' | 'correction_requested' | 'paid'
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('job_sub_user_status_idx').on(table.userId, table.status),
    index('job_sub_job_idx').on(table.jobId),
  ]
);

export const submissionReviews = pgTable('submission_reviews', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .references(() => jobSubmissions.id, { onDelete: 'cascade' })
    .notNull(),
  reviewerUserId: integer('reviewer_user_id')
    .references(() => users.id)
    .notNull(),
  decision: text('decision').notNull(), // 'approved' | 'rejected' | 'correction_requested'
  feedback: text('feedback').notNull(),
  reviewedAt: timestamp('reviewed_at').defaultNow().notNull(),
});

export const workerPerformance = pgTable('worker_performance', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  totalAllocated: integer('total_allocated').notNull().default(0),
  totalSubmitted: integer('total_submitted').notNull().default(0),
  totalApproved: integer('total_approved').notNull().default(0),
  totalRejected: integer('total_rejected').notNull().default(0),
  approvalRate: numeric('approval_rate', { precision: 5, scale: 2 }).notNull().default('100.00'),
  currentStreak: integer('current_streak').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Worker Earnings, Withdrawals, Payment Transactions
export const earnings = pgTable(
  'earnings',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    jobId: integer('job_id')
      .references(() => jobs.id)
      .notNull(),
    submissionId: integer('submission_id')
      .references(() => jobSubmissions.id)
      .notNull()
      .unique(),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    status: text('status').notNull().default('approved'), // 'pending' | 'approved' | 'available' | 'withdrawn' | 'reversed'
    isSample: boolean('is_sample').notNull().default(false),
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
    approvedAt: timestamp('approved_at'),
  },
  (table) => [index('earnings_user_status_idx').on(table.userId, table.status)]
);

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    ledgerType: text('ledger_type').notNull(), // 'worker_earnings' | 'referral_commissions'
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    amountKes: numeric('amount_kes', { precision: 12, scale: 2 }).notNull(),
    exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 }).notNull(),
    phoneNumber: text('phone_number').notNull(),
    payoutMethod: text('payout_method').notNull().default('mpesa'),
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'processing' | 'paid' | 'rejected'
    transactionReference: text('transaction_reference').unique(),
    adminNote: text('admin_note'),
    reviewedByUserId: integer('reviewed_by_user_id').references(() => users.id),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
  },
  (table) => [index('withdrawals_user_ledger_idx').on(table.userId, table.ledgerType)]
);

export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  txType: text('tx_type').notNull(), // 'subscription' | 'withdrawal' | 'refund' | 'project_payout'
  reference: text('reference').notNull().unique(),
  amountUsd: numeric('amount_usd', { precision: 12, scale: 2 }).notNull(),
  amountKes: numeric('amount_kes', { precision: 12, scale: 2 }).notNull(),
  exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 }).notNull(),
  status: text('status').notNull(),
  metadataJson: jsonb('metadata_json').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Referral Programme (Single-Level, Confirmed-Payment Commissions)
export const referralCodes = pgTable('referral_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  code: text('code').notNull().unique(),
  isSuspended: boolean('is_suspended').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referralRelationships = pgTable(
  'referral_relationships',
  {
    id: serial('id').primaryKey(),
    referrerUserId: integer('referrer_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    referredUserId: integer('referred_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    referralCode: text('referral_code').notNull(),
    attributionWindowDays: integer('attribution_window_days').notNull().default(90),
    attributionExpiresAt: timestamp('attribution_expires_at').notNull(),
    status: text('status').notNull().default('active'), // 'active' | 'flagged' | 'suspended'
    fraudReason: text('fraud_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('ref_rel_referrer_idx').on(table.referrerUserId)]
);

export const referralClicks = pgTable(
  'referral_clicks',
  {
    id: serial('id').primaryKey(),
    referralCode: text('referral_code').notNull(),
    referrerUserId: integer('referrer_user_id').references(() => users.id),
    ipHash: text('ip_hash').notNull(),
    userAgent: text('user_agent'),
    clickedAt: timestamp('clicked_at').defaultNow().notNull(),
  },
  (table) => [index('ref_clicks_referrer_idx').on(table.referrerUserId)]
);

export const referralConversions = pgTable('referral_conversions', {
  id: serial('id').primaryKey(),
  relationshipId: integer('relationship_id')
    .references(() => referralRelationships.id, { onDelete: 'cascade' })
    .notNull(),
  referrerUserId: integer('referrer_user_id')
    .references(() => users.id)
    .notNull(),
  referredUserId: integer('referred_user_id')
    .references(() => users.id)
    .notNull(),
  subscriptionTransactionId: integer('subscription_transaction_id')
    .references(() => subscriptionTransactions.id)
    .notNull()
    .unique(),
  planSlug: text('plan_slug').notNull(),
  amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
  convertedAt: timestamp('converted_at').defaultNow().notNull(),
});

export const referralCommissions = pgTable(
  'referral_commissions',
  {
    id: serial('id').primaryKey(),
    referrerUserId: integer('referrer_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    referredUserId: integer('referred_user_id')
      .references(() => users.id)
      .notNull(),
    relationshipId: integer('relationship_id')
      .references(() => referralRelationships.id)
      .notNull(),
    subscriptionTransactionId: integer('subscription_transaction_id')
      .references(() => subscriptionTransactions.id)
      .notNull()
      .unique(),
    commissionRatePct: numeric('commission_rate_pct', { precision: 5, scale: 2 }).notNull(),
    baseAmountUsd: numeric('base_amount_usd', { precision: 10, scale: 2 }).notNull(),
    commissionAmountUsd: numeric('commission_amount_usd', { precision: 10, scale: 2 }).notNull(),
    retainedAmountUsd: numeric('retained_amount_usd', { precision: 10, scale: 2 }).notNull(),
    status: text('status').notNull().default('available'), // 'pending' | 'approved' | 'available' | 'withdrawn' | 'reversed'
    isRenewal: boolean('is_renewal').notNull().default(false),
    isSample: boolean('is_sample').notNull().default(false),
    approvedAt: timestamp('approved_at'),
    reversedAt: timestamp('reversed_at'),
    reversalReason: text('reversal_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('ref_comm_referrer_status_idx').on(table.referrerUserId, table.status)]
);

export const referralWalletTransactions = pgTable(
  'referral_wallet_transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    commissionId: integer('commission_id').references(() => referralCommissions.id),
    withdrawalId: integer('withdrawal_id').references(() => withdrawals.id),
    entryType: text('entry_type').notNull(), // 'credit' | 'debit' | 'reversal'
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    balanceAfterUsd: numeric('balance_after_usd', { precision: 10, scale: 2 }).notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('ref_wallet_user_idx').on(table.userId)]
);

// 8. External Affiliate Partnerships
export const affiliatePartners = pgTable('affiliate_partners', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  websiteUrl: text('website_url').notNull(),
  disclosureText: text('disclosure_text').notNull(),
  commissionRateDesc: text('commission_rate_desc').notNull(),
  agreementStatus: text('agreement_status').notNull().default('active'), // 'active' | 'paused' | 'pending'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const affiliateLinks = pgTable('affiliate_links', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id')
    .references(() => affiliatePartners.id, { onDelete: 'cascade' })
    .notNull(),
  slug: text('slug').notNull().unique(),
  targetUrl: text('target_url').notNull(),
  campaignName: text('campaign_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const affiliateClicks = pgTable('affiliate_clicks', {
  id: serial('id').primaryKey(),
  linkId: integer('link_id')
    .references(() => affiliateLinks.id, { onDelete: 'cascade' })
    .notNull(),
  partnerId: integer('partner_id')
    .references(() => affiliatePartners.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id').references(() => users.id),
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});

export const affiliateConversions = pgTable('affiliate_conversions', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id')
    .references(() => affiliatePartners.id)
    .notNull(),
  linkId: integer('link_id').references(() => affiliateLinks.id),
  reference: text('reference').notNull().unique(),
  conversionValueUsd: numeric('conversion_value_usd', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('confirmed'),
  convertedAt: timestamp('converted_at').defaultNow().notNull(),
});

export const affiliateCommissions = pgTable('affiliate_commissions', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id')
    .references(() => affiliatePartners.id)
    .notNull(),
  conversionId: integer('conversion_id').references(() => affiliateConversions.id),
  amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('earned'), // 'pending' | 'earned' | 'paid'
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
});

// 9. Managed Project Contracts & Commissions
export const projectContracts = pgTable('project_contracts', {
  id: serial('id').primaryKey(),
  contractCode: text('contract_code').notNull().unique(),
  clientName: text('client_name').notNull(),
  title: text('title').notNull(),
  revenueType: text('revenue_type').notNull().default('managed_project'), // 'managed_project' | 'corporate' | 'sponsored_placement'
  totalValueUsd: numeric('total_value_usd', { precision: 12, scale: 2 }).notNull(),
  workerPayoutUsd: numeric('worker_payout_usd', { precision: 12, scale: 2 }).notNull(),
  commissionPct: numeric('commission_pct', { precision: 5, scale: 2 }).notNull().default('10.00'),
  platformCommissionUsd: numeric('platform_commission_usd', { precision: 12, scale: 2 }).notNull(),
  agreementVerified: boolean('agreement_verified').notNull().default(true),
  status: text('status').notNull().default('active'), // 'active' | 'completed' | 'cancelled'
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projectCommissions = pgTable('project_commissions', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id')
    .references(() => projectContracts.id, { onDelete: 'cascade' })
    .notNull(),
  amountUsd: numeric('amount_usd', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('realized'), // 'pending' | 'realized'
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// 10. Financial Ledger, Expenses, Notifications, Settings, Audit Logs
export const financialLedger = pgTable(
  'financial_ledger',
  {
    id: serial('id').primaryKey(),
    entryNumber: text('entry_number').notNull().unique(),
    ledgerScope: text('ledger_scope').notNull(), // 'platform_revenue' | 'worker_earnings' | 'referral_commissions' | 'membership_payments' | 'business_expenses'
    category: text('category').notNull(),
    direction: text('direction').notNull(), // 'credit' | 'debit'
    amountUsd: numeric('amount_usd', { precision: 12, scale: 2 }).notNull(),
    amountKes: numeric('amount_kes', { precision: 12, scale: 2 }),
    exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4 }),
    referenceId: text('reference_id'),
    description: text('description').notNull(),
    isSample: boolean('is_sample').notNull().default(false),
    recordedByUserId: integer('recorded_by_user_id').references(() => users.id),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => [
    index('fin_ledger_scope_idx').on(table.ledgerScope, table.occurredAt),
  ]
);

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(), // 'referral_commissions' | 'worker_payments' | 'payment_processing' | 'hosting' | 'software' | 'marketing' | 'operational' | 'refunds' | 'other'
  vendor: text('vendor').notNull(),
  description: text('description').notNull(),
  amountUsd: numeric('amount_usd', { precision: 12, scale: 2 }).notNull(),
  incurredAt: timestamp('incurred_at').defaultNow().notNull(),
  recordedByUserId: integer('recorded_by_user_id').references(() => users.id),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    targetRole: text('target_role').notNull().default('member'), // 'member' | 'admin' | 'owner'
    category: text('category').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    linkPath: text('link_path'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('notifications_user_role_idx').on(table.userId, table.targetRole)]
);

export const adminSettings = pgTable('admin_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  valueText: text('value_text').notNull(),
  valueJson: jsonb('value_json').$type<Record<string, unknown>>().default({}).notNull(),
  category: text('category').notNull().default('general'),
  updatedByUserId: integer('updated_by_user_id').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    actorUserId: integer('actor_user_id').references(() => users.id),
    actorEmail: text('actor_email'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    detailsJson: jsonb('details_json').$type<Record<string, unknown>>().default({}).notNull(),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('audit_logs_created_idx').on(table.createdAt)]
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  referralCode: one(referralCodes, { fields: [users.id], references: [referralCodes.userId] }),
  subscriptions: many(subscriptions),
  allocations: many(jobAllocations),
  submissions: many(jobSubmissions),
  earnings: many(earnings),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  category: one(jobCategories, { fields: [jobs.categoryId], references: [jobCategories.id] }),
  provider: one(jobProviders, { fields: [jobs.providerId], references: [jobProviders.id] }),
  allocations: many(jobAllocations),
  submissions: many(jobSubmissions),
}));
