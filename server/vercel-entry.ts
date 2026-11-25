import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { createApiApp } from './app.ts';

let cachedApp: Express | null = null;

function getApp(): Express {
  if (!cachedApp) {
    cachedApp = createApiApp();
  }
  return cachedApp;
}

function sendJsonError(res: ServerResponse, statusCode: number, message: string) {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: message }));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Restore original /api/* path when rewritten by Vercel (?__path=...)
    if (req.url) {
      const parsed = new URL(req.url, 'http://localhost');
      const rewrittenPath = parsed.searchParams.get('__path');
      if (rewrittenPath !== null) {
        parsed.searchParams.delete('__path');
        const qs = parsed.searchParams.toString();
        const cleanPath = rewrittenPath.replace(/^\/+/, '');
        req.url = `/api/${cleanPath}${qs ? `?${qs}` : ''}`;
      }
    }

    const app = getApp();

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      res.once('finish', done);
      res.once('close', done);

      try {
        app(req as any, res as any);
      } catch (err) {
        console.error('Vercel API handler execution error:', err);
        sendJsonError(res, 500, 'Unexpected server error while processing API request.');
        done();
      }
    });
  } catch (err) {
    console.error('Vercel API initialization error:', err);
    sendJsonError(res, 500, 'API server failed to initialize. Verify server configuration.');
  }
}
