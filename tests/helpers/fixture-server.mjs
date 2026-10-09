/**
 * Serves tests/fixtures/pages on 127.0.0.1 for end-to-end tests, so no test
 * depends on a real website. Started by Playwright's `webServer` option.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../fixtures/pages');
const PORT = Number(process.env.FIXTURE_PORT ?? 4173);
/** @type {Record<string, string>} */
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css' };

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1');
  const file = normalize(join(ROOT, decodeURIComponent(pathname)));
  // Refuse anything that resolves outside the fixtures folder.
  if (!file.startsWith(ROOT + sep)) {
    response.writeHead(403).end();
    return;
  }
  readFile(file).then(
    (body) => {
      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      });
      response.end(body);
    },
    () => response.writeHead(404).end(),
  );
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fixtures served on http://127.0.0.1:${String(PORT)}`);
});
