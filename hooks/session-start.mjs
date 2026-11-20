// SessionStart (startup, resume, clear, compact): surface the codemap and any active
// deepwork task so a resumed or compacted session picks up where it left off. Silent otherwise.
import fs from 'node:fs';
import path from 'node:path';

let cwd = process.cwd();
try { cwd = JSON.parse(fs.readFileSync(0, 'utf8')).cwd || cwd; } catch { /* no stdin: use cwd */ }

const notes = [];

if (fs.existsSync(path.join(cwd, '.omc', 'codemap.json'))) {
  notes.push('This repo has a codemap (.omc/codemap.json). Read the nearest codemap.md before exploring unfamiliar folders; run the codemap skill to refresh it after large changes.');
}

const deepwork = path.join(cwd, '.omc', 'deepwork');
if (fs.existsSync(deepwork)) {
  for (const slug of fs.readdirSync(deepwork, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const progress = path.join(deepwork, slug.name, 'progress.md');
    if (!fs.existsSync(progress)) continue;
    const first = fs.readFileSync(progress, 'utf8').split(/\r?\n/, 1)[0] ?? '';
    if (!/status:\s*completed/i.test(first)) {
      notes.push(`Deepwork task "${slug.name}" looks active. If this session continues it, load the deepwork skill and read .omc/deepwork/${slug.name}/progress.md before anything else.`);
    }
  }
}

if (notes.length) {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: notes.join('\n') },
  }));
}
