import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const FILES = ['index.html', 'windows.html', 'mac.html', 'ios.html', 'android.html', 'web.html', 'get.css', 'get.js'];
const WINDOWS_FALLBACK = 'https://github.com/grimvirusoffical-source/InfectedVoices/releases';
const APP_FALLBACK = 'https://apps.apple.com/';
const PLAY_FALLBACK = 'https://play.google.com/store';
const WEB_FALLBACK = '/voices/';
const PACKAGE = /\.(ipa|aab|apk)(?:$|[?#])/i;

export function downloadUrls(env = process.env) {
  return {
    WINDOWS_URL: allowedUrl(env.IV_DOWNLOAD_WINDOWS_URL, WINDOWS_FALLBACK, isWindowsRelease),
    APP_STORE_URL: allowedUrl(env.IV_APP_STORE_URL, APP_FALLBACK, isAppleStore),
    PLAY_STORE_URL: allowedUrl(env.IV_PLAY_STORE_URL, PLAY_FALLBACK, isPlayStore),
    WEB_URL: allowedUrl(env.IV_DOWNLOAD_WEB_URL, WEB_FALLBACK, isStudioWeb),
    NATION_URL: 'https://nation.infectedvoices.space/',
    TESTFLIGHT_URL: allowedUrl(env.IV_TESTFLIGHT_URL, '', isTestFlight),
    WINDOWS_SHA256: windowsSha256(env)
  };
}

function allowedUrl(value, fallback, accept) {
  const candidate = safeUrl(value, fallback);
  if (candidate && accept(candidate)) return candidate;
  return fallback && accept(fallback) ? fallback : '';
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

function parsed(url) {
  try { return new URL(url); } catch { return null; }
}

export function hostsRawPackage(url) {
  return PACKAGE.test(String(url || ''));
}

export function isAppleStore(url) {
  if (hostsRawPackage(url)) return false;
  const host = parsed(url)?.hostname.toLowerCase() || '';
  return host === 'apps.apple.com' || host === 'itunes.apple.com' || host === 'testflight.apple.com';
}

export function isTestFlight(url) {
  if (!url) return false;
  if (hostsRawPackage(url)) return false;
  return parsed(url)?.hostname.toLowerCase() === 'testflight.apple.com';
}

export function isPlayStore(url) {
  if (hostsRawPackage(url)) return false;
  return parsed(url)?.hostname.toLowerCase() === 'play.google.com';
}

export function isWindowsRelease(url) {
  if (hostsRawPackage(url) || /\.(zip|dmg)(?:$|[?#])/i.test(url) || /zipball|\/archive\//i.test(url)) return false;
  const parsedUrl = parsed(url);
  if (!parsedUrl || parsedUrl.protocol !== 'https:') return false;
  const host = parsedUrl.hostname.toLowerCase();
  if (host === 'github.com') return /^\/grimvirusoffical-source\/InfectedVoices\/releases(?:\/|$)/i.test(parsedUrl.pathname);
  if (host === 'release-assets.githubusercontent.com') return true;
  if (host === 'app.infectedvoices.space' || host === 'infectedvoices.space') {
    return /^\/(?:releases|download|static)\//i.test(parsedUrl.pathname);
  }
  return false;
}

export function isStudioWeb(url) {
  if (hostsRawPackage(url)) return false;
  if (url === '/voices' || url === '/voices/' || url === '/studio' || url === '/studio/' || url.startsWith('/voices/') || url.startsWith('/studio/')) return true;
  const parsedUrl = parsed(url);
  if (!parsedUrl || parsedUrl.protocol !== 'https:') return false;
  const host = parsedUrl.hostname.toLowerCase();
  if (host !== 'app.infectedvoices.space' && host !== 'infectedvoices.space') return false;
  return parsedUrl.pathname === '/voices' || parsedUrl.pathname.startsWith('/voices/') || parsedUrl.pathname === '/studio' || parsedUrl.pathname.startsWith('/studio/');
}

export function windowsSha256(env = process.env) {
  const raw = String(env.IV_DOWNLOAD_WINDOWS_SHA256 || '').trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(raw) ? raw : '';
}

function shaLine(hash) {
  const value = hash || 'published beside the signed installer on GitHub Releases or RedX static. This page does not invent a digest.';
  return `SHA-256 <code class="sha256">${attr(value)}</code>`;
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
    .replaceAll('{{TESTFLIGHT}}', testflight)
    .replaceAll('{{WINDOWS_SHA256}}', shaLine(urls.WINDOWS_SHA256));
}

function hrefs(html) {
  return [...html.matchAll(/href="([^"]*)"/g)].map(match => match[1].replace(/&amp;/g, '&'));
}

export function assertDownloadPages(pages, env = {}) {
  const rendered = {};
  for (const [name, html] of Object.entries(pages)) {
    const body = renderDownload(html, env);
    rendered[name] = body;
    for (const href of hrefs(body)) {
      if (hostsRawPackage(href)) throw new Error(name + ' hosts a raw ipa, aab, or apk: ' + href);
    }
  }
  const hub = rendered['index.html'] || '';
  const windows = rendered['windows.html'] || '';
  const ios = rendered['ios.html'] || '';
  const android = rendered['android.html'] || '';
  const mac = rendered['mac.html'] || '';
  const web = rendered['web.html'] || '';
  const urls = downloadUrls(env);
  if (!isWindowsRelease(urls.WINDOWS_URL)) throw new Error('Windows CTA is not a GitHub Release or RedX static installer.');
  if (!isAppleStore(urls.APP_STORE_URL)) throw new Error('iOS CTA is not an App Store or TestFlight link.');
  if (!isPlayStore(urls.PLAY_STORE_URL)) throw new Error('Android CTA is not a Google Play link.');
  if (!isStudioWeb(urls.WEB_URL)) throw new Error('Open web CTA is not /voices or a studio URL.');
  if (urls.TESTFLIGHT_URL && !isTestFlight(urls.TESTFLIGHT_URL)) throw new Error('TestFlight CTA left the TestFlight host.');
  const chrome = href => href.startsWith('#') || href.startsWith('/get') || href.startsWith('/download') || isStudioWeb(href) || href.startsWith('https://nation.infectedvoices.space');
  for (const href of hrefs(ios)) {
    if (chrome(href)) continue;
    if (!isAppleStore(href)) throw new Error('iOS page has a non-store download: ' + href);
  }
  for (const href of hrefs(android)) {
    if (chrome(href)) continue;
    if (!isPlayStore(href)) throw new Error('Android page has a non-Play download: ' + href);
  }
  if (!mac.includes('No Mac .app') || !hub.includes('No Mac .app')) throw new Error('Mac must stay honest: no .app is published.');
  for (const href of hrefs(mac)) {
    if (chrome(href) || isAppleStore(href)) continue;
    if (/\.(dmg|pkg|app)(?:$|[?#])/i.test(href)) throw new Error('Mac page hosts a desktop installer: ' + href);
    throw new Error('Mac page has a download that is not Open web or the App Store: ' + href);
  }
  if (!windows.includes('id="windowsSha256"') || !windows.includes('SHA-256') || !hub.includes('id="windowsSha256"') || !hub.includes('SHA-256')) {
    throw new Error('Windows SHA-256 is not shown on /get.');
  }
  if (urls.WINDOWS_SHA256 && (!windows.includes(urls.WINDOWS_SHA256) || !hub.includes(urls.WINDOWS_SHA256))) {
    throw new Error('Published Windows SHA-256 was dropped from the page.');
  }
  const digest = String(env.IV_DOWNLOAD_WINDOWS_SHA256 || '').trim();
  if (digest && !urls.WINDOWS_SHA256 && (windows.includes(digest) || hub.includes(digest))) {
    throw new Error('A Windows digest that is not SHA-256 was printed.');
  }
  for (const [name, body] of Object.entries(rendered)) {
    if (!name.endsWith('.html')) continue;
    if (!body.includes('/voices') && name !== 'android.html' && name !== 'ios.html') throw new Error(name + ' does not send open web to /voices.');
    if (!body.includes('44.1 kHz · 16-bit') || !body.includes('48 kHz · 24-bit')) throw new Error(name + ' drops Free 16-bit or Basic+ 48 kHz / 24-bit.');
  }
  for (const pair of [['/get', '/download'], ['/get/windows', '/download/windows'], ['/get/mac', '/download/mac'], ['/get/ios', '/download/ios'], ['/get/android', '/download/android'], ['/get/web', '/download/web']]) {
    if (DOWNLOAD_ROUTES[pair[0]] !== DOWNLOAD_ROUTES[pair[1]]) throw new Error(pair.join(' is not the same page as '));
  }
  return rendered;
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
  '/get/mac': 'mac.html',
  '/get/mac/': 'mac.html',
  '/download/mac': 'mac.html',
  '/download/mac/': 'mac.html',
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
