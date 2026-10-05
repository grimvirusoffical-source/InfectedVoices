// Headless audio-engine test for the built browser studio (browser-dist from `npm run build:browser`).
//
// Run:   npm run build:browser && npm run test:engine
// Env:   ENGINE_E2E_DIST=<dir>   serve another built payload (default: browser-dist)
//        CHROME_PATH=<binary>    use a system Chrome/Chromium instead of Playwright's chromium
//
// Test-only scaffolding (no app code changes):
//  * the RedXAIHost account adapter (api.js) is replaced by a local stub so the studio opens signed in;
//  * localStorage `iv-entitlements-signal` is set to an active Pro plan so GRIM / Project Lab are unlocked;
//  * Chromium's fake mic plays a 440 Hz sine generated at test time (no binary fixtures in git).
//
// Every assertion reads audio the app itself produced (takes in IndexedDB, staged previews, downloaded WAVs).
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const dist = path.resolve(process.env.ENGINE_E2E_DIST || path.join(root, 'browser-dist'))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iv-engine-e2e-'))
const SR = 48000
const IN_HZ = 440
const CENTS_TOL = 5
// Engine-neutral pitch worklet contract (Avery): file and registered AudioWorklet processor name.
const PITCH_WORKLET_FILE = 'iv-pitch-processor.js'
const PITCH_PROCESSOR_NAME = 'iv-pitch-processor'

// ---------- WAV + DSP helpers ----------
function writeWav(file, chans, sr) {
  const n = chans[0].length, nc = chans.length, buf = Buffer.alloc(44 + n * nc * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22); buf.writeUInt32LE(sr, 24)
  buf.writeUInt32LE(sr * nc * 2, 28); buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40)
  let o = 44
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, chans[c][i])) * 32767), o); o += 2 }
  fs.writeFileSync(file, buf)
}
function readWav(b, label) {
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${label}: not a RIFF/WAV file (first bytes "${b.toString('ascii', 0, 4)}")`)
  let o = 12, fmt, data
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4)
    if (id === 'fmt ') fmt = { nc: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) }
    if (id === 'data') data = b.subarray(o + 8, o + 8 + sz)
    o += 8 + sz + (sz & 1)
  }
  assert.ok(fmt && data, `${label}: WAV is missing fmt/data chunks`)
  const bps = fmt.bits / 8, n = Math.floor(data.length / (bps * fmt.nc))
  const ch = Array.from({ length: fmt.nc }, () => new Float32Array(n))
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.nc; c++) {
    const p = (i * fmt.nc + c) * bps
    ch[c][i] = bps === 2 ? data.readInt16LE(p) / 32768 : bps === 3 ? data.readIntLE(p, 3) / 8388608 : data.readFloatLE(p)
  }
  return { ...fmt, n, ch, dur: n / fmt.sr }
}
const sine = (hz, sec, a = 0.3) => Float32Array.from({ length: Math.round(SR * sec) }, (_, i) => a * Math.sin(2 * Math.PI * hz * i / SR))
function amp(x, sr, f, start = 0, len = x.length - start) {
  const k = 2 * Math.cos(2 * Math.PI * f / sr); let s1 = 0, s2 = 0
  const end = Math.min(x.length, start + len)
  for (let i = start; i < end; i++) { const s0 = x[i] + k * s1 - s2; s2 = s1; s1 = s0 }
  return 2 * Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2)) / Math.max(1, end - start)
}
/** Dominant frequency in [lo,hi] (coarse 1 Hz scan, then 0.05 Hz refine). */
function dominant(x, sr, lo, hi, start, len) {
  let bf = lo, ba = 0
  for (let f = lo; f <= hi; f += 1) { const a = amp(x, sr, f, start, len); if (a > ba) { ba = a; bf = f } }
  for (let f = bf - 1; f <= bf + 1; f += 0.05) { const a = amp(x, sr, f, start, len); if (a > ba) { ba = a; bf = f } }
  return { hz: bf, amp: ba }
}
const cents = (a, b) => 1200 * Math.log2(a / b)
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length))
const midHz = (semitones) => IN_HZ * Math.pow(2, semitones / 12)
/** Analysis window that skips the first second (retune slew, recorder start). */
const win = (w) => ({ start: Math.min(w.n - 1, Math.round(w.sr * 1.0)), len: Math.max(1, Math.min(w.n - Math.round(w.sr * 1.0), w.sr * 2)) })

// ---------- static server for the built payload ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' }
const servers = []
/** Serve the payload. `override(rel)` may return {status, type, body} to replace a file (used to force pitch-shifter failures;
 *  served from the origin itself because AudioWorklet module fetches are not reliably interceptable with page.route). */
function serve(override) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      const o = override?.(rel)
      if (o) { res.writeHead(o.status ?? 200, { 'content-type': o.type ?? 'text/javascript', 'cache-control': 'no-store' }); res.end(o.body ?? ''); return }
      let file = path.join(dist, rel)
      if (!file.startsWith(dist)) { res.writeHead(403).end(); return }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
      if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
      fs.createReadStream(file).pipe(res)
    }).listen(0, '127.0.0.1', () => { servers.push(server); resolve(`http://127.0.0.1:${server.address().port}`) })
  })
}
let base

// ---------- browser session ----------
const HOST_STUB = `/* infectednation_session (engine e2e test stub) */
export const auth = { getUser: async () => ({ id: 'engine-e2e', email: 'engine-e2e@example.test', name: 'Engine E2E' }), signIn: async () => ({ user: { id: 'engine-e2e' } }), signOut: async () => {} };`
let browser
async function openStudio({ worklet, query = '', browserOverride, probe = false } = {}) {
  const ctx = await (browserOverride ?? browser).newContext({ permissions: ['microphone'], viewport: { width: 1400, height: 1000 }, acceptDownloads: true })
  await ctx.route('**/api.js', (r) => r.fulfill({ contentType: 'text/javascript', body: HOST_STUB }))
  const forced = { hits: 0 }
  const isWorklet = (rel) => rel.endsWith(`/${PITCH_WORKLET_FILE}`) && ++forced.hits > 0
  const origin = worklet === 'missing' ? await serve((rel) => isWorklet(rel) && { status: 404, type: 'text/plain', body: 'blocked by engine e2e' })
    : worklet === 'init-error' ? await serve((rel) => isWorklet(rel) && { body: FAILING_WORKLET })
    : base
  await ctx.addInitScript(() => localStorage.setItem('iv-entitlements-signal', JSON.stringify({ studioPlan: 'pro', billingStatus: 'active' })))
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (probe) await ctx.addInitScript(LATENCY_PROBE)
  await page.goto(`${origin}/index.html${query}`)
  await page.getByRole('button', { name: 'Start engine', exact: true }).waitFor({ timeout: 15000 }).catch(async () => {
    throw new Error(`Studio did not open past the account gate. Page text: ${(await page.textContent('body')).slice(0, 300)}`)
  })
  return { ctx, page, errors, forced, ...helpers(page) }
}
// Stands in for a pitch shifter that fails to initialise and would otherwise pass audio through silently.
const FAILING_WORKLET = `class EngineE2EFailingPitchProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.port.onmessage = () => {}; this.port.postMessage({ type: 'error', message: 'engine-e2e: forced pitch shifter init failure' }) }
  process(inputs, outputs) { const i = inputs[0], o = outputs[0]; for (let c = 0; c < o.length; c++) if (i && i[c]) o[c].set(i[c]); return true }
}
registerProcessor('${PITCH_PROCESSOR_NAME}', EngineE2EFailingPitchProcessor);`

// Taps the mic source and the recorder input into one sample-aligned 2-channel capture (ch0 = mic, ch1 = what gets recorded).
const LATENCY_PROBE = () => {
  const oc = AudioNode.prototype.connect
  const taps = new WeakMap()
  const tapFor = (ctx) => {
    if (taps.has(ctx)) return taps.get(ctx)
    const merger = ctx.createChannelMerger(2), sp = ctx.createScriptProcessor(2048, 2, 2)
    const store = { sr: ctx.sampleRate, on: false, a: [], b: [] }
    sp.onaudioprocess = (e) => { if (store.on) { store.a.push(new Float32Array(e.inputBuffer.getChannelData(0))); store.b.push(new Float32Array(e.inputBuffer.getChannelData(1))) } }
    oc.call(merger, sp); oc.call(sp, ctx.destination)
    window.__ivProbe = store; const t = { merger, mic: new WeakSet(), out: new WeakSet() }; taps.set(ctx, t); return t
  }
  AudioNode.prototype.connect = function (dst, ...rest) {
    const r = oc.call(this, dst, ...rest)
    try {
      if (this.context instanceof AudioContext) {
        if (this instanceof MediaStreamAudioSourceNode) { const t = tapFor(this.context); if (!t.mic.has(this)) { t.mic.add(this); oc.call(this, t.merger, 0, 0) } }
        if (dst instanceof MediaStreamAudioDestinationNode) { const t = tapFor(this.context); if (!t.out.has(this)) { t.out.add(this); oc.call(this, t.merger, 0, 1) } }
      }
    } catch {}
    return r
  }
}

function helpers(page) {
  const wait = (ms) => page.waitForTimeout(ms)
  const status = async () => (await page.locator('.status:not(.pitch-error)').textContent())?.trim() ?? ''
  const click = async (name) => { await page.getByRole('button', { name, exact: true }).first().click(); await wait(250) }
  const tab = click
  const setRange = async (label, v) => {
    const ok = await page.evaluate(([label, v]) => {
      const l = [...document.querySelectorAll('label.field')].find((x) => x.querySelector('span')?.textContent.trim().startsWith(label))
      const i = l?.querySelector('input[type=range]'); if (!i) return false
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, String(v))
      i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true
    }, [label, v])
    assert.ok(ok, `Deep Settings slider "${label}" not found`)
    await wait(200)
  }
  const select = async (label, value) => { await page.locator('label.field', { hasText: label }).locator('select').first().selectOption(value); await wait(200) }
  const grim = async (on) => {
    const b = page.getByRole('button', { name: /^GRIM (ON|OFF)$/ })
    if (((await b.textContent()) === 'GRIM ON') !== on) await b.click()
    await wait(200)
    assert.equal(await b.textContent(), on ? 'GRIM ON' : 'GRIM OFF', 'GRIM toggle did not change state')
  }
  const configure = async ({ key, scale, correction, grimOn = false, depth = 0, darkness = 10 }) => {
    await tab('Deep Settings'); await click('Reset clean')
    await select('Key', key); await select('Scale', scale)
    await setRange('Correction', correction); await grim(grimOn)
    await setRange('Depth (evil)', depth); await setRange('Darkness', darkness)
  }
  const takes = () => page.evaluate(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('infected-voices-ultimate'); r.onsuccess = () => res(r.result); r.onerror = rej })
    const all = await new Promise((res) => { const q = db.transaction('takes').objectStore('takes').getAll(); q.onsuccess = () => res(q.result) })
    const out = []
    for (const t of all) {
      const u = new Uint8Array(await t.blob.arrayBuffer()); let s = ''
      for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768))
      out.push({ name: t.name, kind: t.kind, createdAt: t.createdAt, b64: btoa(s) })
    }
    db.close(); return out.sort((a, b) => a.createdAt - b.createdAt)
  })
  const latestTake = async (label) => {
    const all = await takes(); assert.ok(all.length, `${label}: no take was saved to the project`)
    const t = all[all.length - 1]; return { ...t, wav: readWav(Buffer.from(t.b64, 'base64'), `${label} (${t.name})`) }
  }
  const recordTake = async (label, ms = 4000) => {
    await tab('Studio')
    const before = (await takes()).length
    await click('Record take'); await wait(ms); await click('Stop take')
    await page.waitForFunction(() => /Saved /.test(document.querySelector('.status:not(.pitch-error)')?.textContent || ''), null, { timeout: 15000 })
      .catch(async () => { throw new Error(`${label}: take was not saved. Status: "${await status()}"`) })
    assert.equal((await takes()).length, before + 1, `${label}: expected exactly one new take`)
    return latestTake(label)
  }
  const clearStage = async () => { if (await page.locator('#ivKeepBar').count()) await click('Undo') }
  /** Wait for a staged preview, or for a NEW failure status (different from `before`, the status captured before the action). */
  const stagedWav = async (label, before, timeout = 30000) => {
    await page.waitForFunction((before) => {
      const st = document.querySelector('.status:not(.pitch-error)')?.textContent || ''
      return document.querySelector('#ivKeepBar audio') || (st !== before && /failed/i.test(st))
    }, before, { timeout }).catch(() => {})
    if (!(await page.locator('#ivKeepBar audio').count())) {
      const banner = await page.locator('[data-testid="pitch-error"]').textContent().catch(() => null)
      throw new Error(`${label}: no preview render. Status: "${await status()}"${banner ? `. Pitch-error banner: "${banner.trim()}"` : ''}`)
    }
    const b64 = await page.evaluate(async () => {
      const a = document.querySelector('#ivKeepBar audio'); const u = new Uint8Array(await (await fetch(a.src)).arrayBuffer()); let s = ''
      for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768)); return btoa(s)
    })
    return readWav(Buffer.from(b64, 'base64'), label)
  }
  const playheads = async (n = 10, every = 300) => {
    const out = []
    for (let i = 0; i < n; i++) { out.push(Number((await page.locator('.loop-meta').textContent()).match(/Playhead ([\d.]+)/)[1])); await wait(every) }
    return out
  }
  return { clearStage, wait, status, click, tab, setRange, select, grim, configure, takes, latestTake, recordTake, stagedWav, playheads }
}

// ---------- suite ----------
let S // main session
let engineLive = false
const pitchResults = {} // realtime vs offline auto-tune pitch for the same input/settings
const requireEngine = () => assert.ok(engineLive, 'BLOCKED: the audio engine never reached "Engine live" (see the engine-start test)')

before(async () => {
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), `Built payload not found at ${dist}. Run \`npm run build:browser\` first.`)
  writeWav(path.join(tmp, 'mic-440.wav'), [sine(IN_HZ, 10)], SR)
  writeWav(path.join(tmp, 'dry-440.wav'), [sine(IN_HZ, 3)], SR)
  base = await serve()
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${path.join(tmp, 'mic-440.wav')}`, '--autoplay-policy=no-user-gesture-required'],
  })
  S = await openStudio()
})
after(async () => { await browser?.close(); for (const s of servers) s.close(); fs.rmSync(tmp, { recursive: true, force: true }) })

test('engine start: Start engine reaches "Engine live" with a fake 440 Hz mic', async () => {
  await S.configure({ key: 'A', scale: 'major', correction: 100 })
  await S.tab('Studio'); await S.click('Start engine')
  await S.page.waitForFunction(() => /Engine live|error/i.test(document.querySelector('.status:not(.pitch-error)')?.textContent || ''), null, { timeout: 15000 }).catch(() => {})
  const st = await S.status()
  assert.match(st, /^Engine live/, `Engine did not start. Status: "${st}". Page errors: ${JSON.stringify(S.errors)}`)
  assert.equal(await S.page.getByRole('button', { name: 'Record take', exact: true }).isDisabled(), false, 'Record take is still disabled after engine start')
  engineLive = true
})

test('[Casey 1] 440 Hz at 100% correction toward A major stays within ±5 cents of A4 (440 Hz)', async () => {
  requireEngine()
  const t = await S.recordTake('A-major take')
  const { start, len } = win(t.wav); const d = dominant(t.wav.ch[0], t.wav.sr, 300, 600, start, len)
  assert.ok(rms(t.wav.ch[0]) > 0.005, `A-major take is silent (rms ${rms(t.wav.ch[0]).toFixed(5)})`)
  const c = cents(d.hz, 440)
  assert.ok(Math.abs(c) <= CENTS_TOL, `A-major take dominant ${d.hz.toFixed(2)} Hz is ${c.toFixed(1)} cents from 440 Hz (tolerance ±${CENTS_TOL})`)
})

test('realtime auto-tune: a non-zero correction actually shifts (440 Hz -> Bb4 466.16 Hz in C pentatonic minor)', async () => {
  requireEngine()
  // A is not in C pentatonic minor (C Eb F G Bb); nearest permitted note is Bb4, +1 semitone.
  await S.configure({ key: 'C', scale: 'pentatonicMinor', correction: 100 })
  const t = await S.recordTake('C-pentatonic take')
  const { start, len } = win(t.wav); const x = t.wav.ch[0]
  const d = dominant(x, t.wav.sr, 300, 600, start, len); const target = midHz(1)
  pitchResults.realtime = d.hz
  const c = cents(d.hz, target)
  assert.ok(Math.abs(cents(d.hz, IN_HZ)) > 50, `SILENT PASS-THROUGH: output stayed at ${d.hz.toFixed(2)} Hz (input 440 Hz) with 100% correction toward a scale without A. The pitch shifter is not processing.`)
  assert.ok(Math.abs(c) <= CENTS_TOL, `Corrected take dominant ${d.hz.toFixed(2)} Hz is ${c.toFixed(1)} cents from Bb4 ${target.toFixed(2)} Hz (tolerance ±${CENTS_TOL})`)
})

test('[Casey 2] GRIM pitch drop is measurable in the recorded output', async () => {
  requireEngine()
  // correction 0 isolates the GRIM shifter: depth 50 -> -(0.5*10)-2 = -7 semitones (293.66 Hz), mixed with the dry 440 Hz.
  const drop = midHz(-7)
  await S.configure({ key: 'A', scale: 'major', correction: 0, grimOn: false })
  const off = await S.recordTake('GRIM off take')
  await S.configure({ key: 'A', scale: 'major', correction: 0, grimOn: true, depth: 50, darkness: 70 })
  const on = await S.recordTake('GRIM on take')
  await S.configure({ key: 'A', scale: 'major', correction: 100, grimOn: false })
  const wOff = win(off.wav), wOn = win(on.wav)
  const aOff = amp(off.wav.ch[0], off.wav.sr, drop, wOff.start, wOff.len)
  const aOn = amp(on.wav.ch[0], on.wav.sr, drop, wOn.start, wOn.len)
  const aDry = amp(on.wav.ch[0], on.wav.sr, IN_HZ, wOn.start, wOn.len)
  assert.ok(aOn > 10 * Math.max(aOff, 1e-4) && aOn > 0.1 * aDry,
    `GRIM pitch drop not found: level at ${drop.toFixed(1)} Hz is ${aOn.toFixed(4)} with GRIM on vs ${aOff.toFixed(4)} off (440 Hz level ${aDry.toFixed(4)}). Expected >10x the GRIM-off level and >10% of the dry tone.`)
})

test('offline export: Takes + Export WAV writes a non-silent 48 kHz / 24-bit file of the take length', async () => {
  requireEngine()
  const take = await S.latestTake('export source')
  await S.tab('Takes + Export')
  const row = S.page.locator('.take', { has: S.page.locator('strong', { hasText: take.name }) }).first()
  const [dl] = await Promise.all([S.page.waitForEvent('download', { timeout: 20000 }), row.getByRole('button', { name: 'WAV', exact: true }).click()])
  const file = path.join(tmp, 'export.wav'); await dl.saveAs(file)
  const w = readWav(fs.readFileSync(file), 'exported WAV')
  assert.equal(w.sr, 48000, `exported WAV sample rate ${w.sr}, expected 48000 for Pro`)
  assert.equal(w.bits, 24, `exported WAV bit depth ${w.bits}, expected 24 for Pro`)
  assert.ok(Math.abs(w.dur - take.wav.dur) < 0.05, `exported WAV is ${w.dur.toFixed(3)} s, take is ${take.wav.dur.toFixed(3)} s`)
  assert.ok(w.dur > 2, `exported WAV is only ${w.dur.toFixed(3)} s`)
  assert.ok(rms(w.ch[0]) > 0.005, `exported WAV is silent (rms ${rms(w.ch[0]).toFixed(5)})`)
})

test('[Casey 5] Loop ON wraps and Loop OFF does not, immediately after each toggle', async () => {
  requireEngine()
  await S.tab('Beat Deck'); await S.click('Play')
  await S.tab('Rap on Beat')
  await S.page.locator('label.field', { hasText: 'Loop start (sec)' }).locator('input').fill('1')
  await S.page.locator('label.field', { hasText: 'Loop end (sec)' }).locator('input').fill('2.5')
  await S.click('Apply loop points')
  const loopBtn = S.page.getByRole('button', { name: /^Loop (ON|OFF)$/ })
  if ((await loopBtn.textContent()) === 'Loop ON') { await loopBtn.click(); await S.wait(300) }
  await S.wait(3000) // let the playhead run past the loop end with looping off
  await loopBtn.click(); assert.equal(await loopBtn.textContent(), 'Loop ON', 'Loop button did not switch to ON')
  const onHeads = await S.playheads(10, 300)
  const settled = onHeads.slice(3)
  assert.ok(settled.every((p) => p >= 0.95 && p <= 2.6),
    `Loop ON did not wrap the transport within 1.00–2.50 s right after the toggle. Playheads: ${onHeads.join(', ')}`)
  await loopBtn.click(); assert.equal(await loopBtn.textContent(), 'Loop OFF', 'Loop button did not switch to OFF')
  const offHeads = await S.playheads(10, 300)
  assert.ok(Math.max(...offHeads) > 2.7 && offHeads.slice(1).every((p, i) => p >= offHeads[i] - 0.01),
    `Loop OFF still wraps right after the toggle (playhead should run past 2.50 s without jumping back). Playheads: ${offHeads.join(', ')}`)
})

test('[Casey 3] Rap on Beat render is non-silent, loop-length, and differs from the dry pass', async () => {
  requireEngine()
  await S.tab('Rap on Beat')
  await S.click('Record practice pass'); await S.wait(3000); await S.click('Save pass to project')
  await S.page.waitForFunction(() => /Practice pass saved/.test(document.querySelector('.status:not(.pitch-error)')?.textContent || ''), null, { timeout: 15000 })
    .catch(async () => { throw new Error(`practice pass was not saved. Status: "${await S.status()}"`) })
  const pass = await S.latestTake('practice pass')
  assert.equal(pass.kind, 'pass', `latest take kind is ${pass.kind}, expected pass`)
  const before = await S.status()
  await S.click('Rap on Beat auto')
  const w = await S.stagedWav('Rap on Beat preview', before)
  const target = 1.5
  assert.ok(rms(w.ch[0]) > 0.005, `Rap on Beat preview is silent (rms ${rms(w.ch[0]).toFixed(5)})`)
  assert.ok(Math.abs(w.dur - target) / target < 0.1, `Rap on Beat preview is ${w.dur.toFixed(3)} s, expected ≈${target} s (loop length)`)
  assert.ok(Math.abs(w.dur - pass.wav.dur) > 0.3, `Rap on Beat preview (${w.dur.toFixed(3)} s) is not different from the dry pass (${pass.wav.dur.toFixed(3)} s)`)
  await S.click('Undo')
})

test('[Casey 3] offline auto-tune render is non-silent, input-length, 48 kHz, and differs from the dry file', async () => {
  requireEngine()
  await S.clearStage()
  await S.configure({ key: 'C', scale: 'pentatonicMinor', correction: 100 })
  await S.tab('Project Lab')
  const before = await S.status()
  await S.page.locator('label.field', { hasText: 'Autotune recorded file' }).locator('input[type=file]').setInputFiles(path.join(tmp, 'dry-440.wav'))
  const w = await S.stagedWav('offline auto-tune preview', before)
  assert.equal(w.sr, 48000, `offline render sample rate ${w.sr}, expected 48000`)
  assert.ok(Math.abs(w.dur - 3) < 0.15, `offline render is ${w.dur.toFixed(3)} s, input was 3.000 s`)
  assert.ok(rms(w.ch[0]) > 0.005, `offline render is silent (rms ${rms(w.ch[0]).toFixed(5)})`)
  const d = dominant(w.ch[0], w.sr, 300, 600, Math.round(w.sr * 0.5), w.sr * 2)
  pitchResults.offline = d.hz
  assert.ok(Math.abs(cents(d.hz, IN_HZ)) > 50, `offline auto-tune did not change pitch: dominant ${d.hz.toFixed(2)} Hz vs dry 440 Hz (expected ≈${midHz(1).toFixed(2)} Hz)`)
  await S.click('Undo')
})

test('[Casey b] offline auto-tune pitch matches realtime auto-tune pitch within ±5 cents (440 Hz, C pentatonic minor, 100%)', () => {
  requireEngine()
  assert.ok(pitchResults.realtime, 'BLOCKED: no realtime auto-tune pitch was measured (see the realtime auto-tune test)')
  assert.ok(pitchResults.offline, 'BLOCKED: no offline auto-tune render was measured (see the offline auto-tune test)')
  const c = cents(pitchResults.offline, pitchResults.realtime)
  assert.ok(Math.abs(c) <= CENTS_TOL, `offline ${pitchResults.offline.toFixed(2)} Hz vs realtime ${pitchResults.realtime.toFixed(2)} Hz differ by ${c.toFixed(1)} cents (tolerance ±${CENTS_TOL})`)
  assert.ok(Math.abs(cents(pitchResults.realtime, IN_HZ)) > 50, `both renders sit at the unshifted input (${pitchResults.realtime.toFixed(2)} Hz); matching pass-through is not a match`)
})

test('[Casey a] realtime auto-tune latency (mic -> recorded take) is <= 50 ms with correction engaged', async () => {
  requireEngine()
  // 440 Hz bursts (150 ms on / 350 ms off) on a separate fake mic; onsets compared sample-aligned between the mic source and the recorder input.
  const burstFile = path.join(tmp, 'mic-bursts-440.wav')
  const x = new Float32Array(SR * 10)
  for (let i = 0; i < x.length; i++) { const t = (i % (SR / 2)) / SR; if (t < 0.15) x[i] = 0.3 * Math.sin(2 * Math.PI * IN_HZ * i / SR) * Math.min(1, t / 0.002, (0.15 - t) / 0.002) }
  writeWav(burstFile, [x], SR)
  const b2 = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${burstFile}`, '--autoplay-policy=no-user-gesture-required'],
  })
  try {
    const s = await openStudio({ browserOverride: b2, probe: true })
    await s.configure({ key: 'C', scale: 'pentatonicMinor', correction: 100 })
    await s.tab('Studio'); await s.click('Start engine'); await s.wait(2500)
    assert.match(await s.status(), /^Engine live/, `latency session: engine did not start. Status: "${await s.status()}"`)
    const banner = await s.page.locator('[data-testid="pitch-error"]').count()
    assert.equal(banner, 0, `latency session: pitch shifting failed, so correction is not engaged: "${banner && (await s.page.locator('[data-testid="pitch-error"]').textContent())}"`)
    await s.page.evaluate(() => { const p = window.__ivProbe; if (p) { p.a = []; p.b = []; p.on = true } })
    await s.wait(4000)
    const cap = await s.page.evaluate(() => {
      const p = window.__ivProbe; if (!p) return null; p.on = false
      const cat = (arr) => { const n = arr.reduce((k, c) => k + c.length, 0), o = new Float32Array(n); let j = 0; for (const c of arr) { o.set(c, j); j += c.length } return Array.from(o) }
      return { sr: p.sr, a: cat(p.a), b: cat(p.b) }
    })
    const lateBanner = await s.page.locator('[data-testid="pitch-error"]').count()
    assert.equal(lateBanner, 0, `latency session: pitch shifting failed during capture, so correction is not engaged: "${lateBanner && (await s.page.locator('[data-testid="pitch-error"]').textContent())}"`)
    assert.ok(cap && cap.a.length > cap.sr, 'latency probe captured nothing (harness could not tap the mic source / recorder input)')
    const env = (arr) => { const o = new Float32Array(arr.length); let e = 0; const k = Math.exp(-1 / (cap.sr * 0.001)); for (let i = 0; i < arr.length; i++) { e = Math.max(Math.abs(arr[i]), e * k); o[i] = e } return o }
    const ea = env(cap.a), eb = env(cap.b)
    const peak = (e) => e.reduce((m, v) => (v > m ? v : m), 0)
    const maxA = peak(ea), maxB = peak(eb)
    assert.ok(maxA > 0.05, `latency probe: the mic tap is silent (peak ${maxA.toFixed(4)})`)
    assert.ok(maxB > 0.01, `latency probe: nothing reached the recorder (peak ${maxB.toFixed(4)})`)
    const onsets = (e, thr) => { const o = []; for (let i = 1; i < e.length; i++) if (e[i] >= thr && e[i - 1] < thr && (!o.length || i - o[o.length - 1] > cap.sr * 0.3)) o.push(i); return o }
    const inOn = onsets(ea, 0.25 * maxA), outOn = onsets(eb, 0.25 * maxB)
    const lags = []
    for (const i of inOn) { const j = outOn.find((v) => v >= i && v - i < cap.sr * 0.3); if (j !== undefined) lags.push((j - i) / cap.sr * 1000) }
    assert.ok(lags.length >= 4, `latency probe: could not pair mic and output onsets (mic onsets ${inOn.length}, output onsets ${outOn.length})`)
    lags.sort((p, q) => p - q); const median = lags[Math.floor(lags.length / 2)]
    assert.ok(median <= 50, `realtime auto-tune latency is ${median.toFixed(1)} ms (median of ${lags.length} bursts: ${lags.map((v) => v.toFixed(1)).join(', ')}); Casey's bar is <= 50 ms`)
  } finally { await b2.close() }
})

for (const [mode, how] of [
  ['url-hook', 'the studio is opened with ?ivForcePitchFail=1'],
  ['missing', 'the pitch-shifter worklet fails to load (404)'],
  ['init-error', 'the pitch shifter reports an init error and passes audio through'],
]) {
  test(`[Casey 4] when ${how}, the pitch-error banner is shown instead of silently passing audio through`, async () => {
    requireEngine() // only meaningful once the engine starts normally; otherwise every start "shows an error"
    const s = await openStudio(mode === 'url-hook' ? { query: '?ivForcePitchFail=1' } : { worklet: mode })
    try {
      await s.tab('Studio'); await s.click('Start engine')
      const banner = s.page.locator('[data-testid="pitch-error"]')
      await banner.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {})
      const st = await s.status()
      if (mode !== 'url-hook') assert.ok(s.forced.hits > 0, `Expected worklet ${PITCH_WORKLET_FILE} to be requested (processor "${PITCH_PROCESSOR_NAME}"), but the studio never fetched it, so the ${mode} failure could not be injected.`)
      assert.ok(await banner.isVisible(), `With ${how}, no [data-testid="pitch-error"] banner appeared (status: "${st}") — silent pass-through.`)
      assert.match(await banner.textContent(), /Pitch shifting failed/, 'pitch-error banner text does not say pitch shifting failed')
    } finally { await s.ctx.close() }
  })
}
