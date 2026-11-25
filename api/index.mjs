var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/app.ts
import "dotenv/config";
import express from "express";

// src/db/seed.ts
import { sql } from "drizzle-orm";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminSettings: () => adminSettings,
  affiliateClicks: () => affiliateClicks,
  affiliateCommissions: () => affiliateCommissions,
  affiliateConversions: () => affiliateConversions,
  affiliateLinks: () => affiliateLinks,
  affiliatePartners: () => affiliatePartners,
  auditLogs: () => auditLogs,
  earnings: () => earnings,
  exchangeRates: () => exchangeRates,
  expenses: () => expenses,
  financialLedger: () => financialLedger,
  jobAllocations: () => jobAllocations,
  jobApplications: () => jobApplications,
  jobCategories: () => jobCategories,
  jobProviders: () => jobProviders,
  jobSubmissions: () => jobSubmissions,
  jobs: () => jobs,
  jobsRelations: () => jobsRelations,
  membershipPlans: () => membershipPlans,
  notifications: () => notifications,
  paymentTransactions: () => paymentTransactions,
  permissions: () => permissions,
  pricingSettings: () => pricingSettings,
  profiles: () => profiles,
  projectCommissions: () => projectCommissions,
  projectContracts: () => projectContracts,
  providerVerifications: () => providerVerifications,
  referralClicks: () => referralClicks,
  referralCodes: () => referralCodes,
  referralCommissions: () => referralCommissions,
  referralConversions: () => referralConversions,
  referralRelationships: () => referralRelationships,
  referralWalletTransactions: () => referralWalletTransactions,
  rolePermissions: () => rolePermissions,
  roles: () => roles,
  submissionReviews: () => submissionReviews,
  subscriptionTransactions: () => subscriptionTransactions,
  subscriptions: () => subscriptions,
  users: () => users,
  usersRelations: () => usersRelations,
  withdrawals: () => withdrawals,
  workerPerformance: () => workerPerformance
});
import { relations } from "drizzle-orm";
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
  uniqueIndex
} from "drizzle-orm/pg-core";
var roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  // 'member' | 'admin' | 'finance_admin' | 'owner'
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull()
});
var rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
    permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull()
  },
  (table) => [uniqueIndex("role_perm_unique_idx").on(table.roleId, table.permissionId)]
);
var users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    uid: text("uid").notNull().unique(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    passwordSalt: text("password_salt"),
    resetTokenHash: text("reset_token_hash"),
    resetTokenExpiresAt: timestamp("reset_token_expires_at"),
    fullName: text("full_name").notNull().default("Workaby AI Member"),
    roleId: integer("role_id").references(() => roles.id),
    roleSlug: text("role_slug").notNull().default("member"),
    status: text("status").notNull().default("active"),
    // 'active' | 'suspended'
    membershipTier: text("membership_tier").notNull().default("free"),
    // 'free' | 'verified' | 'pro' | 'top_rated'
    subscriptionExpiresAt: timestamp("subscription_expires_at"),
    completedApprovedJobs: integer("completed_approved_jobs").notNull().default(0),
    achievement50Jobs: boolean("achievement_50_jobs").notNull().default(false),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("users_role_slug_idx").on(table.roleSlug),
    index("users_membership_tier_idx").on(table.membershipTier)
  ]
);
var profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  phone: text("phone"),
  country: text("country").notNull().default("Kenya"),
  county: text("county").default("Nairobi"),
  timezone: text("timezone").notNull().default("Africa/Nairobi"),
  bio: text("bio"),
  skillsJson: jsonb("skills_json").$type().default([]).notNull(),
  avatarUrl: text("avatar_url"),
  preferredPayoutPhone: text("preferred_payout_phone"),
  dataPrivacyConsent: boolean("data_privacy_consent").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  // 'free' | 'verified' | 'pro' | 'top_rated'
  name: text("name").notNull(),
  audienceLabel: text("audience_label").notNull(),
  description: text("description").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  billingIntervalDays: integer("billing_interval_days").notNull().default(90),
  weeklyJobLimit: integer("weekly_job_limit").notNull().default(2),
  // -1 means unlimited
  allowVerifiedProviders: boolean("allow_verified_providers").notNull().default(false),
  allowProExclusive: boolean("allow_pro_exclusive").notNull().default(false),
  allowTopRatedExclusive: boolean("allow_top_rated_exclusive").notNull().default(false),
  featuresJson: jsonb("features_json").$type().default([]).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    planId: integer("plan_id").references(() => membershipPlans.id).notNull(),
    planSlug: text("plan_slug").notNull(),
    status: text("status").notNull().default("pending"),
    // 'pending' | 'active' | 'expired' | 'cancelled'
    billingIntervalDays: integer("billing_interval_days").notNull().default(90),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    autoRenewAuthorized: boolean("auto_renew_authorized").notNull().default(false),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [index("subscriptions_user_status_idx").on(table.userId, table.status)]
);
var exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    baseCurrency: text("base_currency").notNull().default("USD"),
    quoteCurrency: text("quote_currency").notNull().default("KES"),
    rate: numeric("rate", { precision: 12, scale: 4 }).notNull(),
    source: text("source").notNull().default("manual"),
    // 'auto' | 'manual' | 'api'
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    recordedByUserId: integer("recorded_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [index("exchange_rates_active_idx").on(table.isActive, table.createdAt)]
);
var subscriptionTransactions = pgTable(
  "subscription_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    subscriptionId: integer("subscription_id").references(() => subscriptions.id),
    planSlug: text("plan_slug").notNull(),
    paymentMethod: text("payment_method").notNull().default("mpesa_stk"),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    amountKes: numeric("amount_kes", { precision: 12, scale: 2 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 12, scale: 4 }).notNull(),
    exchangeRateId: integer("exchange_rate_id").references(() => exchangeRates.id),
    phoneNumber: text("phone_number").notNull(),
    checkoutRequestId: text("checkout_request_id").notNull().unique(),
    merchantRequestId: text("merchant_request_id"),
    mpesaReceiptNumber: text("mpesa_receipt_number").unique(),
    status: text("status").notNull().default("pending"),
    // 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded'
    isRenewal: boolean("is_renewal").notNull().default(false),
    isSample: boolean("is_sample").notNull().default(false),
    callbackPayloadJson: jsonb("callback_payload_json").$type(),
    initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at"),
    refundedAt: timestamp("refunded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    index("sub_tx_user_status_idx").on(table.userId, table.status),
    index("sub_tx_confirmed_at_idx").on(table.confirmedAt)
  ]
);
var pricingSettings = pgTable("pricing_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  valueText: text("value_text").notNull(),
  valueNumeric: numeric("value_numeric", { precision: 12, scale: 4 }),
  description: text("description").notNull(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var jobCategories = pgTable("job_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconName: text("icon_name").notNull().default("Briefcase"),
  isPremium: boolean("is_premium").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0)
});
var jobProviders = pgTable("job_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  websiteUrl: text("website_url"),
  sourceUrl: text("source_url"),
  classification: text("classification").notNull().default("unverified"),
  // 'unverified' | 'verified'
  verificationStatus: text("verification_status").notNull().default("pending"),
  // 'pending' | 'verified' | 'suspended'
  reliabilityScore: integer("reliability_score").notNull().default(80),
  partnershipNotes: text("partnership_notes"),
  contactEmail: text("contact_email"),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var providerVerifications = pgTable("provider_verifications", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => jobProviders.id, { onDelete: "cascade" }).notNull(),
  verifiedByUserId: integer("verified_by_user_id").references(() => users.id).notNull(),
  status: text("status").notNull(),
  // 'verified' | 'suspended' | 'rejected'
  evidenceSummary: text("evidence_summary").notNull(),
  evidenceUrl: text("evidence_url"),
  sourceCheckNotes: text("source_check_notes"),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    jobCode: text("job_code").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    categoryId: integer("category_id").references(() => jobCategories.id).notNull(),
    providerId: integer("provider_id").references(() => jobProviders.id).notNull(),
    sourceUrl: text("source_url"),
    instructions: text("instructions").notNull(),
    requiredSkillsJson: jsonb("required_skills_json").$type().default([]).notNull(),
    difficulty: text("difficulty").notNull().default("beginner"),
    // 'beginner' | 'intermediate' | 'advanced'
    estimatedDuration: text("estimated_duration").notNull().default("30 mins"),
    rewardUsd: numeric("reward_usd", { precision: 10, scale: 2 }).notNull(),
    availablePositions: integer("available_positions").notNull().default(25),
    filledPositions: integer("filled_positions").notNull().default(0),
    publishedAt: timestamp("published_at"),
    deadlineAt: timestamp("deadline_at").notNull(),
    eligibleTiersJson: jsonb("eligible_tiers_json").$type().default(["free", "verified", "pro", "top_rated"]).notNull(),
    minTier: text("min_tier").notNull().default("free"),
    // 'free' | 'verified' | 'pro' | 'top_rated'
    submissionRequirements: text("submission_requirements").notNull(),
    paymentConditions: text("payment_conditions").notNull().default("Paid in USD upon QA approval."),
    status: text("status").notNull().default("published"),
    // 'draft' | 'pending_verification' | 'approved' | 'published' | 'fully_allocated' | 'paused' | 'closed' | 'expired'
    isFeatured: boolean("is_featured").notNull().default(false),
    isSponsored: boolean("is_sponsored").notNull().default(false),
    isSample: boolean("is_sample").notNull().default(false),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("jobs_status_cat_idx").on(table.status, table.categoryId),
    index("jobs_min_tier_idx").on(table.minTier)
  ]
);
var jobAllocations = pgTable(
  "job_allocations",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    weekKey: text("week_key").notNull(),
    // Africa/Nairobi ISO week e.g. '2026-W48'
    membershipTierAtAllocation: text("membership_tier_at_allocation").notNull(),
    status: text("status").notNull().default("allocated"),
    // 'allocated' | 'completed' | 'released'
    allocatedAt: timestamp("allocated_at").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("job_alloc_user_job_unique_idx").on(table.jobId, table.userId),
    index("job_alloc_user_week_idx").on(table.userId, table.weekKey)
  ]
);
var jobApplications = pgTable(
  "job_applications",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    allocationId: integer("allocation_id").references(() => jobAllocations.id),
    status: text("status").notNull().default("accepted"),
    // 'applied' | 'accepted' | 'in_progress' | 'rejected' | 'withdrawn'
    coverNote: text("cover_note"),
    appliedAt: timestamp("applied_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [uniqueIndex("job_app_user_job_unique_idx").on(table.jobId, table.userId)]
);
var jobSubmissions = pgTable(
  "job_submissions",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    applicationId: integer("application_id").references(() => jobApplications.id),
    submissionType: text("submission_type").notNull().default("text"),
    // 'text' | 'document' | 'image' | 'file' | 'external_ref'
    textContent: text("text_content").notNull(),
    externalReference: text("external_reference"),
    attachmentName: text("attachment_name"),
    attachmentUrl: text("attachment_url"),
    notes: text("notes"),
    status: text("status").notNull().default("submitted"),
    // 'submitted' | 'under_review' | 'approved' | 'rejected' | 'correction_requested' | 'paid'
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("job_sub_user_status_idx").on(table.userId, table.status),
    index("job_sub_job_idx").on(table.jobId)
  ]
);
var submissionReviews = pgTable("submission_reviews", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => jobSubmissions.id, { onDelete: "cascade" }).notNull(),
  reviewerUserId: integer("reviewer_user_id").references(() => users.id).notNull(),
  decision: text("decision").notNull(),
  // 'approved' | 'rejected' | 'correction_requested'
  feedback: text("feedback").notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull()
});
var workerPerformance = pgTable("worker_performance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  totalAllocated: integer("total_allocated").notNull().default(0),
  totalSubmitted: integer("total_submitted").notNull().default(0),
  totalApproved: integer("total_approved").notNull().default(0),
  totalRejected: integer("total_rejected").notNull().default(0),
  approvalRate: numeric("approval_rate", { precision: 5, scale: 2 }).notNull().default("100.00"),
  currentStreak: integer("current_streak").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var earnings = pgTable(
  "earnings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    jobId: integer("job_id").references(() => jobs.id).notNull(),
    submissionId: integer("submission_id").references(() => jobSubmissions.id).notNull().unique(),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("approved"),
    // 'pending' | 'approved' | 'available' | 'withdrawn' | 'reversed'
    isSample: boolean("is_sample").notNull().default(false),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
    approvedAt: timestamp("approved_at")
  },
  (table) => [index("earnings_user_status_idx").on(table.userId, table.status)]
);
var withdrawals = pgTable(
  "withdrawals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    ledgerType: text("ledger_type").notNull(),
    // 'worker_earnings' | 'referral_commissions'
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    amountKes: numeric("amount_kes", { precision: 12, scale: 2 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 12, scale: 4 }).notNull(),
    phoneNumber: text("phone_number").notNull(),
    payoutMethod: text("payout_method").notNull().default("mpesa"),
    status: text("status").notNull().default("pending"),
    // 'pending' | 'approved' | 'processing' | 'paid' | 'rejected'
    transactionReference: text("transaction_reference").unique(),
    adminNote: text("admin_note"),
    reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at")
  },
  (table) => [index("withdrawals_user_ledger_idx").on(table.userId, table.ledgerType)]
);
var paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  txType: text("tx_type").notNull(),
  // 'subscription' | 'withdrawal' | 'refund' | 'project_payout'
  reference: text("reference").notNull().unique(),
  amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull(),
  amountKes: numeric("amount_kes", { precision: 12, scale: 2 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 4 }).notNull(),
  status: text("status").notNull(),
  metadataJson: jsonb("metadata_json").$type().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  code: text("code").notNull().unique(),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var referralRelationships = pgTable(
  "referral_relationships",
  {
    id: serial("id").primaryKey(),
    referrerUserId: integer("referrer_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    referredUserId: integer("referred_user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
    referralCode: text("referral_code").notNull(),
    attributionWindowDays: integer("attribution_window_days").notNull().default(90),
    attributionExpiresAt: timestamp("attribution_expires_at").notNull(),
    status: text("status").notNull().default("active"),
    // 'active' | 'flagged' | 'suspended'
    fraudReason: text("fraud_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [index("ref_rel_referrer_idx").on(table.referrerUserId)]
);
var referralClicks = pgTable(
  "referral_clicks",
  {
    id: serial("id").primaryKey(),
    referralCode: text("referral_code").notNull(),
    referrerUserId: integer("referrer_user_id").references(() => users.id),
    ipHash: text("ip_hash").notNull(),
    userAgent: text("user_agent"),
    clickedAt: timestamp("clicked_at").defaultNow().notNull()
  },
  (table) => [index("ref_clicks_referrer_idx").on(table.referrerUserId)]
);
var referralConversions = pgTable("referral_conversions", {
  id: serial("id").primaryKey(),
  relationshipId: integer("relationship_id").references(() => referralRelationships.id, { onDelete: "cascade" }).notNull(),
  referrerUserId: integer("referrer_user_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id).notNull(),
  subscriptionTransactionId: integer("subscription_transaction_id").references(() => subscriptionTransactions.id).notNull().unique(),
  planSlug: text("plan_slug").notNull(),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  convertedAt: timestamp("converted_at").defaultNow().notNull()
});
var referralCommissions = pgTable(
  "referral_commissions",
  {
    id: serial("id").primaryKey(),
    referrerUserId: integer("referrer_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    referredUserId: integer("referred_user_id").references(() => users.id).notNull(),
    relationshipId: integer("relationship_id").references(() => referralRelationships.id).notNull(),
    subscriptionTransactionId: integer("subscription_transaction_id").references(() => subscriptionTransactions.id).notNull().unique(),
    commissionRatePct: numeric("commission_rate_pct", { precision: 5, scale: 2 }).notNull(),
    baseAmountUsd: numeric("base_amount_usd", { precision: 10, scale: 2 }).notNull(),
    commissionAmountUsd: numeric("commission_amount_usd", { precision: 10, scale: 2 }).notNull(),
    retainedAmountUsd: numeric("retained_amount_usd", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("available"),
    // 'pending' | 'approved' | 'available' | 'withdrawn' | 'reversed'
    isRenewal: boolean("is_renewal").notNull().default(false),
    isSample: boolean("is_sample").notNull().default(false),
    approvedAt: timestamp("approved_at"),
    reversedAt: timestamp("reversed_at"),
    reversalReason: text("reversal_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [index("ref_comm_referrer_status_idx").on(table.referrerUserId, table.status)]
);
var referralWalletTransactions = pgTable(
  "referral_wallet_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    commissionId: integer("commission_id").references(() => referralCommissions.id),
    withdrawalId: integer("withdrawal_id").references(() => withdrawals.id),
    entryType: text("entry_type").notNull(),
    // 'credit' | 'debit' | 'reversal'
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    balanceAfterUsd: numeric("balance_after_usd", { precision: 10, scale: 2 }).notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [index("ref_wallet_user_idx").on(table.userId)]
);
var affiliatePartners = pgTable("affiliate_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  websiteUrl: text("website_url").notNull(),
  disclosureText: text("disclosure_text").notNull(),
  commissionRateDesc: text("commission_rate_desc").notNull(),
  agreementStatus: text("agreement_status").notNull().default("active"),
  // 'active' | 'paused' | 'pending'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var affiliateLinks = pgTable("affiliate_links", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => affiliatePartners.id, { onDelete: "cascade" }).notNull(),
  slug: text("slug").notNull().unique(),
  targetUrl: text("target_url").notNull(),
  campaignName: text("campaign_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").references(() => affiliateLinks.id, { onDelete: "cascade" }).notNull(),
  partnerId: integer("partner_id").references(() => affiliatePartners.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id),
  clickedAt: timestamp("clicked_at").defaultNow().notNull()
});
var affiliateConversions = pgTable("affiliate_conversions", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => affiliatePartners.id).notNull(),
  linkId: integer("link_id").references(() => affiliateLinks.id),
  reference: text("reference").notNull().unique(),
  conversionValueUsd: numeric("conversion_value_usd", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("confirmed"),
  convertedAt: timestamp("converted_at").defaultNow().notNull()
});
var affiliateCommissions = pgTable("affiliate_commissions", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => affiliatePartners.id).notNull(),
  conversionId: integer("conversion_id").references(() => affiliateConversions.id),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("earned"),
  // 'pending' | 'earned' | 'paid'
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at")
});
var projectContracts = pgTable("project_contracts", {
  id: serial("id").primaryKey(),
  contractCode: text("contract_code").notNull().unique(),
  clientName: text("client_name").notNull(),
  title: text("title").notNull(),
  revenueType: text("revenue_type").notNull().default("managed_project"),
  // 'managed_project' | 'corporate' | 'sponsored_placement'
  totalValueUsd: numeric("total_value_usd", { precision: 12, scale: 2 }).notNull(),
  workerPayoutUsd: numeric("worker_payout_usd", { precision: 12, scale: 2 }).notNull(),
  commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("10.00"),
  platformCommissionUsd: numeric("platform_commission_usd", { precision: 12, scale: 2 }).notNull(),
  agreementVerified: boolean("agreement_verified").notNull().default(true),
  status: text("status").notNull().default("active"),
  // 'active' | 'completed' | 'cancelled'
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var projectCommissions = pgTable("project_commissions", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => projectContracts.id, { onDelete: "cascade" }).notNull(),
  amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("realized"),
  // 'pending' | 'realized'
  recordedAt: timestamp("recorded_at").defaultNow().notNull()
});
var financialLedger = pgTable(
  "financial_ledger",
  {
    id: serial("id").primaryKey(),
    entryNumber: text("entry_number").notNull().unique(),
    ledgerScope: text("ledger_scope").notNull(),
    // 'platform_revenue' | 'worker_earnings' | 'referral_commissions' | 'membership_payments' | 'business_expenses'
    category: text("category").notNull(),
    direction: text("direction").notNull(),
    // 'credit' | 'debit'
    amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull(),
    amountKes: numeric("amount_kes", { precision: 12, scale: 2 }),
    exchangeRate: numeric("exchange_rate", { precision: 12, scale: 4 }),
    referenceId: text("reference_id"),
    description: text("description").notNull(),
    isSample: boolean("is_sample").notNull().default(false),
    recordedByUserId: integer("recorded_by_user_id").references(() => users.id),
    occurredAt: timestamp("occurred_at").defaultNow().notNull()
  },
  (table) => [
    index("fin_ledger_scope_idx").on(table.ledgerScope, table.occurredAt)
  ]
);
var expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  // 'referral_commissions' | 'worker_payments' | 'payment_processing' | 'hosting' | 'software' | 'marketing' | 'operational' | 'refunds' | 'other'
  vendor: text("vendor").notNull(),
  description: text("description").notNull(),
  amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull(),
  incurredAt: timestamp("incurred_at").defaultNow().notNull(),
  recordedByUserId: integer("recorded_by_user_id").references(() => users.id),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    targetRole: text("target_role").notNull().default("member"),
    // 'member' | 'admin' | 'owner'
    category: text("category").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    linkPath: text("link_path"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [index("notifications_user_role_idx").on(table.userId, table.targetRole)]
);
var adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  valueText: text("value_text").notNull(),
  valueJson: jsonb("value_json").$type().default({}).notNull(),
  category: text("category").notNull().default("general"),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").references(() => users.id),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    detailsJson: jsonb("details_json").$type().default({}).notNull(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [index("audit_logs_created_idx").on(table.createdAt)]
);
var usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  referralCode: one(referralCodes, { fields: [users.id], references: [referralCodes.userId] }),
  subscriptions: many(subscriptions),
  allocations: many(jobAllocations),
  submissions: many(jobSubmissions),
  earnings: many(earnings)
}));
var jobsRelations = relations(jobs, ({ one, many }) => ({
  category: one(jobCategories, { fields: [jobs.categoryId], references: [jobCategories.id] }),
  provider: one(jobProviders, { fields: [jobs.providerId], references: [jobProviders.id] }),
  allocations: many(jobAllocations),
  submissions: many(jobSubmissions)
}));

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    if (process.env.SQL_HOST) {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15e3
      });
    } else if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      global._postgresPool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 1e4,
        connectionTimeoutMillis: 8e3
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 5,
        connectionTimeoutMillis: 3e3
      });
    }
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/seed.ts
var seedPromise = null;
async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = runIdempotentSeed().catch((err) => {
      seedPromise = null;
      console.error("Seed check error:", err);
      throw err;
    });
  }
  return seedPromise;
}
async function runIdempotentSeed() {
  const roleSeeds = [
    {
      slug: "member",
      name: "Member",
      description: "Standard marketplace worker with tier-based job allocation and referral access."
    },
    {
      slug: "admin",
      name: "Administrator",
      description: "Operations administrator managing jobs, providers, submissions, and member support. Restricted from Owner financial ledger controls."
    },
    {
      slug: "finance_admin",
      name: "Financial Administrator",
      description: "Authorized financial controller with access to payouts, ledger reconciliation, and owner revenue dashboards."
    },
    {
      slug: "owner",
      name: "Platform Owner",
      description: "Full marketplace owner access including revenue analytics, profitability, expenses, pricing, and RBAC governance."
    }
  ];
  for (const r of roleSeeds) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }
  const permSeeds = [
    { code: "jobs.manage", name: "Manage Jobs", category: "marketplace", description: "Create, edit, publish, pause, and close jobs" },
    { code: "providers.verify", name: "Verify Providers", category: "marketplace", description: "Register, verify, and suspend job providers" },
    { code: "submissions.review", name: "Review Submissions", category: "operations", description: "Approve, reject, and request corrections on worker tasks" },
    { code: "withdrawals.process", name: "Process Withdrawals", category: "finance", description: "Approve and reconcile worker and referral M-Pesa payouts" },
    { code: "referrals.manage", name: "Manage Referrals", category: "growth", description: "Review referral conversions and reverse fraudulent commissions" },
    { code: "owner.revenue.view", name: "Owner Revenue Dashboard", category: "owner", description: "Access owner gross/retained revenue, expenses, and net profit reports" },
    { code: "owner.pricing.edit", name: "Edit Pricing & Rates", category: "owner", description: "Modify subscription USD pricing, commission rates, and exchange rate overrides" }
  ];
  for (const p of permSeeds) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }
  const allRoles = await db.select().from(roles);
  const allPerms = await db.select().from(permissions);
  const roleMap = new Map(allRoles.map((r) => [r.slug, r.id]));
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));
  const assignPerm = async (roleSlug, permCode) => {
    const rId = roleMap.get(roleSlug);
    const pId = permMap.get(permCode);
    if (rId && pId) {
      await db.insert(rolePermissions).values({ roleId: rId, permissionId: pId }).onConflictDoNothing();
    }
  };
  for (const code of ["jobs.manage", "providers.verify", "submissions.review", "withdrawals.process", "referrals.manage"]) {
    await assignPerm("admin", code);
    await assignPerm("finance_admin", code);
    await assignPerm("owner", code);
  }
  for (const code of ["owner.revenue.view", "owner.pricing.edit"]) {
    await assignPerm("finance_admin", code);
    await assignPerm("owner", code);
  }
  const planSeeds = [
    {
      slug: "free",
      name: "Free Member",
      audienceLabel: "For new workers getting started",
      description: "Start with 2 micro-tasks per week ($0.01\u2013$0.02 per task) from unverified providers. Upgrade to Verified for $2.00+ jobs.",
      priceUsd: "0.00",
      billingIntervalDays: 90,
      weeklyJobLimit: 2,
      allowVerifiedProviders: false,
      allowProExclusive: false,
      allowTopRatedExclusive: false,
      featuresJson: [
        "2 micro-task opportunities per week ($0.01\u2013$0.02)",
        "Access to unverified-provider starter tasks",
        "Basic member dashboard & work history",
        "Submission & USD earnings tracking",
        "10% referral programme access"
      ],
      sortOrder: 1
    },
    {
      slug: "verified",
      name: "Verified Member",
      audienceLabel: "For consistent weekly earners",
      description: "Unlock verified-provider jobs paying from $2.00+ per task and at least 10 eligible tasks every week. Converted from KSh 299/mo reference.",
      priceUsd: "6.90",
      billingIntervalDays: 90,
      weeklyJobLimit: 10,
      allowVerifiedProviders: true,
      allowProExclusive: false,
      allowTopRatedExclusive: false,
      featuresJson: [
        "At least 10 verified jobs per week ($2.00+ per task)",
        "Access to Verified & Unverified providers",
        "Premium AI & research categories",
        "Priority job notifications & recommendations",
        "Enhanced earnings dashboard & analytics"
      ],
      sortOrder: 2
    },
    {
      slug: "pro",
      name: "Pro Worker",
      audienceLabel: "For dedicated digital specialists",
      description: "Priority access to Pro-exclusive AI evaluation, annotation, and high-reward projects at $5 per quarter.",
      priceUsd: "5.00",
      billingIntervalDays: 90,
      weeklyJobLimit: 10,
      allowVerifiedProviders: true,
      allowProExclusive: true,
      allowTopRatedExclusive: false,
      featuresJson: [
        "All Verified Member benefits included",
        "At least 10 eligible jobs per week",
        "Access to Pro-exclusive jobs",
        "Priority consideration on selected projects",
        "Advanced work analytics & priority support"
      ],
      sortOrder: 3
    },
    {
      slug: "top_rated",
      name: "Top-Rated Worker",
      audienceLabel: "For full-access power earners",
      description: "Unlimited eligible opportunities, highest-paying verified client tasks, and Top-Rated badge at $8 per quarter.",
      priceUsd: "8.00",
      billingIntervalDays: 90,
      weeklyJobLimit: -1,
      allowVerifiedProviders: true,
      allowProExclusive: true,
      allowTopRatedExclusive: true,
      featuresJson: [
        "All Pro Worker benefits included",
        "Unlimited eligible opportunities weekly",
        "Top-Rated membership badge & priority queue",
        "Exclusive enterprise & managed projects",
        "Highest tier access & priority support"
      ],
      sortOrder: 4
    }
  ];
  for (const plan of planSeeds) {
    await db.insert(membershipPlans).values(plan).onConflictDoNothing();
  }
  const settingSeeds = [
    { key: "referral_commission_pct", valueText: "10.00", valueNumeric: "10.0000", description: "Default referral commission percentage on eligible subscription payments." },
    { key: "referral_attribution_days", valueText: "90", valueNumeric: "90.0000", description: "Referral attribution window in days from registration." },
    { key: "project_commission_pct", valueText: "10.00", valueNumeric: "10.0000", description: "Managed client-funded project commission percentage." },
    { key: "min_worker_withdrawal_usd", valueText: "5.00", valueNumeric: "5.0000", description: "Minimum USD balance required for worker job earnings withdrawal." },
    { key: "min_referral_withdrawal_usd", valueText: "2.00", valueNumeric: "2.0000", description: "Minimum USD balance required for referral commission withdrawal." },
    { key: "default_billing_interval_days", valueText: "90", valueNumeric: "90.0000", description: "Default paid subscription billing interval in days (Quarterly = 90)." }
  ];
  for (const s of settingSeeds) {
    await db.insert(pricingSettings).values(s).onConflictDoNothing();
  }
  const rateCount = await db.select({ count: sql`count(*)::int` }).from(exchangeRates);
  if ((rateCount[0]?.count ?? 0) === 0) {
    await db.insert(exchangeRates).values({
      baseCurrency: "USD",
      quoteCurrency: "KES",
      rate: "129.5000",
      source: "manual",
      notes: "Initial Kenya launch reference rate ($1 USD = KES 129.50)",
      isActive: true
    });
  }
  const categorySeeds = [
    { slug: "online-surveys", name: "Online Surveys", description: "Consumer research questionnaires, product feedback studies, and East Africa market pulse surveys.", iconName: "ClipboardList", isPremium: false, sortOrder: 1 },
    { slug: "ai-training", name: "AI Training", description: "Structured prompt engineering, instruction following, and RLHF model alignment workflows.", iconName: "Cpu", isPremium: true, sortOrder: 2 },
    { slug: "ai-data-annotation", name: "AI Data Annotation", description: "Precision bounding boxes, entity tagging, and multimodal dataset annotation.", iconName: "Tags", isPremium: true, sortOrder: 3 },
    { slug: "ai-response-evaluation", name: "AI Response Evaluation", description: "Side-by-side LLM response grading for factuality, reasoning clarity, and safety.", iconName: "CheckSquare", isPremium: true, sortOrder: 4 },
    { slug: "ai-model-testing", name: "AI Model Testing", description: "Adversarial edge-case testing, hallucination audits, and multilingual benchmark QA.", iconName: "ShieldCheck", isPremium: true, sortOrder: 5 },
    { slug: "data-collection", name: "Data Collection", description: "Verified public registry gathering, Swahili/English voice prompts, and structured field datasets.", iconName: "Database", isPremium: false, sortOrder: 6 },
    { slug: "data-labelling", name: "Data Labelling", description: "Classification, sentiment tagging, and taxonomy mapping for machine learning pipelines.", iconName: "Layers", isPremium: false, sortOrder: 7 },
    { slug: "transcription", name: "Transcription", description: "Clean verbatim and timestamped audio-to-text transcription in English, Swahili, and Sheng.", iconName: "Mic", isPremium: false, sortOrder: 8 },
    { slug: "content-writing", name: "Content Writing", description: "Technical documentation, localized SaaS guides, and editorial copywriting assignments.", iconName: "PenTool", isPremium: false, sortOrder: 9 },
    { slug: "research-assistance", name: "Research Assistance", description: "Literature synthesis, market sizing briefs, and cited secondary research support.", iconName: "Search", isPremium: true, sortOrder: 10 },
    { slug: "academic-tutoring", name: "Academic Tutoring", description: "Legitimate tutoring, structured editing, study guide review, and learning assistance.", iconName: "GraduationCap", isPremium: true, sortOrder: 11 },
    { slug: "virtual-assistance", name: "Virtual Assistance", description: "Inbox triage, calendar operations, CRM hygiene, and remote executive support.", iconName: "Headphones", isPremium: false, sortOrder: 12 },
    { slug: "data-entry", name: "Data Entry", description: "High-accuracy spreadsheet normalization, invoice digitization, and catalog updates.", iconName: "Table", isPremium: false, sortOrder: 13 },
    { slug: "image-annotation", name: "Image Annotation", description: "Polygon segmentation, OCR verification, and retail shelf recognition tagging.", iconName: "Image", isPremium: true, sortOrder: 14 },
    { slug: "video-annotation", name: "Video Annotation", description: "Temporal action tracking, frame-level object labeling, and scene event tagging.", iconName: "Video", isPremium: true, sortOrder: 15 },
    { slug: "translation", name: "Translation", description: "Human-reviewed Swahili, Kikuyu, Luo, and French-English localization tasks.", iconName: "Languages", isPremium: true, sortOrder: 16 },
    { slug: "other-online-freelance-tasks", name: "Other Online Freelance Tasks", description: "Curated micro-projects, QA usability tests, and specialized digital operations.", iconName: "Briefcase", isPremium: false, sortOrder: 17 }
  ];
  for (const c of categorySeeds) {
    await db.insert(jobCategories).values(c).onConflictDoNothing();
  }
  const providerCount = await db.select({ count: sql`count(*)::int` }).from(jobProviders);
  if ((providerCount[0]?.count ?? 0) === 0) {
    const insertedProviders = await db.insert(jobProviders).values([
      {
        name: "Savannah AI Labs (Sample Verified)",
        websiteUrl: "https://example.com/savannah-ai",
        sourceUrl: "https://example.com/savannah-ai/partner-program",
        classification: "verified",
        verificationStatus: "verified",
        reliabilityScore: 98,
        partnershipNotes: "Sample verified partner for AI response evaluation and Swahili NLP datasets.",
        contactEmail: "ops@savannah-sample.example",
        isSample: true
      },
      {
        name: "Nairobi Digital Research Panel (Sample Unverified)",
        websiteUrl: "https://example.com/nairobi-panel",
        sourceUrl: "https://example.com/nairobi-panel/surveys",
        classification: "unverified",
        verificationStatus: "pending",
        reliabilityScore: 82,
        partnershipNotes: "Sample unverified open-web survey aggregator accessible to Free Members.",
        contactEmail: "panel@nairobi-sample.example",
        isSample: true
      },
      {
        name: "Equinox Vision Datasets (Sample Verified)",
        websiteUrl: "https://example.com/equinox-vision",
        sourceUrl: "https://example.com/equinox-vision/tasks",
        classification: "verified",
        verificationStatus: "verified",
        reliabilityScore: 95,
        partnershipNotes: "Sample verified enterprise computer vision & video annotation partner.",
        contactEmail: "datasets@equinox-sample.example",
        isSample: true
      },
      {
        name: "KaziMicro Open Tasks (Sample Unverified)",
        websiteUrl: "https://example.com/kazimicro",
        sourceUrl: "https://example.com/kazimicro/feed",
        classification: "unverified",
        verificationStatus: "pending",
        reliabilityScore: 79,
        partnershipNotes: "Sample unverified micro-task feed for Free tier onboarding.",
        contactEmail: "tasks@kazimicro-sample.example",
        isSample: true
      }
    ]).returning();
    const catRows = await db.select().from(jobCategories);
    const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
    const verifiedSavannah = insertedProviders[0].id;
    const unverifiedPanel = insertedProviders[1].id;
    const verifiedEquinox = insertedProviders[2].id;
    const unverifiedKazi = insertedProviders[3].id;
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    const now = /* @__PURE__ */ new Date();
    const sampleJobs = [
      // Only 2 Free-tier micro-tasks paying very small amounts ($0.01 - $0.02)
      {
        jobCode: "WRK-SAMPLE-101",
        title: "Quick 3-Question Mobile Checkout Poll",
        description: "Answer 3 rapid multiple-choice questions on mobile wallet checkout speed in Kenya.",
        categoryId: catBySlug.get("online-surveys"),
        providerId: unverifiedPanel,
        sourceUrl: "https://example.com/nairobi-panel/quick-poll",
        instructions: "Select your answers for all 3 prompts and paste your poll completion code.",
        requiredSkillsJson: ["Basic English", "Attention to Detail"],
        difficulty: "beginner",
        estimatedDuration: "3 mins",
        rewardUsd: "0.01",
        availablePositions: 50,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["free", "verified", "pro", "top_rated"],
        minTier: "free",
        submissionRequirements: "Submit poll completion code.",
        paymentConditions: "Free micro-task \xB7 Paid in USD upon QA check.",
        status: "published",
        isFeatured: true,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-102",
        title: "Single Receipt Total Verification Tag",
        description: "Verify total amount and merchant category on 2 anonymized retail receipt snippets.",
        categoryId: catBySlug.get("data-entry"),
        providerId: unverifiedKazi,
        sourceUrl: "https://example.com/kazimicro/receipt-tag",
        instructions: "Confirm receipt total matches printed subtotal and select retail category.",
        requiredSkillsJson: ["Basic Typing", "Accuracy"],
        difficulty: "beginner",
        estimatedDuration: "5 mins",
        rewardUsd: "0.02",
        availablePositions: 40,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["free", "verified", "pro", "top_rated"],
        minTier: "free",
        submissionRequirements: "Paste verified receipt total and category.",
        paymentConditions: "Free micro-task \xB7 100% accuracy required.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      // 14 Verification-required tasks starting from $2.00+
      {
        jobCode: "WRK-SAMPLE-203",
        title: "East Africa Mobile Money UX Benchmark Survey",
        description: "Complete an in-depth 25-question verified research evaluation covering mobile banking workflows.",
        categoryId: catBySlug.get("online-surveys"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/fintech-benchmark",
        instructions: "Provide detailed written justifications on checkout friction, USSD fallback, and confirmation clarity.",
        requiredSkillsJson: ["Kenyan Fintech Familiarity", "Written English", "Product Feedback"],
        difficulty: "beginner",
        estimatedDuration: "20 mins",
        rewardUsd: "2.00",
        availablePositions: 60,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit survey completion ID and 3-sentence usability summary.",
        paymentConditions: "Verified Member+ \xB7 Paid in USD upon QA review.",
        status: "published",
        isFeatured: true,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-204",
        title: "Swahili Customer Support Intent Classification (50 Utterances)",
        description: "Label 50 anonymized Kenyan telecom and fintech support chats into structured intent and sentiment classes.",
        categoryId: catBySlug.get("data-labelling"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/swahili-intent",
        instructions: "Assign one primary intent tag and sentiment score (Positive, Neutral, Negative) per utterance.",
        requiredSkillsJson: ["Fluent Swahili", "Data Labelling", "Consistency"],
        difficulty: "beginner",
        estimatedDuration: "25 mins",
        rewardUsd: "2.50",
        availablePositions: 55,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit labeled batch reference ID and summary count.",
        paymentConditions: "Verified Partner \xB7 Paid in USD upon QA check.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-211",
        title: "Spoken Swahili & Sheng Voice Prompt Recording Batch",
        description: "Record 25 short natural voice commands for East African speech-recognition model training.",
        categoryId: catBySlug.get("data-collection"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/voice-prompts",
        instructions: "Record in a quiet indoor setting following the exact prompt sheet without background noise.",
        requiredSkillsJson: ["Clear Speech", "Swahili / Sheng Fluency", "Audio Hygiene"],
        difficulty: "beginner",
        estimatedDuration: "30 mins",
        rewardUsd: "3.00",
        availablePositions: 50,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit audio batch upload ID and recording device note.",
        paymentConditions: "Verified Partner \xB7 Clean audio SNR check required.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-205",
        title: "Wholesale Invoice Digitization & Ledger Reconciliation (40 Rows)",
        description: "Transcribe and validate 40 multi-line supplier invoices into standardized SKU, tax, and USD/KES fields.",
        categoryId: catBySlug.get("data-entry"),
        providerId: verifiedEquinox,
        sourceUrl: "https://example.com/equinox-vision/invoice-batch",
        instructions: "Verify VAT subtotals and format dates in ISO YYYY-MM-DD before submitting.",
        requiredSkillsJson: ["Spreadsheets", "Accounting Accuracy", "Data Entry"],
        difficulty: "beginner",
        estimatedDuration: "35 mins",
        rewardUsd: "3.25",
        availablePositions: 45,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Upload formatted CSV summary or paste verified reconciliation table.",
        paymentConditions: "Verified Partner \xB7 98% field accuracy required.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-206",
        title: "Supermarket Shelf SKU Bounding-Box Annotation",
        description: "Draw tight bounding boxes and brand labels across 35 Kenyan retail shelf photographs.",
        categoryId: catBySlug.get("ai-data-annotation"),
        providerId: verifiedEquinox,
        sourceUrl: "https://example.com/equinox-vision/shelf-sku",
        instructions: "Box every visible beverage and consumer goods pack using the provided taxonomy codes.",
        requiredSkillsJson: ["Bounding Boxes", "Visual Precision", "Taxonomy QA"],
        difficulty: "intermediate",
        estimatedDuration: "40 mins",
        rewardUsd: "4.00",
        availablePositions: 40,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit batch completion ID and occluded-item notes.",
        paymentConditions: "Verified Partner \xB7 Paid upon IoU QA.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-207",
        title: "SaaS Helpdesk Knowledge-Base Localization (EN to SW)",
        description: "Translate and localize 12 concise cloud-software support articles into natural Kenyan Swahili.",
        categoryId: catBySlug.get("translation"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/sw-localization",
        instructions: "Preserve UI button labels in English brackets while adapting explanations into clear formal Swahili.",
        requiredSkillsJson: ["Fluent Swahili", "Technical Translation", "Localization"],
        difficulty: "intermediate",
        estimatedDuration: "45 mins",
        rewardUsd: "4.50",
        availablePositions: 35,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Paste translated markdown articles or document link.",
        paymentConditions: "Verified Partner \xB7 Human linguistic QA.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-212",
        title: "Remote CRM Hygiene & Lead Enrichment Operations",
        description: "Verify business website URLs, LinkedIn handles, and operating hours for 60 East Africa B2B listings.",
        categoryId: catBySlug.get("virtual-assistance"),
        providerId: verifiedEquinox,
        sourceUrl: "https://example.com/equinox-vision/crm-ops",
        instructions: "Flag closed entities and update verified contact emails directly in the sheet template.",
        requiredSkillsJson: ["Web Research", "CRM Operations", "Attention to Detail"],
        difficulty: "beginner",
        estimatedDuration: "40 mins",
        rewardUsd: "3.75",
        availablePositions: 40,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit enriched sheet URL and verification count.",
        paymentConditions: "Verified Partner \xB7 Spot-checked by QA.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-213",
        title: "Technical Product Guide Copywriting (800 Words)",
        description: "Draft a clear step-by-step onboarding article covering mobile payment reconciliation for SMEs.",
        categoryId: catBySlug.get("content-writing"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/sme-guide",
        instructions: "Write 100% original structured prose with subheadings, numbered steps, and zero AI filler.",
        requiredSkillsJson: ["Editorial Writing", "Fintech Literacy", "Clarity"],
        difficulty: "intermediate",
        estimatedDuration: "50 mins",
        rewardUsd: "5.00",
        availablePositions: 30,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Paste article draft or shared doc URL.",
        paymentConditions: "Verified Partner \xB7 Editorial originality check.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-103",
        title: "Swahili-English Audio Transcription (15-Min Segment)",
        description: "Produce clean verbatim transcripts for code-switched Kenyan business podcast audio clips.",
        categoryId: catBySlug.get("transcription"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/swahili-transcription",
        instructions: "Include speaker labels (Speaker 1, Speaker 2) and timestamps every 60 seconds.",
        requiredSkillsJson: ["Fluent English", "Fluent Swahili", "Audio Transcription"],
        difficulty: "intermediate",
        estimatedDuration: "45 mins",
        rewardUsd: "5.50",
        availablePositions: 30,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Paste full timestamped transcript text or document link.",
        paymentConditions: "Verified Partner \xB7 Approved after reviewer spot-check.",
        status: "published",
        isFeatured: true,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-208",
        title: "East Africa Cloud & Payments Pricing Research Brief",
        description: "Compile an attributed comparison table of 10 regional SaaS & payment gateway fee structures.",
        categoryId: catBySlug.get("research-assistance"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/pricing-brief",
        instructions: "Cite official pricing URLs and retrieval dates for every provider listed.",
        requiredSkillsJson: ["Secondary Research", "Citation Discipline", "Structured Tables"],
        difficulty: "intermediate",
        estimatedDuration: "55 mins",
        rewardUsd: "6.00",
        availablePositions: 25,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit structured comparison table and source URLs.",
        paymentConditions: "Verified Partner \xB7 Paid upon citation verification.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-209",
        title: "Urban Street Pedestrian Action Video Labeling (20 Clips)",
        description: "Track pedestrian crossing events and vehicle turn signals frame-by-frame across 20 short clips.",
        categoryId: catBySlug.get("video-annotation"),
        providerId: verifiedEquinox,
        sourceUrl: "https://example.com/equinox-vision/video-events",
        instructions: "Mark start/end timestamps for every pedestrian yield and lane-change event.",
        requiredSkillsJson: ["Video Annotation", "Temporal Precision", "Event Tagging"],
        difficulty: "intermediate",
        estimatedDuration: "60 mins",
        rewardUsd: "6.50",
        availablePositions: 25,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit clip batch ID and timestamp QA summary.",
        paymentConditions: "Verified Partner \xB7 Frame tolerance +/- 3 frames.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-210",
        title: "STEM Calculus & Python Study Guide Review",
        description: "Audit worked university calculus and introductory Python exercises for step-by-step clarity.",
        categoryId: catBySlug.get("academic-tutoring"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/stem-tutoring",
        instructions: "Verify algebraic derivations, test Python snippets, and write clear hint explanations.",
        requiredSkillsJson: ["Calculus / Python", "Pedagogical Clarity", "Technical Editing"],
        difficulty: "intermediate",
        estimatedDuration: "60 mins",
        rewardUsd: "7.00",
        availablePositions: 20,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit annotated solution review and correction notes.",
        paymentConditions: "Verified Partner \xB7 Senior academic QA.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-201",
        title: "LLM Reasoning & Factuality Side-by-Side Evaluation",
        description: "Compare two AI assistant answers across 12 African legal and financial literacy prompts and score clarity, grounding, and tone.",
        categoryId: catBySlug.get("ai-response-evaluation"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/eval-batch-201",
        instructions: "Evaluate Model A vs Model B using the 5-point rubric. Justify every preference with at least 40 words citing factual accuracy.",
        requiredSkillsJson: ["Critical Reasoning", "Fact-Checking", "Rubric Grading"],
        difficulty: "intermediate",
        estimatedDuration: "50 mins",
        rewardUsd: "8.50",
        availablePositions: 35,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Submit completed evaluation table and justification notes.",
        paymentConditions: "Verified Partner \xB7 Paid in USD upon QA review.",
        status: "published",
        isFeatured: true,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-202",
        title: "AgriTech Crop Leaf Image Polygon Annotation",
        description: "Annotate 40 high-resolution maize and coffee leaf images for blight detection training datasets.",
        categoryId: catBySlug.get("image-annotation"),
        providerId: verifiedEquinox,
        sourceUrl: "https://example.com/equinox-vision/crop-polygon",
        instructions: "Draw tight polygon boundaries around affected leaf lesions and classify severity (Mild, Moderate, Severe).",
        requiredSkillsJson: ["Image Annotation", "Visual Precision", "Taxonomy Following"],
        difficulty: "intermediate",
        estimatedDuration: "60 mins",
        rewardUsd: "9.00",
        availablePositions: 25,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["verified", "pro", "top_rated"],
        minTier: "verified",
        submissionRequirements: "Provide annotation batch ID and QA summary notes.",
        paymentConditions: "Verified Partner \xB7 IoU >= 0.85 required.",
        status: "published",
        isFeatured: false,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-301",
        title: "Pro Exclusive: Swahili RLHF Instruction Prompt Authoring",
        description: "Author 15 high-complexity multi-turn Swahili prompts and gold-standard reference responses for enterprise AI alignment.",
        categoryId: catBySlug.get("ai-training"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/pro-rlhf",
        instructions: "Each prompt must test reasoning, summarization, or localized Kenyan context without copying public benchmarks.",
        requiredSkillsJson: ["Native Swahili", "Prompt Engineering", "Editorial Writing"],
        difficulty: "advanced",
        estimatedDuration: "90 mins",
        rewardUsd: "14.00",
        availablePositions: 20,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["pro", "top_rated"],
        minTier: "pro",
        submissionRequirements: "Submit 15 prompt-response pairs in structured markdown or attachment reference.",
        paymentConditions: "Pro-Exclusive Verified Project \xB7 Paid upon senior QA sign-off.",
        status: "published",
        isFeatured: true,
        isSponsored: true,
        isSample: true
      },
      {
        jobCode: "WRK-SAMPLE-401",
        title: "Top-Rated Exclusive: Adversarial AI Safety Red-Teaming",
        description: "Conduct structured robustness testing on multilingual financial advisor models and document failure modes.",
        categoryId: catBySlug.get("ai-model-testing"),
        providerId: verifiedSavannah,
        sourceUrl: "https://example.com/savannah-ai/top-rated-redteam",
        instructions: "Test 20 edge-case scenarios across English and Swahili, recording exact prompts, model outputs, and severity ratings.",
        requiredSkillsJson: ["AI Red-Teaming", "Structured QA", "Risk Categorization"],
        difficulty: "advanced",
        estimatedDuration: "2 hours",
        rewardUsd: "22.00",
        availablePositions: 15,
        publishedAt: now,
        deadlineAt: thirtyDaysLater,
        eligibleTiersJson: ["top_rated"],
        minTier: "top_rated",
        submissionRequirements: "Submit structured safety evaluation log and evidence summary.",
        paymentConditions: "Top-Rated Exclusive \xB7 Priority payout upon verification.",
        status: "published",
        isFeatured: true,
        isSponsored: true,
        isSample: true
      }
    ];
    await db.insert(jobs).values(sampleJobs).onConflictDoNothing();
  }
  const partnerCount = await db.select({ count: sql`count(*)::int` }).from(affiliatePartners);
  if ((partnerCount[0]?.count ?? 0) === 0) {
    const insertedPartners = await db.insert(affiliatePartners).values([
      {
        name: "Grammarly Productivity Suite",
        category: "Productivity Software",
        websiteUrl: "https://www.grammarly.com",
        disclosureText: "Workaby AI earns an authorized affiliate commission if you subscribe through our partner link.",
        commissionRateDesc: "20% CPA on Pro upgrades",
        agreementStatus: "active",
        isActive: true
      },
      {
        name: "Coursera AI & Data Skills",
        category: "Educational Platforms",
        websiteUrl: "https://www.coursera.org",
        disclosureText: "Disclosed educational affiliate partner helping Kenyan workers upskill in AI annotation and data analysis.",
        commissionRateDesc: "15% qualified course enrollment commission",
        agreementStatus: "active",
        isActive: true
      }
    ]).returning();
    await db.insert(affiliateLinks).values([
      {
        partnerId: insertedPartners[0].id,
        slug: "grammarly-writers",
        targetUrl: "https://www.grammarly.com",
        campaignName: "Content Writers & QA Reviewers Toolkit"
      },
      {
        partnerId: insertedPartners[1].id,
        slug: "coursera-ai-track",
        targetUrl: "https://www.coursera.org",
        campaignName: "AI Data & Prompt Engineering Upskilling"
      }
    ]);
  }
  const contractCount = await db.select({ count: sql`count(*)::int` }).from(projectContracts);
  if ((contractCount[0]?.count ?? 0) === 0) {
    const [contract] = await db.insert(projectContracts).values({
      contractCode: "PRJ-SAMPLE-001",
      clientName: "Savannah AI Labs (Sample Contract)",
      title: "East Africa Multilingual Evaluation Sprint",
      revenueType: "managed_project",
      totalValueUsd: "1000.00",
      workerPayoutUsd: "900.00",
      commissionPct: "10.00",
      platformCommissionUsd: "100.00",
      agreementVerified: true,
      status: "completed",
      isSample: true
    }).returning();
    await db.insert(projectCommissions).values({
      contractId: contract.id,
      amountUsd: "100.00",
      status: "realized"
    });
  }
  const defaultAdminSettings = [
    {
      key: "platform_identity",
      valueText: "Workaby AI",
      category: "general",
      valueJson: {
        name: "Workaby AI",
        tagline: "Your Gateway to Online Work.",
        primaryCurrency: "USD",
        mpesaCurrency: "KES",
        timezone: "Africa/Nairobi",
        supportEmail: "support@workaby.ke"
      }
    },
    {
      key: "homepage_faq",
      valueText: "FAQ Items",
      category: "content",
      valueJson: {
        items: [
          {
            q: "How do membership prices and M-Pesa payments work?",
            a: "All Workaby AI prices, job rewards, and earnings are displayed in USD. When paying for a quarterly membership via M-Pesa, the live USD/KES exchange rate is applied and the exact KES amount is sent via Safaricom STK Push."
          },
          {
            q: "How does the 10% referral commission work?",
            a: "Every member gets a unique referral code. When a referred member confirms a paid quarterly subscription ($5 Pro Worker or $8 Top-Rated, plus renewals/upgrades), you earn 10% in your Referral Wallet."
          },
          {
            q: "What is the difference between Top-Rated membership and the 50 Jobs Completed badge?",
            a: "Top-Rated Worker is a paid $8/quarter membership tier granting unlimited eligible job access. Completing 50 approved tasks earns a separate 50 Jobs Completed achievement badge."
          },
          {
            q: "Can ordinary members post jobs?",
            a: "No. Workaby AI centrally sources, verifies, and publishes all marketplace opportunities through authorized administrators to protect worker quality and payment integrity."
          }
        ]
      }
    }
  ];
  for (const s of defaultAdminSettings) {
    await db.insert(adminSettings).values(s).onConflictDoNothing();
  }
}

// server/routes/auth.ts
import crypto2 from "node:crypto";
import { Router } from "express";
import { eq as eq3 } from "drizzle-orm";
import { z } from "zod";

// src/lib/auth-session.ts
import crypto from "node:crypto";
var EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");
function getSessionSecret() {
  const configured = process.env.SESSION_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_FALLBACK_SECRET;
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash: derived, salt };
}
function verifyPassword(password, hash, salt) {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, storedBuf);
}
function signSessionToken(payload, ttlSeconds = 60 * 60 * 24 * 7) {
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1e3) + ttlSeconds
  };
  const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const bodyB64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(`${headerB64}.${bodyB64}`).digest("base64url");
  return `${headerB64}.${bodyB64}.${signature}`;
}
function verifySessionToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts;
    const expectedSig = crypto.createHmac("sha256", getSessionSecret()).update(`${headerB64}.${bodyB64}`).digest("base64url");
    const sigBuf = Buffer.from(sigB64);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
function generateUniqueReferralCode(seedName) {
  const clean = (seedName || "WORK").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(3, "X");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `WRKBY${clean}${suffix}`;
}
function hashIp(ip) {
  return crypto.createHash("sha256").update(ip || "unknown").digest("hex").slice(0, 24);
}

// src/lib/firebase-admin.ts
import fs from "node:fs";
import path from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
function resolveProjectId() {
  const envId = process.env.FIREBASE_PROJECT_ID?.trim() || process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (envId) return envId;
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (parsed?.projectId) return String(parsed.projectId);
    }
  } catch {
  }
  return void 0;
}
if (!getApps().length) {
  const projectId = resolveProjectId();
  initializeApp(projectId ? { projectId } : void 0);
}
var adminAuth = getAuth();

// src/middleware/auth.ts
import { eq as eq2, sql as sql2 } from "drizzle-orm";
var DEFAULT_OWNER_EMAIL = (process.env.OWNER_EMAIL || "dataexperts254@gmail.com").toLowerCase();
async function syncUserRecord(params) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const isOwnerEmail = normalizedEmail === DEFAULT_OWNER_EMAIL;
  const existingRole = await db.select().from(roles).where(eq2(roles.slug, isOwnerEmail ? "owner" : "member")).limit(1);
  const roleId = existingRole[0]?.id ?? null;
  const existingByEmail = await db.select().from(users).where(eq2(users.email, normalizedEmail)).limit(1);
  let dbUser = existingByEmail[0];
  if (!dbUser && params.uid && !params.uid.startsWith("local_")) {
    const existingByUid = await db.select().from(users).where(eq2(users.uid, params.uid)).limit(1);
    dbUser = existingByUid[0];
  }
  if (!dbUser) {
    try {
      const upserted = await db.insert(users).values({
        uid: params.uid,
        email: normalizedEmail,
        fullName: params.fullName?.trim() || normalizedEmail.split("@")[0],
        roleId,
        roleSlug: isOwnerEmail ? "owner" : "member",
        status: "active",
        membershipTier: "free"
      }).onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning();
      dbUser = upserted[0];
      await db.insert(profiles).values({ userId: dbUser.id, country: "Kenya", timezone: "Africa/Nairobi" }).onConflictDoNothing();
      await db.insert(workerPerformance).values({ userId: dbUser.id }).onConflictDoNothing();
      await db.insert(referralCodes).values({
        userId: dbUser.id,
        code: generateUniqueReferralCode(dbUser.fullName)
      }).onConflictDoNothing();
      if (params.referralCode && params.referralCode.trim()) {
        await attachReferralAttribution(dbUser.id, params.referralCode.trim());
      }
      await db.insert(notifications).values({
        userId: null,
        targetRole: "admin",
        category: "registration",
        title: "New member registered",
        message: `${dbUser.fullName} (${dbUser.email}) joined Workaby AI as a Free Member.`,
        linkPath: "/admin/members"
      });
    } catch (err) {
      if (err?.code === "23505") {
        const retry = await db.select().from(users).where(eq2(users.email, normalizedEmail)).limit(1);
        if (retry[0]) {
          dbUser = retry[0];
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
  } else {
    const updates = {};
    if (isOwnerEmail && dbUser.roleSlug !== "owner") {
      updates.roleSlug = "owner";
      updates.roleId = roleId;
    }
    if (params.uid && !params.uid.startsWith("local_") && dbUser.uid.startsWith("local_")) {
      updates.uid = params.uid;
    }
    if (params.fullName?.trim() && (dbUser.fullName === "Workaby AI Member" || dbUser.fullName === "PROXY AI Member")) {
      updates.fullName = params.fullName.trim();
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = /* @__PURE__ */ new Date();
      const updated = await db.update(users).set(updates).where(eq2(users.id, dbUser.id)).returning();
      dbUser = updated[0];
    }
  }
  if (dbUser.membershipTier !== "free" && dbUser.subscriptionExpiresAt && new Date(dbUser.subscriptionExpiresAt).getTime() < Date.now()) {
    const downgraded = await db.update(users).set({
      membershipTier: "free",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(users.id, dbUser.id)).returning();
    dbUser = downgraded[0];
    await db.update(subscriptions).set({ status: "expired" }).where(sql2`${subscriptions.userId} = ${dbUser.id} AND ${subscriptions.status} = 'active'`);
    await db.insert(notifications).values({
      userId: dbUser.id,
      targetRole: "member",
      category: "membership",
      title: "Membership expired",
      message: "Your paid quarterly plan has expired and your account has reverted to Free Member. All earnings, work history, and balances remain intact.",
      linkPath: "/portal/membership"
    });
  }
  return dbUser;
}
async function attachReferralAttribution(referredUserId, rawCode) {
  const codeUpper = rawCode.trim().toUpperCase();
  const codeRow = await db.select().from(referralCodes).where(eq2(referralCodes.code, codeUpper)).limit(1);
  if (!codeRow[0] || codeRow[0].isSuspended) return null;
  if (codeRow[0].userId === referredUserId) return null;
  const referrer = await db.select().from(users).where(eq2(users.id, codeRow[0].userId)).limit(1);
  if (!referrer[0] || referrer[0].status === "suspended") return null;
  const windowSetting = await db.select().from(pricingSettings).where(eq2(pricingSettings.key, "referral_attribution_days")).limit(1);
  const windowDays = Number(windowSetting[0]?.valueNumeric ?? 90) || 90;
  const expiresAt = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1e3);
  const inserted = await db.insert(referralRelationships).values({
    referrerUserId: codeRow[0].userId,
    referredUserId,
    referralCode: codeUpper,
    attributionWindowDays: windowDays,
    attributionExpiresAt: expiresAt,
    status: "active"
  }).onConflictDoNothing().returning();
  if (inserted[0]) {
    await db.insert(notifications).values({
      userId: codeRow[0].userId,
      targetRole: "member",
      category: "referral",
      title: "New referral registration",
      message: "A new member joined Workaby AI using your referral link. You will earn 10% commission when they confirm a paid subscription.",
      linkPath: "/portal/referrals"
    });
  }
  return inserted[0] ?? null;
}
async function resolveAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  const localPayload = verifySessionToken(token);
  if (localPayload) {
    const found = await db.select().from(users).where(eq2(users.id, localPayload.userId)).limit(1);
    if (!found[0] || found[0].status === "suspended") return null;
    const synced = await syncUserRecord({
      uid: found[0].uid,
      email: found[0].email,
      fullName: found[0].fullName
    });
    return {
      id: synced.id,
      uid: synced.uid,
      email: synced.email,
      fullName: synced.fullName,
      roleSlug: synced.roleSlug,
      status: synced.status,
      membershipTier: synced.membershipTier,
      subscriptionExpiresAt: synced.subscriptionExpiresAt,
      completedApprovedJobs: synced.completedApprovedJobs,
      achievement50Jobs: synced.achievement50Jobs
    };
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) return null;
    const synced = await syncUserRecord({
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.name || decoded.email.split("@")[0]
    });
    if (synced.status === "suspended") return null;
    return {
      id: synced.id,
      uid: synced.uid,
      email: synced.email,
      fullName: synced.fullName,
      roleSlug: synced.roleSlug,
      status: synced.status,
      membershipTier: synced.membershipTier,
      subscriptionExpiresAt: synced.subscriptionExpiresAt,
      completedApprovedJobs: synced.completedApprovedJobs,
      achievement50Jobs: synced.achievement50Jobs
    };
  } catch {
    return null;
  }
}
var requireAuth = async (req, res, next) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required. Please sign in." });
    }
    req.authUser = user;
    next();
  } catch (error) {
    console.error("Auth verification failed:", error);
    return res.status(401).json({ error: "Invalid or expired authentication token." });
  }
};
var requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!allowedRoles.includes(req.authUser.roleSlug)) {
      return res.status(403).json({
        error: "Access denied. You do not have permission to access this resource."
      });
    }
    next();
  };
};

// server/routes/auth.ts
var router = Router();
var registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2).max(120),
  phone: z.string().optional(),
  county: z.string().optional(),
  referralCode: z.string().optional()
});
router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid registration data" });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq3(users.email, email)).limit(1);
    if (existing[0]) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    const ownerEmail = (process.env.OWNER_EMAIL || "dataexperts254@gmail.com").toLowerCase();
    const isOwner = email === ownerEmail;
    const [roleRow] = await db.select().from(roles).where(eq3(roles.slug, isOwner ? "owner" : "member")).limit(1);
    const { hash, salt } = hashPassword(parsed.data.password);
    const uid = `local_${crypto2.randomUUID()}`;
    const [created] = await db.insert(users).values({
      uid,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      fullName: parsed.data.fullName.trim(),
      roleId: roleRow?.id ?? null,
      roleSlug: isOwner ? "owner" : "member",
      status: "active",
      membershipTier: "free"
    }).returning();
    await db.insert(profiles).values({
      userId: created.id,
      phone: parsed.data.phone?.trim() || null,
      county: parsed.data.county?.trim() || "Nairobi",
      country: "Kenya",
      timezone: "Africa/Nairobi",
      preferredPayoutPhone: parsed.data.phone?.trim() || null,
      dataPrivacyConsent: true
    });
    await db.insert(workerPerformance).values({ userId: created.id });
    const myCode = generateUniqueReferralCode(created.fullName);
    await db.insert(referralCodes).values({
      userId: created.id,
      code: myCode
    });
    if (parsed.data.referralCode) {
      await attachReferralAttribution(created.id, parsed.data.referralCode);
    }
    await db.insert(notifications).values({
      userId: null,
      targetRole: "admin",
      category: "registration",
      title: "New member registered",
      message: `${created.fullName} (${created.email}) registered as a Free Member.`,
      linkPath: "/admin/members"
    });
    await db.insert(auditLogs).values({
      actorUserId: created.id,
      actorEmail: created.email,
      action: "member_registered",
      entityType: "user",
      entityId: String(created.id),
      detailsJson: { referralCodeUsed: parsed.data.referralCode || null }
    });
    const token = signSessionToken({
      uid: created.uid,
      userId: created.id,
      email: created.email,
      roleSlug: created.roleSlug
    });
    return res.status(201).json({
      token,
      user: {
        id: created.id,
        uid: created.uid,
        email: created.email,
        fullName: created.fullName,
        roleSlug: created.roleSlug,
        membershipTier: created.membershipTier,
        referralCode: myCode
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Unable to complete registration right now." });
  }
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please provide a valid email and password." });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq3(users.email, email)).limit(1);
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return res.status(401).json({
        error: "Invalid email or password. If you signed up with Google, please use Continue with Google."
      });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ error: "This account has been suspended. Contact support." });
    }
    const valid = verifyPassword(parsed.data.password, user.passwordHash, user.passwordSalt);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const synced = await syncUserRecord({
      uid: user.uid,
      email: user.email,
      fullName: user.fullName
    });
    const token = signSessionToken({
      uid: synced.uid,
      userId: synced.id,
      email: synced.email,
      roleSlug: synced.roleSlug
    });
    return res.json({
      token,
      user: {
        id: synced.id,
        uid: synced.uid,
        email: synced.email,
        fullName: synced.fullName,
        roleSlug: synced.roleSlug,
        membershipTier: synced.membershipTier,
        subscriptionExpiresAt: synced.subscriptionExpiresAt,
        completedApprovedJobs: synced.completedApprovedJobs,
        achievement50Jobs: synced.achievement50Jobs
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Sign in failed. Please try again." });
  }
});
router.post("/firebase-sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Firebase ID token." });
    }
    const idToken = authHeader.slice("Bearer ".length).trim();
    if (!idToken) {
      return res.status(401).json({ error: "Empty Firebase ID token." });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded.email) {
      return res.status(400).json({ error: "Authenticated Firebase account must have an email address." });
    }
    if (decoded.firebase?.sign_in_provider === "google.com" && decoded.email_verified === false) {
      return res.status(403).json({ error: "Google account email address is not verified." });
    }
    const referralCode = typeof req.body?.referralCode === "string" ? req.body.referralCode : void 0;
    const synced = await syncUserRecord({
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.name || decoded.email.split("@")[0],
      referralCode
    });
    if (synced.status === "suspended") {
      return res.status(403).json({ error: "Account suspended." });
    }
    const [profile] = await db.select().from(profiles).where(eq3(profiles.userId, synced.id)).limit(1);
    const [refCode] = await db.select().from(referralCodes).where(eq3(referralCodes.userId, synced.id)).limit(1);
    return res.json({
      user: {
        id: synced.id,
        uid: synced.uid,
        email: synced.email,
        fullName: synced.fullName,
        roleSlug: synced.roleSlug,
        status: synced.status,
        membershipTier: synced.membershipTier,
        subscriptionExpiresAt: synced.subscriptionExpiresAt,
        completedApprovedJobs: synced.completedApprovedJobs,
        achievement50Jobs: synced.achievement50Jobs,
        referralCode: refCode?.code || null,
        profile: profile || null
      }
    });
  } catch (error) {
    console.error("Firebase sync error:", error);
    const code = error?.code || "";
    if (typeof code === "string" && code.startsWith("auth/")) {
      return res.status(401).json({ error: "Invalid or expired Firebase authentication token." });
    }
    return res.status(500).json({ error: "Unable to synchronize Firebase user profile." });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required." });
    const [user] = await db.select().from(users).where(eq3(users.email, email)).limit(1);
    if (user) {
      const rawToken = crypto2.randomBytes(24).toString("hex");
      const tokenHash = crypto2.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      await db.update(users).set({ resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt }).where(eq3(users.id, user.id));
      await db.insert(notifications).values({
        userId: user.id,
        targetRole: "member",
        category: "security",
        title: "Password reset requested",
        message: "A password reset request was recorded for your account.",
        linkPath: "/portal/security"
      });
    }
    return res.json({
      message: "If an account exists for that email, password reset instructions have been prepared."
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Could not process password reset request." });
  }
});
router.get("/me", requireAuth, async (req, res) => {
  try {
    const u = req.authUser;
    const [profile] = await db.select().from(profiles).where(eq3(profiles.userId, u.id)).limit(1);
    const [refCode] = await db.select().from(referralCodes).where(eq3(referralCodes.userId, u.id)).limit(1);
    return res.json({
      user: {
        ...u,
        referralCode: refCode?.code || null,
        profile: profile || null
      }
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return res.status(500).json({ error: "Failed to load account." });
  }
});
var auth_default = router;

// server/routes/public.ts
import { Router as Router2 } from "express";
import { and, desc as desc2, eq as eq5, ilike, or, sql as sql3 } from "drizzle-orm";

// server/services/exchangeRate.ts
import { desc, eq as eq4 } from "drizzle-orm";
async function getActiveUsdKesRate() {
  try {
    const latest = await db.select().from(exchangeRates).where(eq4(exchangeRates.isActive, true)).orderBy(desc(exchangeRates.createdAt)).limit(1);
    if (latest[0]) {
      return {
        id: latest[0].id,
        rate: Number(latest[0].rate),
        source: latest[0].source,
        createdAt: latest[0].createdAt
      };
    }
    const fallback = await db.insert(exchangeRates).values({
      baseCurrency: "USD",
      quoteCurrency: "KES",
      rate: "129.5000",
      source: "manual",
      notes: "Initial default Kenya USD/KES benchmark rate",
      isActive: true
    }).returning();
    return {
      id: fallback[0].id,
      rate: Number(fallback[0].rate),
      source: fallback[0].source,
      createdAt: fallback[0].createdAt
    };
  } catch (error) {
    console.error("Exchange rate lookup failed:", error);
    throw new Error("Unable to retrieve USD/KES exchange rate.", { cause: error });
  }
}
async function refreshLiveUsdKesRate(actorUserId) {
  const feedUrl = process.env.EXCHANGE_RATE_API_URL || "https://open.er-api.com/v6/latest/USD";
  try {
    const parsedUrl = new URL(feedUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("Unsupported exchange rate feed protocol");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5e3);
    const resp = await fetch(parsedUrl.toString(), { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) {
      throw new Error(`Feed HTTP ${resp.status}`);
    }
    const data = await resp.json();
    const kesRate = Number(data?.rates?.KES);
    if (!Number.isFinite(kesRate) || kesRate < 50 || kesRate > 500) {
      throw new Error("Invalid KES rate returned from feed");
    }
    await db.update(exchangeRates).set({ isActive: false }).where(eq4(exchangeRates.isActive, true));
    const inserted = await db.insert(exchangeRates).values({
      baseCurrency: "USD",
      quoteCurrency: "KES",
      rate: kesRate.toFixed(4),
      source: "api",
      notes: `Live USD/KES rate fetched from ${parsedUrl.hostname}`,
      isActive: true,
      recordedByUserId: actorUserId ?? null
    }).returning();
    return {
      id: inserted[0].id,
      rate: Number(inserted[0].rate),
      source: inserted[0].source,
      createdAt: inserted[0].createdAt
    };
  } catch (error) {
    console.warn("Live exchange rate fetch fell back to latest stored rate:", error);
    return getActiveUsdKesRate();
  }
}
async function setManualUsdKesRate(rate, notes, actorUserId) {
  await db.update(exchangeRates).set({ isActive: false }).where(eq4(exchangeRates.isActive, true));
  const inserted = await db.insert(exchangeRates).values({
    baseCurrency: "USD",
    quoteCurrency: "KES",
    rate: rate.toFixed(4),
    source: "manual",
    notes: notes || "Administrator manual USD/KES rate update",
    isActive: true,
    recordedByUserId: actorUserId
  }).returning();
  return {
    id: inserted[0].id,
    rate: Number(inserted[0].rate),
    source: inserted[0].source,
    createdAt: inserted[0].createdAt
  };
}

// server/routes/public.ts
var router2 = Router2();
router2.get("/overview", async (_req, res) => {
  try {
    const [plans, categories, rateInfo, commissionSetting, featuredJobs, partnerLinks, faqSetting, memberStats, jobStats] = await Promise.all([
      db.select().from(membershipPlans).where(eq5(membershipPlans.isActive, true)).orderBy(membershipPlans.sortOrder),
      db.select().from(jobCategories).where(eq5(jobCategories.isActive, true)).orderBy(jobCategories.sortOrder),
      getActiveUsdKesRate(),
      db.select().from(pricingSettings).where(eq5(pricingSettings.key, "referral_commission_pct")).limit(1),
      db.select({
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
        providerClassification: jobProviders.classification
      }).from(jobs).innerJoin(jobCategories, eq5(jobs.categoryId, jobCategories.id)).innerJoin(jobProviders, eq5(jobs.providerId, jobProviders.id)).where(eq5(jobs.status, "published")).orderBy(desc2(jobs.isFeatured), desc2(jobs.createdAt)).limit(6),
      db.select({
        id: affiliateLinks.id,
        slug: affiliateLinks.slug,
        campaignName: affiliateLinks.campaignName,
        partnerName: affiliatePartners.name,
        category: affiliatePartners.category,
        disclosureText: affiliatePartners.disclosureText
      }).from(affiliateLinks).innerJoin(affiliatePartners, eq5(affiliateLinks.partnerId, affiliatePartners.id)).where(eq5(affiliatePartners.isActive, true)),
      db.select().from(adminSettings).where(eq5(adminSettings.key, "homepage_faq")).limit(1),
      db.select({ count: sql3`count(*)::int` }).from(users),
      db.select({
        count: sql3`count(*)::int`,
        sampleCount: sql3`COUNT(*) FILTER (WHERE ${jobs.isSample} = true)::int`
      }).from(jobs).where(eq5(jobs.status, "published"))
    ]);
    const categoryCounts = await db.select({
      categoryId: jobs.categoryId,
      openCount: sql3`count(*)::int`
    }).from(jobs).where(eq5(jobs.status, "published")).groupBy(jobs.categoryId);
    const countMap = new Map(categoryCounts.map((c) => [c.categoryId, c.openCount]));
    return res.json({
      plans,
      categories: categories.map((c) => ({ ...c, openJobsCount: countMap.get(c.id) ?? 0 })),
      exchangeRate: rateInfo,
      referralCommissionPct: Number(commissionSetting[0]?.valueNumeric ?? 10),
      featuredJobs,
      affiliatePartners: partnerLinks,
      faq: faqSetting[0]?.valueJson?.items ?? [],
      stats: {
        registeredMembers: memberStats[0]?.count ?? 0,
        activePublishedJobs: jobStats[0]?.count ?? 0,
        sampleJobsIncluded: jobStats[0]?.sampleCount ?? 0,
        totalCategories: categories.length
      }
    });
  } catch (error) {
    console.error("Public overview error:", error);
    return res.status(500).json({ error: "Unable to load marketplace overview." });
  }
});
router2.get("/jobs", async (req, res) => {
  try {
    const categorySlug = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const tier = typeof req.query.tier === "string" ? req.query.tier.trim() : "";
    const verifiedOnly = req.query.verified === "true";
    const conditions = [eq5(jobs.status, "published")];
    if (categorySlug) {
      conditions.push(eq5(jobCategories.slug, categorySlug));
    }
    if (tier) {
      conditions.push(eq5(jobs.minTier, tier));
    }
    if (verifiedOnly) {
      conditions.push(eq5(jobProviders.classification, "verified"));
    }
    if (search) {
      conditions.push(
        or(ilike(jobs.title, `%${search}%`), ilike(jobs.description, `%${search}%`))
      );
    }
    const rows = await db.select({
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
      providerReliability: jobProviders.reliabilityScore
    }).from(jobs).innerJoin(jobCategories, eq5(jobs.categoryId, jobCategories.id)).innerJoin(jobProviders, eq5(jobs.providerId, jobProviders.id)).where(and(...conditions)).orderBy(desc2(jobs.isFeatured), desc2(jobs.createdAt));
    return res.json({ jobs: rows });
  } catch (error) {
    console.error("Public jobs error:", error);
    return res.status(500).json({ error: "Unable to fetch jobs." });
  }
});
router2.get("/jobs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid job ID." });
    }
    const [row] = await db.select({
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
      providerReliability: jobProviders.reliabilityScore
    }).from(jobs).innerJoin(jobCategories, eq5(jobs.categoryId, jobCategories.id)).innerJoin(jobProviders, eq5(jobs.providerId, jobProviders.id)).where(eq5(jobs.id, id)).limit(1);
    if (!row) {
      return res.status(404).json({ error: "Job not found." });
    }
    return res.json({ job: row });
  } catch (error) {
    console.error("Public job detail error:", error);
    return res.status(500).json({ error: "Unable to load job details." });
  }
});
router2.post("/referrals/track-click", async (req, res) => {
  try {
    const rawCode = String(req.body?.code || "").trim().toUpperCase();
    if (!rawCode) return res.status(400).json({ error: "Missing referral code." });
    const [codeRow] = await db.select().from(referralCodes).where(eq5(referralCodes.code, rawCode)).limit(1);
    await db.insert(referralClicks).values({
      referralCode: rawCode,
      referrerUserId: codeRow?.userId ?? null,
      ipHash: hashIp(req.ip || ""),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 200)
    });
    return res.json({ tracked: true, valid: Boolean(codeRow && !codeRow.isSuspended) });
  } catch (error) {
    console.error("Track referral click error:", error);
    return res.status(500).json({ error: "Unable to track referral." });
  }
});
router2.get("/affiliates/go/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const [link] = await db.select({
      id: affiliateLinks.id,
      partnerId: affiliateLinks.partnerId,
      targetUrl: affiliateLinks.targetUrl
    }).from(affiliateLinks).innerJoin(affiliatePartners, eq5(affiliateLinks.partnerId, affiliatePartners.id)).where(and(eq5(affiliateLinks.slug, slug), eq5(affiliatePartners.isActive, true))).limit(1);
    if (!link) {
      return res.status(404).json({ error: "Affiliate link not found." });
    }
    const parsed = new URL(link.targetUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return res.status(400).json({ error: "Invalid target URL." });
    }
    await db.insert(affiliateClicks).values({
      linkId: link.id,
      partnerId: link.partnerId
    });
    return res.json({ redirectUrl: parsed.toString() });
  } catch (error) {
    console.error("Affiliate redirect error:", error);
    return res.status(500).json({ error: "Unable to resolve affiliate partner link." });
  }
});
router2.post("/contact", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required." });
    }
    await db.insert(notifications).values({
      userId: null,
      targetRole: "admin",
      category: "contact",
      title: `Contact inquiry: ${subject || "General"}`,
      message: `From ${name} (${email}): ${message.slice(0, 300)}`,
      linkPath: "/admin/notifications"
    });
    return res.json({ submitted: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({ error: "Failed to submit contact message." });
  }
});
var public_default = router2;

// server/routes/member.ts
import { Router as Router3 } from "express";
import { and as and4, desc as desc3, eq as eq8, sql as sql6 } from "drizzle-orm";
import { z as z2 } from "zod";

// server/services/allocation.ts
import { and as and2, eq as eq6, sql as sql4 } from "drizzle-orm";
function getNairobiWeekKey(date = /* @__PURE__ */ new Date()) {
  const nairobiStr = date.toLocaleString("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const [y, m, d] = nairobiStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
async function getWeeklyAllowanceSummary(userId, membershipTier) {
  const weekKey = getNairobiWeekKey();
  const [plan] = await db.select().from(membershipPlans).where(eq6(membershipPlans.slug, membershipTier)).limit(1);
  const weeklyLimit = plan?.weeklyJobLimit ?? 2;
  const usedRows = await db.select({ count: sql4`count(*)::int` }).from(jobAllocations).where(and2(eq6(jobAllocations.userId, userId), eq6(jobAllocations.weekKey, weekKey)));
  const usedThisWeek = usedRows[0]?.count ?? 0;
  return {
    weekKey,
    timezone: "Africa/Nairobi",
    weeklyLimit,
    isUnlimited: weeklyLimit < 0,
    usedThisWeek,
    remainingThisWeek: weeklyLimit < 0 ? null : Math.max(0, weeklyLimit - usedThisWeek),
    allowVerifiedProviders: plan?.allowVerifiedProviders ?? false,
    allowProExclusive: plan?.allowProExclusive ?? false,
    allowTopRatedExclusive: plan?.allowTopRatedExclusive ?? false
  };
}
function isTierEligibleForJob(params) {
  if (params.providerClassification === "verified" && !params.allowVerifiedProviders) {
    return {
      eligible: false,
      reason: "Verified-provider opportunities require Verified Member, Pro Worker, or Top-Rated membership."
    };
  }
  if (params.jobMinTier === "pro" && !params.allowProExclusive) {
    return {
      eligible: false,
      reason: "This opportunity is reserved for Pro Worker and Top-Rated members."
    };
  }
  if (params.jobMinTier === "top_rated" && !params.allowTopRatedExclusive) {
    return {
      eligible: false,
      reason: "This exclusive opportunity is reserved for Top-Rated members."
    };
  }
  if (params.eligibleTiers.length > 0 && !params.eligibleTiers.includes(params.userTier)) {
    return {
      eligible: false,
      reason: `Your current ${params.userTier.replace("_", " ")} tier is not eligible for this job.`
    };
  }
  return { eligible: true };
}
async function allocateJobToMember(params) {
  const weekKey = getNairobiWeekKey();
  return await db.transaction(async (tx) => {
    const [plan] = await tx.select().from(membershipPlans).where(eq6(membershipPlans.slug, params.membershipTier)).limit(1);
    const weeklyLimit = plan?.weeklyJobLimit ?? 2;
    const [jobRow] = await tx.select().from(jobs).where(eq6(jobs.id, params.jobId)).limit(1);
    if (!jobRow) {
      throw new Error("Job not found.");
    }
    if (jobRow.status !== "published") {
      throw new Error(`This job is currently ${jobRow.status.replace("_", " ")} and cannot be allocated.`);
    }
    if (new Date(jobRow.deadlineAt).getTime() < Date.now()) {
      throw new Error("This job deadline has passed.");
    }
    if (jobRow.filledPositions >= jobRow.availablePositions) {
      throw new Error("All available positions for this job have been allocated.");
    }
    const [provider] = await tx.select().from(jobProviders).where(eq6(jobProviders.id, jobRow.providerId)).limit(1);
    if (!provider || provider.verificationStatus === "suspended") {
      throw new Error("The provider for this job is currently suspended.");
    }
    const eligibility = isTierEligibleForJob({
      userTier: params.membershipTier,
      allowVerifiedProviders: plan?.allowVerifiedProviders ?? false,
      allowProExclusive: plan?.allowProExclusive ?? false,
      allowTopRatedExclusive: plan?.allowTopRatedExclusive ?? false,
      providerClassification: provider.classification,
      jobMinTier: jobRow.minTier,
      eligibleTiers: jobRow.eligibleTiersJson || []
    });
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || "Membership tier not eligible.");
    }
    const existingAlloc = await tx.select().from(jobAllocations).where(and2(eq6(jobAllocations.jobId, params.jobId), eq6(jobAllocations.userId, params.userId))).limit(1);
    if (existingAlloc[0]) {
      throw new Error("You have already allocated this opportunity to your workspace.");
    }
    if (weeklyLimit >= 0) {
      const usedRows = await tx.select({ count: sql4`count(*)::int` }).from(jobAllocations).where(and2(eq6(jobAllocations.userId, params.userId), eq6(jobAllocations.weekKey, weekKey)));
      const used = usedRows[0]?.count ?? 0;
      if (used >= weeklyLimit) {
        throw new Error(
          `Weekly job allowance reached (${used}/${weeklyLimit} for ${weekKey} Africa/Nairobi). Upgrade your membership for higher weekly limits.`
        );
      }
    }
    const [allocation] = await tx.insert(jobAllocations).values({
      jobId: params.jobId,
      userId: params.userId,
      weekKey,
      membershipTierAtAllocation: params.membershipTier,
      status: "allocated"
    }).returning();
    const [application] = await tx.insert(jobApplications).values({
      jobId: params.jobId,
      userId: params.userId,
      allocationId: allocation.id,
      status: "accepted",
      coverNote: "Allocated via Workaby AI weekly allocation engine."
    }).onConflictDoNothing().returning();
    const nextFilled = jobRow.filledPositions + 1;
    const nextStatus = nextFilled >= jobRow.availablePositions ? "fully_allocated" : "published";
    await tx.update(jobs).set({
      filledPositions: nextFilled,
      status: nextStatus,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(jobs.id, jobRow.id));
    await tx.insert(workerPerformance).values({ userId: params.userId, totalAllocated: 1 }).onConflictDoUpdate({
      target: workerPerformance.userId,
      set: {
        totalAllocated: sql4`${workerPerformance.totalAllocated} + 1`,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    await tx.insert(notifications).values({
      userId: params.userId,
      targetRole: "member",
      category: "allocation",
      title: `Job allocated: ${jobRow.title}`,
      message: `Allocated under ${weekKey} (${params.membershipTier.replace("_", " ")}). Reward: $${Number(jobRow.rewardUsd).toFixed(2)} USD upon QA approval.`,
      linkPath: "/portal/my-jobs"
    });
    return { allocation, application };
  });
}

// server/services/mpesa.ts
import crypto3 from "node:crypto";
import { and as and3, eq as eq7, sql as sql5 } from "drizzle-orm";
function normalizeKenyaPhone(phone) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("07") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("01") && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return `254${digits}`;
  return null;
}
function isDarajaConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY && process.env.MPESA_CALLBACK_URL
  );
}
async function initiateDarajaStkPush(params) {
  if (!isDarajaConfigured()) {
    const reqId = `ws_CO_${Date.now()}_${crypto3.randomBytes(4).toString("hex")}`;
    const merchId = `MR_${Date.now()}_${crypto3.randomBytes(3).toString("hex")}`;
    return {
      mode: "sandbox_awaiting_callback",
      checkoutRequestId: reqId,
      merchantRequestId: merchId,
      customerMessage: "STK Push queued in Safaricom Daraja sandbox awaiting payment confirmation callback. Subscription activates strictly after confirmed payment."
    };
  }
  const baseUrl = process.env.MPESA_ENVIRONMENT === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const authCreds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const tokenResp = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${authCreds}` }
    }
  );
  if (!tokenResp.ok) {
    throw new Error("Failed to authenticate with Safaricom Daraja API");
  }
  const tokenData = await tokenResp.json();
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const password = Buffer.from(`${shortcode}${passkey}${timestamp2}`).toString("base64");
  const stkPayload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp2,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(params.amountKes)),
    PartyA: params.phone254,
    PartyB: shortcode,
    PhoneNumber: params.phone254,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: params.description.slice(0, 20)
  };
  const stkResp = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(stkPayload)
  });
  const stkResult = await stkResp.json();
  if (!stkResp.ok || !stkResult.CheckoutRequestID) {
    throw new Error(stkResult.errorMessage || "Safaricom Daraja STK Push initiation failed");
  }
  return {
    mode: "live",
    checkoutRequestId: stkResult.CheckoutRequestID,
    merchantRequestId: stkResult.MerchantRequestID || `MR_${Date.now()}`,
    customerMessage: stkResult.CustomerMessage || "M-Pesa prompt sent to your phone."
  };
}
async function confirmSubscriptionPayment(params) {
  return await db.transaction(async (tx) => {
    const existingList = await tx.select().from(subscriptionTransactions).where(eq7(subscriptionTransactions.checkoutRequestId, params.checkoutRequestId)).limit(1);
    const subTx = existingList[0];
    if (!subTx) {
      throw new Error("Transaction reference not found.");
    }
    if (subTx.status !== "pending") {
      return { alreadyProcessed: true, status: subTx.status, transaction: subTx };
    }
    if (params.resultCode !== 0) {
      const nextStatus = params.resultCode === 1032 ? "cancelled" : "failed";
      const [updatedTx] = await tx.update(subscriptionTransactions).set({
        status: nextStatus,
        callbackPayloadJson: params.callbackPayload
      }).where(eq7(subscriptionTransactions.id, subTx.id)).returning();
      if (subTx.subscriptionId) {
        await tx.update(subscriptions).set({ status: "cancelled" }).where(eq7(subscriptions.id, subTx.subscriptionId));
      }
      await tx.insert(notifications).values({
        userId: subTx.userId,
        targetRole: "member",
        category: "payment",
        title: nextStatus === "cancelled" ? "M-Pesa payment cancelled" : "M-Pesa payment failed",
        message: `Your KES ${Number(subTx.amountKes).toFixed(2)} ($${Number(subTx.amountUsd).toFixed(2)} USD) payment for ${subTx.planSlug} was ${nextStatus}.`,
        linkPath: "/portal/membership"
      });
      await tx.insert(notifications).values({
        userId: null,
        targetRole: "admin",
        category: "payment",
        title: `Subscription payment ${nextStatus}`,
        message: `M-Pesa checkout ${subTx.checkoutRequestId} ($${subTx.amountUsd} USD / KES ${subTx.amountKes}) ${nextStatus}.`,
        linkPath: "/admin/payments"
      });
      return { alreadyProcessed: false, status: nextStatus, transaction: updatedTx };
    }
    const receipt = params.mpesaReceiptNumber || `MPESA_${crypto3.randomBytes(4).toString("hex").toUpperCase()}`;
    const now = /* @__PURE__ */ new Date();
    const [confirmedTx] = await tx.update(subscriptionTransactions).set({
      status: "confirmed",
      mpesaReceiptNumber: receipt,
      confirmedAt: now,
      callbackPayloadJson: params.callbackPayload,
      isSample: Boolean(params.isSample ?? subTx.isSample)
    }).where(eq7(subscriptionTransactions.id, subTx.id)).returning();
    const planRows = await tx.select().from(membershipPlans).where(eq7(membershipPlans.slug, subTx.planSlug)).limit(1);
    const plan = planRows[0];
    const intervalDays = plan?.billingIntervalDays ?? 90;
    const [userRow] = await tx.select().from(users).where(eq7(users.id, subTx.userId)).limit(1);
    const baseStart = userRow?.subscriptionExpiresAt && new Date(userRow.subscriptionExpiresAt) > now ? new Date(userRow.subscriptionExpiresAt) : now;
    const newExpiresAt = new Date(baseStart.getTime() + intervalDays * 24 * 60 * 60 * 1e3);
    await tx.update(subscriptions).set({ status: "expired" }).where(and3(eq7(subscriptions.userId, subTx.userId), eq7(subscriptions.status, "active")));
    if (subTx.subscriptionId) {
      await tx.update(subscriptions).set({
        status: "active",
        startsAt: now,
        expiresAt: newExpiresAt
      }).where(eq7(subscriptions.id, subTx.subscriptionId));
    }
    await tx.update(users).set({
      membershipTier: subTx.planSlug,
      subscriptionExpiresAt: newExpiresAt,
      updatedAt: now
    }).where(eq7(users.id, subTx.userId));
    await tx.insert(paymentTransactions).values({
      userId: subTx.userId,
      txType: "subscription",
      reference: receipt,
      amountUsd: subTx.amountUsd,
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      status: "confirmed",
      metadataJson: {
        planSlug: subTx.planSlug,
        checkoutRequestId: subTx.checkoutRequestId,
        isRenewal: subTx.isRenewal,
        isSample: confirmedTx.isSample
      }
    });
    const amountUsdNum = Number(subTx.amountUsd);
    await tx.insert(financialLedger).values({
      entryNumber: `FL-SUB-${confirmedTx.id}-${Date.now()}`,
      ledgerScope: "membership_payments",
      category: `subscription_${subTx.planSlug}`,
      direction: "credit",
      amountUsd: amountUsdNum.toFixed(2),
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      referenceId: receipt,
      description: `${subTx.isRenewal ? "Renewal" : "Purchase"} of ${subTx.planSlug} plan via M-Pesa (${receipt})`,
      isSample: confirmedTx.isSample,
      occurredAt: now
    });
    await tx.insert(financialLedger).values({
      entryNumber: `FL-REV-${confirmedTx.id}-${Date.now()}`,
      ledgerScope: "platform_revenue",
      category: `subscription_${subTx.planSlug}`,
      direction: "credit",
      amountUsd: amountUsdNum.toFixed(2),
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      referenceId: receipt,
      description: `Gross subscription revenue (${subTx.planSlug})`,
      isSample: confirmedTx.isSample,
      occurredAt: now
    });
    const relRows = await tx.select().from(referralRelationships).where(eq7(referralRelationships.referredUserId, subTx.userId)).limit(1);
    const rel = relRows[0];
    if (rel && rel.status === "active" && rel.referrerUserId !== subTx.userId && (subTx.isRenewal || new Date(rel.attributionExpiresAt) >= now)) {
      const rateSetting = await tx.select().from(pricingSettings).where(eq7(pricingSettings.key, "referral_commission_pct")).limit(1);
      const commissionPct = Number(rateSetting[0]?.valueNumeric ?? 10) || 10;
      const commissionUsd = Number((amountUsdNum * commissionPct / 100).toFixed(2));
      const retainedUsd = Number((amountUsdNum - commissionUsd).toFixed(2));
      if (commissionUsd > 0) {
        await tx.insert(referralConversions).values({
          relationshipId: rel.id,
          referrerUserId: rel.referrerUserId,
          referredUserId: subTx.userId,
          subscriptionTransactionId: confirmedTx.id,
          planSlug: subTx.planSlug,
          amountUsd: amountUsdNum.toFixed(2)
        }).onConflictDoNothing();
        const [commissionRow] = await tx.insert(referralCommissions).values({
          referrerUserId: rel.referrerUserId,
          referredUserId: subTx.userId,
          relationshipId: rel.id,
          subscriptionTransactionId: confirmedTx.id,
          commissionRatePct: commissionPct.toFixed(2),
          baseAmountUsd: amountUsdNum.toFixed(2),
          commissionAmountUsd: commissionUsd.toFixed(2),
          retainedAmountUsd: retainedUsd.toFixed(2),
          status: "available",
          isRenewal: subTx.isRenewal,
          isSample: confirmedTx.isSample,
          approvedAt: now
        }).onConflictDoNothing().returning();
        if (commissionRow) {
          const walletAgg = await tx.select({
            bal: sql5`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`
          }).from(referralWalletTransactions).where(eq7(referralWalletTransactions.userId, rel.referrerUserId));
          const currentBal = Number(walletAgg[0]?.bal ?? 0);
          const nextBal = Number((currentBal + commissionUsd).toFixed(2));
          await tx.insert(referralWalletTransactions).values({
            userId: rel.referrerUserId,
            commissionId: commissionRow.id,
            entryType: "credit",
            amountUsd: commissionUsd.toFixed(2),
            balanceAfterUsd: nextBal.toFixed(2),
            description: `${commissionPct}% referral commission on ${subTx.planSlug} ${subTx.isRenewal ? "renewal" : "subscription"} ($${amountUsdNum.toFixed(2)})`
          });
          await tx.insert(financialLedger).values({
            entryNumber: `FL-REF-${commissionRow.id}-${Date.now()}`,
            ledgerScope: "referral_commissions",
            category: "referral_commission_accrual",
            direction: "debit",
            amountUsd: commissionUsd.toFixed(2),
            referenceId: receipt,
            description: `Referral commission (${commissionPct}%) credited to referrer #${rel.referrerUserId}`,
            isSample: confirmedTx.isSample,
            occurredAt: now
          });
          await tx.insert(notifications).values({
            userId: rel.referrerUserId,
            targetRole: "member",
            category: "referral",
            title: `Referral commission earned: $${commissionUsd.toFixed(2)}`,
            message: `Your referred member confirmed a $${amountUsdNum.toFixed(2)} ${subTx.planSlug} payment. $${commissionUsd.toFixed(2)} (${commissionPct}%) has been credited to your Referral Wallet.`,
            linkPath: "/portal/referrals"
          });
        }
      }
    }
    await tx.insert(notifications).values({
      userId: subTx.userId,
      targetRole: "member",
      category: "membership",
      title: `${subTx.planSlug.replace("_", " ").toUpperCase()} membership activated`,
      message: `M-Pesa receipt ${receipt} confirmed (KES ${Number(subTx.amountKes).toFixed(2)} / $${amountUsdNum.toFixed(2)} USD). Active until ${newExpiresAt.toDateString()}.`,
      linkPath: "/portal/membership"
    });
    await tx.insert(notifications).values({
      userId: null,
      targetRole: "admin",
      category: "subscription",
      title: "New confirmed paid subscriber",
      message: `User #${subTx.userId} activated ${subTx.planSlug} for $${amountUsdNum.toFixed(2)} USD (KES ${subTx.amountKes}, Receipt: ${receipt}).`,
      linkPath: "/admin/subscriptions"
    });
    await tx.insert(auditLogs).values({
      actorUserId: subTx.userId,
      action: "subscription_payment_confirmed",
      entityType: "subscription_transaction",
      entityId: String(confirmedTx.id),
      detailsJson: {
        receipt,
        amountUsd: amountUsdNum,
        amountKes: Number(subTx.amountKes),
        exchangeRate: Number(subTx.exchangeRate)
      }
    });
    return { alreadyProcessed: false, status: "confirmed", transaction: confirmedTx };
  });
}
async function refundSubscriptionTransaction(params) {
  return await db.transaction(async (tx) => {
    const [subTx] = await tx.select().from(subscriptionTransactions).where(eq7(subscriptionTransactions.id, params.transactionId)).limit(1);
    if (!subTx) throw new Error("Transaction not found.");
    if (subTx.status !== "confirmed") {
      throw new Error(`Only confirmed transactions can be refunded (current status: ${subTx.status}).`);
    }
    const now = /* @__PURE__ */ new Date();
    const [refundedTx] = await tx.update(subscriptionTransactions).set({ status: "refunded", refundedAt: now }).where(eq7(subscriptionTransactions.id, subTx.id)).returning();
    if (subTx.subscriptionId) {
      await tx.update(subscriptions).set({ status: "cancelled", cancelledAt: now }).where(eq7(subscriptions.id, subTx.subscriptionId));
    }
    await tx.update(users).set({ membershipTier: "free", subscriptionExpiresAt: null, updatedAt: now }).where(eq7(users.id, subTx.userId));
    const amountUsdNum = Number(subTx.amountUsd);
    await tx.insert(expenses).values({
      category: "refunds",
      vendor: "M-Pesa Refund",
      description: `Refund for transaction #${subTx.id} (${subTx.mpesaReceiptNumber || subTx.checkoutRequestId}): ${params.reason}`,
      amountUsd: amountUsdNum.toFixed(2),
      recordedByUserId: params.actorUserId,
      isSample: subTx.isSample
    });
    await tx.insert(financialLedger).values({
      entryNumber: `FL-REFUND-${subTx.id}-${Date.now()}`,
      ledgerScope: "platform_revenue",
      category: "subscription_refund",
      direction: "debit",
      amountUsd: amountUsdNum.toFixed(2),
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      referenceId: subTx.mpesaReceiptNumber || subTx.checkoutRequestId,
      description: `Subscription refund: ${params.reason}`,
      isSample: subTx.isSample,
      recordedByUserId: params.actorUserId,
      occurredAt: now
    });
    const [comm] = await tx.select().from(referralCommissions).where(eq7(referralCommissions.subscriptionTransactionId, subTx.id)).limit(1);
    if (comm && comm.status !== "reversed") {
      await tx.update(referralCommissions).set({
        status: "reversed",
        reversedAt: now,
        reversalReason: params.reason
      }).where(eq7(referralCommissions.id, comm.id));
      const commUsd = Number(comm.commissionAmountUsd);
      const walletAgg = await tx.select({
        bal: sql5`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`
      }).from(referralWalletTransactions).where(eq7(referralWalletTransactions.userId, comm.referrerUserId));
      const currentBal = Number(walletAgg[0]?.bal ?? 0);
      const nextBal = Number((currentBal - commUsd).toFixed(2));
      await tx.insert(referralWalletTransactions).values({
        userId: comm.referrerUserId,
        commissionId: comm.id,
        entryType: "reversal",
        amountUsd: commUsd.toFixed(2),
        balanceAfterUsd: nextBal.toFixed(2),
        description: `Commission reversed due to refund (${params.reason})`
      });
      await tx.insert(notifications).values({
        userId: comm.referrerUserId,
        targetRole: "member",
        category: "referral",
        title: "Referral commission reversed",
        message: `Commission of $${commUsd.toFixed(2)} was reversed because the underlying subscription payment was refunded (${params.reason}).`,
        linkPath: "/portal/referrals"
      });
    }
    await tx.insert(auditLogs).values({
      actorUserId: params.actorUserId,
      action: "subscription_refunded",
      entityType: "subscription_transaction",
      entityId: String(subTx.id),
      detailsJson: { reason: params.reason, amountUsd: amountUsdNum }
    });
    return refundedTx;
  });
}

// server/routes/member.ts
var router3 = Router3();
router3.use(requireAuth);
async function getMemberBalances(userId) {
  const [workerEarnedRow, workerWithdrawnRow, refEarnedRow, refWithdrawnRow] = await Promise.all([
    db.select({
      total: sql6`COALESCE(SUM(CASE WHEN ${earnings.status} IN ('approved','available','withdrawn') THEN ${earnings.amountUsd} ELSE 0 END), 0)`,
      pending: sql6`COALESCE(SUM(CASE WHEN ${earnings.status} = 'pending' THEN ${earnings.amountUsd} ELSE 0 END), 0)`,
      approved: sql6`COALESCE(SUM(CASE WHEN ${earnings.status} IN ('approved','available') THEN ${earnings.amountUsd} ELSE 0 END), 0)`
    }).from(earnings).where(eq8(earnings.userId, userId)),
    db.select({
      reserved: sql6`COALESCE(SUM(CASE WHEN ${withdrawals.status} IN ('pending','approved','processing','paid') THEN ${withdrawals.amountUsd} ELSE 0 END), 0)`
    }).from(withdrawals).where(and4(eq8(withdrawals.userId, userId), eq8(withdrawals.ledgerType, "worker_earnings"))),
    db.select({
      total: sql6`COALESCE(SUM(CASE WHEN ${referralCommissions.status} IN ('approved','available','withdrawn') THEN ${referralCommissions.commissionAmountUsd} ELSE 0 END), 0)`,
      pending: sql6`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'pending' THEN ${referralCommissions.commissionAmountUsd} ELSE 0 END), 0)`,
      approved: sql6`COALESCE(SUM(CASE WHEN ${referralCommissions.status} IN ('approved','available') THEN ${referralCommissions.commissionAmountUsd} ELSE 0 END), 0)`
    }).from(referralCommissions).where(eq8(referralCommissions.referrerUserId, userId)),
    db.select({
      reserved: sql6`COALESCE(SUM(CASE WHEN ${withdrawals.status} IN ('pending','approved','processing','paid') THEN ${withdrawals.amountUsd} ELSE 0 END), 0)`
    }).from(withdrawals).where(and4(eq8(withdrawals.userId, userId), eq8(withdrawals.ledgerType, "referral_commissions")))
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
      availableWithdrawalUsd: workerAvailable
    },
    referral: {
      totalEarningsUsd: refTotal,
      pendingCommissionsUsd: refPending,
      approvedCommissionsUsd: refApproved,
      withdrawnOrPendingUsd: refReserved,
      availableReferralBalanceUsd: refAvailable
    }
  };
}
router3.get("/dashboard", async (req, res) => {
  try {
    const user = req.authUser;
    const [allowance, balances, perfRows, subCounts, refCodeRows, refStats, recentNotifs, allJobs] = await Promise.all([
      getWeeklyAllowanceSummary(user.id, user.membershipTier),
      getMemberBalances(user.id),
      db.select().from(workerPerformance).where(eq8(workerPerformance.userId, user.id)).limit(1),
      db.select({
        status: jobSubmissions.status,
        count: sql6`count(*)::int`
      }).from(jobSubmissions).where(eq8(jobSubmissions.userId, user.id)).groupBy(jobSubmissions.status),
      db.select().from(referralCodes).where(eq8(referralCodes.userId, user.id)).limit(1),
      db.select({
        totalRegistrations: sql6`count(*)::int`
      }).from(referralRelationships).where(eq8(referralRelationships.referrerUserId, user.id)),
      db.select().from(notifications).where(eq8(notifications.userId, user.id)).orderBy(desc3(notifications.createdAt)).limit(8),
      db.select({
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
        providerClassification: jobProviders.classification
      }).from(jobs).innerJoin(jobCategories, eq8(jobs.categoryId, jobCategories.id)).innerJoin(jobProviders, eq8(jobs.providerId, jobProviders.id)).where(eq8(jobs.status, "published")).orderBy(desc3(jobs.isFeatured), desc3(jobs.createdAt)).limit(12)
    ]);
    const paidRefCountRows = await db.select({ count: sql6`COUNT(DISTINCT ${referralCommissions.referredUserId})::int` }).from(referralCommissions).where(and4(eq8(referralCommissions.referrerUserId, user.id), sql6`${referralCommissions.status} != 'reversed'`));
    const subCountMap = new Map(subCounts.map((s) => [s.status, s.count]));
    const pendingSubmissions = (subCountMap.get("submitted") ?? 0) + (subCountMap.get("under_review") ?? 0) + (subCountMap.get("correction_requested") ?? 0);
    const approvedSubmissions = (subCountMap.get("approved") ?? 0) + (subCountMap.get("paid") ?? 0);
    const rejectedSubmissions = subCountMap.get("rejected") ?? 0;
    const recommendedJobs = allJobs.filter(
      (j) => isTierEligibleForJob({
        userTier: user.membershipTier,
        allowVerifiedProviders: allowance.allowVerifiedProviders,
        allowProExclusive: allowance.allowProExclusive,
        allowTopRatedExclusive: allowance.allowTopRatedExclusive,
        providerClassification: j.providerClassification,
        jobMinTier: j.minTier,
        eligibleTiers: j.eligibleTiersJson || []
      }).eligible
    ).slice(0, 6);
    const recentEarnings = await db.select({
      earnedAt: earnings.earnedAt,
      amountUsd: earnings.amountUsd
    }).from(earnings).where(eq8(earnings.userId, user.id)).orderBy(desc3(earnings.earnedAt)).limit(30);
    return res.json({
      user,
      allowance,
      balances,
      performance: perfRows[0] ?? {
        totalAllocated: 0,
        totalSubmitted: 0,
        totalApproved: 0,
        totalRejected: 0,
        approvalRate: "100.00",
        currentStreak: 0
      },
      submissionStats: {
        pending: pendingSubmissions,
        approved: approvedSubmissions,
        rejected: rejectedSubmissions
      },
      referralSummary: {
        code: refCodeRows[0]?.code || "",
        totalRegistrations: refStats[0]?.totalRegistrations ?? 0,
        paidReferrals: paidRefCountRows[0]?.count ?? 0
      },
      recommendedJobs,
      availableJobsCount: allJobs.length,
      notifications: recentNotifs,
      recentEarnings
    });
  } catch (error) {
    console.error("Member dashboard error:", error);
    return res.status(500).json({ error: "Unable to load member dashboard." });
  }
});
router3.get("/jobs", async (req, res) => {
  try {
    const user = req.authUser;
    const allowance = await getWeeklyAllowanceSummary(user.id, user.membershipTier);
    const [rows, myAllocations] = await Promise.all([
      db.select({
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
        providerClassification: jobProviders.classification
      }).from(jobs).innerJoin(jobCategories, eq8(jobs.categoryId, jobCategories.id)).innerJoin(jobProviders, eq8(jobs.providerId, jobProviders.id)).where(eq8(jobs.status, "published")).orderBy(desc3(jobs.isFeatured), desc3(jobs.createdAt)),
      db.select().from(jobAllocations).where(eq8(jobAllocations.userId, user.id))
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
        eligibleTiers: job.eligibleTiersJson || []
      });
      return {
        ...job,
        isEligible: check.eligible,
        ineligibilityReason: check.reason || null,
        isAllocatedToMe: allocatedJobIds.has(job.id)
      };
    });
    return res.json({ allowance, jobs: enriched });
  } catch (error) {
    console.error("Member jobs error:", error);
    return res.status(500).json({ error: "Unable to load available jobs." });
  }
});
router3.post("/jobs/:id/allocate", async (req, res) => {
  try {
    const user = req.authUser;
    const jobId = Number(req.params.id);
    if (!Number.isInteger(jobId)) {
      return res.status(400).json({ error: "Invalid job ID." });
    }
    const result = await allocateJobToMember({
      userId: user.id,
      membershipTier: user.membershipTier,
      jobId
    });
    const allowance = await getWeeklyAllowanceSummary(user.id, user.membershipTier);
    return res.status(201).json({ ...result, allowance });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to allocate job." });
  }
});
router3.get("/work", async (req, res) => {
  try {
    const user = req.authUser;
    const [allocations, applications, submissions] = await Promise.all([
      db.select({
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
        providerClassification: jobProviders.classification
      }).from(jobAllocations).innerJoin(jobs, eq8(jobAllocations.jobId, jobs.id)).innerJoin(jobCategories, eq8(jobs.categoryId, jobCategories.id)).innerJoin(jobProviders, eq8(jobs.providerId, jobProviders.id)).where(eq8(jobAllocations.userId, user.id)).orderBy(desc3(jobAllocations.allocatedAt)),
      db.select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        coverNote: jobApplications.coverNote,
        appliedAt: jobApplications.appliedAt,
        jobTitle: jobs.title,
        rewardUsd: jobs.rewardUsd
      }).from(jobApplications).innerJoin(jobs, eq8(jobApplications.jobId, jobs.id)).where(eq8(jobApplications.userId, user.id)).orderBy(desc3(jobApplications.appliedAt)),
      db.select({
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
        rewardUsd: jobs.rewardUsd
      }).from(jobSubmissions).innerJoin(jobs, eq8(jobSubmissions.jobId, jobs.id)).where(eq8(jobSubmissions.userId, user.id)).orderBy(desc3(jobSubmissions.submittedAt))
    ]);
    const reviews = await db.select().from(submissionReviews).orderBy(desc3(submissionReviews.reviewedAt));
    const reviewBySubId = /* @__PURE__ */ new Map();
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
        latestReview: reviewBySubId.get(s.id) ?? null
      }))
    });
  } catch (error) {
    console.error("Member work error:", error);
    return res.status(500).json({ error: "Unable to load your workspace." });
  }
});
var submissionSchema = z2.object({
  jobId: z2.number().int().positive(),
  submissionType: z2.enum(["text", "document", "image", "file", "external_ref"]).default("text"),
  textContent: z2.string().min(10, "Please provide task deliverable details (minimum 10 characters)."),
  externalReference: z2.string().optional(),
  attachmentName: z2.string().optional(),
  attachmentUrl: z2.string().optional(),
  notes: z2.string().optional()
});
router3.post("/submissions", async (req, res) => {
  try {
    const user = req.authUser;
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid submission." });
    }
    const [alloc] = await db.select().from(jobAllocations).where(and4(eq8(jobAllocations.jobId, parsed.data.jobId), eq8(jobAllocations.userId, user.id))).limit(1);
    if (!alloc) {
      return res.status(403).json({ error: "You must allocate this job before submitting work." });
    }
    const [appRow] = await db.select().from(jobApplications).where(and4(eq8(jobApplications.jobId, parsed.data.jobId), eq8(jobApplications.userId, user.id))).limit(1);
    const [created] = await db.insert(jobSubmissions).values({
      jobId: parsed.data.jobId,
      userId: user.id,
      applicationId: appRow?.id ?? null,
      submissionType: parsed.data.submissionType,
      textContent: parsed.data.textContent.trim(),
      externalReference: parsed.data.externalReference?.trim() || null,
      attachmentName: parsed.data.attachmentName?.trim() || null,
      attachmentUrl: parsed.data.attachmentUrl?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      status: "submitted"
    }).returning();
    await db.update(jobAllocations).set({ status: "completed" }).where(eq8(jobAllocations.id, alloc.id));
    await db.update(workerPerformance).set({
      totalSubmitted: sql6`${workerPerformance.totalSubmitted} + 1`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq8(workerPerformance.userId, user.id));
    await db.insert(notifications).values({
      userId: null,
      targetRole: "admin",
      category: "submission",
      title: "New task submission awaiting QA review",
      message: `${user.fullName} submitted work for Job #${parsed.data.jobId}.`,
      linkPath: "/admin/submissions"
    });
    return res.status(201).json({ submission: created });
  } catch (error) {
    console.error("Submit work error:", error);
    return res.status(500).json({ error: "Failed to record submission." });
  }
});
router3.get("/earnings", async (req, res) => {
  try {
    const user = req.authUser;
    const [balances, earningRows, withdrawalRows, rateInfo, minWorkerSetting, minRefSetting] = await Promise.all([
      getMemberBalances(user.id),
      db.select({
        id: earnings.id,
        jobId: earnings.jobId,
        submissionId: earnings.submissionId,
        amountUsd: earnings.amountUsd,
        status: earnings.status,
        isSample: earnings.isSample,
        earnedAt: earnings.earnedAt,
        approvedAt: earnings.approvedAt,
        jobTitle: jobs.title
      }).from(earnings).innerJoin(jobs, eq8(earnings.jobId, jobs.id)).where(eq8(earnings.userId, user.id)).orderBy(desc3(earnings.earnedAt)),
      db.select().from(withdrawals).where(eq8(withdrawals.userId, user.id)).orderBy(desc3(withdrawals.requestedAt)),
      getActiveUsdKesRate(),
      db.select().from(pricingSettings).where(eq8(pricingSettings.key, "min_worker_withdrawal_usd")).limit(1),
      db.select().from(pricingSettings).where(eq8(pricingSettings.key, "min_referral_withdrawal_usd")).limit(1)
    ]);
    return res.json({
      balances,
      earnings: earningRows,
      withdrawals: withdrawalRows,
      exchangeRate: rateInfo,
      minimums: {
        workerUsd: Number(minWorkerSetting[0]?.valueNumeric ?? 5),
        referralUsd: Number(minRefSetting[0]?.valueNumeric ?? 2)
      }
    });
  } catch (error) {
    console.error("Member earnings error:", error);
    return res.status(500).json({ error: "Unable to load earnings ledger." });
  }
});
var withdrawalSchema = z2.object({
  ledgerType: z2.enum(["worker_earnings", "referral_commissions"]),
  amountUsd: z2.number().positive(),
  phoneNumber: z2.string().min(9)
});
router3.post("/withdrawals", async (req, res) => {
  try {
    const user = req.authUser;
    const parsed = withdrawalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid withdrawal request." });
    }
    const phone254 = normalizeKenyaPhone(parsed.data.phoneNumber);
    if (!phone254) {
      return res.status(400).json({ error: "Enter a valid Kenyan M-Pesa phone number (e.g. 0712345678 or 254712345678)." });
    }
    const balances = await getMemberBalances(user.id);
    const available = parsed.data.ledgerType === "worker_earnings" ? balances.worker.availableWithdrawalUsd : balances.referral.availableReferralBalanceUsd;
    const minKey = parsed.data.ledgerType === "worker_earnings" ? "min_worker_withdrawal_usd" : "min_referral_withdrawal_usd";
    const [minSetting] = await db.select().from(pricingSettings).where(eq8(pricingSettings.key, minKey)).limit(1);
    const minUsd = Number(minSetting?.valueNumeric ?? 2);
    if (parsed.data.amountUsd < minUsd) {
      return res.status(400).json({ error: `Minimum withdrawal for this ledger is $${minUsd.toFixed(2)} USD.` });
    }
    if (parsed.data.amountUsd > available) {
      return res.status(400).json({ error: `Requested amount exceeds available balance ($${available.toFixed(2)} USD).` });
    }
    const rateInfo = await getActiveUsdKesRate();
    const amountKes = Number((parsed.data.amountUsd * rateInfo.rate).toFixed(2));
    const [created] = await db.insert(withdrawals).values({
      userId: user.id,
      ledgerType: parsed.data.ledgerType,
      amountUsd: parsed.data.amountUsd.toFixed(2),
      amountKes: amountKes.toFixed(2),
      exchangeRate: rateInfo.rate.toFixed(4),
      phoneNumber: phone254,
      payoutMethod: "mpesa",
      status: "pending"
    }).returning();
    await db.insert(notifications).values({
      userId: null,
      targetRole: "admin",
      category: "withdrawal",
      title: `New ${parsed.data.ledgerType === "worker_earnings" ? "Worker" : "Referral"} withdrawal request`,
      message: `${user.fullName} requested $${parsed.data.amountUsd.toFixed(2)} USD (KES ${amountKes.toFixed(2)}) to ${phone254}.`,
      linkPath: parsed.data.ledgerType === "worker_earnings" ? "/admin/withdrawals" : "/admin/referrals"
    });
    return res.status(201).json({ withdrawal: created });
  } catch (error) {
    console.error("Withdrawal request error:", error);
    return res.status(500).json({ error: "Unable to submit withdrawal request." });
  }
});
router3.get("/membership", async (req, res) => {
  try {
    const user = req.authUser;
    const [plans, rateInfo, history, transactions] = await Promise.all([
      db.select().from(membershipPlans).where(eq8(membershipPlans.isActive, true)).orderBy(membershipPlans.sortOrder),
      getActiveUsdKesRate(),
      db.select().from(subscriptions).where(eq8(subscriptions.userId, user.id)).orderBy(desc3(subscriptions.createdAt)),
      db.select().from(subscriptionTransactions).where(eq8(subscriptionTransactions.userId, user.id)).orderBy(desc3(subscriptionTransactions.createdAt))
    ]);
    return res.json({
      currentTier: user.membershipTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      plans,
      exchangeRate: rateInfo,
      subscriptions: history,
      transactions
    });
  } catch (error) {
    console.error("Membership fetch error:", error);
    return res.status(500).json({ error: "Unable to load membership details." });
  }
});
var subscribeSchema = z2.object({
  planSlug: z2.enum(["verified", "pro", "top_rated"]),
  phoneNumber: z2.string().min(9),
  autoRenewAuthorized: z2.boolean().default(false)
});
router3.post("/subscriptions/initiate", async (req, res) => {
  try {
    const user = req.authUser;
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Select a valid paid plan and M-Pesa phone number." });
    }
    const phone254 = normalizeKenyaPhone(parsed.data.phoneNumber);
    if (!phone254) {
      return res.status(400).json({
        error: "Enter a valid Kenyan M-Pesa phone number (e.g. 0712345678 or 254712345678)."
      });
    }
    const [plan] = await db.select().from(membershipPlans).where(eq8(membershipPlans.slug, parsed.data.planSlug)).limit(1);
    if (!plan || !plan.isActive || Number(plan.priceUsd) <= 0) {
      return res.status(404).json({ error: "Selected membership plan is unavailable." });
    }
    const rateInfo = await getActiveUsdKesRate();
    const amountUsd = Number(plan.priceUsd);
    const amountKes = Math.max(1, Math.round(amountUsd * rateInfo.rate));
    const isRenewal = user.membershipTier === plan.slug;
    const stk = await initiateDarajaStkPush({
      phone254,
      amountKes,
      accountReference: `WORKABY-${plan.slug.toUpperCase()}`,
      description: `Workaby AI ${plan.name}`
    });
    const [pendingSub] = await db.insert(subscriptions).values({
      userId: user.id,
      planId: plan.id,
      planSlug: plan.slug,
      status: "pending",
      billingIntervalDays: plan.billingIntervalDays,
      amountUsd: amountUsd.toFixed(2),
      autoRenewAuthorized: parsed.data.autoRenewAuthorized
    }).returning();
    const [txRow] = await db.insert(subscriptionTransactions).values({
      userId: user.id,
      subscriptionId: pendingSub.id,
      planSlug: plan.slug,
      paymentMethod: "mpesa_stk",
      amountUsd: amountUsd.toFixed(2),
      amountKes: amountKes.toFixed(2),
      exchangeRate: rateInfo.rate.toFixed(4),
      exchangeRateId: rateInfo.id,
      phoneNumber: phone254,
      checkoutRequestId: stk.checkoutRequestId,
      merchantRequestId: stk.merchantRequestId,
      status: "pending",
      isRenewal,
      isSample: stk.mode !== "live"
    }).returning();
    return res.status(201).json({
      transaction: txRow,
      stkMode: stk.mode,
      customerMessage: stk.customerMessage,
      display: {
        amountUsd,
        amountKes,
        exchangeRate: rateInfo.rate,
        phone254
      }
    });
  } catch (error) {
    console.error("Subscription initiate error:", error);
    return res.status(500).json({ error: error.message || "Unable to initiate M-Pesa payment." });
  }
});
router3.get("/subscriptions/tx/:id", async (req, res) => {
  try {
    const user = req.authUser;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid transaction ID." });
    const [tx] = await db.select().from(subscriptionTransactions).where(and4(eq8(subscriptionTransactions.id, id), eq8(subscriptionTransactions.userId, user.id))).limit(1);
    if (!tx) return res.status(404).json({ error: "Transaction not found." });
    return res.json({ transaction: tx });
  } catch (error) {
    console.error("Tx status error:", error);
    return res.status(500).json({ error: "Unable to check payment status." });
  }
});
router3.post("/subscriptions/downgrade", async (req, res) => {
  try {
    const user = req.authUser;
    await db.update(users).set({ membershipTier: "free", subscriptionExpiresAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(users.id, user.id));
    await db.update(subscriptions).set({ status: "cancelled", cancelledAt: /* @__PURE__ */ new Date(), autoRenewAuthorized: false }).where(and4(eq8(subscriptions.userId, user.id), eq8(subscriptions.status, "active")));
    return res.json({
      membershipTier: "free",
      message: "Downgraded to Free Member. All earnings, referral balances, and work history are preserved."
    });
  } catch (error) {
    console.error("Downgrade error:", error);
    return res.status(500).json({ error: "Unable to downgrade subscription." });
  }
});
router3.get("/referrals", async (req, res) => {
  try {
    const user = req.authUser;
    const [codeRow, clicksRow, relationships, commissions, walletTx, balances, rateSetting] = await Promise.all([
      db.select().from(referralCodes).where(eq8(referralCodes.userId, user.id)).limit(1),
      db.select({ count: sql6`count(*)::int` }).from(referralClicks).where(eq8(referralClicks.referrerUserId, user.id)),
      db.select({
        id: referralRelationships.id,
        referredUserId: referralRelationships.referredUserId,
        status: referralRelationships.status,
        attributionExpiresAt: referralRelationships.attributionExpiresAt,
        createdAt: referralRelationships.createdAt,
        referredName: users.fullName,
        referredTier: users.membershipTier
      }).from(referralRelationships).innerJoin(users, eq8(referralRelationships.referredUserId, users.id)).where(eq8(referralRelationships.referrerUserId, user.id)).orderBy(desc3(referralRelationships.createdAt)),
      db.select({
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
        referredName: users.fullName
      }).from(referralCommissions).innerJoin(users, eq8(referralCommissions.referredUserId, users.id)).where(eq8(referralCommissions.referrerUserId, user.id)).orderBy(desc3(referralCommissions.createdAt)),
      db.select().from(referralWalletTransactions).where(eq8(referralWalletTransactions.userId, user.id)).orderBy(desc3(referralWalletTransactions.createdAt)),
      getMemberBalances(user.id),
      db.select().from(pricingSettings).where(eq8(pricingSettings.key, "referral_commission_pct")).limit(1)
    ]);
    const freeReferrals = relationships.filter((r) => r.referredTier === "free").length;
    const paidSubscriberIds = new Set(
      commissions.filter((c) => c.status !== "reversed").map((c) => c.referredUserId)
    );
    const activePaidSubscribers = relationships.filter((r) => r.referredTier !== "free").length;
    return res.json({
      referralCode: codeRow[0]?.code || "",
      isSuspended: codeRow[0]?.isSuspended ?? false,
      commissionPct: Number(rateSetting[0]?.valueNumeric ?? 10),
      stats: {
        totalClicks: clicksRow[0]?.count ?? 0,
        totalRegistrations: relationships.length,
        verifiedRegistrations: relationships.filter((r) => r.status === "active").length,
        freeReferrals,
        paidReferrals: paidSubscriberIds.size,
        activeReferredSubscribers: activePaidSubscribers,
        conversionRatePct: relationships.length > 0 ? Number((paidSubscriberIds.size / relationships.length * 100).toFixed(1)) : 0
      },
      wallet: balances.referral,
      relationships,
      commissions,
      walletTransactions: walletTx
    });
  } catch (error) {
    console.error("Member referrals error:", error);
    return res.status(500).json({ error: "Unable to load referral dashboard." });
  }
});
router3.get("/notifications", async (req, res) => {
  try {
    const user = req.authUser;
    const rows = await db.select().from(notifications).where(eq8(notifications.userId, user.id)).orderBy(desc3(notifications.createdAt)).limit(50);
    return res.json({ notifications: rows });
  } catch (error) {
    console.error("Notifications error:", error);
    return res.status(500).json({ error: "Unable to load notifications." });
  }
});
router3.post("/notifications/read", async (req, res) => {
  try {
    const user = req.authUser;
    await db.update(notifications).set({ isRead: true }).where(eq8(notifications.userId, user.id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Unable to mark notifications read." });
  }
});
router3.patch("/profile", async (req, res) => {
  try {
    const user = req.authUser;
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : void 0;
    const county = typeof req.body?.county === "string" ? req.body.county.trim() : void 0;
    const bio = typeof req.body?.bio === "string" ? req.body.bio.trim() : void 0;
    const preferredPayoutPhone = typeof req.body?.preferredPayoutPhone === "string" ? req.body.preferredPayoutPhone.trim() : void 0;
    const skills = Array.isArray(req.body?.skills) ? req.body.skills.map(String) : void 0;
    if (fullName) {
      await db.update(users).set({ fullName, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(users.id, user.id));
    }
    await db.insert(profiles).values({
      userId: user.id,
      phone: phone ?? null,
      county: county ?? "Nairobi",
      bio: bio ?? null,
      preferredPayoutPhone: preferredPayoutPhone ?? null,
      skillsJson: skills ?? []
    }).onConflictDoUpdate({
      target: profiles.userId,
      set: {
        ...phone !== void 0 ? { phone } : {},
        ...county !== void 0 ? { county } : {},
        ...bio !== void 0 ? { bio } : {},
        ...preferredPayoutPhone !== void 0 ? { preferredPayoutPhone } : {},
        ...skills !== void 0 ? { skillsJson: skills } : {},
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    return res.json({ updated: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ error: "Unable to update profile." });
  }
});
router3.post("/security/password", async (req, res) => {
  try {
    const user = req.authUser;
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }
    const [dbUser] = await db.select().from(users).where(eq8(users.id, user.id)).limit(1);
    if (dbUser?.passwordHash && dbUser?.passwordSalt) {
      if (!verifyPassword(currentPassword, dbUser.passwordHash, dbUser.passwordSalt)) {
        return res.status(400).json({ error: "Current password is incorrect." });
      }
    }
    const { hash, salt } = hashPassword(newPassword);
    await db.update(users).set({ passwordHash: hash, passwordSalt: salt, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(users.id, user.id));
    return res.json({ updated: true });
  } catch (error) {
    console.error("Password change error:", error);
    return res.status(500).json({ error: "Unable to update password." });
  }
});
var member_default = router3;

// server/routes/admin.ts
import crypto4 from "node:crypto";
import { Router as Router4 } from "express";
import { desc as desc4, eq as eq9, sql as sql7 } from "drizzle-orm";
import { z as z3 } from "zod";
var router4 = Router4();
router4.use(requireAuth);
router4.use(requireRole(["admin", "finance_admin", "owner"]));
router4.get("/overview", async (_req, res) => {
  try {
    const [
      memberCounts,
      jobCounts,
      pendingSubmissions,
      pendingWithdrawals,
      pendingPayments,
      recentNotifs,
      recentAudits
    ] = await Promise.all([
      db.select({
        total: sql7`count(*)::int`,
        paid: sql7`COUNT(*) FILTER (WHERE ${users.membershipTier} != 'free')::int`
      }).from(users),
      db.select({
        total: sql7`count(*)::int`,
        published: sql7`COUNT(*) FILTER (WHERE ${jobs.status} = 'published')::int`
      }).from(jobs),
      db.select({ count: sql7`count(*)::int` }).from(jobSubmissions).where(sql7`${jobSubmissions.status} IN ('submitted', 'under_review')`),
      db.select({ count: sql7`count(*)::int` }).from(withdrawals).where(eq9(withdrawals.status, "pending")),
      db.select({ count: sql7`count(*)::int` }).from(subscriptionTransactions).where(eq9(subscriptionTransactions.status, "pending")),
      db.select().from(notifications).where(eq9(notifications.targetRole, "admin")).orderBy(desc4(notifications.createdAt)).limit(12),
      db.select().from(auditLogs).orderBy(desc4(auditLogs.createdAt)).limit(15)
    ]);
    return res.json({
      stats: {
        totalMembers: memberCounts[0]?.total ?? 0,
        paidMembers: memberCounts[0]?.paid ?? 0,
        totalJobs: jobCounts[0]?.total ?? 0,
        publishedJobs: jobCounts[0]?.published ?? 0,
        pendingSubmissions: pendingSubmissions[0]?.count ?? 0,
        pendingWithdrawals: pendingWithdrawals[0]?.count ?? 0,
        pendingPayments: pendingPayments[0]?.count ?? 0
      },
      notifications: recentNotifs,
      auditLogs: recentAudits
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return res.status(500).json({ error: "Unable to load admin overview." });
  }
});
router4.get("/members", async (_req, res) => {
  try {
    const rows = await db.select({
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
      createdAt: users.createdAt
    }).from(users).orderBy(desc4(users.createdAt));
    const allRoles = await db.select().from(roles);
    return res.json({ members: rows, roles: allRoles });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load members." });
  }
});
router4.patch("/members/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const actor = req.authUser;
    const status = typeof req.body?.status === "string" ? req.body.status : void 0;
    const roleSlug = typeof req.body?.roleSlug === "string" ? req.body.roleSlug : void 0;
    if (roleSlug && actor.roleSlug !== "owner") {
      return res.status(403).json({ error: "Only the Platform Owner can modify user roles." });
    }
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (status && ["active", "suspended"].includes(status)) updates.status = status;
    if (roleSlug && ["member", "admin", "finance_admin", "owner"].includes(roleSlug)) {
      const [r] = await db.select().from(roles).where(eq9(roles.slug, roleSlug)).limit(1);
      updates.roleSlug = roleSlug;
      if (r) updates.roleId = r.id;
    }
    const [updated] = await db.update(users).set(updates).where(eq9(users.id, id)).returning();
    await db.insert(auditLogs).values({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: "member_updated",
      entityType: "user",
      entityId: String(id),
      detailsJson: updates
    });
    return res.json({ member: updated });
  } catch (error) {
    return res.status(500).json({ error: "Unable to update member." });
  }
});
router4.get("/providers", async (_req, res) => {
  try {
    const [providers, verifications, categories] = await Promise.all([
      db.select().from(jobProviders).orderBy(desc4(jobProviders.createdAt)),
      db.select().from(providerVerifications).orderBy(desc4(providerVerifications.verifiedAt)),
      db.select().from(jobCategories).orderBy(jobCategories.sortOrder)
    ]);
    return res.json({ providers, verifications, categories });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load providers." });
  }
});
router4.post("/providers", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Provider name is required." });
    const [created] = await db.insert(jobProviders).values({
      name,
      websiteUrl: req.body?.websiteUrl || null,
      sourceUrl: req.body?.sourceUrl || null,
      classification: req.body?.classification === "verified" ? "verified" : "unverified",
      verificationStatus: req.body?.classification === "verified" ? "verified" : "pending",
      reliabilityScore: Number(req.body?.reliabilityScore ?? 85),
      partnershipNotes: req.body?.partnershipNotes || null,
      contactEmail: req.body?.contactEmail || null,
      isSample: Boolean(req.body?.isSample)
    }).returning();
    await db.insert(auditLogs).values({
      actorUserId: req.authUser.id,
      actorEmail: req.authUser.email,
      action: "provider_created",
      entityType: "job_provider",
      entityId: String(created.id),
      detailsJson: { name, classification: created.classification }
    });
    return res.status(201).json({ provider: created });
  } catch (error) {
    return res.status(500).json({ error: "Unable to create provider." });
  }
});
router4.post("/providers/:id/verify", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "verified");
    const evidenceSummary = String(req.body?.evidenceSummary || "").trim();
    if (!evidenceSummary) {
      return res.status(400).json({ error: "Verification evidence summary is required." });
    }
    const classification = status === "verified" ? "verified" : "unverified";
    const [updated] = await db.update(jobProviders).set({
      classification,
      verificationStatus: status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(jobProviders.id, id)).returning();
    const [log] = await db.insert(providerVerifications).values({
      providerId: id,
      verifiedByUserId: req.authUser.id,
      status,
      evidenceSummary,
      evidenceUrl: req.body?.evidenceUrl || null,
      sourceCheckNotes: req.body?.sourceCheckNotes || null
    }).returning();
    return res.json({ provider: updated, verification: log });
  } catch (error) {
    return res.status(500).json({ error: "Unable to update provider verification." });
  }
});
router4.get("/jobs", async (_req, res) => {
  try {
    const rows = await db.select({
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
      providerClassification: jobProviders.classification
    }).from(jobs).innerJoin(jobCategories, eq9(jobs.categoryId, jobCategories.id)).innerJoin(jobProviders, eq9(jobs.providerId, jobProviders.id)).orderBy(desc4(jobs.createdAt));
    return res.json({ jobs: rows });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load admin jobs." });
  }
});
var jobSchema = z3.object({
  title: z3.string().min(4),
  description: z3.string().min(10),
  categoryId: z3.number().int().positive(),
  providerId: z3.number().int().positive(),
  sourceUrl: z3.string().optional(),
  instructions: z3.string().min(5),
  requiredSkills: z3.array(z3.string()).default([]),
  difficulty: z3.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  estimatedDuration: z3.string().default("30 mins"),
  rewardUsd: z3.number().positive(),
  availablePositions: z3.number().int().positive(),
  deadlineAt: z3.string(),
  minTier: z3.enum(["free", "verified", "pro", "top_rated"]).default("free"),
  submissionRequirements: z3.string().min(4),
  paymentConditions: z3.string().default("Paid in USD upon QA approval."),
  status: z3.string().default("published"),
  isFeatured: z3.boolean().default(false),
  isSponsored: z3.boolean().default(false),
  isSample: z3.boolean().default(false)
});
function tiersForMin(minTier) {
  if (minTier === "top_rated") return ["top_rated"];
  if (minTier === "pro") return ["pro", "top_rated"];
  if (minTier === "verified") return ["verified", "pro", "top_rated"];
  return ["free", "verified", "pro", "top_rated"];
}
router4.post("/jobs", async (req, res) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid job payload." });
    }
    const d = parsed.data;
    if (d.minTier === "free" && d.rewardUsd > 0.1) {
      return res.status(400).json({
        error: "Free-tier micro-tasks are capped at $0.10 USD (e.g. $0.01 per task)."
      });
    }
    if (d.minTier !== "free" && d.rewardUsd < 2) {
      return res.status(400).json({
        error: "Tasks paying $2.00 or higher \u2014 and all Verified, Pro, or Top-Rated tasks \u2014 must pay at least $2.00 USD."
      });
    }
    const jobCode = `WRK-${Date.now().toString().slice(-5)}-${crypto4.randomBytes(2).toString("hex").toUpperCase()}`;
    const [created] = await db.insert(jobs).values({
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
      publishedAt: d.status === "published" ? /* @__PURE__ */ new Date() : null,
      deadlineAt: new Date(d.deadlineAt),
      minTier: d.minTier,
      eligibleTiersJson: tiersForMin(d.minTier),
      submissionRequirements: d.submissionRequirements,
      paymentConditions: d.paymentConditions,
      status: d.status,
      isFeatured: d.isFeatured,
      isSponsored: d.isSponsored,
      isSample: d.isSample,
      createdByUserId: req.authUser.id
    }).returning();
    await db.insert(auditLogs).values({
      actorUserId: req.authUser.id,
      actorEmail: req.authUser.email,
      action: "job_created",
      entityType: "job",
      entityId: String(created.id),
      detailsJson: { jobCode, title: d.title, rewardUsd: d.rewardUsd }
    });
    return res.status(201).json({ job: created });
  } catch (error) {
    console.error("Create job error:", error);
    return res.status(500).json({ error: "Unable to create job." });
  }
});
router4.patch("/jobs/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "");
    const allowed = ["draft", "pending_verification", "approved", "published", "paused", "closed", "expired"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid job status." });
    const [updated] = await db.update(jobs).set({
      status,
      publishedAt: status === "published" ? /* @__PURE__ */ new Date() : void 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(jobs.id, id)).returning();
    return res.json({ job: updated });
  } catch (error) {
    return res.status(500).json({ error: "Unable to update job status." });
  }
});
router4.post("/jobs/:id/duplicate", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [orig] = await db.select().from(jobs).where(eq9(jobs.id, id)).limit(1);
    if (!orig) return res.status(404).json({ error: "Job not found." });
    const [copy] = await db.insert(jobs).values({
      ...orig,
      id: void 0,
      jobCode: `${orig.jobCode}-CPY-${crypto4.randomBytes(2).toString("hex").toUpperCase()}`,
      title: `${orig.title} (Copy)`,
      filledPositions: 0,
      status: "draft",
      publishedAt: null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      createdByUserId: req.authUser.id
    }).returning();
    return res.status(201).json({ job: copy });
  } catch (error) {
    return res.status(500).json({ error: "Unable to duplicate job." });
  }
});
router4.get("/submissions", async (_req, res) => {
  try {
    const rows = await db.select({
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
      workerEmail: users.email
    }).from(jobSubmissions).innerJoin(jobs, eq9(jobSubmissions.jobId, jobs.id)).innerJoin(users, eq9(jobSubmissions.userId, users.id)).orderBy(desc4(jobSubmissions.submittedAt));
    const allocations = await db.select({
      id: jobAllocations.id,
      weekKey: jobAllocations.weekKey,
      membershipTierAtAllocation: jobAllocations.membershipTierAtAllocation,
      status: jobAllocations.status,
      allocatedAt: jobAllocations.allocatedAt,
      jobTitle: jobs.title,
      workerName: users.fullName
    }).from(jobAllocations).innerJoin(jobs, eq9(jobAllocations.jobId, jobs.id)).innerJoin(users, eq9(jobAllocations.userId, users.id)).orderBy(desc4(jobAllocations.allocatedAt)).limit(50);
    return res.json({ submissions: rows, allocations });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load submissions." });
  }
});
router4.post("/submissions/:id/review", async (req, res) => {
  try {
    const submissionId = Number(req.params.id);
    const decision = String(req.body?.decision || "");
    const feedback = String(req.body?.feedback || "").trim();
    if (!["approved", "rejected", "correction_requested"].includes(decision) || !feedback) {
      return res.status(400).json({ error: "Decision and reviewer feedback are required." });
    }
    const result = await db.transaction(async (tx) => {
      const [sub] = await tx.select().from(jobSubmissions).where(eq9(jobSubmissions.id, submissionId)).limit(1);
      if (!sub) throw new Error("Submission not found.");
      const [jobRow] = await tx.select().from(jobs).where(eq9(jobs.id, sub.jobId)).limit(1);
      if (!jobRow) throw new Error("Job not found.");
      const [updatedSub] = await tx.update(jobSubmissions).set({ status: decision, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(jobSubmissions.id, submissionId)).returning();
      await tx.insert(submissionReviews).values({
        submissionId,
        reviewerUserId: req.authUser.id,
        decision,
        feedback
      });
      if (decision === "approved") {
        const rewardNum = Number(jobRow.rewardUsd);
        const [earning] = await tx.insert(earnings).values({
          userId: sub.userId,
          jobId: sub.jobId,
          submissionId: sub.id,
          amountUsd: rewardNum.toFixed(2),
          status: "approved",
          isSample: jobRow.isSample,
          approvedAt: /* @__PURE__ */ new Date()
        }).onConflictDoNothing().returning();
        if (earning) {
          const [updatedUser] = await tx.update(users).set({
            completedApprovedJobs: sql7`${users.completedApprovedJobs} + 1`,
            achievement50Jobs: sql7`CASE WHEN ${users.completedApprovedJobs} + 1 >= 50 THEN true ELSE ${users.achievement50Jobs} END`,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq9(users.id, sub.userId)).returning();
          await tx.update(workerPerformance).set({
            totalApproved: sql7`${workerPerformance.totalApproved} + 1`,
            currentStreak: sql7`${workerPerformance.currentStreak} + 1`,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq9(workerPerformance.userId, sub.userId));
          await tx.insert(financialLedger).values({
            entryNumber: `FL-WRK-${earning.id}-${Date.now()}`,
            ledgerScope: "worker_earnings",
            category: "approved_task_payout_liability",
            direction: "credit",
            amountUsd: rewardNum.toFixed(2),
            referenceId: `SUB-${sub.id}`,
            description: `Worker earnings approved for "${jobRow.title}"`,
            isSample: jobRow.isSample,
            recordedByUserId: req.authUser.id
          });
          await tx.insert(notifications).values({
            userId: sub.userId,
            targetRole: "member",
            category: "earnings",
            title: `Submission approved: +$${rewardNum.toFixed(2)} USD`,
            message: `Your work on "${jobRow.title}" was approved (${feedback}).${updatedUser.completedApprovedJobs === 50 ? " Achievement unlocked: 50 Jobs Completed badge!" : ""}`,
            linkPath: "/portal/earnings"
          });
        }
      } else {
        if (decision === "rejected") {
          await tx.update(workerPerformance).set({
            totalRejected: sql7`${workerPerformance.totalRejected} + 1`,
            currentStreak: 0,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq9(workerPerformance.userId, sub.userId));
        }
        await tx.insert(notifications).values({
          userId: sub.userId,
          targetRole: "member",
          category: "submission",
          title: decision === "rejected" ? `Submission rejected: ${jobRow.title}` : `Correction requested: ${jobRow.title}`,
          message: `Reviewer feedback: ${feedback}`,
          linkPath: "/portal/my-submissions"
        });
      }
      return updatedSub;
    });
    return res.json({ submission: result });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to review submission." });
  }
});
router4.get("/plans-and-rates", async (_req, res) => {
  try {
    const [plans, settings, rates] = await Promise.all([
      db.select().from(membershipPlans).orderBy(membershipPlans.sortOrder),
      db.select().from(pricingSettings),
      db.select().from(exchangeRates).orderBy(desc4(exchangeRates.createdAt)).limit(25)
    ]);
    return res.json({ plans, pricingSettings: settings, exchangeRates: rates });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load plans and rates." });
  }
});
router4.patch("/plans/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const priceUsd = Number(req.body?.priceUsd);
    const billingIntervalDays = Number(req.body?.billingIntervalDays);
    const weeklyJobLimit = Number(req.body?.weeklyJobLimit);
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (Number.isFinite(priceUsd) && priceUsd >= 0) updates.priceUsd = priceUsd.toFixed(2);
    if (Number.isInteger(billingIntervalDays) && billingIntervalDays > 0) {
      updates.billingIntervalDays = billingIntervalDays;
    }
    if (Number.isInteger(weeklyJobLimit)) {
      updates.weeklyJobLimit = weeklyJobLimit;
    }
    const [updated] = await db.update(membershipPlans).set(updates).where(eq9(membershipPlans.id, id)).returning();
    await db.insert(auditLogs).values({
      actorUserId: req.authUser.id,
      actorEmail: req.authUser.email,
      action: "membership_plan_updated",
      entityType: "membership_plan",
      entityId: String(id),
      detailsJson: updates
    });
    return res.json({ plan: updated });
  } catch (error) {
    return res.status(500).json({ error: "Unable to update membership plan." });
  }
});
router4.patch("/pricing-settings/:key", async (req, res) => {
  try {
    const key = req.params.key;
    const val = Number(req.body?.valueNumeric);
    if (!Number.isFinite(val) || val < 0) {
      return res.status(400).json({ error: "Valid numeric value required." });
    }
    const [updated] = await db.update(pricingSettings).set({
      valueText: val.toFixed(2),
      valueNumeric: val.toFixed(4),
      updatedByUserId: req.authUser.id,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(pricingSettings.key, key)).returning();
    return res.json({ setting: updated });
  } catch (error) {
    return res.status(500).json({ error: "Unable to update pricing setting." });
  }
});
router4.post("/exchange-rates/refresh", async (req, res) => {
  try {
    const rate = await refreshLiveUsdKesRate(req.authUser.id);
    return res.json({ rate });
  } catch (error) {
    return res.status(500).json({ error: "Unable to refresh live rate." });
  }
});
router4.post("/exchange-rates/manual", async (req, res) => {
  try {
    const rateVal = Number(req.body?.rate);
    const notes = String(req.body?.notes || "Manual rate override");
    if (!Number.isFinite(rateVal) || rateVal < 50 || rateVal > 500) {
      return res.status(400).json({ error: "Enter a valid USD/KES rate between 50 and 500." });
    }
    const rate = await setManualUsdKesRate(rateVal, notes, req.authUser.id);
    return res.json({ rate });
  } catch (error) {
    return res.status(500).json({ error: "Unable to save manual rate." });
  }
});
router4.get("/payments", async (_req, res) => {
  try {
    const [txs, subs] = await Promise.all([
      db.select({
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
        memberEmail: users.email
      }).from(subscriptionTransactions).innerJoin(users, eq9(subscriptionTransactions.userId, users.id)).orderBy(desc4(subscriptionTransactions.createdAt)).limit(100),
      db.select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        planSlug: subscriptions.planSlug,
        status: subscriptions.status,
        amountUsd: subscriptions.amountUsd,
        startsAt: subscriptions.startsAt,
        expiresAt: subscriptions.expiresAt,
        memberName: users.fullName
      }).from(subscriptions).innerJoin(users, eq9(subscriptions.userId, users.id)).orderBy(desc4(subscriptions.createdAt)).limit(50)
    ]);
    return res.json({ transactions: txs, subscriptions: subs });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load payment records." });
  }
});
router4.post("/payments/:id/reconcile-sandbox", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const outcome = String(req.body?.outcome || "confirm");
    const [tx] = await db.select().from(subscriptionTransactions).where(eq9(subscriptionTransactions.id, id)).limit(1);
    if (!tx) return res.status(404).json({ error: "Transaction not found." });
    const resultCode = outcome === "confirm" ? 0 : outcome === "cancel" ? 1032 : 1;
    const receipt = outcome === "confirm" ? `SBX${Date.now().toString().slice(-6)}${crypto4.randomBytes(2).toString("hex").toUpperCase()}` : void 0;
    const result = await confirmSubscriptionPayment({
      checkoutRequestId: tx.checkoutRequestId,
      resultCode,
      mpesaReceiptNumber: receipt,
      callbackPayload: {
        source: "admin_sandbox_reconciliation",
        reconciledBy: req.authUser.email,
        outcome
      },
      isSample: true
    });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to reconcile payment." });
  }
});
router4.post("/payments/:id/refund", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "Administrator refund");
    const refunded = await refundSubscriptionTransaction({
      transactionId: id,
      reason,
      actorUserId: req.authUser.id
    });
    return res.json({ transaction: refunded });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Refund failed." });
  }
});
router4.get("/withdrawals", async (_req, res) => {
  try {
    const rows = await db.select({
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
      memberEmail: users.email
    }).from(withdrawals).innerJoin(users, eq9(withdrawals.userId, users.id)).orderBy(desc4(withdrawals.requestedAt));
    return res.json({ withdrawals: rows });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load withdrawals." });
  }
});
router4.post("/withdrawals/:id/process", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "");
    const transactionReference = String(req.body?.transactionReference || "").trim();
    const adminNote = String(req.body?.adminNote || "").trim();
    if (!["approved", "paid", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid withdrawal status." });
    }
    if (status === "paid" && !transactionReference) {
      return res.status(400).json({ error: "M-Pesa payout reference is required when marking Paid." });
    }
    const updated = await db.transaction(async (tx) => {
      const [w] = await tx.select().from(withdrawals).where(eq9(withdrawals.id, id)).limit(1);
      if (!w) throw new Error("Withdrawal not found.");
      const [next] = await tx.update(withdrawals).set({
        status,
        transactionReference: transactionReference || w.transactionReference,
        adminNote: adminNote || w.adminNote,
        reviewedByUserId: req.authUser.id,
        processedAt: status === "paid" || status === "rejected" ? /* @__PURE__ */ new Date() : w.processedAt
      }).where(eq9(withdrawals.id, id)).returning();
      if (status === "paid" && w.ledgerType === "referral_commissions") {
        const amt = Number(w.amountUsd);
        const walletAgg = await tx.select({
          bal: sql7`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`
        }).from(referralWalletTransactions).where(eq9(referralWalletTransactions.userId, w.userId));
        const currentBal = Number(walletAgg[0]?.bal ?? 0);
        await tx.insert(referralWalletTransactions).values({
          userId: w.userId,
          withdrawalId: w.id,
          entryType: "debit",
          amountUsd: amt.toFixed(2),
          balanceAfterUsd: Math.max(0, currentBal - amt).toFixed(2),
          description: `Referral payout via M-Pesa (${transactionReference})`
        });
      }
      await tx.insert(notifications).values({
        userId: w.userId,
        targetRole: "member",
        category: "withdrawal",
        title: `Withdrawal ${status}`,
        message: `Your $${Number(w.amountUsd).toFixed(2)} USD (${w.ledgerType.replace("_", " ")}) request is now ${status}${transactionReference ? ` (Ref: ${transactionReference})` : ""}.`,
        linkPath: "/portal/withdrawals"
      });
      return next;
    });
    return res.json({ withdrawal: updated });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to process withdrawal." });
  }
});
router4.get("/referrals-overview", async (_req, res) => {
  try {
    const [relationships, commissions, partners, links, contracts] = await Promise.all([
      db.select({
        id: referralRelationships.id,
        referrerUserId: referralRelationships.referrerUserId,
        referredUserId: referralRelationships.referredUserId,
        referralCode: referralRelationships.referralCode,
        status: referralRelationships.status,
        createdAt: referralRelationships.createdAt,
        referredEmail: users.email,
        referredName: users.fullName
      }).from(referralRelationships).innerJoin(users, eq9(referralRelationships.referredUserId, users.id)).orderBy(desc4(referralRelationships.createdAt)),
      db.select().from(referralCommissions).orderBy(desc4(referralCommissions.createdAt)),
      db.select().from(affiliatePartners).orderBy(desc4(affiliatePartners.createdAt)),
      db.select().from(affiliateLinks),
      db.select().from(projectContracts).orderBy(desc4(projectContracts.createdAt))
    ]);
    return res.json({ relationships, commissions, affiliatePartners: partners, affiliateLinks: links, projectContracts: contracts });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load referral & partner overview." });
  }
});
router4.post("/referrals/commissions/:id/reverse", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || "Fraudulent or invalid referral activity");
    const updated = await db.transaction(async (tx) => {
      const [comm] = await tx.select().from(referralCommissions).where(eq9(referralCommissions.id, id)).limit(1);
      if (!comm) throw new Error("Commission not found.");
      if (comm.status === "reversed") throw new Error("Already reversed.");
      const [next] = await tx.update(referralCommissions).set({ status: "reversed", reversedAt: /* @__PURE__ */ new Date(), reversalReason: reason }).where(eq9(referralCommissions.id, id)).returning();
      const amt = Number(comm.commissionAmountUsd);
      const walletAgg = await tx.select({
        bal: sql7`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`
      }).from(referralWalletTransactions).where(eq9(referralWalletTransactions.userId, comm.referrerUserId));
      const currentBal = Number(walletAgg[0]?.bal ?? 0);
      await tx.insert(referralWalletTransactions).values({
        userId: comm.referrerUserId,
        commissionId: comm.id,
        entryType: "reversal",
        amountUsd: amt.toFixed(2),
        balanceAfterUsd: (currentBal - amt).toFixed(2),
        description: `Admin reversal: ${reason}`
      });
      return next;
    });
    return res.json({ commission: updated });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to reverse commission." });
  }
});
router4.post("/referrals/suspend-code/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const suspend = Boolean(req.body?.suspend ?? true);
    await db.update(referralCodes).set({ isSuspended: suspend }).where(eq9(referralCodes.userId, userId));
    return res.json({ updated: true, isSuspended: suspend });
  } catch (error) {
    return res.status(500).json({ error: "Unable to update referral code status." });
  }
});
router4.post("/affiliates", async (req, res) => {
  try {
    const { name, category, websiteUrl, disclosureText, commissionRateDesc, slug, campaignName } = req.body || {};
    if (!name || !websiteUrl || !slug) {
      return res.status(400).json({ error: "Name, website URL, and slug are required." });
    }
    const [partner] = await db.insert(affiliatePartners).values({
      name,
      category: category || "Digital Services",
      websiteUrl,
      disclosureText: disclosureText || "Disclosed authorized affiliate partnership.",
      commissionRateDesc: commissionRateDesc || "10% CPA",
      agreementStatus: "active"
    }).returning();
    const [link] = await db.insert(affiliateLinks).values({
      partnerId: partner.id,
      slug,
      targetUrl: websiteUrl,
      campaignName: campaignName || name
    }).returning();
    return res.status(201).json({ partner, link });
  } catch (error) {
    return res.status(500).json({ error: "Unable to add affiliate partner." });
  }
});
router4.post("/affiliates/:id/commission", async (req, res) => {
  try {
    const partnerId = Number(req.params.id);
    const amountUsd = Number(req.body?.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return res.status(400).json({ error: "Valid USD commission amount required." });
    }
    const [comm] = await db.insert(affiliateCommissions).values({
      partnerId,
      amountUsd: amountUsd.toFixed(2),
      status: "earned"
    }).returning();
    await db.insert(financialLedger).values({
      entryNumber: `FL-AFF-${comm.id}-${Date.now()}`,
      ledgerScope: "platform_revenue",
      category: "affiliate_commission",
      direction: "credit",
      amountUsd: amountUsd.toFixed(2),
      referenceId: `AFF-${comm.id}`,
      description: `Affiliate partner #${partnerId} earned commission`,
      recordedByUserId: req.authUser.id
    });
    return res.status(201).json({ commission: comm });
  } catch (error) {
    return res.status(500).json({ error: "Unable to record affiliate commission." });
  }
});
router4.post("/project-contracts", async (req, res) => {
  try {
    const clientName = String(req.body?.clientName || "").trim();
    const title = String(req.body?.title || "").trim();
    const revenueType = String(req.body?.revenueType || "managed_project");
    const totalValueUsd = Number(req.body?.totalValueUsd);
    const commissionPct = Number(req.body?.commissionPct ?? 10);
    const agreementVerified = Boolean(req.body?.agreementVerified ?? true);
    if (!clientName || !title || !Number.isFinite(totalValueUsd) || totalValueUsd <= 0) {
      return res.status(400).json({ error: "Client name, title, and valid USD contract value required." });
    }
    if (!agreementVerified) {
      return res.status(400).json({ error: "Managed project commissions require a verified agreement." });
    }
    const platformCommissionUsd = Number((totalValueUsd * commissionPct / 100).toFixed(2));
    const workerPayoutUsd = Number((totalValueUsd - platformCommissionUsd).toFixed(2));
    const contractCode = `PRJ-${Date.now().toString().slice(-6)}`;
    const [contract] = await db.insert(projectContracts).values({
      contractCode,
      clientName,
      title,
      revenueType,
      totalValueUsd: totalValueUsd.toFixed(2),
      workerPayoutUsd: workerPayoutUsd.toFixed(2),
      commissionPct: commissionPct.toFixed(2),
      platformCommissionUsd: platformCommissionUsd.toFixed(2),
      agreementVerified,
      status: "completed",
      isSample: false
    }).returning();
    await db.insert(projectCommissions).values({
      contractId: contract.id,
      amountUsd: platformCommissionUsd.toFixed(2),
      status: "realized"
    });
    await db.insert(financialLedger).values({
      entryNumber: `FL-PRJ-${contract.id}-${Date.now()}`,
      ledgerScope: "platform_revenue",
      category: revenueType,
      direction: "credit",
      amountUsd: platformCommissionUsd.toFixed(2),
      referenceId: contractCode,
      description: `${commissionPct}% platform commission on "${title}" ($${totalValueUsd.toFixed(2)} contract)`,
      recordedByUserId: req.authUser.id
    });
    return res.status(201).json({ contract });
  } catch (error) {
    return res.status(500).json({ error: "Unable to record managed project contract." });
  }
});
router4.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(adminSettings);
    return res.json({ settings: rows });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load settings." });
  }
});
router4.patch("/settings/:key", async (req, res) => {
  try {
    const key = req.params.key;
    const [updated] = await db.update(adminSettings).set({
      valueText: req.body?.valueText ?? "updated",
      valueJson: req.body?.valueJson ?? {},
      updatedByUserId: req.authUser.id,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(adminSettings.key, key)).returning();
    return res.json({ setting: updated });
  } catch (error) {
    return res.status(500).json({ error: "Unable to update settings." });
  }
});
var admin_default = router4;

// server/routes/owner.ts
import { Router as Router5 } from "express";
import { and as and5, desc as desc5, eq as eq10, gte, sql as sql8 } from "drizzle-orm";
import { z as z4 } from "zod";
var router5 = Router5();
router5.use(requireAuth);
router5.use(requireRole(["owner", "finance_admin"]));
function getPeriodStart(period) {
  const now = Date.now();
  switch (period) {
    case "daily":
      return new Date(now - 24 * 60 * 60 * 1e3);
    case "weekly":
      return new Date(now - 7 * 24 * 60 * 60 * 1e3);
    case "monthly":
      return new Date(now - 30 * 24 * 60 * 60 * 1e3);
    case "quarterly":
      return new Date(now - 90 * 24 * 60 * 60 * 1e3);
    case "annual":
      return new Date(now - 365 * 24 * 60 * 60 * 1e3);
    default:
      return null;
  }
}
router5.get("/dashboard", async (req, res) => {
  try {
    const period = String(req.query.period || "all");
    const includeSample = req.query.includeSample !== "false";
    const since = getPeriodStart(period);
    const txConditions = [eq10(subscriptionTransactions.status, "confirmed")];
    if (since) txConditions.push(gte(subscriptionTransactions.confirmedAt, since));
    if (!includeSample) txConditions.push(eq10(subscriptionTransactions.isSample, false));
    const expConditions = [];
    if (since) expConditions.push(gte(expenses.incurredAt, since));
    if (!includeSample) expConditions.push(eq10(expenses.isSample, false));
    const contractConditions = [];
    if (since) contractConditions.push(gte(projectContracts.createdAt, since));
    if (!includeSample) contractConditions.push(eq10(projectContracts.isSample, false));
    const earningConditions = [sql8`${earnings.status} IN ('approved','available','withdrawn')`];
    if (since) earningConditions.push(gte(earnings.earnedAt, since));
    if (!includeSample) earningConditions.push(eq10(earnings.isSample, false));
    const [
      confirmedSubs,
      refComms,
      allContracts,
      allAffiliateComms,
      allExpenses,
      workerLiabilities,
      ledgerEntries,
      totalUsersRow,
      totalReferralsRow
    ] = await Promise.all([
      db.select().from(subscriptionTransactions).where(and5(...txConditions)),
      db.select().from(referralCommissions),
      db.select().from(projectContracts).where(contractConditions.length ? and5(...contractConditions) : void 0),
      db.select().from(affiliateCommissions),
      db.select().from(expenses).where(expConditions.length ? and5(...expConditions) : void 0).orderBy(desc5(expenses.incurredAt)),
      db.select({
        total: sql8`COALESCE(SUM(${earnings.amountUsd}), 0)`,
        unpaid: sql8`COALESCE(SUM(CASE WHEN ${earnings.status} IN ('approved','available') THEN ${earnings.amountUsd} ELSE 0 END), 0)`
      }).from(earnings).where(and5(...earningConditions)),
      db.select().from(financialLedger).orderBy(desc5(financialLedger.occurredAt)).limit(100),
      db.select({
        total: sql8`count(*)::int`,
        paying: sql8`COUNT(*) FILTER (WHERE ${users.membershipTier} != 'free')::int`
      }).from(users),
      db.select({ count: sql8`count(*)::int` }).from(referralRelationships)
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
      if (tx.planSlug === "verified") verifiedRevenue += amt;
      else if (tx.planSlug === "pro") proRevenue += amt;
      else if (tx.planSlug === "top_rated") topRatedRevenue += amt;
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
      if (c.revenueType === "corporate") corporateRevenue += amt;
      else if (c.revenueType === "sponsored_placement") sponsoredPlacementRevenue += amt;
      else projectCommissionRevenue += amt;
    }
    const affiliateRevenue = allAffiliateComms.filter((a) => a.status !== "pending").reduce((acc, a) => acc + Number(a.amountUsd), 0);
    const grossRevenue = totalSubscriptionRevenue + projectCommissionRevenue + corporateRevenue + affiliateRevenue + sponsoredPlacementRevenue;
    const totalReferralCommissionsPaidOrAvailable = filteredComms.filter((c) => c.status !== "reversed" && c.status !== "pending").reduce((acc, c) => acc + Number(c.commissionAmountUsd), 0);
    const totalReferralCommissionsPending = filteredComms.filter((c) => c.status === "pending").reduce((acc, c) => acc + Number(c.commissionAmountUsd), 0);
    const netRevenueRetainedFromReferrals = Math.max(
      0,
      referralDrivenSubRevenue - totalReferralCommissionsPaidOrAvailable
    );
    const operatingExpensesTotal = allExpenses.reduce((acc, e) => acc + Number(e.amountUsd), 0);
    const workerPaymentLiabilities = Number(workerLiabilities[0]?.total ?? 0);
    const unpaidWorkerLiabilities = Number(workerLiabilities[0]?.unpaid ?? 0);
    const netOperatingContribution = grossRevenue - totalReferralCommissionsPaidOrAvailable - workerPaymentLiabilities;
    const netProfit = netOperatingContribution - operatingExpensesTotal;
    const profitMarginPct = grossRevenue > 0 ? netProfit / grossRevenue * 100 : 0;
    const referrerStatsMap = /* @__PURE__ */ new Map();
    for (const c of filteredComms) {
      if (c.status === "reversed") continue;
      const cur = referrerStatsMap.get(c.referrerUserId) || {
        referrerUserId: c.referrerUserId,
        grossSalesUsd: 0,
        commissionUsd: 0,
        conversions: 0
      };
      cur.grossSalesUsd += Number(c.baseAmountUsd);
      cur.commissionUsd += Number(c.commissionAmountUsd);
      cur.conversions += 1;
      referrerStatsMap.set(c.referrerUserId, cur);
    }
    const topReferrerIds = Array.from(referrerStatsMap.keys());
    const referrerUsers = topReferrerIds.length > 0 ? await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users) : [];
    const userMap = new Map(referrerUsers.map((u) => [u.id, u]));
    const topReferrers = Array.from(referrerStatsMap.values()).sort((a, b) => b.grossSalesUsd - a.grossSalesUsd).slice(0, 8).map((r) => ({
      ...r,
      name: userMap.get(r.referrerUserId)?.fullName || `Member #${r.referrerUserId}`,
      email: userMap.get(r.referrerUserId)?.email || ""
    }));
    const totalUsers = totalUsersRow[0]?.total ?? 0;
    const payingMembers = totalUsersRow[0]?.paying ?? 0;
    const totalReferrals = totalReferralsRow[0]?.count ?? 0;
    const paidReferralCount = new Set(
      filteredComms.filter((c) => c.status !== "reversed").map((c) => c.referredUserId)
    ).size;
    const marketingSpend = allExpenses.filter((e) => e.category === "marketing").reduce((acc, e) => acc + Number(e.amountUsd), 0);
    const avgQuarterlySubPrice = payingMembers > 0 ? totalSubscriptionRevenue / Math.max(1, confirmedSubs.length) : 6;
    const projectedQuarterlyRenewals = Math.round(payingMembers * 0.78);
    const forecastNextQuarterSubRevenue = Number(
      ((payingMembers + Math.max(2, Math.round(totalUsers * 0.12))) * avgQuarterlySubPrice).toFixed(2)
    );
    const forecastReferralRevenue = Number((forecastNextQuarterSubRevenue * 0.25).toFixed(2));
    const forecastOperatingExpenses = Number(
      (operatingExpensesTotal > 0 ? operatingExpensesTotal : 45).toFixed(2)
    );
    const forecastPotentialProfit = Number(
      (forecastNextQuarterSubRevenue - forecastReferralRevenue * 0.1 - forecastOperatingExpenses).toFixed(2)
    );
    const expenseByCategory = {};
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
        grossRevenue: Number(grossRevenue.toFixed(2))
      },
      referralRevenue: {
        totalReferredSubscriptionSales: Number(referralDrivenSubRevenue.toFixed(2)),
        totalReferralCommissionsPaid: Number(totalReferralCommissionsPaidOrAvailable.toFixed(2)),
        totalReferralCommissionsPending: Number(totalReferralCommissionsPending.toFixed(2)),
        netRevenueRetainedFromReferrals: Number(netRevenueRetainedFromReferrals.toFixed(2)),
        recurringReferredSubscriptionRevenue: Number(recurringReferredSubRevenue.toFixed(2)),
        referralConversionRatePct: totalReferrals > 0 ? Number((paidReferralCount / totalReferrals * 100).toFixed(1)) : 0,
        topReferrers
      },
      profitability: {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        totalReferralCommissions: Number(totalReferralCommissionsPaidOrAvailable.toFixed(2)),
        workerPaymentLiabilities: Number(workerPaymentLiabilities.toFixed(2)),
        unpaidWorkerLiabilities: Number(unpaidWorkerLiabilities.toFixed(2)),
        totalOperatingExpenses: Number(operatingExpensesTotal.toFixed(2)),
        netOperatingContribution: Number(netOperatingContribution.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        profitMarginPct: Number(profitMarginPct.toFixed(1))
      },
      unitEconomics: {
        totalUsers,
        payingMembers,
        membershipConversionRatePct: totalUsers > 0 ? Number((payingMembers / totalUsers * 100).toFixed(1)) : 0,
        subscriptionRenewalRatePct: confirmedSubs.length > 0 ? Number((renewalCount / confirmedSubs.length * 100).toFixed(1)) : 0,
        revenuePerPayingMemberUsd: payingMembers > 0 ? Number((totalSubscriptionRevenue / payingMembers).toFixed(2)) : 0,
        customerAcquisitionCostUsd: payingMembers > 0 && marketingSpend > 0 ? Number((marketingSpend / payingMembers).toFixed(2)) : null
      },
      forecast: {
        isForecast: true,
        disclaimer: "Estimated projection based on active subscriptions and historical rates \u2014 strictly separate from realized accounting ledger results.",
        projectedQuarterlyRenewals,
        estimatedFutureSubscriptionRevenueUsd: forecastNextQuarterSubRevenue,
        estimatedReferralRevenueUsd: forecastReferralRevenue,
        estimatedOperatingExpensesUsd: forecastOperatingExpenses,
        estimatedPotentialProfitUsd: forecastPotentialProfit
      },
      expenses: allExpenses,
      expenseByCategory,
      ledgerEntries
    });
  } catch (error) {
    console.error("Owner dashboard error:", error);
    return res.status(500).json({ error: "Unable to load owner financial analytics." });
  }
});
var expenseSchema = z4.object({
  category: z4.enum([
    "referral_commissions",
    "worker_payments",
    "payment_processing",
    "hosting",
    "software",
    "marketing",
    "operational",
    "refunds",
    "other"
  ]),
  vendor: z4.string().min(2),
  description: z4.string().min(3),
  amountUsd: z4.number().positive(),
  incurredAt: z4.string().optional()
});
router5.post("/expenses", async (req, res) => {
  try {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid expense." });
    }
    const d = parsed.data;
    const occurred = d.incurredAt ? new Date(d.incurredAt) : /* @__PURE__ */ new Date();
    const [created] = await db.insert(expenses).values({
      category: d.category,
      vendor: d.vendor.trim(),
      description: d.description.trim(),
      amountUsd: d.amountUsd.toFixed(2),
      incurredAt: occurred,
      recordedByUserId: req.authUser.id,
      isSample: false
    }).returning();
    await db.insert(financialLedger).values({
      entryNumber: `FL-EXP-${created.id}-${Date.now()}`,
      ledgerScope: "business_expenses",
      category: d.category,
      direction: "debit",
      amountUsd: d.amountUsd.toFixed(2),
      referenceId: `EXP-${created.id}`,
      description: `${d.vendor}: ${d.description}`,
      isSample: false,
      recordedByUserId: req.authUser.id,
      occurredAt: occurred
    });
    await db.insert(auditLogs).values({
      actorUserId: req.authUser.id,
      actorEmail: req.authUser.email,
      action: "expense_recorded",
      entityType: "expense",
      entityId: String(created.id),
      detailsJson: { category: d.category, amountUsd: d.amountUsd, vendor: d.vendor }
    });
    return res.status(201).json({ expense: created });
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ error: "Unable to record expense." });
  }
});
router5.get("/reports/export", async (req, res) => {
  try {
    const reportType = String(req.query.type || "ledger");
    let csv = "";
    if (reportType === "expenses") {
      const rows = await db.select().from(expenses).orderBy(desc5(expenses.incurredAt));
      csv = "ID,Category,Vendor,Description,Amount_USD,Incurred_At,Is_Sample\n";
      for (const r of rows) {
        csv += `${r.id},"${r.category}","${r.vendor.replace(/"/g, '""')}","${r.description.replace(/"/g, '""')}",${r.amountUsd},${new Date(r.incurredAt).toISOString()},${r.isSample}
`;
      }
    } else if (reportType === "referrals") {
      const rows = await db.select().from(referralCommissions).orderBy(desc5(referralCommissions.createdAt));
      csv = "ID,Referrer_ID,Referred_ID,Sub_Tx_ID,Rate_Pct,Base_USD,Commission_USD,Retained_USD,Status,Is_Renewal,Created_At\n";
      for (const r of rows) {
        csv += `${r.id},${r.referrerUserId},${r.referredUserId},${r.subscriptionTransactionId},${r.commissionRatePct},${r.baseAmountUsd},${r.commissionAmountUsd},${r.retainedAmountUsd},${r.status},${r.isRenewal},${new Date(r.createdAt).toISOString()}
`;
      }
    } else {
      const rows = await db.select().from(financialLedger).orderBy(desc5(financialLedger.occurredAt));
      csv = "Entry_Number,Ledger_Scope,Category,Direction,Amount_USD,Amount_KES,Exchange_Rate,Reference_ID,Description,Is_Sample,Occurred_At\n";
      for (const r of rows) {
        csv += `"${r.entryNumber}","${r.ledgerScope}","${r.category}","${r.direction}",${r.amountUsd},${r.amountKes ?? ""},${r.exchangeRate ?? ""},"${r.referenceId ?? ""}","${r.description.replace(/"/g, '""')}",${r.isSample},${new Date(r.occurredAt).toISOString()}
`;
      }
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="workabyai-${reportType}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
    );
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: "Unable to export CSV report." });
  }
});
var owner_default = router5;

// server/app.ts
function createApiApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "workaby-api",
      dbConfigured: Boolean(process.env.SQL_HOST || process.env.DATABASE_URL || process.env.POSTGRES_URL),
      sessionSecretConfigured: Boolean(process.env.SESSION_SECRET?.trim())
    });
  });
  const rateHits = /* @__PURE__ */ new Map();
  app.use("/api", (req, res, next) => {
    const key = `${req.ip}:${req.path.split("/").slice(0, 4).join("/")}`;
    const now = Date.now();
    const entry = rateHits.get(key);
    if (!entry || entry.resetAt < now) {
      rateHits.set(key, { count: 1, resetAt: now + 6e4 });
    } else {
      entry.count += 1;
      if (entry.count > 120) {
        return res.status(429).json({ error: "Too many requests. Please try again shortly." });
      }
    }
    next();
  });
  app.use("/api", async (_req, res, next) => {
    if (!process.env.SQL_HOST && !process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      return res.status(503).json({
        error: "Database environment variables are not configured. Set DATABASE_URL in Vercel.",
        code: "DB_NOT_CONFIGURED"
      });
    }
    try {
      await ensureSeeded();
      next();
    } catch (error) {
      console.error("Database bootstrap error:", error);
      const pgCode = String(error?.code || error?.cause?.code || "");
      if (pgCode === "42P01") {
        return res.status(503).json({
          error: "Database tables are missing. Push the Drizzle schema to your PostgreSQL database (npm run db:push) and retry.",
          code: "DB_SCHEMA_MISSING"
        });
      }
      if (pgCode === "28P01" || pgCode === "28000") {
        return res.status(503).json({
          error: "Database authentication failed. Please verify your DATABASE_URL credentials.",
          code: "DB_AUTH_FAILED"
        });
      }
      return res.status(503).json({
        error: "Database connection unavailable. Please verify database environment variables.",
        code: "DB_UNAVAILABLE"
      });
    }
  });
  app.post("/api/mpesa/callback", async (req, res) => {
    try {
      const configuredSecret = process.env.MPESA_CALLBACK_SECRET?.trim();
      if (configuredSecret) {
        const provided = req.query.secret || req.headers["x-mpesa-secret"];
        if (provided !== configuredSecret) {
          return res.status(403).json({ ResultCode: 1, ResultDesc: "Unauthorized callback" });
        }
      }
      const stkCallback = req.body?.Body?.stkCallback;
      if (!stkCallback || !stkCallback.CheckoutRequestID) {
        return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid STK callback payload" });
      }
      const items = Array.isArray(stkCallback.CallbackMetadata?.Item) ? stkCallback.CallbackMetadata.Item : [];
      const receiptItem = items.find((i) => i.Name === "MpesaReceiptNumber");
      const mpesaReceiptNumber = receiptItem?.Value ? String(receiptItem.Value) : void 0;
      await confirmSubscriptionPayment({
        checkoutRequestId: String(stkCallback.CheckoutRequestID),
        resultCode: Number(stkCallback.ResultCode),
        mpesaReceiptNumber,
        callbackPayload: req.body,
        isSample: process.env.MPESA_ENVIRONMENT !== "production"
      });
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
      console.error("M-Pesa callback error:", error);
      return res.status(500).json({ ResultCode: 1, ResultDesc: "Callback processing error" });
    }
  });
  app.use("/api/auth", auth_default);
  app.use("/api/public", public_default);
  app.use("/api/member", member_default);
  app.use("/api/admin", admin_default);
  app.use("/api/owner", owner_default);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });
  app.use((err, req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.error("Unhandled API error:", err);
      return res.status(err?.status || 500).json({
        error: err?.message || "Internal server error."
      });
    }
    return next(err);
  });
  return app;
}

// server/vercel-entry.ts
var cachedApp = null;
function getApp() {
  if (!cachedApp) {
    cachedApp = createApiApp();
  }
  return cachedApp;
}
function sendJsonError(res, statusCode, message) {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: message }));
}
async function handler(req, res) {
  try {
    if (req.url) {
      const parsed = new URL(req.url, "http://localhost");
      const rewrittenPath = parsed.searchParams.get("__path");
      if (rewrittenPath !== null) {
        parsed.searchParams.delete("__path");
        const qs = parsed.searchParams.toString();
        const cleanPath = rewrittenPath.replace(/^\/+/, "");
        req.url = `/api/${cleanPath}${qs ? `?${qs}` : ""}`;
      }
    }
    const app = getApp();
    await new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      res.once("finish", done);
      res.once("close", done);
      try {
        app(req, res);
      } catch (err) {
        console.error("Vercel API handler execution error:", err);
        sendJsonError(res, 500, "Unexpected server error while processing API request.");
        done();
      }
    });
  } catch (err) {
    console.error("Vercel API initialization error:", err);
    sendJsonError(res, 500, "API server failed to initialize. Verify server configuration.");
  }
}
export {
  handler as default
};
