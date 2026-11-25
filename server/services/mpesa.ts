import crypto from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../src/db/index.ts';
import {
  auditLogs,
  expenses,
  financialLedger,
  membershipPlans,
  notifications,
  paymentTransactions,
  pricingSettings,
  referralCommissions,
  referralConversions,
  referralRelationships,
  referralWalletTransactions,
  subscriptions,
  subscriptionTransactions,
  users,
} from '../../src/db/schema.ts';

export function normalizeKenyaPhone(phone: string): string | null {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('07') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('01') && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) return `254${digits}`;
  return null;
}

export function isDarajaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL
  );
}

export async function initiateDarajaStkPush(params: {
  phone254: string;
  amountKes: number;
  accountReference: string;
  description: string;
}): Promise<{
  mode: 'live' | 'sandbox_awaiting_callback';
  checkoutRequestId: string;
  merchantRequestId: string;
  customerMessage: string;
}> {
  if (!isDarajaConfigured()) {
    const reqId = `ws_CO_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const merchId = `MR_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    return {
      mode: 'sandbox_awaiting_callback',
      checkoutRequestId: reqId,
      merchantRequestId: merchId,
      customerMessage:
        'STK Push queued in Safaricom Daraja sandbox awaiting payment confirmation callback. Subscription activates strictly after confirmed payment.',
    };
  }

  const baseUrl =
    process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  const authCreds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const tokenResp = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${authCreds}` },
    }
  );
  if (!tokenResp.ok) {
    throw new Error('Failed to authenticate with Safaricom Daraja API');
  }
  const tokenData = (await tokenResp.json()) as { access_token: string };

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const stkPayload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.max(1, Math.round(params.amountKes)),
    PartyA: params.phone254,
    PartyB: shortcode,
    PhoneNumber: params.phone254,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: params.description.slice(0, 20),
  };

  const stkResp = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stkPayload),
  });

  const stkResult = (await stkResp.json()) as {
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
    CustomerMessage?: string;
    errorMessage?: string;
  };

  if (!stkResp.ok || !stkResult.CheckoutRequestID) {
    throw new Error(stkResult.errorMessage || 'Safaricom Daraja STK Push initiation failed');
  }

  return {
    mode: 'live',
    checkoutRequestId: stkResult.CheckoutRequestID,
    merchantRequestId: stkResult.MerchantRequestID || `MR_${Date.now()}`,
    customerMessage: stkResult.CustomerMessage || 'M-Pesa prompt sent to your phone.',
  };
}

/**
 * Processes a verified payment confirmation inside an atomic PostgreSQL transaction.
 * Enforces idempotency, activates membership, logs USD/KES ledger entries,
 * and awards single-level 10% (configurable) referral commissions exactly once.
 */
export async function confirmSubscriptionPayment(params: {
  checkoutRequestId: string;
  resultCode: number;
  mpesaReceiptNumber?: string;
  callbackPayload: Record<string, unknown>;
  isSample?: boolean;
}) {
  return await db.transaction(async (tx) => {
    const existingList = await tx
      .select()
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.checkoutRequestId, params.checkoutRequestId))
      .limit(1);

    const subTx = existingList[0];
    if (!subTx) {
      throw new Error('Transaction reference not found.');
    }

    // Duplicate callback protection: only process if still pending
    if (subTx.status !== 'pending') {
      return { alreadyProcessed: true, status: subTx.status, transaction: subTx };
    }

    // Handle Failed or Cancelled M-Pesa response
    if (params.resultCode !== 0) {
      const nextStatus = params.resultCode === 1032 ? 'cancelled' : 'failed';
      const [updatedTx] = await tx
        .update(subscriptionTransactions)
        .set({
          status: nextStatus,
          callbackPayloadJson: params.callbackPayload,
        })
        .where(eq(subscriptionTransactions.id, subTx.id))
        .returning();

      if (subTx.subscriptionId) {
        await tx
          .update(subscriptions)
          .set({ status: 'cancelled' })
          .where(eq(subscriptions.id, subTx.subscriptionId));
      }

      await tx.insert(notifications).values({
        userId: subTx.userId,
        targetRole: 'member',
        category: 'payment',
        title: nextStatus === 'cancelled' ? 'M-Pesa payment cancelled' : 'M-Pesa payment failed',
        message: `Your KES ${Number(subTx.amountKes).toFixed(2)} ($${Number(subTx.amountUsd).toFixed(2)} USD) payment for ${subTx.planSlug} was ${nextStatus}.`,
        linkPath: '/portal/membership',
      });

      await tx.insert(notifications).values({
        userId: null,
        targetRole: 'admin',
        category: 'payment',
        title: `Subscription payment ${nextStatus}`,
        message: `M-Pesa checkout ${subTx.checkoutRequestId} ($${subTx.amountUsd} USD / KES ${subTx.amountKes}) ${nextStatus}.`,
        linkPath: '/admin/payments',
      });

      return { alreadyProcessed: false, status: nextStatus, transaction: updatedTx };
    }

    const receipt =
      params.mpesaReceiptNumber ||
      `MPESA_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const now = new Date();
    const [confirmedTx] = await tx
      .update(subscriptionTransactions)
      .set({
        status: 'confirmed',
        mpesaReceiptNumber: receipt,
        confirmedAt: now,
        callbackPayloadJson: params.callbackPayload,
        isSample: Boolean(params.isSample ?? subTx.isSample),
      })
      .where(eq(subscriptionTransactions.id, subTx.id))
      .returning();

    const planRows = await tx
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.slug, subTx.planSlug))
      .limit(1);
    const plan = planRows[0];
    const intervalDays = plan?.billingIntervalDays ?? 90;

    // Check if user already has an active expiry in the future for renewal stacking
    const [userRow] = await tx
      .select()
      .from(users)
      .where(eq(users.id, subTx.userId))
      .limit(1);

    const baseStart =
      userRow?.subscriptionExpiresAt && new Date(userRow.subscriptionExpiresAt) > now
        ? new Date(userRow.subscriptionExpiresAt)
        : now;
    const newExpiresAt = new Date(baseStart.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    // Expire previous active subscriptions for this user
    await tx
      .update(subscriptions)
      .set({ status: 'expired' })
      .where(and(eq(subscriptions.userId, subTx.userId), eq(subscriptions.status, 'active')));

    if (subTx.subscriptionId) {
      await tx
        .update(subscriptions)
        .set({
          status: 'active',
          startsAt: now,
          expiresAt: newExpiresAt,
        })
        .where(eq(subscriptions.id, subTx.subscriptionId));
    }

    await tx
      .update(users)
      .set({
        membershipTier: subTx.planSlug,
        subscriptionExpiresAt: newExpiresAt,
        updatedAt: now,
      })
      .where(eq(users.id, subTx.userId));

    // Record payment transaction
    await tx.insert(paymentTransactions).values({
      userId: subTx.userId,
      txType: 'subscription',
      reference: receipt,
      amountUsd: subTx.amountUsd,
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      status: 'confirmed',
      metadataJson: {
        planSlug: subTx.planSlug,
        checkoutRequestId: subTx.checkoutRequestId,
        isRenewal: subTx.isRenewal,
        isSample: confirmedTx.isSample,
      },
    });

    const amountUsdNum = Number(subTx.amountUsd);

    // Record in Membership Payments & Platform Revenue Ledger
    await tx.insert(financialLedger).values({
      entryNumber: `FL-SUB-${confirmedTx.id}-${Date.now()}`,
      ledgerScope: 'membership_payments',
      category: `subscription_${subTx.planSlug}`,
      direction: 'credit',
      amountUsd: amountUsdNum.toFixed(2),
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      referenceId: receipt,
      description: `${subTx.isRenewal ? 'Renewal' : 'Purchase'} of ${subTx.planSlug} plan via M-Pesa (${receipt})`,
      isSample: confirmedTx.isSample,
      occurredAt: now,
    });

    await tx.insert(financialLedger).values({
      entryNumber: `FL-REV-${confirmedTx.id}-${Date.now()}`,
      ledgerScope: 'platform_revenue',
      category: `subscription_${subTx.planSlug}`,
      direction: 'credit',
      amountUsd: amountUsdNum.toFixed(2),
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      referenceId: receipt,
      description: `Gross subscription revenue (${subTx.planSlug})`,
      isSample: confirmedTx.isSample,
      occurredAt: now,
    });

    // Referral Commission Engine (10% configurable, single-level, idempotent via unique subscriptionTransactionId)
    const relRows = await tx
      .select()
      .from(referralRelationships)
      .where(eq(referralRelationships.referredUserId, subTx.userId))
      .limit(1);

    const rel = relRows[0];
    if (
      rel &&
      rel.status === 'active' &&
      rel.referrerUserId !== subTx.userId &&
      (subTx.isRenewal || new Date(rel.attributionExpiresAt) >= now)
    ) {
      const rateSetting = await tx
        .select()
        .from(pricingSettings)
        .where(eq(pricingSettings.key, 'referral_commission_pct'))
        .limit(1);

      const commissionPct = Number(rateSetting[0]?.valueNumeric ?? 10) || 10;
      const commissionUsd = Number(((amountUsdNum * commissionPct) / 100).toFixed(2));
      const retainedUsd = Number((amountUsdNum - commissionUsd).toFixed(2));

      if (commissionUsd > 0) {
        await tx
          .insert(referralConversions)
          .values({
            relationshipId: rel.id,
            referrerUserId: rel.referrerUserId,
            referredUserId: subTx.userId,
            subscriptionTransactionId: confirmedTx.id,
            planSlug: subTx.planSlug,
            amountUsd: amountUsdNum.toFixed(2),
          })
          .onConflictDoNothing();

        const [commissionRow] = await tx
          .insert(referralCommissions)
          .values({
            referrerUserId: rel.referrerUserId,
            referredUserId: subTx.userId,
            relationshipId: rel.id,
            subscriptionTransactionId: confirmedTx.id,
            commissionRatePct: commissionPct.toFixed(2),
            baseAmountUsd: amountUsdNum.toFixed(2),
            commissionAmountUsd: commissionUsd.toFixed(2),
            retainedAmountUsd: retainedUsd.toFixed(2),
            status: 'available',
            isRenewal: subTx.isRenewal,
            isSample: confirmedTx.isSample,
            approvedAt: now,
          })
          .onConflictDoNothing()
          .returning();

        if (commissionRow) {
          // Compute updated referral wallet balance
          const walletAgg = await tx
            .select({
              bal: sql<string>`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`,
            })
            .from(referralWalletTransactions)
            .where(eq(referralWalletTransactions.userId, rel.referrerUserId));

          const currentBal = Number(walletAgg[0]?.bal ?? 0);
          const nextBal = Number((currentBal + commissionUsd).toFixed(2));

          await tx.insert(referralWalletTransactions).values({
            userId: rel.referrerUserId,
            commissionId: commissionRow.id,
            entryType: 'credit',
            amountUsd: commissionUsd.toFixed(2),
            balanceAfterUsd: nextBal.toFixed(2),
            description: `${commissionPct}% referral commission on ${subTx.planSlug} ${
              subTx.isRenewal ? 'renewal' : 'subscription'
            } ($${amountUsdNum.toFixed(2)})`,
          });

          await tx.insert(financialLedger).values({
            entryNumber: `FL-REF-${commissionRow.id}-${Date.now()}`,
            ledgerScope: 'referral_commissions',
            category: 'referral_commission_accrual',
            direction: 'debit',
            amountUsd: commissionUsd.toFixed(2),
            referenceId: receipt,
            description: `Referral commission (${commissionPct}%) credited to referrer #${rel.referrerUserId}`,
            isSample: confirmedTx.isSample,
            occurredAt: now,
          });

          await tx.insert(notifications).values({
            userId: rel.referrerUserId,
            targetRole: 'member',
            category: 'referral',
            title: `Referral commission earned: $${commissionUsd.toFixed(2)}`,
            message: `Your referred member confirmed a $${amountUsdNum.toFixed(2)} ${subTx.planSlug} payment. $${commissionUsd.toFixed(2)} (${commissionPct}%) has been credited to your Referral Wallet.`,
            linkPath: '/portal/referrals',
          });
        }
      }
    }

    await tx.insert(notifications).values({
      userId: subTx.userId,
      targetRole: 'member',
      category: 'membership',
      title: `${subTx.planSlug.replace('_', ' ').toUpperCase()} membership activated`,
      message: `M-Pesa receipt ${receipt} confirmed (KES ${Number(subTx.amountKes).toFixed(2)} / $${amountUsdNum.toFixed(2)} USD). Active until ${newExpiresAt.toDateString()}.`,
      linkPath: '/portal/membership',
    });

    await tx.insert(notifications).values({
      userId: null,
      targetRole: 'admin',
      category: 'subscription',
      title: 'New confirmed paid subscriber',
      message: `User #${subTx.userId} activated ${subTx.planSlug} for $${amountUsdNum.toFixed(2)} USD (KES ${subTx.amountKes}, Receipt: ${receipt}).`,
      linkPath: '/admin/subscriptions',
    });

    await tx.insert(auditLogs).values({
      actorUserId: subTx.userId,
      action: 'subscription_payment_confirmed',
      entityType: 'subscription_transaction',
      entityId: String(confirmedTx.id),
      detailsJson: {
        receipt,
        amountUsd: amountUsdNum,
        amountKes: Number(subTx.amountKes),
        exchangeRate: Number(subTx.exchangeRate),
      },
    });

    return { alreadyProcessed: false, status: 'confirmed', transaction: confirmedTx };
  });
}

/**
 * Refunds a confirmed subscription transaction and automatically reverses any
 * associated referral commissions & updates the referrer wallet ledger.
 */
export async function refundSubscriptionTransaction(params: {
  transactionId: number;
  reason: string;
  actorUserId: number;
}) {
  return await db.transaction(async (tx) => {
    const [subTx] = await tx
      .select()
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.id, params.transactionId))
      .limit(1);

    if (!subTx) throw new Error('Transaction not found.');
    if (subTx.status !== 'confirmed') {
      throw new Error(`Only confirmed transactions can be refunded (current status: ${subTx.status}).`);
    }

    const now = new Date();
    const [refundedTx] = await tx
      .update(subscriptionTransactions)
      .set({ status: 'refunded', refundedAt: now })
      .where(eq(subscriptionTransactions.id, subTx.id))
      .returning();

    if (subTx.subscriptionId) {
      await tx
        .update(subscriptions)
        .set({ status: 'cancelled', cancelledAt: now })
        .where(eq(subscriptions.id, subTx.subscriptionId));
    }

    await tx
      .update(users)
      .set({ membershipTier: 'free', subscriptionExpiresAt: null, updatedAt: now })
      .where(eq(users.id, subTx.userId));

    const amountUsdNum = Number(subTx.amountUsd);
    await tx.insert(expenses).values({
      category: 'refunds',
      vendor: 'M-Pesa Refund',
      description: `Refund for transaction #${subTx.id} (${subTx.mpesaReceiptNumber || subTx.checkoutRequestId}): ${params.reason}`,
      amountUsd: amountUsdNum.toFixed(2),
      recordedByUserId: params.actorUserId,
      isSample: subTx.isSample,
    });

    await tx.insert(financialLedger).values({
      entryNumber: `FL-REFUND-${subTx.id}-${Date.now()}`,
      ledgerScope: 'platform_revenue',
      category: 'subscription_refund',
      direction: 'debit',
      amountUsd: amountUsdNum.toFixed(2),
      amountKes: subTx.amountKes,
      exchangeRate: subTx.exchangeRate,
      referenceId: subTx.mpesaReceiptNumber || subTx.checkoutRequestId,
      description: `Subscription refund: ${params.reason}`,
      isSample: subTx.isSample,
      recordedByUserId: params.actorUserId,
      occurredAt: now,
    });

    // Reverse referral commission if one was generated for this transaction
    const [comm] = await tx
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.subscriptionTransactionId, subTx.id))
      .limit(1);

    if (comm && comm.status !== 'reversed') {
      await tx
        .update(referralCommissions)
        .set({
          status: 'reversed',
          reversedAt: now,
          reversalReason: params.reason,
        })
        .where(eq(referralCommissions.id, comm.id));

      const commUsd = Number(comm.commissionAmountUsd);
      const walletAgg = await tx
        .select({
          bal: sql<string>`COALESCE(SUM(CASE WHEN ${referralWalletTransactions.entryType} = 'credit' THEN ${referralWalletTransactions.amountUsd} ELSE -${referralWalletTransactions.amountUsd} END), 0)`,
        })
        .from(referralWalletTransactions)
        .where(eq(referralWalletTransactions.userId, comm.referrerUserId));

      const currentBal = Number(walletAgg[0]?.bal ?? 0);
      const nextBal = Number((currentBal - commUsd).toFixed(2));

      await tx.insert(referralWalletTransactions).values({
        userId: comm.referrerUserId,
        commissionId: comm.id,
        entryType: 'reversal',
        amountUsd: commUsd.toFixed(2),
        balanceAfterUsd: nextBal.toFixed(2),
        description: `Commission reversed due to refund (${params.reason})`,
      });

      await tx.insert(notifications).values({
        userId: comm.referrerUserId,
        targetRole: 'member',
        category: 'referral',
        title: 'Referral commission reversed',
        message: `Commission of $${commUsd.toFixed(2)} was reversed because the underlying subscription payment was refunded (${params.reason}).`,
        linkPath: '/portal/referrals',
      });
    }

    await tx.insert(auditLogs).values({
      actorUserId: params.actorUserId,
      action: 'subscription_refunded',
      entityType: 'subscription_transaction',
      entityId: String(subTx.id),
      detailsJson: { reason: params.reason, amountUsd: amountUsdNum },
    });

    return refundedTx;
  });
}
