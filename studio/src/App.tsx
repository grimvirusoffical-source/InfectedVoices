import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InfectedAudioEngine, pocketAssistOffsetSec, rapOnBeatRate } from './lib/audioEngine'
import {
  KEYS,
  defaultSettings,
  factoryPresets,
  uid,
  type Preset,
  type VocalSettings,
} from './lib/presets'
import {
  deletePreset,
  getProject,
  listPresets,
  listTakes,
  savePreset,
  saveProject,
  saveTake,
  seedFactoryPresets,
  type SongSection,
} from './lib/projectStore'
import { estimateKey, sliceChannel } from './lib/keyEstimate'
import { loadHostSession, type HostModule, type HostUser } from './hostSession'
import {
  audioBufferToMp3,
  audioBufferToWav,
  blobToAudioBuffer,
  micMasterMix,
  smartMixMaster,
  ultimateMicMaster,
  type MicMasterOptions,
} from './lib/exportAudio'
import { deliverBlob } from './lib/deliver'
import { clampPocketSec, POCKET_LIMIT_SEC } from './lib/pocket'
import { loopRangeFromBars, secToBar } from './lib/transport'
import { QRCodeSVG } from 'qrcode.react'
import { shiftAudioBuffer } from './lib/audioShift'
import { STUDIO_VERSION } from './version'
import { REDX_INSTALL_COMMAND, VOCAL_LAB_V040 } from './releases'
import './index.css'

type Tab =
  | 'studio'
  | 'beat'
  | 'voice'
  | 'settings'
  | 'practice'
  | 'lab'
  | 'takes'
  | 'mobile'
  | 'desktop'
  | 'updates'

const TABS: { id: Tab; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'beat', label: 'Beat Deck' },
  { id: 'voice', label: 'Voice + Presets' },
  { id: 'settings', label: 'Deep Settings' },
  { id: 'practice', label: 'Rap on Beat' },
  { id: 'lab', label: 'Project Lab' },
  { id: 'takes', label: 'Takes + Export' },
  { id: 'mobile', label: 'Mobile Connect' },
  { id: 'desktop', label: 'Windows' },
  { id: 'updates', label: 'Updates' },
]

const MASTER_DEFAULT: MicMasterOptions = {
  beatVolume: 0.65,
  loudness: 62,
  headroomDb: 1.5,
  ducking: 55,
  width: 18,
  tone: 54,
  vocalsOnly: false,
}

function Knob({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
}) {
  return (
    <label className="field">
      <span>
        {label} <strong style={{ color: 'var(--text-primary)' }}>{Math.round(value)}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('studio')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [engineOn, setEngineOn] = useState(false)
  const [recording, setRecording] = useState(false)
  const [settings, setSettings] = useState<VocalSettings>(factoryPresets()[0].settings)
  const [presets, setPresets] = useState<Preset[]>([])
  const [activePresetId, setActivePresetId] = useState('grim')
  const [bpm, setBpm] = useState(140)
  const [pos, setPos] = useState(0)
  const [loopOn, setLoopOn] = useState(false)
  const [loopStart, setLoopStart] = useState(0)
  const [loopEnd, setLoopEnd] = useState(8)
  const [loopStartBar, setLoopStartBar] = useState(1)
  const [loopEndBar, setLoopEndBar] = useState(2)
  const [pocketMs, setPocketMs] = useState(0)
  const [compensationMs, setCompensationMs] = useState(0)
  const [sections, setSections] = useState<SongSection[]>([])
  const [master, setMaster] = useState<MicMasterOptions>(MASTER_DEFAULT)
  const [roexKey, setRoexKey] = useState('')
  const [roexConfirm, setRoexConfirm] = useState(false)
  const [correctOnBalance, setCorrectOnBalance] = useState(true)
  const [uiMode, setUiMode] = useState<'auto' | 'ios' | 'android' | 'pc'>('auto')
  const [host, setHost] = useState<HostModule | null>(null)
  const [hostReady, setHostReady] = useState(false)
  const [user, setUser] = useState<HostUser | null>(null)
  const [hostError, setHostError] = useState('')
  const settingsRef = useRef(settings)
  const sectionsRef = useRef(sections)
  const undoMaster = useRef<{ settings: VocalSettings; master: MicMasterOptions } | null>(null)
  settingsRef.current = settings
  sectionsRef.current = sections
  const [metro, setMetro] = useState(false)
  const [beatName, setBeatName] = useState<string | null>(null)
  const [beatBuf, setBeatBuf] = useState<AudioBuffer | null>(null)
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([])
  const [takes, setTakes] = useState<Awaited<ReturnType<typeof listTakes>>>([])
  const [status, setStatus] = useState('Ready')
  const [customName, setCustomName] = useState('')
  const [lanUrl, setLanUrl] = useState('')
  const [rapRate, setRapRate] = useState(1)
  const engineRef = useRef<InfectedAudioEngine | null>(null)
  const vocalBufRef = useRef<AudioBuffer | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    ;(async () => {
      await seedFactoryPresets()
      setPresets(await listPresets())
      const proj = await getProject()
      setSettings(proj.settings)
      setBpm(proj.bpm)
      setLoopStart(proj.loopStartSec)
      setLoopEnd(proj.loopEndSec)
      setLoopStartBar(secToBar(proj.loopStartSec, proj.bpm))
      setLoopEndBar(Math.max(secToBar(proj.loopStartSec, proj.bpm), secToBar(Math.max(0, proj.loopEndSec - 0.0001), proj.bpm)))
      setSections(proj.sections ?? [])
      const savedMode = localStorage.getItem('iv-ui-mode')
      if (savedMode === 'ios' || savedMode === 'android' || savedMode === 'pc' || savedMode === 'auto') setUiMode(savedMode)
      const savedKey = localStorage.getItem('iv-roex-key')
      if (savedKey) setRoexKey(savedKey)
      setTakes(await listTakes())
      const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
      const proto = window.location.protocol
      const urls = new Set<string>([window.location.origin])
      try {
        const pcs = [new RTCPeerConnection({ iceServers: [] })]
        pcs[0].createDataChannel('')
        const offer = await pcs[0].createOffer()
        await pcs[0].setLocalDescription(offer)
        await new Promise<void>((resolve) => {
          const done = () => resolve()
          setTimeout(done, 800)
          pcs[0].onicecandidate = (e) => {
            const cand = e.candidate?.candidate
            if (!cand) return
            const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(cand)
            if (m && !m[1].startsWith('127.')) {
              urls.add(`${proto}//${m[1]}:${port}`)
            }
            if (!e.candidate) done()
          }
        })
        pcs[0].close()
      } catch {
        /* keep origin */
      }
      const preferred = [...urls].find((u) => !u.includes('localhost') && !u.includes('127.0.0.1')) || window.location.origin
      setLanUrl(preferred)
    })()
  }, [])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const mod = await loadHostSession()
      if (cancel) return
      setHost(mod)
      if (mod) {
        try {
          setUser(await mod.auth.getUser())
        } catch (error) {
          setHostError(error instanceof Error ? error.message : String(error))
          setUser(null)
        }
      }
      if (!cancel) setHostReady(true)
    })()
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.ui = uiMode
    localStorage.setItem('iv-ui-mode', uiMode)
  }, [uiMode])

  const bindTick = useCallback((engine: InfectedAudioEngine) => {
    engine.setOnTick((p) => {
      setPos(p)
      const section = sectionsRef.current.find((item) => p >= item.startSec && p < item.endSec)
      const current = settingsRef.current
      if (!section || (section.key === current.key && section.scale === current.scale)) return
      const next = { ...current, key: section.key, scale: section.scale }
      settingsRef.current = next
      setSettings(next)
      engine.applySettings(next)
    })
  }, [])

  const barBeat = useMemo(() => {
    const beats = pos / (60 / bpm)
    const bar = Math.floor(beats / 4) + 1
    const beat = (Math.floor(beats) % 4) + 1
    return { bar, beat }
  }, [pos, bpm])

  const patchSettings = useCallback((partial: Partial<VocalSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...partial }
      engineRef.current?.applySettings(next)
      void saveProject({ settings: next })
      return next
    })
  }, [])

  const startEngine = async () => {
    try {
      setStatus('Starting engine…')
      if (!engineRef.current) {
        engineRef.current = new InfectedAudioEngine(settings)
        await engineRef.current.init()
        bindTick(engineRef.current)
      }
      engineRef.current.setBpm(bpm)
      engineRef.current.applySettings(settings)
      await engineRef.current.startMic()
      setEngineOn(true)
      setStatus('Engine live — headphones recommended')
    } catch (e) {
      setStatus(`Mic error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const stopEngine = () => {
    engineRef.current?.stopMic()
    engineRef.current?.stop()
    setEngineOn(false)
    setStatus('Engine stopped')
  }

  const onBeatFile = async (file: File) => {
    const ab = await file.arrayBuffer()
    const buf = await blobToAudioBuffer(new Blob([ab]))
    setBeatBuf(buf)
    const peaks: number[] = []
    const data = buf.getChannelData(0)
    const buckets = 120
    const step = Math.floor(data.length / buckets) || 1
    for (let i = 0; i < buckets; i++) {
      let m = 0
      const start = i * step
      for (let j = start; j < start + step && j < data.length; j++) m = Math.max(m, Math.abs(data[j]))
      peaks.push(m)
    }
    setWaveformPeaks(peaks)
    setBeatName(file.name)
    if (!engineRef.current) {
      engineRef.current = new InfectedAudioEngine(settings)
      await engineRef.current.init()
      bindTick(engineRef.current)
    }
    await engineRef.current.loadBeat(ab)
    engineRef.current.setBpm(bpm)
    setStatus(`Beat loaded: ${file.name}`)
  }

  const applyLoop = () => {
    engineRef.current?.setLoop(loopOn, loopStart, loopEnd)
    void saveProject({ loopStartSec: loopStart, loopEndSec: loopEnd, bpm })
  }

  const applyBarLoop = () => {
    const range = loopRangeFromBars(loopStartBar, loopEndBar, bpm)
    setLoopStartBar(range.startBar)
    setLoopEndBar(range.endBar)
    setLoopStart(range.startSec)
    setLoopEnd(range.endSec)
    setLoopOn(true)
    engineRef.current?.setLoop(true, range.startSec, range.endSec)
    void saveProject({ loopStartSec: range.startSec, loopEndSec: range.endSec, bpm })
    setStatus(`Bar loop ${range.startBar}–${range.endBar} (${range.startSec.toFixed(2)}s–${range.endSec.toFixed(2)}s)`)
  }

  const setOneBarLoop = () => {
    const startBar = secToBar(pos, bpm)
    setLoopStartBar(startBar)
    setLoopEndBar(startBar)
    const range = loopRangeFromBars(startBar, startBar, bpm)
    setLoopStart(range.startSec)
    setLoopEnd(range.endSec)
    setLoopOn(true)
    engineRef.current?.setLoop(true, range.startSec, range.endSec)
    void saveProject({ loopStartSec: range.startSec, loopEndSec: range.endSec, bpm })
    setStatus(`One-bar loop at bar ${startBar}`)
  }

  const rememberSection = (guess?: { key: string; scale: VocalSettings['scale'] }) => {
    const section: SongSection = {
      id: uid('section'),
      startSec: loopStart,
      endSec: Math.max(loopStart + 0.05, loopEnd),
      key: guess?.key ?? settings.key,
      scale: guess?.scale ?? settings.scale,
    }
    const next = [...sections.filter((item) => item.endSec <= section.startSec || item.startSec >= section.endSec), section]
      .sort((a, b) => a.startSec - b.startSec)
    setSections(next)
    void saveProject({ sections: next })
    setStatus(`Song map ${section.key} ${section.scale} · ${section.startSec.toFixed(2)}s–${section.endSec.toFixed(2)}s`)
  }

  const estimateSectionKey = () => {
    if (!beatBuf) {
      setStatus('Import a beat before estimating a section key')
      return
    }
    const slice = sliceChannel(beatBuf, loopStart, loopEnd)
    const guess = estimateKey(slice, beatBuf.sampleRate)
    if (!guess) {
      setStatus('Could not estimate a key in A–B. Set it by ear.')
      return
    }
    rememberSection(guess)
  }

  const toggleMetro = (on: boolean) => {
    setMetro(on)
    engineRef.current?.setMetronome(on)
  }

  const toggleRecord = async () => {
    if (!engineRef.current) return
    if (!recording) {
      await engineRef.current.startRecording()
      setRecording(true)
      setStatus('Recording take… (metronome stays cue-only)')
    } else {
      const blob = await engineRef.current.stopRecording()
      setRecording(false)
      const take = await persistAsWavTake({
        name: `Take ${new Date().toLocaleTimeString()}`,
        blob,
        kind: 'infected',
      })
      setTakes(await listTakes())
      setStatus(`Saved ${take.name}`)
    }
  }

  const loadPreset = (p: Preset) => {
    setActivePresetId(p.id)
    setSettings(p.settings)
    engineRef.current?.applySettings(p.settings)
    void saveProject({ settings: p.settings })
  }

  const saveCustom = async () => {
    const name = customName.trim() || `Custom ${presets.length + 1}`
    const preset: Preset = { id: uid('preset'), name, settings: { ...settings } }
    await savePreset(preset)
    setPresets(await listPresets())
    setActivePresetId(preset.id)
    setCustomName('')
    setStatus(`Saved preset “${name}”`)
  }


  const persistAsWavTake = async (opts: {
    name: string
    blob: Blob
    kind: 'dry' | 'infected' | 'mix' | 'master' | 'pass'
    offsetSec?: number
  }) => {
    let buf = await blobToAudioBuffer(opts.blob)
    const compensationSec = Math.max(-0.2, Math.min(0.2, compensationMs / 1000))
    if (compensationSec) buf = shiftAudioBuffer(buf, -compensationSec)
    if (opts.offsetSec) buf = shiftAudioBuffer(buf, opts.offsetSec)
    const wav = await audioBufferToWav(buf)
    return saveTake({ name: opts.name, blob: wav, kind: opts.kind, offsetSec: opts.offsetSec })
  }

  const processOfflineFile = async (file: File) => {
    if (!engineRef.current) {
      engineRef.current = new InfectedAudioEngine(settings)
      await engineRef.current.init()
    }
    const buf = await blobToAudioBuffer(file)
    vocalBufRef.current = buf
    const processed = await engineRef.current.processOfflineBuffer(buf)
    const wav = await audioBufferToWav(processed)
    await saveTake({ name: `Offline ${file.name}`, blob: wav, kind: 'infected' })
    setTakes(await listTakes())
    setStatus(`Processed offline: ${file.name}`)
  }

  const runPocketAssist = async (takeId: string) => {
    const take = takes.find((t) => t.id === takeId)
    if (!take) return
    const buf = await blobToAudioBuffer(take.blob)
    const offset = pocketAssistOffsetSec(buf.getChannelData(0), buf.sampleRate, bpm)
    const shifted = shiftAudioBuffer(buf, offset)
    const wav = await audioBufferToWav(shifted)
    await saveTake({
      name: `${take.name} (pocket ${(offset * 1000).toFixed(0)}ms)`,
      blob: wav,
      kind: take.kind,
      offsetSec: offset,
    })
    setTakes(await listTakes())
    setStatus(`Pocket Assist applied ${(offset * 1000).toFixed(1)} ms (limit ±${POCKET_LIMIT_SEC * 1000} ms)`)
  }

  const runManualPocket = async (takeId: string) => {
    const take = takes.find((t) => t.id === takeId)
    if (!take) return
    const offset = clampPocketSec(pocketMs / 1000)
    const buf = await blobToAudioBuffer(take.blob)
    const shifted = shiftAudioBuffer(buf, offset)
    const wav = await audioBufferToWav(shifted)
    await saveTake({
      name: `${take.name} (nudge ${(offset * 1000).toFixed(0)}ms)`,
      blob: wav,
      kind: take.kind,
      offsetSec: offset,
    })
    setTakes(await listTakes())
    setStatus(`Pocket nudge ${(offset * 1000).toFixed(0)} ms saved (clamped to ±80 ms)`)
  }

  const runSmartMix = async () => {
    if (!beatBuf) {
      setStatus('Import a beat first')
      return
    }
    const vocalTake = takes.find((t) => t.kind === 'infected' || t.kind === 'pass')
    if (!vocalTake) {
      setStatus('Record or process a vocal first')
      return
    }
    setStatus('SMART MIX+MASTER rendering…')
    let vocal = await blobToAudioBuffer(vocalTake.blob)
    if (vocalTake.offsetSec) vocal = shiftAudioBuffer(vocal, vocalTake.offsetSec)
    const mastered = await smartMixMaster(vocal, beatBuf)
    const wav = await audioBufferToWav(mastered)
    await saveTake({ name: `SMART MIX+MASTER ${new Date().toLocaleTimeString()}`, blob: wav, kind: 'master' })
    setTakes(await listTakes())
    setStatus('SMART MIX+MASTER complete — vocal balanced, beat ducked, bus limited')
  }

  const runMicMaster = async () => {
    if (!beatBuf) {
      setStatus('Import a beat first')
      return
    }
    const vocalTake = takes.find((t) => t.kind === 'infected' || t.kind === 'pass')
    if (!vocalTake) {
      setStatus('Record or process a vocal first')
      return
    }
    setStatus('Ultimate Mic Master rendering…')
    let vocal = await blobToAudioBuffer(vocalTake.blob)
    if (vocalTake.offsetSec) vocal = shiftAudioBuffer(vocal, vocalTake.offsetSec)
    const mastered = await micMasterMix(vocal, beatBuf)
    const wav = await audioBufferToWav(mastered)
    await saveTake({ name: `Mic Master ${new Date().toLocaleTimeString()}`, blob: wav, kind: 'master' })
    setTakes(await listTakes())
    setStatus('Mic Master complete — check Takes + Export')
  }

  const runUltimateMaster = async () => {
    if (!beatBuf) {
      setStatus('Import a beat first')
      return
    }
    const vocalTake = takes.find((t) => t.kind === 'infected' || t.kind === 'pass')
    if (!vocalTake) {
      setStatus('Record or process a vocal first')
      return
    }
    setStatus('Ultimate Mic Master rendering…')
    let vocal = await blobToAudioBuffer(vocalTake.blob)
    if (vocalTake.offsetSec) vocal = shiftAudioBuffer(vocal, vocalTake.offsetSec)
    const mastered = await ultimateMicMaster(vocal, beatBuf, master)
    const wav = await audioBufferToWav(mastered)
    await saveTake({ name: `Ultimate Mic Master ${new Date().toLocaleTimeString()}`, blob: wav, kind: 'master' })
    setTakes(await listTakes())
    setStatus('Ultimate Mic Master rendered with the current loudness, ducking, width and tone')
  }

  const balanceMix = async () => {
    undoMaster.current = { settings: { ...settings }, master: { ...master } }
    if (correctOnBalance && settings.correction < 70) patchSettings({ correction: 70 })
    const vocalTake = takes.find((t) => t.kind === 'infected' || t.kind === 'pass')
    if (vocalTake && beatBuf) {
      const vocal = await blobToAudioBuffer(vocalTake.blob)
      const vocalRms = Math.sqrt(vocal.getChannelData(0).reduce((sum, sample) => sum + sample * sample, 0) / vocal.length)
      const beatRms = Math.sqrt(beatBuf.getChannelData(0).reduce((sum, sample) => sum + sample * sample, 0) / beatBuf.length)
      const nextVolume = Math.max(0.2, Math.min(1, (0.65 * vocalRms) / Math.max(0.0001, beatRms)))
      setMaster((current) => ({ ...current, beatVolume: Number(nextVolume.toFixed(2)) }))
      setStatus(`Balance set beat volume to ${nextVolume.toFixed(2)} from the measured tracks`)
      return
    }
    setStatus('Balance kept your current beat volume. Record a vocal to measure against the beat.')
  }

  const savePracticePass = async () => {
    if (!engineRef.current) return
    if (!recording) {
      await engineRef.current.startRecording()
      setRecording(true)
      setStatus('Practice pass recording on loop…')
      return
    }
    const blob = await engineRef.current.stopRecording()
    setRecording(false)
    await persistAsWavTake({
      name: `Pass ${loopStart.toFixed(1)}–${loopEnd.toFixed(1)}s`,
      blob,
      kind: 'pass',
    })
    setTakes(await listTakes())
    setStatus('Practice pass saved to project (WAV)')
  }

  const exportTake = async (takeId: string, format: 'wav' | 'mp3') => {
    const take = takes.find((t) => t.id === takeId)
    if (!take) return
    let buf = await blobToAudioBuffer(take.blob)
    if (take.offsetSec) buf = shiftAudioBuffer(buf, take.offsetSec)
    if (format === 'wav') {
      const wav = await audioBufferToWav(buf)
      const how = await deliverBlob(wav, `${take.name}.wav`)
      setStatus(how === 'shared' ? `Shared ${take.name}.wav` : `Downloaded ${take.name}.wav`)
      return
    }
    const mp3 = await audioBufferToMp3(buf)
    const how = await deliverBlob(mp3, `${take.name}.mp3`)
    setStatus(how === 'shared' ? `Shared ${take.name}.mp3` : `Downloaded ${take.name}.mp3`)
  }

  const applyRapOnBeat = async () => {
    const target = Math.max(0.05, loopEnd - loopStart)
    const pass = takes.find((t) => t.kind === 'pass') || takes.find((t) => t.kind === 'infected')
    if (!pass) {
      setStatus('Record a practice pass first, then Rap on Beat auto')
      return
    }
    if (!engineRef.current) {
      engineRef.current = new InfectedAudioEngine(settings)
      await engineRef.current.init()
    }
    setStatus('Stretching saved pass to loop length…')
    const buf = await blobToAudioBuffer(pass.blob)
    const speed = rapOnBeatRate(buf.duration, target)
    setRapRate(speed)
    const stretched = await engineRef.current.stretchBufferToDuration(buf, target)
    const wav = await audioBufferToWav(stretched)
    await saveTake({
      name: `${pass.name} (on-beat ${target.toFixed(2)}s)`,
      blob: wav,
      kind: 'pass',
    })
    setTakes(await listTakes())
    setStatus(`Rap-on-Beat: pass stretched to ${target.toFixed(2)}s (Bungee, pitch kept)`)
  }

  if (!hostReady) {
    return (
      <div className="gate">
        <p className="eyebrow">Infected Voices</p>
        <h1>Checking account…</h1>
      </div>
    )
  }

  if (host && !user) {
    return (
      <div className="gate">
        <p className="eyebrow">Vocal Lab channel v0.4.1 · Studio {STUDIO_VERSION}</p>
        <h1>Sign in to open Studio.</h1>
        <p>
          The recording workspace stays behind the existing account sign-in. Studio stays locked until that account has a subscription or lifetime code. The published {VOCAL_LAB_V040.name} download is the public source zipball on GitHub.
        </p>
        {hostError && <p className="error">{hostError}</p>}
        <div className="cta-row">
          <button
            className="primary"
            onClick={() => {
              void (async () => {
                try {
                  setHostError('')
                  const signed = await host.auth.signIn()
                  setUser(signed.user ?? (await host.auth.getUser()))
                } catch (error) {
                  setHostError(error instanceof Error ? error.message : String(error))
                }
              })()
            }}
          >
            Sign in
          </button>
          <a className="nav-link" href="./studio.html">Arrangement Studio</a>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">
          Infected Voices
          <span>Studio {STUDIO_VERSION}</span>
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <a className="nav-link" href="./studio.html">
          Arrangement
        </a>
        <div className="hint">Local-only · quiet studio · one indigo accent · cue metronome stays out of the bounce</div>
      </nav>

      <main className="main">
        <div className="topbar">
          <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
          <div className="transport">
            <span className="pill">
              BAR {barBeat.bar} · BEAT {barBeat.beat}
            </span>
            <span className={`pill ${engineOn ? 'on' : ''}`}>{engineOn ? 'ENGINE ON' : 'ENGINE OFF'}</span>
            <span className={`pill ${metro ? 'on' : ''}`}>METRO {metro ? 'CUE' : 'OFF'}</span>
            <span className={`pill ${recording ? 'warn' : ''}`}>{recording ? 'REC' : 'IDLE'}</span>
            <label className="field mode-field">
              Layout
              <select
                value={uiMode}
                onChange={(e) => setUiMode(e.target.value as typeof uiMode)}
              >
                <option value="auto">Auto</option>
                <option value="ios">iOS</option>
                <option value="android">Android</option>
                <option value="pc">PC</option>
              </select>
            </label>
            <button className="ghost" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            {host && user && (
              <button
                className="ghost"
                onClick={() => {
                  void host.auth.signOut().then(() => setUser(null))
                }}
              >
                {user.name || user.email || 'Sign out'}
              </button>
            )}
          </div>
        </div>
        <div className="status">{status}</div>

        {tab === 'studio' && (
          <section className="panel">
            <h2>Engine</h2>
            <p className="panel-lead">
              Arm the mic, then record. Metronome stays cue-only — never lands in the bounce.
            </p>
            <div className="cta-row">
              {!engineOn ? (
                <button className="primary" onClick={startEngine}>
                  Start engine
                </button>
              ) : (
                <button className="danger" onClick={stopEngine}>
                  Stop engine
                </button>
              )}
              <button
                className={recording ? 'rec-live' : engineOn ? 'primary' : ''}
                disabled={!engineOn}
                onClick={toggleRecord}
              >
                {recording ? 'Stop take' : 'Record take'}
              </button>
              <button
                disabled={!engineOn}
                onClick={() => {
                  toggleMetro(!metro)
                }}
              >
                Metronome (cue only)
              </button>
            </div>
          </section>
        )}

        {tab === 'beat' && (
          <section className="panel">
            <h2>Beat Deck</h2>
            <div className="grid2">
              <label className="field">
                Import beat
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onBeatFile(f)
                  }}
                />
              </label>
              <label className="field">
                BPM
                <input
                  type="number"
                  value={bpm}
                  min={60}
                  max={200}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setBpm(v)
                    engineRef.current?.setBpm(v)
                    void saveProject({ bpm: v })
                  }}
                />
              </label>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className="primary"
                onClick={() => {
                  engineRef.current?.play()
                  setStatus('Transport playing')
                }}
              >
                Play
              </button>
              <button onClick={() => engineRef.current?.pause()}>Pause</button>
              <button onClick={() => engineRef.current?.stop()}>Stop</button>
              <span className="muted">{beatName ?? 'No beat loaded'} · {pos.toFixed(2)}s</span>
            </div>
            {waveformPeaks.length > 0 && (
              <div className="waveform" aria-hidden>
                {waveformPeaks.map((v, i) => (
                  <span key={i} style={{ height: `${Math.max(4, v * 100)}%` }} />
                ))}
                <div
                  className="loop-playhead"
                  style={{
                    left: `${Math.min(100, Math.max(0, (pos / Math.max(beatBuf?.duration ?? 1, 0.001)) * 100))}%`,
                  }}
                />
              </div>
            )}
          </section>
        )}

        {tab === 'voice' && (
          <>
            <section className="panel">
              <h2>Mode</h2>
              <div className="mode-seg">
                {(['rap', 'sing', 'call'] as const).map((m) => (
                  <button
                    key={m}
                    className={settings.mode === m ? 'active' : ''}
                    onClick={() => patchSettings({ mode: m, acapella: m === 'sing' ? settings.acapella : false })}
                  >
                    {m === 'rap' ? 'Rap' : m === 'sing' ? 'Singing' : 'Call'}
                  </button>
                ))}
              </div>
              {settings.mode === 'sing' && (
                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    className={settings.acapella ? 'primary' : ''}
                    onClick={() => patchSettings({ acapella: !settings.acapella })}
                  >
                    Acapella space
                  </button>
                </div>
              )}
            </section>
            <section className="panel">
              <h2>Presets</h2>
              <div className="preset-grid">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    className={activePresetId === p.id ? 'primary' : ''}
                    onClick={() => loadPreset(p)}
                  >
                    {p.name}
                    {p.factory ? '' : ' ★'}
                  </button>
                ))}
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <input
                  type="text"
                  placeholder="Custom preset name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ maxWidth: 240 }}
                />
                <button className="primary" onClick={saveCustom}>
                  Save custom
                </button>
                {!presets.find((p) => p.id === activePresetId)?.factory && (
                  <button
                    className="danger"
                    onClick={async () => {
                      await deletePreset(activePresetId)
                      setPresets(await listPresets())
                      loadPreset(factoryPresets()[0])
                    }}
                  >
                    Delete custom
                  </button>
                )}
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                GRIM Signature is deeper and darker than 0.3.0 — depth, grit, darkness, and low formant bias cranked for that evil tone.
              </p>
            </section>
          </>
        )}

        {tab === 'settings' && (
          <section className="panel">
            <h2>Deep Settings</h2>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <label className="field">
                Key
                <select
                  value={settings.key}
                  onChange={(e) => patchSettings({ key: e.target.value })}
                >
                  {KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Scale
                <select
                  value={settings.scale}
                  onChange={(e) =>
                    patchSettings({ scale: e.target.value as VocalSettings['scale'] })
                  }
                >
                  <option value="naturalMinor">Natural minor</option>
                  <option value="harmonicMinor">Harmonic minor</option>
                  <option value="major">Major</option>
                  <option value="pentatonicMinor">Pentatonic minor</option>
                  <option value="chromatic">Chromatic</option>
                </select>
              </label>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <button
                className={settings.grimOn ? 'primary' : ''}
                onClick={() => patchSettings({ grimOn: !settings.grimOn })}
              >
                GRIM {settings.grimOn ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => patchSettings(defaultSettings())}>Reset clean</button>
            </div>
            <div className="settings-group">
              <h3>Pitch</h3>
              <div className="knobs">
                <Knob label="Correction" value={settings.correction} onChange={(v) => patchSettings({ correction: v })} />
                <Knob label="Retune ms" value={settings.retuneMs} min={1} max={40} onChange={(v) => patchSettings({ retuneMs: v })} />
                <Knob label="Humanize" value={settings.humanize} onChange={(v) => patchSettings({ humanize: v })} />
                <Knob label="Formant" value={settings.formant} min={-50} max={50} onChange={(v) => patchSettings({ formant: v })} />
              </div>
            </div>
            <div className="settings-group">
              <h3>Tone (GRIM)</h3>
              <div className="knobs">
                <Knob label="Depth (evil)" value={settings.depth} onChange={(v) => patchSettings({ depth: v })} />
                <Knob label="Glitch" value={settings.glitch} onChange={(v) => patchSettings({ glitch: v })} />
                <Knob label="Grit" value={settings.grit} onChange={(v) => patchSettings({ grit: v })} />
                <Knob label="Darkness" value={settings.darkness} onChange={(v) => patchSettings({ darkness: v })} />
                <Knob label="Warmth" value={settings.warmth} onChange={(v) => patchSettings({ warmth: v })} />
              </div>
            </div>
            <div className="settings-group">
              <h3>Space</h3>
              <div className="knobs">
                <Knob label="Echo" value={settings.echo} onChange={(v) => patchSettings({ echo: v })} />
                <Knob label="Space" value={settings.space} onChange={(v) => patchSettings({ space: v })} />
              </div>
            </div>
            <div className="settings-group">
              <h3>Dynamics</h3>
              <div className="knobs">
                <Knob label="Gate" value={settings.gate} onChange={(v) => patchSettings({ gate: v })} />
                <Knob label="Compress" value={settings.compress} onChange={(v) => patchSettings({ compress: v })} />
                <Knob label="De-ess" value={settings.deess} onChange={(v) => patchSettings({ deess: v })} />
                <Knob label="Output dB" value={settings.outputDb} min={-12} max={0} onChange={(v) => patchSettings({ outputDb: v })} />
              </div>
            </div>
          </section>
        )}

        {tab === 'practice' && (
          <section className="panel">
            <h2>Rap on Beat · Practice Loop</h2>
            <div className="grid3">
              <label className="field">
                Loop start (sec)
                <input
                  type="number"
                  step={0.01}
                  value={loopStart}
                  onChange={(e) => setLoopStart(Number(e.target.value))}
                />
              </label>
              <label className="field">
                Loop end (sec)
                <input
                  type="number"
                  step={0.01}
                  value={loopEnd}
                  onChange={(e) => setLoopEnd(Number(e.target.value))}
                />
              </label>
              <label className="field">
                Playhead
                <div className="row">
                  <button onClick={() => setLoopStart(pos)}>Set start here</button>
                  <button onClick={() => setLoopEnd(pos)}>Set end here</button>
                </div>
              </label>
            </div>
            <div className="loop-rail">
              <div className="loop-track">
                <div
                  className="loop-region"
                  style={{
                    left: `${Math.min(95, Math.max(0, (loopStart / Math.max(loopEnd, loopStart + 0.01, 30)) * 100))}%`,
                    width: `${Math.min(100, Math.max(2, ((loopEnd - loopStart) / Math.max(loopEnd, 30)) * 100))}%`,
                  }}
                />
                <div
                  className="loop-playhead"
                  style={{
                    left: `${Math.min(100, Math.max(0, (pos / Math.max(loopEnd, beatBuf?.duration ?? 30, 1)) * 100))}%`,
                  }}
                />
              </div>
              <div className="loop-meta">
                <span>
                  Loop {loopStart.toFixed(2)}s – {loopEnd.toFixed(2)}s
                </span>
                <span>Playhead {pos.toFixed(2)}s · rate {rapRate.toFixed(3)}×</span>
              </div>
            </div>
            <div className="cta-row" style={{ marginTop: 12 }}>
              <button
                className={loopOn ? 'primary' : ''}
                onClick={() => {
                  const next = !loopOn
                  setLoopOn(next)
                  engineRef.current?.setLoop(next, loopStart, loopEnd)
                  applyLoop()
                }}
              >
                {loopOn ? 'Loop ON' : 'Loop OFF'}
              </button>
              <button onClick={applyLoop}>Apply loop points</button>
              <button onClick={setOneBarLoop}>One-bar loop at cursor</button>
              <button onClick={() => toggleMetro(!metro)}>Metronome cue</button>
              <button className={recording ? 'rec-live' : 'primary'} onClick={savePracticePass}>
                {recording ? 'Save pass to project' : 'Record practice pass'}
              </button>
              <button onClick={() => void applyRapOnBeat()}>Rap on Beat auto</button>
            </div>
            <div className="settings-group">
              <h3>Recording compensation</h3>
              <label className="field">
                Milliseconds <strong style={{ color: 'var(--text-primary)' }}>{compensationMs}</strong>
                <input
                  type="range"
                  min={-200}
                  max={200}
                  value={compensationMs}
                  onChange={(e) => setCompensationMs(Number(e.target.value))}
                />
              </label>
              <p className="muted">Positive compensation moves the recorded vocal earlier. Headphones keep the cue metronome out of the take.</p>
            </div>
            <div className="settings-group">
              <h3>Follow the beat</h3>
              <p className="muted">Save the current A–B range onto the song map. Playback, recording and offline autotune follow that key. Estimates need an ear check.</p>
              <div className="cta-row">
                <button onClick={() => rememberSection()}>Use current key for A–B</button>
                <button onClick={estimateSectionKey}>Estimate key in A–B</button>
              </div>
              {sections.map((section) => (
                <div className="take" key={section.id}>
                  <div>
                    <strong>{section.key} · {section.scale}</strong>
                    <div className="muted">{section.startSec.toFixed(2)}s – {section.endSec.toFixed(2)}s</div>
                  </div>
                  <button
                    onClick={() => {
                      const next = sections.filter((item) => item.id !== section.id)
                      setSections(next)
                      void saveProject({ sections: next })
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              Loop a section, spit the bar until it locks, then save the pass.
            </p>
          </section>
        )}

        {tab === 'lab' && (
          <section className="panel">
            <h2>Project Lab</h2>
            <p className="panel-lead">
              Bar/beat loop, Pocket Assist within ±80 ms, Mic Master, and SMART MIX+MASTER. Offline autotune uses the same key, scale, and GRIM settings as the live engine.
            </p>
            <div className="settings-group">
              <h3>Bar / beat loop</h3>
              <div className="grid3">
                <label className="field">
                  Start bar
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={loopStartBar}
                    onChange={(e) => setLoopStartBar(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  End bar
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={loopEndBar}
                    onChange={(e) => setLoopEndBar(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  Grid
                  <span className="muted">4/4 · {bpm} BPM · bars {loopStartBar}–{loopEndBar}</span>
                </label>
              </div>
              <div className="cta-row">
                <button className="primary" onClick={applyBarLoop}>
                  Loop these bars
                </button>
                <span className="muted">
                  {loopRangeFromBars(loopStartBar, loopEndBar, bpm).startSec.toFixed(2)}s –{' '}
                  {loopRangeFromBars(loopStartBar, loopEndBar, bpm).endSec.toFixed(2)}s
                  {loopOn ? ' · transport loop on' : ''}
                </span>
              </div>
            </div>
            <div className="settings-group">
              <h3>Ultimate Mic Master</h3>
              <p className="muted">
                Pick a voice style, then set loudness, headroom, ducking, width and tone. Balance measures the vocal against the beat before the render. Originals stay in the project.
              </p>
              <div className="row">
                <button onClick={() => loadPreset(presets.find((item) => item.id === 'clean-rap') ?? factoryPresets()[0])}>Clean rap</button>
                <button onClick={() => loadPreset(presets.find((item) => item.id === 'melodic') ?? factoryPresets()[1])}>Singing</button>
                <button onClick={() => loadPreset(presets.find((item) => item.id === 'grim') ?? factoryPresets()[0])}>Grim abyss</button>
              </div>
              <div className="knobs">
                <Knob label="Loudness" value={master.loudness} onChange={(v) => setMaster({ ...master, loudness: v })} />
                <Knob label="Headroom dB" value={master.headroomDb} min={0.5} max={6} onChange={(v) => setMaster({ ...master, headroomDb: v })} />
                <Knob label="Ducking" value={master.ducking} onChange={(v) => setMaster({ ...master, ducking: v })} />
                <Knob label="Width" value={master.width} onChange={(v) => setMaster({ ...master, width: v })} />
                <Knob label="Tone" value={master.tone} onChange={(v) => setMaster({ ...master, tone: v })} />
                <label className="field">
                  Beat volume <strong style={{ color: 'var(--text-primary)' }}>{master.beatVolume.toFixed(2)}</strong>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={Math.round(master.beatVolume * 100)}
                    onChange={(e) => setMaster({ ...master, beatVolume: Number(e.target.value) / 100 })}
                  />
                </label>
              </div>
              <div className="cta-row">
                <label className="check">
                  <input type="checkbox" checked={correctOnBalance} onChange={(e) => setCorrectOnBalance(e.target.checked)} />
                  Enable pitch correction when balancing
                </label>
                <label className="check">
                  <input type="checkbox" checked={master.vocalsOnly} onChange={(e) => setMaster({ ...master, vocalsOnly: e.target.checked })} />
                  Vocals only
                </label>
              </div>
              <div className="cta-row">
                <button onClick={() => void balanceMix()}>Balance</button>
                <button
                  onClick={() => {
                    const previous = undoMaster.current
                    if (!previous) return
                    setSettings(previous.settings)
                    setMaster(previous.master)
                    engineRef.current?.applySettings(previous.settings)
                    setStatus('Undid the last balance')
                  }}
                >
                  Undo mix
                </button>
                <button className="primary" onClick={() => void runUltimateMaster()}>Ultimate Mic Master</button>
              </div>
            </div>
            <div className="settings-group">
              <h3>Infected Mixer + Grim Beats</h3>
              <p className="muted">
                Grim Beats is local vocal preparation. Your original take stays in the project. Infected Mixer is for a RoEx key you already fund. This page stores that key only in this browser and does not upload audio or spend credits.
              </p>
              <label className="field">
                Your RoEx key
                <input
                  type="password"
                  autoComplete="off"
                  value={roexKey}
                  placeholder="Paste your own key"
                  onChange={(e) => {
                    setRoexKey(e.target.value)
                    if (e.target.value) localStorage.setItem('iv-roex-key', e.target.value)
                    else localStorage.removeItem('iv-roex-key')
                  }}
                />
              </label>
              <label className="check">
                <input type="checkbox" checked={roexConfirm} onChange={(e) => setRoexConfirm(e.target.checked)} />
                I understand a funded RoEx preview is not sent from this build
              </label>
              <div className="cta-row">
                <button
                  className="primary"
                  disabled={!roexConfirm}
                  onClick={() => {
                    if (!roexKey.trim()) {
                      setStatus('Paste your own RoEx key, or use Grim Beats locally')
                      return
                    }
                    setStatus('Key saved on this device. No audio was uploaded and no credits were spent.')
                  }}
                >
                  Save key, preview locally
                </button>
                <button onClick={() => loadPreset(presets.find((item) => item.id === 'grim') ?? factoryPresets()[0])}>
                  Apply Grim Beats locally
                </button>
              </div>
            </div>
            <div className="settings-group">
              <h3>Mix</h3>
              <div className="row">
                <button className="primary" onClick={() => void runSmartMix()}>
                  SMART MIX+MASTER
                </button>
                <button onClick={runMicMaster}>Quick Mic Master</button>
                <label className="field" style={{ maxWidth: 280 }}>
                  Autotune recorded file
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void processOfflineFile(f)
                    }}
                  />
                </label>
              </div>
              <p className="muted">
                SMART MIX+MASTER levels the vocal, ducks the beat under the voice, then compresses and limits the bus.
              </p>
            </div>
            <div className="settings-group">
              <h3>Pocket Assist · ±80 ms</h3>
              <label className="field">
                Manual nudge <strong style={{ color: 'var(--text-primary)' }}>{pocketMs} ms</strong>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={pocketMs}
                  onChange={(e) => setPocketMs(Number(e.target.value))}
                />
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              {takes.slice(0, 8).map((t) => (
                <div className="take" key={t.id}>
                  <div>
                    <strong>{t.name}</strong>
                    <div className="muted">
                      {t.kind}
                      {t.offsetSec != null ? ` · pocket ${(t.offsetSec * 1000).toFixed(1)}ms` : ''}
                    </div>
                  </div>
                  <div className="row">
                    <button onClick={() => void runPocketAssist(t.id)}>Auto pocket</button>
                    <button onClick={() => void runManualPocket(t.id)}>Nudge ±80</button>
                  </div>
                </div>
              ))}
              {takes.length === 0 && (
                <div className="empty">
                  <strong>No stems yet</strong>
                  Record a take or import vocals to start mastering.
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'takes' && (
          <section className="panel">
            <h2>Takes + Export</h2>
            {takes.map((t) => (
              <div className="take" key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <div className="muted">
                    {t.kind} · {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="row">
                  <button onClick={() => void exportTake(t.id, 'wav')}>WAV</button>
                  <button onClick={() => void exportTake(t.id, 'mp3')}>MP3</button>
                </div>
              </div>
            ))}
            {takes.length === 0 && (
              <div className="empty">
                <strong>Nothing to export yet</strong>
                Record, process, or Mic Master a take first.
              </div>
            )}
          </section>
        )}

        {tab === 'desktop' && (
          <section className="panel">
            <h2>Windows channel</h2>
            <p className="panel-lead">
              GitHub release {VOCAL_LAB_V040.name} uses tag {VOCAL_LAB_V040.tag} and branch {VOCAL_LAB_V040.branch}. The download is that branch’s source zipball. Vocal Lab v0.4.1 is the channel in this Studio {STUDIO_VERSION} host. GitHub has no v0.4.1 release.
            </p>
            <div className="take">
              <div>
                <strong>{VOCAL_LAB_V040.name} · source release</strong>
                <div className="muted">
                  Tag {VOCAL_LAB_V040.tag} · branch {VOCAL_LAB_V040.branch}. Source zipball. The release page lists no uploaded installer assets.
                </div>
              </div>
              <a className="pill on" href={VOCAL_LAB_V040.zipball}>
                Source zipball
              </a>
            </div>
            <div className="take">
              <div>
                <strong>v0.4.1 · vocal lab channel</strong>
                <div className="muted">
                  Bar loop, Pocket Assist, Ultimate Mic Master, Grim Beats, and layout modes in this host. No second zipball and no installer URL.
                </div>
              </div>
              <span className="pill">In this host</span>
            </div>
            <ol className="notes">
              <li>
                Download the {VOCAL_LAB_V040.name} source zipball, or open the{' '}
                <a href={VOCAL_LAB_V040.page}>release page</a>.
              </li>
              <li>
                Install with <code>{REDX_INSTALL_COMMAND}</code>, then run <code>npm run build:browser</code>. esbuild is a devDependency, so the install must include dev packages.
              </li>
              <li>
                <code>npm run package:windows</code> stages a local Electron shell from <code>browser-dist/</code>. It does not sign the app.
              </li>
              <li>Phone and tablet builds still ship through the App Store and Google Play.</li>
            </ol>
            <p className="muted">
              A signing key for private desktop updates stays outside this repository. The source zipball is the published v0.4.0 artifact.
            </p>
          </section>
        )}

        {tab === 'updates' && (
          <section className="panel">
            <h2>Updates</h2>
            <p className="panel-lead">
              Studio {STUDIO_VERSION}. Phone and tablet builds update through the App Store or Google Play. Windows can use a signed private channel once a release key is provisioned outside this repository.
            </p>
            <div className="settings-group">
              <h3>This session</h3>
              <p className="muted">
                {window.ivNative?.platform
                  ? `Native ${window.ivNative.platform} · ${window.ivNative.nativeVersion ?? STUDIO_VERSION}. Store listing opens from the app shell. This build does not download replacement code.`
                  : window.ivDesktop?.platform
                    ? `Desktop shell · ${window.ivDesktop.version ?? STUDIO_VERSION}.`
                    : 'Browser session. Host the production build as static files. Nothing here phones home for an update.'}
              </p>
              <div className="cta-row">
                {window.ivNative && (
                  <button
                    className="primary"
                    onClick={() => {
                      void window.ivOpenNativeUpdates?.()
                    }}
                  >
                    Open store updates
                  </button>
                )}
                <button
                  onClick={() => {
                    void (async () => {
                      const report = await window.ivDesktop?.checkUpdates?.()
                      setStatus(report?.message ?? 'No desktop updater is attached. Signed private updates stay unwired until a release key exists outside the repo.')
                    })()
                  }}
                >
                  Check desktop channel
                </button>
              </div>
            </div>
            <div className="settings-group">
              <h3>Signed private updates</h3>
              <ol className="notes">
                <li>The desktop shell reads a release manifest (version, file names, sizes, hashes).</li>
                <li>It verifies a detached signature with a public key installed beside the app, not stored in this source tree.</li>
                <li>You approve the install. Rollback keeps takes and presets in place.</li>
                <li>This repository does not contain signing keys, a private update URL, or a live signature check.</li>
              </ol>
            </div>
          </section>
        )}

        {tab === 'mobile' && (
          <section className="panel">
            <h2>Phone / Tablet / PC</h2>
            <p>Same Wi‑Fi LAN URL (not just localhost):</p>
            <div className="lan-card">
              <code>{lanUrl}</code>
              {lanUrl && (
                <div className="qr-wrap">
                  <QRCodeSVG value={lanUrl} size={168} bgColor="transparent" fgColor="currentColor" />
                </div>
              )}
            </div>
            <p className="muted">
              Run <code>npm run dev -- --host</code>, scan the QR from iPhone/Android/tablet, allow mic. No App Store build required.
            </p>
            <button
              className="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(lanUrl)
                  setStatus('LAN URL copied')
                } catch {
                  setStatus(lanUrl)
                }
              }}
            >
              Copy LAN URL
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
