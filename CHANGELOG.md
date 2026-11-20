# Changelog

## 0.1.0 (beta)

First public release. Adapted from [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) (MIT).

**Added**
- Orchestrator plus specialist subagents: explorer, oracle, designer, fixer, observer, council/councillor, and nine audit and utility agents (janitor, paladin, arbiter, hunter, proctor, validator, debugger, documenter, chronicler).
- 14 skills (deepwork, interview, council, worktrees, codemap, clonedeps, simplify, verification-planning, step-back, deanchor, ai-estimates, reflect, obsidian, preset) and a configuration skill.
- Hooks: codemap and deepwork pointers at session start, council nudge, confirmation before destructive shell commands and secret writes, JSON check after edits. Optional Rust build of the hooks.
- Optional agents in `extras/` (reverse engineering).
- Logo and plugin icon.

**Verified**
- `claude plugin validate`, 41 hook tests, a fresh-clone gate (Windows checkout settings), and 36 live `claude -p` sessions (every agent dispatched, read-only agents stay read-only, council runs 3 seats on 3 models, all skills load, audit agents find planted defects).

**Not verified**
- Interactive sessions, macOS, Linux, large projects and long conversations. The live suite checks wiring and small cases, not general quality.

**Known limits**
- The orchestrator is not the default agent; start it with `claude --agent slim-claude:orchestrator` or set `"agent"` in your own settings.
- No mixing of non-Claude model providers per agent, no tmux panes (see README, "Not ported").
- No trademark search was done for the logo.
