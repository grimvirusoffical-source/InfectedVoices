#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = join(dirname(fileURLToPath(import.meta.url)), "../studio/src/studioAppParts/b64");
const chunks = readdirSync(dir).filter(f => /^chunk\d+\.b64$/.test(f)).sort();
const b64 = chunks.map(f => readFileSync(join(dir, f), "utf8").trim()).join("");
const body = Buffer.from(b64, "base64").toString("utf8");
writeFileSync(join(dir, "../../StudioApp.tsx"), body);
console.log("joined StudioApp.tsx from", chunks.length, "b64 chunks (", body.length, "bytes)");
