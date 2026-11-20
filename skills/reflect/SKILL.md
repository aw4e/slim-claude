---
name: reflect
description: Review recent work, find repeated workflow patterns, and suggest reusable skills, agents, commands, config changes, or playbooks. Use when the user asks to learn from past sessions, improve recurring workflows, or identify what should be turned into reusable agent instructions.
---

# Reflect

Orchestrator-only. Looks back over recent sessions, project notes, and existing
agent assets, then recommends the smallest useful improvement: a skill, custom
agent, command, config change, prompt rule, documentation playbook, or no change.
Find real repeated friction and back every suggestion with evidence.

Do not use for ordinary implementation, one-off debugging, broad architecture
review, or speculative agent creation without workflow evidence.

## Evidence sources (read-only, in order)

1. The current conversation.
2. Project guidance: `CLAUDE.md`, `.claude/` (agents, skills, commands), `.omc/` (deepwork progress, codemap, notes).
3. This plugin's config (see the `oh-my-claudecode` skill).
4. With `--sessions`: past session transcripts, `~/.claude/projects/<project-slug>/*.jsonl` (one JSON event per line). Sample the most recent N (default 20, or `--last N`) by modification time; read user-turn text and tool-use names only. Delegate bulk reading to the `explorer` subagent. Never copy secrets, tokens, or personal data into a summary.

## Process

1. Gather evidence from the sources above, scoped by any `<focus>` the user gave.
2. Cluster: repeated corrections, repeated manual steps, repeated delegation misses, recurring failures. A pattern needs at least 2-3 independent occurrences.
3. For each pattern pick the smallest fix:
   - a one-line rule in `CLAUDE.md` or an agent prompt;
   - a new skill for a recurring multi-step procedure;
   - a custom agent only for a narrow, repeatable job no specialist covers;
   - a permission or model change;
   - nothing.
4. Report: pattern, evidence (session/file references), proposed change, target file, expected effect, risk.
5. Ask before applying anything. Apply via the `oh-my-claudecode` skill rules, and say when it takes effect (next session).

## Output

A ranked short list, strongest evidence first, then "no change" notes for patterns
that did not clear the bar. Be honest when evidence is thin.
