# slim-claude

An orchestrator plus specialist subagents and skills for Claude Code, adapted from
[oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) (MIT).

## Agents

| Agent | File | Model | Job |
|---|---|---|---|
| orchestrator | `agents/orchestrator.md` | session model | plans, delegates, verifies (run as main agent) |
| explorer | `agents/explorer.md` | haiku | read-only codebase search, docs research (uses `context7`, `gh_grep`) |
| oracle | `agents/oracle.md` | opus | architecture, hard debugging, review (read-only) |
| designer | `agents/designer.md` | sonnet | UI/UX design and implementation |
| fixer | `agents/fixer.md` | sonnet | bounded implementation |
| observer | `agents/observer.md` | sonnet | images, PDFs, screenshots, diagrams |
| reverser / reverser-light | `agents/reverser*.md` | opus 4.8 / sonnet 4.6 | reverse engineering, deep vs light chores |
| janitor, paladin, arbiter, hunter, proctor | `agents/*.md` | session model | read-only audits: maintainability, security, code review, error paths, test gaps |
| validator, debugger, documenter, chronicler | `agents/*.md` | session model | run tests/builds, live debugging (needs a debugger MCP), docs |
| councillor / council | `agents/councillor.md`, `agents/council.md` | per seat / opus | multi-model consensus seats and synthesizer |

## Skills

`deepwork` (multi-phase heavy builds), `interview` (spec Q&A), `council`, `worktrees` (isolated git lanes),
`codemap` (hierarchical repo map, with script), `clonedeps` (dependency source for inspection),
`simplify`, `verification-planning`, `step-back`, `deanchor`, `ai-estimates`,
`reflect` (learn from past sessions), `obsidian` (save notes via the obsidian MCP, optional), `preset` (switch model tier: cheap/balanced/max), `slim-claude` (configure this plugin).
Invoke as `/slim-claude:<skill>`. Project state lives under `.slim-claude/`.

## MCP

`.mcp.json` ships `context7` (library docs) and `gh_grep` (GitHub code search).

## Hooks

All local, nothing is sent anywhere. The guards ask for confirmation; they never deny.

- `SessionStart`: points the session at `.slim-claude/codemap.json` and at any active deepwork task (`.slim-claude/deepwork/*/progress.md`), so resume and compaction keep context.
- `UserPromptSubmit`: once per session, nudges toward the `council` skill when the prompt asks for consensus or second opinions (ignores code blocks and slash commands).
- `PreToolUse` Bash: confirms force-push, `git reset --hard`, `git clean -f`, `rm -rf`, and worktree removal.
- `PreToolUse` Write/Edit/MultiEdit: confirms writes to `.env*` (except `.example`), `*.pem`, `*.key`, SSH keys, or content that looks like an AWS/GitHub/Anthropic/Slack key or a private key block.
- `PostToolUse` Write/Edit/MultiEdit: after a `.json` edit, reports a parse error back to the model immediately.

## Install

Local test, from any project:

```
claude --plugin-dir <path-to-this-folder> --agent slim-claude:orchestrator
```

To make the orchestrator the default, add `"agent": "slim-claude:orchestrator"`
to your own `~/.claude/settings.json` (plugins can no longer set this themselves).

Distribute: push this folder to GitHub, then

```
/plugin marketplace add <you>/slim-claude
/plugin install slim-claude@slim-claude
```

## Customize

Edit the `model:` line in any `agents/*.md`. Subagents can only use Claude models
(`opus`, `sonnet`, `haiku`, or a full model ID). Add an agent by dropping a new
`.md` in `agents/` plus a routing line in `agents/orchestrator.md`. The council
roster is the table in `skills/council/SKILL.md`. Durable per-user overrides go in
`~/.claude/agents/` or `.claude/agents/` (see the `slim-claude` skill).

Community agents (janitor, paladin, arbiter, hunter, proctor, validator, debugger, documenter, chronicler) are adapted from the oh-my-opencode marketplace; see `THIRD_PARTY_NOTICES.md`.

## Not ported

- Mixing non-Claude providers per agent (needs a proxy; presets and fallback chains too).
- tmux/multiplexer panes, TUI sidebar, interview browser dashboard, agent marketplace UI, companion app, ast-grep tools
  (Claude Code's own `/plugin` marketplace replaces the last one).
- OpenCode-specific hooks (apply-patch rewrite, foreground fallback, cache monitor, tool-loop guard).

## Privacy

The bundled MCP servers (`context7`, `gh_grep`) are remote: library and code-search queries you or the agents make are sent to mcp.context7.com and mcp.grep.app. Remove `.mcp.json` to disable them. The hooks run locally and send nothing.
