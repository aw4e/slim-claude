// UserPromptSubmit: when the prompt asks for consensus / second opinions, remind the model once
// per session that the council skill exists. Mirrors upstream council-inject (keyword-triggered).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TRIGGER = /\b(?:councillors?|councils?|consensus|second opinions?|roundtable|multiple opinions|multiple models|several models|multi-?model|multi-?agents?|panel|deliberat\w*|diverse perspectives|sounding board|konsensus|pendapat kedua|beberapa model|banyak model|dewan)\b/i;

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }

// Ignore pasted code and slash-command invocations, which merely mention the words.
const text = String(input.prompt ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
if (/^\s*\/[a-z][\w:-]*(\s|$)/i.test(text) || !TRIGGER.test(text)) process.exit(0);

const sid = String(input.session_id ?? '').replace(/[^\w-]/g, '');
if (sid) {
  const marker = path.join(os.tmpdir(), `slim-claude-council-${sid}`);
  if (fs.existsSync(marker)) process.exit(0);
  try { fs.writeFileSync(marker, ''); } catch { /* best effort: nudge may repeat */ }
}

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: 'If this request calls for multi-model consensus, run the council skill (/slim-claude:council). Ignore this note if the word was incidental.',
  },
}));
