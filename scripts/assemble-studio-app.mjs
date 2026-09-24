#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = join(dirname(fileURLToPath(import.meta.url)), "../studio/src/studioAppParts");
const parts = readdirSync(dir).filter(f => /^part\d+\.txt$/.test(f)).sort((a,b)=>Number(a.replace(/\D/g,''))-Number(b.replace(/\D/g,'')));
const body = parts.map(f => readFileSync(join(dir, f), "utf8")).join("");
writeFileSync(join(dir, "../StudioApp.tsx"), body);
console.log("assembled StudioApp.tsx from", parts.length, "parts (", body.length, "bytes)");
