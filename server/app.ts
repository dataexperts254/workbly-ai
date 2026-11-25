import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ensureSeeded } from '../src/db/seed.ts';
import authRoutes from './routes/auth.ts';
import publicRoutes from './routes/public.ts';
import memberRoutes from './routes/member.ts';
import adminRoutes from './routes/admin.ts';
import ownerRoutes from './routes/owner.ts';
import { confirmSubscriptionPayment } from './services/mpesa.ts';

export function createApiApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'workaby-api' });
  });

  // Simple in-memory rate limiting for auth and payment initiation endpoints
  const rateHits = new Map<string, { count: number; resetAt: number }>();
  app.use('/api', (req, res, next) => {
    const key = `${req.ip}:${req.path.split('/').slice(0, 4).join('/')}`;
    const now = Date.now();
    const entry = rateHits.get(key);
    if (!entry || entry.resetAt < now) {
      rateHits.set(key, { count: 1, resetAt: now + 60_000 });
    } else {
      entry.count += 1;
      if (entry.count > 120) {
        return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
      }
    }
    next();
  });

  // Lazy one-time idempotent database bootstrap on first API request (no startup probe)
  app.use('/api', async (_req, res, next) => {
    try {
      await ensureSeeded();
      next();
    } catch (error: any) {
      console.error('Database bootstrap error:', error);
      return res.status(503).json({
        error: 'Database connection unavailable. Please verify database environment variables.',
      });
    }
  });

  // Safaricom Daraja M-Pesa STK Push Webhook Callback
  app.post('/api/mpesa/callback', async (req, res) => {
    try {
      const configuredSecret = process.env.MPESA_CALLBACK_SECRET?.trim();
      if (configuredSecret) {
        const provided = req.query.secret || req.headers['x-mpesa-secret'];
        if (provided !== configuredSecret) {
          return res.status(403).json({ ResultCode: 1, ResultDesc: 'Unauthorized callback' });
        }
      }

      const stkCallback = req.body?.Body?.stkCallback;
      if (!stkCallback || !stkCallback.CheckoutRequestID) {
        return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid STK callback payload' });
      }

      const items = Array.isArray(stkCallback.CallbackMetadata?.Item)
        ? stkCallback.CallbackMetadata.Item
        : [];
      const receiptItem = items.find((i: any) => i.Name === 'MpesaReceiptNumber');
      const mpesaReceiptNumber = receiptItem?.Value ? String(receiptItem.Value) : undefined;

      await confirmSubscriptionPayment({
        checkoutRequestId: String(stkCallback.CheckoutRequestID),
        resultCode: Number(stkCallback.ResultCode),
        mpesaReceiptNumber,
        callbackPayload: req.body,
        isSample: process.env.MPESA_ENVIRONMENT !== 'production',
      });

      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      console.error('M-Pesa callback error:', error);
      return res.status(500).json({ ResultCode: 1, ResultDesc: 'Callback processing error' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/member', memberRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/owner', ownerRoutes);

  // Ensure unknown /api/* routes always return JSON
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Global JSON error handler for API requests
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('Unhandled API error:', err);
      return res.status(err?.status || 500).json({
        error: err?.message || 'Internal server error.',
      });
    }
    return next(err);
  });

  return app;
}
