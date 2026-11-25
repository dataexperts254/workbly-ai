import crypto from 'node:crypto';
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  auditLogs,
  notifications,
  profiles,
  referralCodes,
  roles,
  users,
  workerPerformance,
} from '../../src/db/schema.ts';
import {
  generateUniqueReferralCode,
  hashPassword,
  signSessionToken,
  verifyPassword,
} from '../../src/lib/auth-session.ts';
import { adminAuth } from '../../src/lib/firebase-admin.ts';
import type { AuthRequest } from '../../src/middleware/auth.ts';
import {
  attachReferralAttribution,
  requireAuth,
  syncUserRecord,
} from '../../src/middleware/auth.ts';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2).max(120),
  phone: z.string().optional(),
  county: z.string().optional(),
  referralCode: z.string().optional(),
});

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const ownerEmail = (process.env.OWNER_EMAIL || 'dataexperts254@gmail.com').toLowerCase();
    const isOwner = email === ownerEmail;
    const [roleRow] = await db
      .select()
      .from(roles)
      .where(eq(roles.slug, isOwner ? 'owner' : 'member'))
      .limit(1);

    const { hash, salt } = hashPassword(parsed.data.password);
    const uid = `local_${crypto.randomUUID()}`;

    const [created] = await db
      .insert(users)
      .values({
        uid,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        fullName: parsed.data.fullName.trim(),
        roleId: roleRow?.id ?? null,
        roleSlug: isOwner ? 'owner' : 'member',
        status: 'active',
        membershipTier: 'free',
      })
      .returning();

    await db.insert(profiles).values({
      userId: created.id,
      phone: parsed.data.phone?.trim() || null,
      county: parsed.data.county?.trim() || 'Nairobi',
      country: 'Kenya',
      timezone: 'Africa/Nairobi',
      preferredPayoutPhone: parsed.data.phone?.trim() || null,
      dataPrivacyConsent: true,
    });

    await db.insert(workerPerformance).values({ userId: created.id });

    const myCode = generateUniqueReferralCode(created.fullName);
    await db.insert(referralCodes).values({
      userId: created.id,
      code: myCode,
    });

    if (parsed.data.referralCode) {
      await attachReferralAttribution(created.id, parsed.data.referralCode);
    }

    await db.insert(notifications).values({
      userId: null,
      targetRole: 'admin',
      category: 'registration',
      title: 'New member registered',
      message: `${created.fullName} (${created.email}) registered as a Free Member.`,
      linkPath: '/admin/members',
    });

    await db.insert(auditLogs).values({
      actorUserId: created.id,
      actorEmail: created.email,
      action: 'member_registered',
      entityType: 'user',
      entityId: String(created.id),
      detailsJson: { referralCodeUsed: parsed.data.referralCode || null },
    });

    const token = signSessionToken({
      uid: created.uid,
      userId: created.id,
      email: created.email,
      roleSlug: created.roleSlug,
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
        referralCode: myCode,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Unable to complete registration right now.' });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please provide a valid email and password.' });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !user.passwordHash || !user.passwordSalt) {
      return res.status(401).json({
        error: 'Invalid email or password. If you signed up with Google, please use Continue with Google.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Contact support.' });
    }

    const valid = verifyPassword(parsed.data.password, user.passwordHash, user.passwordSalt);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const synced = await syncUserRecord({
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
    });

    const token = signSessionToken({
      uid: synced.uid,
      userId: synced.id,
      email: synced.email,
      roleSlug: synced.roleSlug,
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
        achievement50Jobs: synced.achievement50Jobs,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

router.post('/firebase-sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Firebase ID token.' });
    }
    const idToken = authHeader.slice('Bearer '.length).trim();
    if (!idToken) {
      return res.status(401).json({ error: 'Empty Firebase ID token.' });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded.email) {
      return res.status(400).json({ error: 'Authenticated Firebase account must have an email address.' });
    }
    if (decoded.firebase?.sign_in_provider === 'google.com' && decoded.email_verified === false) {
      return res.status(403).json({ error: 'Google account email address is not verified.' });
    }

    const referralCode = typeof req.body?.referralCode === 'string' ? req.body.referralCode : undefined;
    const synced = await syncUserRecord({
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.name || decoded.email.split('@')[0],
      referralCode,
    });

    if (synced.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended.' });
    }

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, synced.id)).limit(1);
    const [refCode] = await db.select().from(referralCodes).where(eq(referralCodes.userId, synced.id)).limit(1);

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
        profile: profile || null,
      },
    });
  } catch (error: any) {
    console.error('Firebase sync error:', error);
    const code = error?.code || '';
    if (typeof code === 'string' && code.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
    }
    return res.status(500).json({ error: 'Unable to synchronize Firebase user profile.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db
        .update(users)
        .set({ resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt })
        .where(eq(users.id, user.id));

      await db.insert(notifications).values({
        userId: user.id,
        targetRole: 'member',
        category: 'security',
        title: 'Password reset requested',
        message: 'A password reset request was recorded for your account.',
        linkPath: '/portal/security',
      });
    }

    return res.json({
      message: 'If an account exists for that email, password reset instructions have been prepared.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Could not process password reset request.' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const u = req.authUser!;
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1);
    const [refCode] = await db.select().from(referralCodes).where(eq(referralCodes.userId, u.id)).limit(1);
    return res.json({
      user: {
        ...u,
        referralCode: refCode?.code || null,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return res.status(500).json({ error: 'Failed to load account.' });
  }
});

export default router;
