// After Write/Edit on a .json file, report a parse error back to the model immediately.
// Never blocks for reasons other than "this file is not valid JSON": unreadable files and files
// over MAX_BYTES are skipped silently (a huge file would stall the hook; a read error is not a parse error).
// shortcut: strict JSON only; .jsonc/.json5 are skipped by extension, tsconfig-style comments in .json will warn.
import fs from 'node:fs';

const MAX_BYTES = 5 * 1024 * 1024;

let file = '';
try { file = JSON.parse(fs.readFileSync(0, 'utf8')).tool_input?.file_path ?? ''; } catch { process.exit(0); }
if (!/\.json$/i.test(file)) process.exit(0);

let text;
try {
  if (fs.statSync(file).size > MAX_BYTES) process.exit(0);
  text = fs.readFileSync(file, 'utf8');
} catch { process.exit(0); }

try {
  JSON.parse(text);
} catch (err) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `${file} is not valid JSON after your edit: ${err.message}. Fix it before continuing.`,
  }));
}
