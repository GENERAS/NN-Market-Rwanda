import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db';
import publicRouter from './routes/public';
import adminRouter from './routes/admin';
import { handleRobotsTxt, handleSitemapXml } from './seo';

export function createApp() {
  const app = express();
  app.set('trust proxy', true);

  // Initialize database on startup
  getDb();

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Serve uploaded product images safely
  let uploadsDir = process.env.VERCEL
    ? path.resolve('/tmp', 'uploads')
    : path.resolve(process.cwd(), 'public', 'uploads');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {
    uploadsDir = path.resolve('/tmp', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

  // Serve generated/static src/assets images in both dev and prod
  const srcAssetsDir = path.resolve(process.cwd(), 'src', 'assets');
  if (fs.existsSync(srcAssetsDir)) {
    app.use('/src/assets', express.static(srcAssetsDir, { maxAge: '7d' }));
  }

  // SEO endpoints
  app.get('/robots.txt', handleRobotsTxt);
  app.get('/sitemap.xml', handleSitemapXml);

  // API routes
  app.use('/api/public', publicRouter);
  app.use('/api/admin', adminRouter);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Error handler (including multer upload errors)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: err.message || 'Request error' });
  });

  return app;
}
