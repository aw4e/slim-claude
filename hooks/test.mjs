// Behavior tests for the hooks. Usage: node hooks/test.mjs [--rust]
// Same cases run against the Node hooks (default) or the Rust binary (--rust), so the two stay in parity.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const useRust = process.argv.includes('--rust');
const exe = path.join(here, 'rust', 'target', 'release', process.platform === 'win32' ? 'slim-hook.exe' : 'slim-hook');
if (useRust && !fs.existsSync(exe)) { console.error(`missing ${exe}; run: cargo build --release (in hooks/rust)`); process.exit(2); }

const run = (name, input) => {
  const [cmd, args] = useRust ? [exe, [name]] : ['node', [path.join(here, `${name}.mjs`)]];
  return spawnSync(cmd, args, { input: JSON.stringify(input), encoding: 'utf8' }).stdout.trim();
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-hook-test-'));
const fake = { aws: 'AKIA' + 'A'.repeat(16), gh: 'ghp_' + 'a'.repeat(36), pk: '-----BEGIN RSA PRIVATE KEY-----' };
let fail = 0;
const expect = (label, got, want) => {
  const ok = want ? got.includes(want) : got === '';
  if (!ok) fail++;
  console.log(ok ? 'ok  ' : 'FAIL', label, ok ? '' : `got: ${got.slice(0, 140)}`);
};
const bash = (c) => run('guard-destructive', { tool_input: { command: c } });
const secret = (ti) => run('guard-secrets', { tool_input: ti });
const nudge = (prompt, sid) => run('council-nudge', { session_id: sid, prompt });
const sid = `t${process.pid}${Date.now()}`;

// guard-destructive
for (const c of ['git push --force origin main', 'git push -f', 'git reset --hard HEAD~1', 'rm -rf node_modules', 'orca worktree rm --worktree x', 'git clean -fd', 'git worktree remove x']) expect(`ask: ${c}`, bash(c), 'guard:');
for (const c of ['git push origin main', 'git status', 'rm file.txt', 'ls -la']) expect(`pass: ${c}`, bash(c), '');
// guard-secrets
expect('aws key', secret({ file_path: 'a.txt', content: fake.aws }), 'AWS');
expect('github token', secret({ file_path: 'a.txt', new_string: fake.gh }), 'GitHub');
expect('private key (MultiEdit)', secret({ file_path: 'a.txt', edits: [{ new_string: fake.pk }] }), 'private key');
for (const f of ['D:/x/.env', 'D:/x/.env.local', 'C:\\x\\server.pem', 'id_rsa']) expect(`secret file ${f}`, secret({ file_path: f, content: 'A=1' }), 'secret-bearing');
for (const f of ['D:/x/.env.example', 'a.js', 'D:/x/environment.ts']) expect(`ok file ${f}`, secret({ file_path: f, content: 'const x = 1;' }), '');
// check-json
const good = path.join(tmp, 'good.json'), bad = path.join(tmp, 'bad.json'), txt = path.join(tmp, 'n.txt');
fs.writeFileSync(good, '{"a":1}'); fs.writeFileSync(bad, '{"a":1,}'); fs.writeFileSync(txt, '{bad');
expect('valid json', run('check-json', { tool_input: { file_path: good } }), '');
expect('invalid json', run('check-json', { tool_input: { file_path: bad } }), 'not valid JSON');
expect('non-json file', run('check-json', { tool_input: { file_path: txt } }), '');
// council-nudge
expect('nudge: en trigger', nudge('give me a second opinion on this', sid), 'council skill');
expect('nudge: once per session', nudge('we need consensus from several models', sid), '');
expect('nudge: plain prompt', nudge('fix the login bug', `${sid}b`), '');
expect('nudge: id trigger', nudge('butuh konsensus dari banyak model', `${sid}c`), 'council skill');
expect('nudge: code fence ignored', nudge('see ```council``` here', `${sid}d`), '');
expect('nudge: slash command ignored', nudge('/slim-claude:council what do you think', `${sid}e`), '');
// session-start
const proj = path.join(tmp, 'proj');
for (const t of ['t1', 't2']) fs.mkdirSync(path.join(proj, '.slim-claude', 'deepwork', t), { recursive: true });
fs.writeFileSync(path.join(proj, '.slim-claude', 'deepwork', 't1', 'progress.md'), 'status: active\n');
fs.writeFileSync(path.join(proj, '.slim-claude', 'deepwork', 't2', 'progress.md'), 'status: completed\n');
const out = run('session-start', { cwd: proj });
expect('deepwork: active listed', out, 't1');
expect('deepwork: completed skipped', out.includes('t2') ? 'listed' : '', '');
fs.writeFileSync(path.join(proj, '.slim-claude', 'codemap.json'), '{}');
expect('codemap pointer', run('session-start', { cwd: proj }), 'codemap');
expect('empty project silent', run('session-start', { cwd: tmp }), '');
// robustness: garbage input never throws or prints
for (const n of ['guard-destructive', 'guard-secrets', 'check-json', 'council-nudge', 'session-start']) {
  const r = spawnSync(...(useRust ? [exe, [n]] : ['node', [path.join(here, `${n}.mjs`)]]), { input: 'not json', encoding: 'utf8' });
  expect(`garbage input: ${n}`, r.status === 0 ? r.stdout.trim() : `exit ${r.status}`, '');
}

fs.rmSync(tmp, { recursive: true, force: true });
for (const s of ['', 'b', 'c', 'd', 'e']) fs.rmSync(path.join(os.tmpdir(), `slim-claude-council-${sid}${s}`), { force: true });
console.log(fail ? `${fail} FAILED (${useRust ? 'rust' : 'node'})` : `ALL PASSED (${useRust ? 'rust' : 'node'})`);
process.exit(fail ? 1 : 0);
