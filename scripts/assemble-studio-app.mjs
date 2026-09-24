#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = join(dirname(fileURLToPath(import.meta.url)), "../studio/src/studioAppParts");
const out = join(dir, "../StudioApp.tsx");
if (!existsSync(dir)) {
  console.log("studioAppParts missing; leaving StudioApp.tsx unchanged");
  process.exit(0);
}
const parts = readdirSync(dir).filter(f => /^part\d+\.txt$/.test(f)).sort((a,b)=>Number(a.replace(/\D/g,""))-Number(b.replace(/\D/g,"")));
const ids = parts.map(f => Number(f.replace(/\D/g,"")));
const contiguous = ids.length > 0 && ids[0] === 0 && ids.every((v, i) => v === i);
const complete = contiguous && ids.length >= 9;
if (!complete) {
  console.log("incomplete studioAppParts", parts.join(",") || "(none)", "- leaving StudioApp.tsx unchanged");
  process.exit(0);
}
const body = parts.map(f => readFileSync(join(dir, f), "utf8")).join("");
writeFileSync(out, body);
console.log("assembled StudioApp.tsx from", parts.length, "parts (", body.length, "bytes)");
