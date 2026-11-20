// Asks for confirmation (never denies) before writing credentials or touching secret files.
import fs from 'node:fs';
import path from 'node:path';

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/, 'private key block'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'GitHub token'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/\bsk-[A-Za-z0-9]{32,}\b/, 'API secret key'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
];
const SENSITIVE_FILE = /(^|[\\/])(\.env(\.(?!example|sample|template)[^\\/]*)?|id_rsa|id_ed25519|[^\\/]+\.(pem|key|p12|pfx))$/i;

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const ti = input.tool_input ?? {};
const file = ti.file_path ?? '';
const text = [ti.content, ti.new_string, ...(ti.edits ?? []).map((e) => e.new_string)].filter(Boolean).join('\n');

let reason = '';
if (SENSITIVE_FILE.test(file)) reason = `writes to a secret-bearing file (${path.basename(file)})`;
else {
  const hit = SECRET_PATTERNS.find(([re]) => re.test(text));
  if (hit) reason = `content looks like a ${hit[1]}`;
}

if (reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `oh-my-claudecode guard: ${reason}. Confirm before writing.`,
    },
  }));
}
