import type { Request, Response } from 'express';
import { createApp } from './app';
import { ensureDbReady } from './db';

let appInstance: ReturnType<typeof createApp> | null = null;

export default async function handler(req: Request, res: Response) {
  await ensureDbReady();
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance(req, res);
}
