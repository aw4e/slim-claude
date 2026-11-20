// Pre-release gate: clone the repo the way a Windows user would (core.autocrlf=true), then validate it.
// Usage: node scripts/check-fresh-clone.mjs [repo-url]   (default: this repo's `origin`)
// Catches bugs invisible in the working folder: CRLF-sensitive YAML, missing/ignored files, broken hooks.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sh = (cmd, cwd) => spawnSync(cmd, { cwd, shell: true, encoding: 'utf8' });
const url = process.argv[2] ?? sh('git remote get-url origin').stdout.trim();
if (!url) { console.error('no repo url: pass one or add an origin remote'); process.exit(2); }

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-fresh-'));
const problems = [];
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) problems.push(msg); };

try {
  const clone = sh(`git clone -q -c core.autocrlf=true "${url}" "${dir}"`);
  check(clone.status === 0, `clone ${url}${clone.status === 0 ? '' : `: ${clone.stderr.trim()}`}`);
  if (clone.status === 0) {
    const sample = path.join(dir, 'skills', 'step-back', 'SKILL.md');
    check(fs.existsSync(sample) && !fs.readFileSync(sample, 'utf8').includes('\r'), 'markdown checked out with LF despite autocrlf=true');

    const v = sh('claude plugin validate .', dir);
    const out = `${v.stdout}\n${v.stderr}`;
    check(!/YAML frontmatter failed/.test(out), 'no frontmatter parse errors');
    check(!/Found \d+ error/.test(out.split('Plugin directory checks')[0]), 'manifest and plugin validation has no errors');
    const provided = (out.match(/^\s*❯ (?:agents|skills): /gm) ?? []).length;
    check(provided >= 25, `agents + skills detected: ${provided}`);

    const t = sh('node hooks/test.mjs', dir);
    check(t.status === 0, `hook tests: ${t.stdout.trim().split('\n').pop()}`);
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nfresh clone OK');
process.exit(problems.length ? 1 : 0);
