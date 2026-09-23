import fs from 'node:fs';
import path from 'node:path';

const forbiddenExt = new Set(['.ipa', '.aab', '.apk', '.exe', '.msi', '.dmg', '.app']);

export function classify(urlPath) {
  let pathname = urlPath.split('?')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return { kind: 'forbidden' };
  }
  if (pathname.includes('\\') || pathname.split('/').includes('..')) return { kind: 'forbidden' };
  const base = path.posix.basename(pathname).toLowerCase();
  const ext = path.posix.extname(base);
  if (forbiddenExt.has(ext) || base.endsWith('.app')) return { kind: 'forbidden' };
  if (pathname === '/') return { kind: 'landing' };
  if (pathname === '/get' || pathname === '/get/' || pathname === '/get/index.html') return { kind: 'store-page' };
  if (pathname === '/download' || pathname === '/download/' || pathname === '/download/index.html') return { kind: 'store-page' };
  if (pathname === '/voices' || pathname === '/voices/') return { kind: 'voices', rel: '' };
  if (pathname.startsWith('/voices/')) return { kind: 'voices', rel: pathname.slice('/voices/'.length) };
  return { kind: 'miss' };
}

export function resolveVoicesRoot(rootDir) {
  const candidates = [
    path.join(rootDir, 'site', 'voices'),
    path.join(rootDir, 'core', 'browser-dist'),
    path.join(rootDir, 'core', 'dist'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

export const storePageRelative = 'core/download/index.html';
