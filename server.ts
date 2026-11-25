import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { ensureSeeded } from './src/db/seed.ts';
import authRoutes from './server/routes/auth.ts';
import publicRoutes from './server/routes/public.ts';
import memberRoutes from './server/routes/member.ts';
import adminRoutes from './server/routes/admin.ts';
import ownerRoutes from './server/routes/owner.ts';
import { confirmSubscriptionPayment } from './server/services/mpesa.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

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
  app.use('/api', async (_req, _res, next) => {
    await ensureSeeded();
    next();
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Workaby AI marketplace server listening on port ${PORT}`);
  });
}

startServer();
