import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db';
import publicRouter from './server/routes/public';
import adminRouter from './server/routes/admin';
import { getBaseUrl, handleRobotsTxt, handleSitemapXml, injectSeoHtml } from './server/seo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function startServer() {
  const app = createApp();
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || 3000);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const enriched = injectSeoHtml(template, url, getBaseUrl(req));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(enriched);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));

    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.resolve(distDir, 'index.html');
      const template = fs.readFileSync(indexPath, 'utf-8');
      const enriched = injectSeoHtml(template, req.originalUrl, getBaseUrl(req));
      res.status(200).set({ 'Content-Type': 'text/html' }).send(enriched);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`NN Market Rwanda server running on http://localhost:${port}`);
  });
}

// Only listen when run directly (not imported by tests)
const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  startServer();
}
