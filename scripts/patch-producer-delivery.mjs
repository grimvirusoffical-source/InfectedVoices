import fs from 'node:fs/promises';
import path from 'node:path';

/** Cap pipeline patch. The pinned vendor archive is not edited. */
export async function patchProducerDelivery(appJs) {
  let app = await fs.readFile(appJs, 'utf8');
  const exportMix = "async function exportMix(bits,master){requireStopped();const result=await studio.render(p,{master});await saveFile(wav(result.channels,result.rate,bits),safeName(p.title)+(master?'-master':'-premaster')+'.wav');status('WAV exported. Keep a project backup too.');}";
  const exportMixNext = "function deliveryNote(result,bits){const rate=result.rate||44100;const pm=result.producerMetrics;const lufs=pm&&Number.isFinite(pm.integratedLufs)?pm.integratedLufs.toFixed(1)+' LUFS':'LUFS not measured — Core 5 mastering is off';const dbtp=pm?pm.truePeakDbtp.toFixed(2)+' dBTP':'true peak not measured — Core 5 mastering is off';const sample=pm?pm.samplePeakDb.toFixed(1)+' dBFS':(Number.isFinite(result.metrics?.peakDb)?result.metrics.peakDb.toFixed(1)+' dBFS':'n/a');return 'Delivery note: integrated '+lufs+' · true peak '+dbtp+' · sample peak '+sample+' · '+rate+' Hz · '+bits+'-bit · '+p.bpm+' BPM';}async function exportMix(bits,master){requireStopped();const result=await studio.render(p,{master});await saveFile(wav(result.channels,result.rate,bits),safeName(p.title)+(master?'-master':'-premaster')+'.wav');const note=deliveryNote(result,bits);status(note);const slot=document.getElementById('ivDeliveryNote');if(slot)slot.textContent=note;}";
  const stemLine = "status('Aligned track WAVs exported with session metadata.');";
  const stemNext = "status('Aligned stems exported at time zero with session metadata. BPM '+p.bpm+'.');";
  const note = "el('p','WAVs are 44.1 kHz. Stem files include leading silence and should be imported at time zero. Master ceilings are sample-peak limits, not certified LUFS or true-peak readings. MP3 export remains in Classic Studio.','mini-note')";
  const noteNext = "el('p','Delivery note prints integrated LUFS, true peak, sample rate, bit depth, and BPM after export. Stem files include leading silence and import at time zero. Core 5 mastering supplies LUFS and dBTP. Without it, the note does not invent those figures. MP3 export remains in Classic Studio.','mini-note')";
  if (!app.includes(exportMix) || !app.includes(stemLine) || !app.includes(note)) {
    throw Error('Producer delivery patch could not find the vendor export strings in ' + appJs);
  }
  app = app.replace(exportMix, exportMixNext).replace(stemLine, stemNext).replace(note, noteNext);
  await fs.writeFile(appJs, app);
}

if (process.argv[1] && process.argv[1].endsWith('patch-producer-delivery.mjs') && process.argv[2]) {
  await patchProducerDelivery(path.resolve(process.argv[2]));
}
