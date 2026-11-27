import type { Request, Response } from 'express';
import { createApp } from './app';
import { ensureDbReady } from './db';

const app = createApp();

export default async function handler(req: Request, res: Response) {
  try {
    await ensureDbReady();
    return app(req, res);
  } catch (err) {
    console.error('Vercel API invocation error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal server error',
      });
    }
  }
}
