// After Write/Edit on a .json file, report a parse error back to the model immediately.
// shortcut: strict JSON only; .jsonc/.json5 are skipped by extension, tsconfig-style comments in .json will warn.
import fs from 'node:fs';

let file = '';
try { file = JSON.parse(fs.readFileSync(0, 'utf8')).tool_input?.file_path ?? ''; } catch { process.exit(0); }
if (!/\.json$/i.test(file) || !fs.existsSync(file)) process.exit(0);

try {
  JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `${file} is not valid JSON after your edit: ${err.message}. Fix it before continuing.`,
  }));
}
