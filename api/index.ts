import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server/app.ts';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
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
  return app(req as any, res as any);
}
