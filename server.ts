import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './server/app';
import { ensureDbReady } from './server/db';
import { getBaseUrl, injectSeoHtml } from './server/seo';

export { createApp };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  await ensureDbReady();
  const app = createApp();
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || 3000);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
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
