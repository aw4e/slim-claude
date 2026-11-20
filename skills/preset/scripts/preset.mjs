// Usage: node preset.mjs <name> [--dir <agents-dir>]   |   node preset.mjs --list
// Rewrites the `model:` frontmatter line of each agent named in presets.json.
// "inherit" removes the line. reverser/reverser-light and the orchestrator are never touched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const presets = JSON.parse(fs.readFileSync(path.join(here, '..', 'presets.json'), 'utf8'));
const args = process.argv.slice(2);

if (args.includes('--list') || args.length === 0) {
  for (const [name, map] of Object.entries(presets)) {
    console.log(`${name}: ${Object.entries(map).map(([a, m]) => `${a}=${m}`).join(' ')}`);
  }
  process.exit(0);
}

const name = args[0];
const dirIdx = args.indexOf('--dir');
const agentsDir = dirIdx >= 0 ? args[dirIdx + 1] : path.resolve(here, '..', '..', '..', 'agents');
const preset = presets[name];
if (!preset) {
  console.error(`Unknown preset "${name}". Available: ${Object.keys(presets).join(', ')}`);
  process.exit(1);
}

let changed = 0;
for (const [agent, model] of Object.entries(preset)) {
  const file = path.join(agentsDir, `${agent}.md`);
  if (!fs.existsSync(file)) { console.warn(`skip ${agent}: ${file} not found`); continue; }
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { console.warn(`skip ${agent}: no frontmatter`); continue; }
  const lines = m[1].split(/\r?\n/).filter((l) => !/^model:/.test(l));
  if (model !== 'inherit') lines.push(`model: ${model}`);
  const next = text.replace(m[1], lines.join('\n'));
  if (next !== text) { fs.writeFileSync(file, next); changed++; }
}
console.log(`preset "${name}" applied: ${changed} agent file(s) changed in ${agentsDir}`);
