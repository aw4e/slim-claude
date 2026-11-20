// Live smoke test: runs the plugin through real `claude -p` sessions and checks what actually happened.
// Usage: node scripts/smoke-live.mjs [--only <substring>[,<substring>]] [--concurrency 3] [--json out.json]
// COSTS MONEY (one model session per case, roughly $0.05-0.30 each) and needs the `claude` CLI logged in.
// Isolation: no user CLAUDE.md, no user settings, no user MCP servers; only this plugin is loaded. Each case runs in its
// own temp working directory, with read access to this repo via --add-dir, and only the tools the case lists.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replaceAll('\\', '/');
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : dflt; };
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
const CONCURRENCY = Number(arg('--concurrency', 3));
const BASE_TOOLS = ['Agent', 'Skill', 'Read', 'Grep', 'Glob'];
const READ_ONLY = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'Bash']);   // Bash only where a case allows read-only git
const WRITERS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit']);

// ---- helpers used by the checks -------------------------------------------------------------------
const dispatched = (r, type) => r.agents.some((a) => a.type === `slim-claude:${type}`);
const subTools = (r, type) => new Set(r.agents.filter((a) => a.type === `slim-claude:${type}`).flatMap((a) => a.tools));
const noWriters = (r, type) => [...subTools(r, type)].filter((t) => WRITERS.has(t));
const loadedSkill = (r, name) => r.skills.some((s) => s === name || s === `slim-claude:${name}`);
const mentions = (r, re) => re.test(r.final);

const agentCase = (id, type, prompt, extraTools = [], extra = () => [], opts = {}) => ({
  id: `agent:${id}`, prompt, tools: [...BASE_TOOLS, ...extraTools], turns: opts.turns ?? 10, setup: opts.setup,
  check: (r, dir) => {
    const f = [];
    if (!dispatched(r, type)) f.push(`orchestrator did not dispatch slim-claude:${type}`);
    if (opts.readOnly !== false && noWriters(r, type).length) f.push(`read-only agent used ${noWriters(r, type).join(',')}`);
    if (r.denied && !opts.allowDenied) f.push(`${r.denied} permission denial(s)`);
    if (r.final.trim().length < (opts.minFinal ?? 15)) f.push('empty final answer');
    return [...f, ...extra(r, dir)];
  },
});

const skillCase = (name, extraTools = []) => ({
  id: `skill:${name}`, tools: [...BASE_TOOLS, ...extraTools], turns: 6,
  prompt: `Load the ${name} skill with the Skill tool, then reply with one sentence stating what it is for.`,
  check: (r) => {
    const f = [];
    if (!loadedSkill(r, name)) f.push(`Skill tool was not called with slim-claude:${name} (got: ${r.skills.join(',') || 'none'})`);
    if (r.final.trim().length < 20) f.push('empty final answer');
    return f;
  },
});

const GIT_READ = ['Bash(git log:*)', 'Bash(git diff:*)', 'Bash(git show:*)', 'Bash(git status:*)'];

const CASES = [
  agentCase('explorer', 'explorer', 'Use the explorer subagent to list which files under agents/ mention the word council. Reply with just the file names.', [],
    (r) => (['council.md', 'councillor.md', 'orchestrator.md'].every((n) => r.final.includes(n)) ? [] : ['answer misses an expected file'])),
  agentCase('oracle', 'oracle', `Ask the oracle subagent: in ${ROOT}/hooks/guard-secrets.mjs, name one false-positive risk of the SENSITIVE_FILE regex. Keep it short.`),
  agentCase('designer', 'designer', 'Use the designer subagent to create a file btn.html in the current directory containing one accessible <button> with a visible focus style and a hover style. Reply with the file name when done.', ['Write', 'Edit'],
    (r, dir) => {
      const p = path.join(dir, 'btn.html');
      if (!fs.existsSync(p)) return ['btn.html was not created'];
      const t = fs.readFileSync(p, 'utf8');
      return /<button/i.test(t) && /:focus/.test(t) && /:hover/.test(t) ? [] : ['btn.html lacks <button>, :focus or :hover'];
    }, { readOnly: false, minFinal: 3 }),
  agentCase('fixer', 'fixer', 'Use the fixer subagent to fix add() in add.js (current directory) so it returns a + b. Change nothing else. Reply with a one-line summary.', ['Write', 'Edit', 'Bash(node:*)'],
    (r, dir) => {
      const t = fs.readFileSync(path.join(dir, 'add.js'), 'utf8');
      return /a\s*\+\s*b/.test(t) && !/a\s*-\s*b/.test(t) ? [] : ['add.js was not fixed'];
    }, { readOnly: false, setup: (dir) => fs.writeFileSync(path.join(dir, 'add.js'), 'function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n') }),
  agentCase('observer', 'observer', `Use the observer subagent to look at ${ROOT}/.claude-plugin/icon.png and describe its colours and its main shape in two sentences.`, [],
    (r) => (mentions(r, /(teal|mint|green|turquoise|cyan|aqua)/i) && mentions(r, /(dark|black|navy|ink)/i) ? [] : ['description misses the teal-on-dark colours'])),
  agentCase('paladin', 'paladin', `Use the paladin subagent for a short security review of ${ROOT}/hooks/guard-secrets.mjs. Report at most two findings.`),
  agentCase('hunter', 'hunter', `Use the hunter subagent to audit error handling in ${ROOT}/hooks/check-json.mjs. Report at most two findings.`),
  agentCase('janitor', 'janitor', `Use the janitor subagent for a quick maintainability audit of the ${ROOT}/scripts folder. At most two findings.`),
  agentCase('proctor', 'proctor', `Use the proctor subagent to assess test sufficiency of ${ROOT}/hooks/guard-destructive.mjs against ${ROOT}/hooks/test.mjs. At most two gaps.`),
  agentCase('arbiter', 'arbiter', `Use the arbiter subagent to review the most recent commit of the repo at ${ROOT} (use git show --stat). Give a one-paragraph verdict.`, GIT_READ),
  agentCase('validator', 'validator', `Use the validator subagent to run "node ${ROOT}/hooks/test.mjs" and report pass or fail with the last line of output.`, ['Bash(node:*)'],
    (r) => (mentions(r, /ALL PASSED/i) ? [] : ['validator did not report ALL PASSED']), { readOnly: false }),
  agentCase('debugger', 'debugger', 'Use the debugger subagent to attach to a running process and break on a condition. There is no debugger backend here; it should say so.', [],
    (r) => (mentions(r, /(blocked|no (suitable )?debugger|backend|unavailable|not available)/i) ? [] : ['debugger did not report the missing backend']), { allowDenied: true }),
  agentCase('documenter', 'documenter', `Use the documenter subagent. Do NOT write any files. Reply with a 4-line outline of what a README for ${ROOT}/hooks should cover.`),
  agentCase('chronicler', 'chronicler', `Use the chronicler subagent. Do NOT write any files. Reply with a 4-line outline of a changelog entry for the check-json hook size limit in ${ROOT}/hooks/check-json.mjs.`),
  {
    id: 'agent:councillor+council', tools: BASE_TOOLS, turns: 20,
    prompt: `Use the council skill. Question: in ${ROOT}/hooks/check-json.mjs, what happens with a file larger than 5 MiB? Keep each seat's answer short.`,
    check: (r) => {
      const seats = r.agents.filter((a) => a.type === 'slim-claude:councillor');
      const f = [];
      if (seats.length !== 3) f.push(`expected 3 councillors, got ${seats.length}`);
      if (new Set(seats.map((s) => s.model)).size < 3) f.push(`seats did not use 3 different models (${seats.map((s) => s.model).join(',')})`);
      if (!dispatched(r, 'council')) f.push('council synthesizer not dispatched');
      if (r.denied) f.push(`${r.denied} permission denial(s)`);
      return f;
    },
  },
  skillCase('ai-estimates'), skillCase('clonedeps'), skillCase('codemap'), skillCase('deanchor'), skillCase('deepwork'),
  skillCase('interview'), skillCase('obsidian'), skillCase('preset'), skillCase('reflect'), skillCase('simplify'),
  skillCase('slim-claude'), skillCase('step-back'), skillCase('verification-planning'), skillCase('worktrees'),
].filter((c) => !ONLY.length || ONLY.some((o) => c.id.includes(o)));

// ---- runner ---------------------------------------------------------------------------------------
function parse(stdout) {
  const events = stdout.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const r = { agents: [], skills: [], denied: 0, final: '', cost: 0, error: false };
  const byId = new Map();
  for (const e of events) {
    for (const b of Array.isArray(e.message?.content) ? e.message.content : []) {
      if (b.type === 'tool_use' && !e.parent_tool_use_id) {
        if (b.name === 'Agent') { const a = { type: b.input?.subagent_type, model: b.input?.model, tools: [] }; byId.set(b.id, a); r.agents.push(a); }
        if (b.name === 'Skill') r.skills.push(b.input?.skill);
      } else if (b.type === 'tool_use' && e.parent_tool_use_id) {
        byId.get(e.parent_tool_use_id)?.tools.push(b.name);
      }
      if (b.type === 'tool_result' && b.is_error && /permission|denied|not allowed|not permitted/i.test(JSON.stringify(b.content ?? ''))) r.denied++;
    }
    if (e.type === 'result') { r.final = e.result ?? ''; r.cost = e.total_cost_usd ?? 0; r.error = !!e.is_error; }
  }
  return r;
}

function runCase(c) {
  return new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-live-'));
    c.setup?.(dir);
    const args = ['-p', c.prompt, '--setting-sources', 'project', '--strict-mcp-config', '--plugin-dir', ROOT, '--add-dir', ROOT,
      '--allowedTools', ...c.tools, '--agent', 'slim-claude:orchestrator', '--output-format', 'stream-json', '--verbose', '--max-turns', String(c.turns)];
    const started = Date.now();
    const p = spawn('claude', args, { cwd: dir, env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    const timer = setTimeout(() => p.kill(), 300_000);
    p.on('close', () => {
      clearTimeout(timer);
      const r = parse(out);
      const failures = r.error ? [`session error: ${r.final.slice(0, 160)}`] : c.check(r, dir);
      fs.rmSync(dir, { recursive: true, force: true });
      resolve({ id: c.id, pass: failures.length === 0, failures, cost: r.cost, secs: Math.round((Date.now() - started) / 1000), final: r.final.slice(0, 300) });
    });
  });
}

const results = [];
let next = 0;
async function worker() {
  while (next < CASES.length) {
    const c = CASES[next++];
    const res = await runCase(c);
    results.push(res);
    console.log(`${res.pass ? 'PASS' : 'FAIL'}  ${res.id.padEnd(26)} ${String(res.secs).padStart(3)}s  $${res.cost.toFixed(3)}${res.pass ? '' : '\n      - ' + res.failures.join('\n      - ')}`);
  }
}
console.log(`${CASES.length} case(s), concurrency ${CONCURRENCY}`);
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, CASES.length) }, worker));
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed, total cost $${results.reduce((s, r) => s + r.cost, 0).toFixed(2)}`);
const out = arg('--json', '');
if (out) fs.writeFileSync(out, JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
