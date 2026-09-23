import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const FILES = ['index.html', 'windows.html', 'ios.html', 'android.html', 'web.html', 'get.css', 'get.js'];

export function downloadUrls(env = process.env) {
  return {
    WINDOWS_URL: safeUrl(env.IV_DOWNLOAD_WINDOWS_URL, 'https://github.com/grimvirusoffical-source/InfectedVoices/releases'),
    APP_STORE_URL: safeUrl(env.IV_APP_STORE_URL, 'https://apps.apple.com/'),
    PLAY_STORE_URL: safeUrl(env.IV_PLAY_STORE_URL, 'https://play.google.com/store'),
    WEB_URL: safeUrl(env.IV_DOWNLOAD_WEB_URL, '/voices/'),
    NATION_URL: 'https://nation.infectedvoices.space/',
    TESTFLIGHT_URL: safeUrl(env.IV_TESTFLIGHT_URL, '')
  };
}

export function safeUrl(value, fallback) {
  const raw = String(value || '').trim();
  const candidate = raw || fallback;
  if (!candidate) return '';
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  if (/^https:\/\//i.test(candidate)) return candidate;
  return fallback && fallback !== candidate ? safeUrl(fallback, '') : '';
}

function attr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function renderDownload(html, env = process.env) {
  const urls = downloadUrls(env);
  const testflight = urls.TESTFLIGHT_URL
    ? `<a class="ghost" href="${attr(urls.TESTFLIGHT_URL)}">TestFlight</a>`
    : '';
  return html
    .replaceAll('{{WINDOWS_URL}}', attr(urls.WINDOWS_URL))
    .replaceAll('{{APP_STORE_URL}}', attr(urls.APP_STORE_URL))
    .replaceAll('{{PLAY_STORE_URL}}', attr(urls.PLAY_STORE_URL))
    .replaceAll('{{WEB_URL}}', attr(urls.WEB_URL))
    .replaceAll('{{NATION_URL}}', attr(urls.NATION_URL))
    .replaceAll('{{TESTFLIGHT}}', testflight);
}

export async function publishDownloadPages(root, destRoot, env = process.env) {
  const source = path.join(root, 'download');
  for (const prefix of ['get', 'download']) {
    await mkdir(path.join(destRoot, prefix), {recursive: true});
    for (const file of FILES) {
      const raw = await readFile(path.join(source, file), 'utf8');
      const body = file.endsWith('.html') ? renderDownload(raw, env) : raw;
      const targets = file === 'index.html'
        ? [path.join(destRoot, prefix, 'index.html')]
        : file.endsWith('.html')
          ? [path.join(destRoot, prefix, file.replace('.html', ''), 'index.html')]
          : [path.join(destRoot, prefix, file)];
      for (const target of targets) {
        await mkdir(path.dirname(target), {recursive: true});
        await writeFile(target, body);
      }
    }
  }
}

export const DOWNLOAD_ROUTES = {
  '/get': 'index.html',
  '/get/': 'index.html',
  '/download': 'index.html',
  '/download/': 'index.html',
  '/get/windows': 'windows.html',
  '/get/windows/': 'windows.html',
  '/download/windows': 'windows.html',
  '/download/windows/': 'windows.html',
  '/get/ios': 'ios.html',
  '/get/ios/': 'ios.html',
  '/download/ios': 'ios.html',
  '/download/ios/': 'ios.html',
  '/get/android': 'android.html',
  '/get/android/': 'android.html',
  '/download/android': 'android.html',
  '/download/android/': 'android.html',
  '/get/web': 'web.html',
  '/get/web/': 'web.html',
  '/download/web': 'web.html',
  '/download/web/': 'web.html',
  '/get/get.css': 'get.css',
  '/download/get.css': 'get.css',
  '/get/get.js': 'get.js',
  '/download/get.js': 'get.js'
};
