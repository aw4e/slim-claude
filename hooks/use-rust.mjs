// Switch the plugin's hooks between the Node scripts (default, portable) and the Rust binary (~7x faster start).
// Usage: node hooks/use-rust.mjs on | off | status
// "on" needs a build first:  cd hooks/rust && cargo build --release
// This edits hooks/hooks.json in place. Re-run after a plugin update (an update restores the Node default),
// and do not commit the "on" state: the binary is built per machine and is git-ignored.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, 'hooks.json');
const bin = process.platform === 'win32' ? 'slim-hook.exe' : 'slim-hook';
const MODES = /guard-destructive|guard-secrets|check-json|council-nudge|session-start/;
const action = process.argv[2];

if (!['on', 'off', 'status'].includes(action)) {
  console.error('usage: node hooks/use-rust.mjs on | off | status');
  process.exit(1);
}
if (action === 'on' && !fs.existsSync(path.join(here, 'rust', 'target', 'release', bin))) {
  console.error('Rust binary not found. Build it first:  cd hooks/rust && cargo build --release');
  process.exit(2);
}

const config = JSON.parse(fs.readFileSync(file, 'utf8'));
const seen = [];
for (const groups of Object.values(config.hooks)) {
  for (const group of groups) {
    for (const hook of group.hooks) {
      const mode = hook.command.match(MODES)?.[0];
      if (!mode) continue;
      if (action === 'on') hook.command = `"\${CLAUDE_PLUGIN_ROOT}/hooks/rust/target/release/${bin}" ${mode}`;
      if (action === 'off') hook.command = `node "\${CLAUDE_PLUGIN_ROOT}/hooks/${mode}.mjs"`;
      seen.push(`${mode}: ${hook.command.includes('slim-hook') ? 'rust' : 'node'}`);
    }
  }
}
if (action !== 'status') fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
console.log(seen.join('\n'));
