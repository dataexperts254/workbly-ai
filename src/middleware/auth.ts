import { NextFunction, Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  notifications,
  pricingSettings,
  profiles,
  referralCodes,
  referralRelationships,
  roles,
  subscriptions,
  users,
  workerPerformance,
} from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import { generateUniqueReferralCode, verifySessionToken } from '../lib/auth-session.ts';

export interface AuthUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  roleSlug: string;
  status: string;
  membershipTier: string;
  subscriptionExpiresAt: Date | null;
  completedApprovedJobs: number;
  achievement50Jobs: boolean;
}

export interface AuthRequest extends Request {
  authUser?: AuthUser;
}

const DEFAULT_OWNER_EMAIL = (process.env.OWNER_EMAIL || 'dataexperts254@gmail.com').toLowerCase();

export async function syncUserRecord(params: {
  uid: string;
  email: string;
  fullName?: string;
  referralCode?: string;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const isOwnerEmail = normalizedEmail === DEFAULT_OWNER_EMAIL;

  const existingRole = await db
    .select()
    .from(roles)
    .where(eq(roles.slug, isOwnerEmail ? 'owner' : 'member'))
    .limit(1);

  const roleId = existingRole[0]?.id ?? null;

  const existingByEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  let dbUser = existingByEmail[0];

  if (!dbUser) {
    const upserted = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: normalizedEmail,
        fullName: params.fullName?.trim() || normalizedEmail.split('@')[0],
        roleId,
        roleSlug: isOwnerEmail ? 'owner' : 'member',
        status: 'active',
        membershipTier: 'free',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          updatedAt: new Date(),
        },
      })
      .returning();
    dbUser = upserted[0];

    await db
      .insert(profiles)
      .values({ userId: dbUser.id, country: 'Kenya', timezone: 'Africa/Nairobi' })
      .onConflictDoNothing();

    await db
      .insert(workerPerformance)
      .values({ userId: dbUser.id })
      .onConflictDoNothing();

    await db
      .insert(referralCodes)
      .values({
        userId: dbUser.id,
        code: generateUniqueReferralCode(dbUser.fullName),
      })
      .onConflictDoNothing();

    // Link referral attribution if supplied on first registration
    if (params.referralCode && params.referralCode.trim()) {
      await attachReferralAttribution(dbUser.id, params.referralCode.trim());
    }

    await db.insert(notifications).values({
      userId: null,
      targetRole: 'admin',
      category: 'registration',
      title: 'New member registered',
      message: `${dbUser.fullName} (${dbUser.email}) joined Workaby AI as a Free Member.`,
      linkPath: '/admin/members',
    });
  } else if (isOwnerEmail && dbUser.roleSlug !== 'owner') {
    const updated = await db
      .update(users)
      .set({ roleSlug: 'owner', roleId, updatedAt: new Date() })
      .where(eq(users.id, dbUser.id))
      .returning();
    dbUser = updated[0];
  }

  // Enforce automatic downgrade on expiry while preserving history and balances
  if (
    dbUser.membershipTier !== 'free' &&
    dbUser.subscriptionExpiresAt &&
    new Date(dbUser.subscriptionExpiresAt).getTime() < Date.now()
  ) {
    const downgraded = await db
      .update(users)
      .set({
        membershipTier: 'free',
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id))
      .returning();
    dbUser = downgraded[0];

    await db
      .update(subscriptions)
      .set({ status: 'expired' })
      .where(sql`${subscriptions.userId} = ${dbUser.id} AND ${subscriptions.status} = 'active'`);

    await db.insert(notifications).values({
      userId: dbUser.id,
      targetRole: 'member',
      category: 'membership',
      title: 'Membership expired',
      message: 'Your paid quarterly plan has expired and your account has reverted to Free Member. All earnings, work history, and balances remain intact.',
      linkPath: '/portal/membership',
    });
  }

  return dbUser;
}

export async function attachReferralAttribution(referredUserId: number, rawCode: string) {
  const codeUpper = rawCode.trim().toUpperCase();
  const codeRow = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.code, codeUpper))
    .limit(1);

  if (!codeRow[0] || codeRow[0].isSuspended) return null;
  if (codeRow[0].userId === referredUserId) return null; // Self-referral prevention

  const referrer = await db
    .select()
    .from(users)
    .where(eq(users.id, codeRow[0].userId))
    .limit(1);

  if (!referrer[0] || referrer[0].status === 'suspended') return null;

  const windowSetting = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.key, 'referral_attribution_days'))
    .limit(1);

  const windowDays = Number(windowSetting[0]?.valueNumeric ?? 90) || 90;
  const expiresAt = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000);

  const inserted = await db
    .insert(referralRelationships)
    .values({
      referrerUserId: codeRow[0].userId,
      referredUserId,
      referralCode: codeUpper,
      attributionWindowDays: windowDays,
      attributionExpiresAt: expiresAt,
      status: 'active',
    })
    .onConflictDoNothing()
    .returning();

  if (inserted[0]) {
    await db.insert(notifications).values({
      userId: codeRow[0].userId,
      targetRole: 'member',
      category: 'referral',
      title: 'New referral registration',
      message: 'A new member joined Workaby AI using your referral link. You will earn 10% commission when they confirm a paid subscription.',
      linkPath: '/portal/referrals',
    });
  }

  return inserted[0] ?? null;
}

export async function resolveAuthUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  // 1. Check signed local session token
  const localPayload = verifySessionToken(token);
  if (localPayload) {
    const found = await db
      .select()
      .from(users)
      .where(eq(users.id, localPayload.userId))
      .limit(1);
    if (!found[0] || found[0].status === 'suspended') return null;
    const synced = await syncUserRecord({
      uid: found[0].uid,
      email: found[0].email,
      fullName: found[0].fullName,
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
      achievement50Jobs: synced.achievement50Jobs,
    };
  }

  // 2. Check Firebase ID token
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) return null;
    const synced = await syncUserRecord({
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.name || decoded.email.split('@')[0],
    });
    if (synced.status === 'suspended') return null;
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
      achievement50Jobs: synced.achievement50Jobs,
    };
  } catch {
    return null;
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    req.authUser = user;
    next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.authUser.roleSlug)) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to access this resource.',
      });
    }
    next();
  };
};
