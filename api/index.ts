import type { IncomingMessage, ServerResponse } from 'node:http';

type AppHandler = (req: IncomingMessage, res: ServerResponse) => Promise<unknown> | unknown;

let cachedHandler: AppHandler | null = null;

function resolveHandler(mod: unknown): AppHandler {
  if (typeof mod === 'function') return mod as AppHandler;
  const m = mod as { default?: unknown } | undefined;
  if (m && typeof m.default === 'function') return m.default as AppHandler;
  if (m && m.default && typeof (m.default as { default?: unknown }).default === 'function') {
    return (m.default as { default: AppHandler }).default;
  }
  throw new Error('Failed to resolve serverless API handler export');
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!cachedHandler) {
      const mod = await import('./_app.cjs');
      cachedHandler = resolveHandler(mod);
    }
    return await cachedHandler(req, res);
  } catch (err) {
    console.error('Vercel API error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        })
      );
    }
  }
}
