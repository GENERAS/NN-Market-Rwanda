declare module 'sql.js/dist/sql-wasm-inline.js' {
  import initSqlJs from 'sql.js';
  export default initSqlJs;
}

declare module './_app.cjs' {
  import type { IncomingMessage, ServerResponse } from 'node:http';
  const handler: (req: IncomingMessage, res: ServerResponse) => Promise<unknown> | unknown;
  export default handler;
}
