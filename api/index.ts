import type { Request, Response } from 'express';
import { createApp } from '../server/app';
import { ensureDbReady } from '../server/db';

let appInstance: ReturnType<typeof createApp> | null = null;

export default async function handler(req: Request, res: Response) {
  try {
    await ensureDbReady();
    if (!appInstance) {
      appInstance = createApp();
    }
    return appInstance(req, res);
  } catch (err) {
    console.error('Vercel API invocation error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  }
}
