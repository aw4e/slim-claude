// Asks for confirmation (never denies) before hard-to-reverse shell commands.
import fs from 'node:fs';

const PATTERNS = [
  [/\bgit\s+push\b[^|;&]*(--force\b|--force-with-lease\b|\s-f\b)/, 'force-push rewrites remote history'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards uncommitted work'],
  [/\bgit\s+clean\b[^|;&]*\s-[a-z]*f/, 'git clean -f deletes untracked files'],
  [/\bgit\s+worktree\s+remove\b/, 'removes a worktree'],
  [/\borca\s+worktree\s+rm\b/, 'removes an Orca worktree'],
  [/\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/, 'recursive force delete'],
];

let command = '';
try { command = JSON.parse(fs.readFileSync(0, 'utf8')).tool_input?.command ?? ''; } catch { process.exit(0); }

const hit = PATTERNS.find(([re]) => re.test(command));
if (hit) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `slim-claude guard: ${hit[1]}. Confirm before running.`,
    },
  }));
}
