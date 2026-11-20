---
name: oh-my-claudecode
description: Configure and improve the oh-my-claudecode plugin for the current user. Use when users want to tune agents, models, prompts, custom agents, skills, MCPs, or plugin behavior, or when recurring workflow friction suggests a safe prompt or config improvement.
---

# oh-my-claudecode Configuration Skill

Help the user configure the plugin and safely make small prompt/config changes
that improve future runs. Suggest changes only for recurring behavior, not one-offs.

## Files

- Plugin agents: `<plugin>/agents/{orchestrator,explorer,oracle,designer,fixer,observer,council,councillor}.md`. Frontmatter holds `model`, `tools` / `disallowedTools`; the body is the prompt.
- Plugin skills: `<plugin>/skills/<name>/SKILL.md`.
- MCPs: `<plugin>/.mcp.json` (`context7`, `gh_grep`).
- Do not edit an installed plugin cache in place — edits are lost on update. To customize durably, shadow instead:
  - Agent override: `~/.claude/agents/<name>.md` (user scope) or `<project>/.claude/agents/<name>.md` (project scope, wins).
  - Skill override: `~/.claude/skills/<name>/SKILL.md` or `<project>/.claude/skills/<name>/`.
  - House rules: `CLAUDE.md`.
- Default main agent: `"agent": "oh-my-claudecode:orchestrator"` in the user's own `settings.json`, or `claude --agent oh-my-claudecode:orchestrator`.

## Common customizations

- Models: cheaper (`haiku`/`sonnet`) for `explorer`/`fixer`, stronger (`opus`) for `oracle`/`orchestrator`/`designer`. Subagents accept only Claude models.
- Tool access: `tools` is an allowlist, `disallowedTools` a denylist.
- Custom agent: new `.md` in `agents/` with a narrow job, plus a routing line (trigger and non-use) in the orchestrator prompt. Do not duplicate explorer (recon/docs), oracle (architecture/review), designer (UI), fixer (scoped implementation).
- Council roster: edit the table in `skills/council/SKILL.md`.

## Safe improvement rules

1. Ask before changing config or prompts: say what and which file, unless the user asked for that exact edit.
2. Prefer narrow changes; no big prompt rewrites when one rule solves it; no custom agents for one-offs.
3. Preserve existing settings; merge, never regenerate.
4. Mention cost, permission, or delegation changes before applying them; flag model changes that raise spend.
5. Agent, skill, and MCP changes apply on the next Claude Code session; say "restart Claude Code if you need it immediately".

## Workflow

Inspect current files, pick the smallest change, show a short proposal with the target path, edit preserving unrelated content, validate (`claude plugin validate <plugin-dir>` for plugin edits), state when it takes effect.
