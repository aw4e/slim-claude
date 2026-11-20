# slim-claude

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-white.svg">
    <img src="assets/logo.svg" alt="slim-claude logo" width="96" height="96">
  </picture>
</p>

An orchestrator that plans work and hands it to specialist subagents (search, architecture review,
UI, implementation, audits), plus skills and a few safety hooks, for Claude Code. Adapted from
[oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) (MIT).

> **Status: beta (v0.1.0).** Passes `claude plugin validate`; the hooks have automated tests (41 cases) and a
> fresh-clone release gate. A live smoke suite (`scripts/smoke-live.mjs`, 36 real `claude -p` sessions on Windows)
> confirms that with the orchestrator as main agent every agent is dispatched, read-only agents stay read-only,
> the council runs 3 seats on 3 models plus a synthesis, and all skills load. Seven cases plant a known defect
> (SQL injection, swallowed error, untested branch, duplicated code, off-by-one, var/closure) and check the audit
> agents name it, plus one clean-code control; this measures recall on small cases, not general review quality. Not yet verified: interactive sessions, macOS and Linux. Issues welcome.

## Quick start

1. **Install**
   ```
   /plugin marketplace add aw4e/slim-claude
   /plugin install slim-claude@slim-claude
   ```
   To try it from a local checkout instead: `claude --plugin-dir <path-to-this-folder>`.
2. **Start with the orchestrator.** A plugin cannot make an agent the default, so either launch with it:
   ```
   claude --agent slim-claude:orchestrator
   ```
   or set it once in your own `~/.claude/settings.json` (or a project's `.claude/settings.json`):
   ```json
   { "agent": "slim-claude:orchestrator" }
   ```
   Without this step the plugin still adds its agents and skills, but nothing delegates for you.
3. **Try it.** Ask for something with a few parts, for example: *"Find where auth is handled, then have
   someone review the design and implement the fix."* The orchestrator should dispatch `explorer`,
   `oracle`, and `fixer` as subagents. Run `/agents` to see everything the plugin added, and
   `/slim-claude:council <question>` for a multi-model second opinion.
4. **Keep costs in check.** `/slim-claude:preset` switches the model tier (`cheap`, `balanced`, `max`).

Nothing else is required. Obsidian, Orca, `rtk`, and a debugger backend are optional and skipped when absent.

## What's inside

| Agent | Model | Job |
|---|---|---|
| orchestrator | session model | plans, delegates, verifies (run it as the main agent) |
| explorer | haiku | read-only codebase search and docs research (uses `context7`, `gh_grep`) |
| oracle | opus | architecture, hard debugging, review (read-only) |
| designer | sonnet | UI/UX design and implementation |
| fixer | sonnet | bounded implementation |
| observer | sonnet | images, PDFs, screenshots, diagrams |
| councillor / council | per seat / opus | multi-model consensus (see the `council` skill) |
| janitor, paladin, arbiter, hunter, proctor | session model | read-only audits: maintainability, security, merge-readiness, error paths, test gaps |
| validator, debugger, documenter, chronicler | session model | run tests/builds, live debugging (needs a debugger MCP), docs |

Skills (invoke as `/slim-claude:<name>`): `deepwork` (multi-phase heavy builds), `interview` (spec Q&A),
`council`, `worktrees` (isolated git lanes, Orca-aware), `codemap` (repo map), `clonedeps` (dependency source),
`simplify`, `verification-planning`, `step-back`, `deanchor`, `ai-estimates`, `reflect`, `obsidian`
(optional), `preset`, `slim-claude` (configure this plugin). Project state lives in `.slim-claude/`.

Optional extras not loaded by default (reverse-engineering agents) are in [`extras/`](extras/README.md).

## Hooks

All local; nothing is sent anywhere. The guards ask for confirmation; they never deny.

- `SessionStart`: points the session at `.slim-claude/codemap.json` and any active deepwork task, so resume and compaction keep context.
- `UserPromptSubmit`: once per session, nudges toward the `council` skill when the prompt asks for consensus or a second opinion.
- `PreToolUse` Bash: confirms force-push, `git reset --hard`, `git clean -f`, `rm -rf`, and worktree removal.
- `PreToolUse` Write/Edit: confirms writes to `.env*` (except `.example`), `*.pem`, `*.key`, SSH keys, or content that looks like a cloud/GitHub/Anthropic/Slack key or private key block.
- `PostToolUse` Write/Edit: after a `.json` edit, reports a parse error back to the model.

Hooks run on Node by default (about 50 ms per call). An optional Rust port starts in about 7-9 ms; build it per machine:

```
cd hooks/rust && cargo build --release
node hooks/use-rust.mjs on      # off | status
node hooks/test.mjs --rust      # parity check against the Node hooks
```

The binary is git-ignored, so other users and OSes keep the Node default. A plugin update restores Node; re-run `on`.

## Customize

Edit the `model:` line in any `agents/*.md`. Subagents can only use Claude models (`opus`, `sonnet`,
`haiku`, or a full model ID). Add an agent by dropping a `.md` in `agents/` and a routing line in
`agents/orchestrator.md`. The council roster is the table in `skills/council/SKILL.md`. Durable
overrides go in `~/.claude/agents/` or `.claude/agents/` so plugin updates do not erase them.

## Development

Before a release, run all three:

```
claude plugin validate .
node hooks/test.mjs                    # add --rust for the Rust hooks
node scripts/check-fresh-clone.mjs     # clones origin as a Windows user would (autocrlf=true) and re-validates
node scripts/smoke-live.mjs            # live: real claude -p sessions per agent/skill; costs money (~$2-3 in total)
```

## Not ported from oh-my-opencode-slim

- Mixing non-Claude providers per agent, presets with fallback chains (needs a proxy).
- tmux panes, TUI sidebar, interview browser dashboard, companion app, ast-grep tools.
- OpenCode-specific hooks (apply-patch rewrite, foreground fallback, cache monitor, tool-loop guard).

## Credits and license

MIT. Built on oh-my-opencode-slim and community agents from the oh-my-opencode marketplace, with
`hunter` and `proctor` derived from Archon. Upstream copyright notices are retained in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Not affiliated with or endorsed by those projects.

## Privacy

The bundled MCP servers (`context7`, `gh_grep`) are remote: library and code-search queries made by you
or the agents are sent to mcp.context7.com and mcp.grep.app. Delete `.mcp.json` to disable them. The
hooks run locally and send nothing. Full statement: [`PRIVACY.md`](PRIVACY.md).
