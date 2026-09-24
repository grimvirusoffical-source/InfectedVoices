#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = join(dirname(fileURLToPath(import.meta.url)), "../studio/src/appChunks");
const parts = readdirSync(dir).filter((f) => f.startsWith("App.tsx.b64.")).sort((a,b)=>Number(a.split(".").pop())-Number(b.split(".").pop()));
const b64 = parts.map((f) => readFileSync(join(dir, f), "utf8")).join("");
writeFileSync(join(dir, "../App.tsx"), Buffer.from(b64, "base64"));
console.log("assembled App.tsx from", parts.length, "chunks");
