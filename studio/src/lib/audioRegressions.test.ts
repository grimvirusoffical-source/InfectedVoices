import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {midiToHz,snapSemitones,yinDetect} from './pitchMath.ts'

test('continuous pitch chooses the nearest permitted note rather than a rounded pitch class',()=>{
 assert.ok(Math.abs((snapSemitones(midiToHz(61.49),'C','major',0)??99)-0.51)<1e-8)
 assert.ok(Math.abs((snapSemitones(midiToHz(60.51),'C','major',0)??99)+0.51)<1e-8)
})
test('pitch snapping handles octave boundaries and rejects non-finite input',()=>{
 assert.ok(Math.abs((snapSemitones(midiToHz(71.8),'C','major',0)??99)-0.2)<1e-8)
 for(const hz of [NaN,Infinity,-Infinity,0,-1,54,1201]) assert.equal(snapSemitones(hz,'C','major',8),null)
})
test('YIN rejects silent, DC, corrupt and undersized frames',()=>{
 assert.equal(yinDetect(new Float32Array(2048),48000),-1)
 assert.equal(yinDetect(new Float32Array(2048).fill(0.5),48000),-1)
 const bad=new Float32Array(2048);bad[14]=NaN;assert.equal(yinDetect(bad,48000),-1)
 assert.equal(yinDetect(new Float32Array(4),48000),-1)
 assert.equal(yinDetect(new Float32Array(2048),NaN),-1)
})
for(const sr of [22050,44100,48000,96000]) test(`YIN accuracy at ${sr} Hz`,()=>{
 for(const hz of [110,220,440,880]) {
  const input=Float32Array.from({length:4096},(_,i)=>0.4*Math.sin(2*Math.PI*hz*i/sr))
  const actual=yinDetect(input,sr)
  assert.ok(Number.isFinite(actual)&&Math.abs(1200*Math.log2(actual/hz))<12,`${hz} => ${actual}`)
 }
})
test('all correction blend sites permit zero and reject non-finite controls',()=>{
 const code=readFileSync(new URL('./audioEngine.ts',import.meta.url),'utf8')
 assert.equal(code.includes('Math.max(0.05, Math.min(1, s.correction / 100))'),false)
 assert.equal(code.includes('Math.max(0.1, Math.min(1, s.correction / 100))'),false)
 assert.equal(code.split('Number.isFinite(s.correction)').length-1,3)
})
test('offline processing preserves partial tails and dry takes; workers have cleanup guards',()=>{
 const code=readFileSync(new URL('./audioEngine.ts',import.meta.url),'utf8')
 assert.equal(code.includes('if (len < 256) break'),false)
 assert.ok(code.includes('if (len < 256 || mix === 0) { parts.push(slice); continue }'))
 assert.ok(code.includes('finally { offline.dispose?.() }'))
 assert.ok(code.includes('finally { URL.revokeObjectURL(url) }'))
})
