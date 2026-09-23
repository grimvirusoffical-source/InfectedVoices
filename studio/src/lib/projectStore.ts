import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { factoryPresets, uid, type Preset, type VocalSettings } from './presets'

export interface SongSection {
  id: string
  startSec: number
  endSec: number
  key: string
  scale: VocalSettings['scale']
}

interface IVDB extends DBSchema {
  presets: { key: string; value: Preset }
  takes: {
    key: string
    value: {
      id: string
      name: string
      createdAt: number
      blob: Blob
      kind: 'dry' | 'infected' | 'mix' | 'master' | 'pass'
      offsetSec?: number
    }
  }
  project: {
    key: string
    value: {
      id: string
      name: string
      bpm: number
      settings: VocalSettings
      loopStartSec: number
      loopEndSec: number
      sections: SongSection[]
      updatedAt: number
    }
  }
}

let dbp: Promise<IDBPDatabase<IVDB>> | null = null

function db() {
  if (!dbp) {
    dbp = openDB<IVDB>('infected-voices-ultimate', 1, {
      upgrade(database) {
        database.createObjectStore('presets', { keyPath: 'id' })
        database.createObjectStore('takes', { keyPath: 'id' })
        database.createObjectStore('project', { keyPath: 'id' })
      },
    })
  }
  return dbp
}

export async function seedFactoryPresets() {
  const database = await db()
  const existing = await database.getAll('presets')
  if (existing.length === 0) {
    for (const p of factoryPresets()) await database.put('presets', p)
  }
}

export async function listPresets() {
  return (await db()).getAll('presets')
}

export async function savePreset(preset: Preset) {
  await (await db()).put('presets', preset)
}

export async function deletePreset(id: string) {
  await (await db()).delete('presets', id)
}

export async function saveTake(input: {
  name: string
  blob: Blob
  kind: 'dry' | 'infected' | 'mix' | 'master' | 'pass'
  offsetSec?: number
}) {
  const take = { id: uid('take'), createdAt: Date.now(), ...input }
  await (await db()).put('takes', take)
  return take
}

export async function listTakes() {
  const all = await (await db()).getAll('takes')
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getProject() {
  const database = await db()
  const all = await database.getAll('project')
  if (all[0]) return all[0]
  const fresh = {
    id: 'current',
    name: 'Current Project',
    bpm: 140,
    settings: factoryPresets()[0].settings,
    loopStartSec: 0,
    loopEndSec: 8,
    sections: [],
    updatedAt: Date.now(),
  }
  await database.put('project', fresh)
  return fresh
}

export async function saveProject(
  patch: Partial<Awaited<ReturnType<typeof getProject>>>,
) {
  const cur = await getProject()
  const next = { ...cur, ...patch, updatedAt: Date.now() }
  await (await db()).put('project', next)
  return next
}
