import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, resolveVoicesRoot, storePageRelative } from './host-routes.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

function inside(base, target) {
  const root = path.resolve(base);
  const resolved = path.resolve(target);
  return resolved === root || resolved.startsWith(root + path.sep);
}

export function createHandler(rootDir = repoRoot) {
  return function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }
    const route = classify(req.url || '/');
    const headers = { 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' };
    if (route.kind === 'forbidden') {
      res.writeHead(403, { ...headers, 'content-type': 'text/plain; charset=utf-8' });
      res.end('This host does not publish store binaries or a Mac app.');
      return;
    }
    let file = null;
    if (route.kind === 'landing') file = path.join(rootDir, 'host', 'landing.html');
    if (route.kind === 'store-page') file = path.join(rootDir, storePageRelative);
    if (route.kind === 'voices') {
      const voices = resolveVoicesRoot(rootDir);
      if (!voices) {
        res.writeHead(503, { ...headers, 'content-type': 'text/plain; charset=utf-8' });
        res.end('Open web payload is not staged. Run scripts/init-core.sh and npm run stage. DSP stays in Core.');
        return;
      }
      const rel = route.rel === '' ? 'index.html' : route.rel;
      file = path.resolve(voices, rel);
      if (!inside(voices, file)) {
        res.writeHead(403, { ...headers, 'content-type': 'text/plain; charset=utf-8' });
        res.end('This host does not publish store binaries or a Mac app.');
        return;
      }
    }
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      const status = route.kind === 'store-page' ? 503 : 404;
      const body = status === 503
        ? 'Core download/index.html is not checked out. Run scripts/init-core.sh.'
        : 'Not found';
      res.writeHead(status, { ...headers, 'content-type': 'text/plain; charset=utf-8' });
      res.end(body);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { ...headers, 'content-type': types[ext] || 'application/octet-stream' });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 8787);
  http.createServer(createHandler()).listen(port, '127.0.0.1', () => {
    console.log('Infected Voices web shell on http://127.0.0.1:' + port);
    console.log('Open web: /voices   Get: /get   Download alias: /download');
  });
}
