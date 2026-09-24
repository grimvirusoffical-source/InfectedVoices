#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const patch = join(root, 'studio/patches/increment-1-app-gating.patch')
try {
  execFileSync('patch', ['-p0', '--batch', '-i', patch], { cwd: root, stdio: 'inherit' })
} catch {
  // fallback: if App is PLACEHOLDER, refuse
  const app = readFileSync(join(root, 'studio/src/App.tsx'), 'utf8')
  if (app.trim() === 'PLACEHOLDER') {
    console.error('App.tsx is PLACEHOLDER; restore base App.tsx then re-run.')
    process.exit(1)
  }
  throw new Error('patch failed')
}
