# Privacy

slim-claude is a Claude Code plugin made of prompts, skills, and local scripts. It has no server
and collects no data.

**What stays on your machine.** The five hooks (`hooks/*.mjs`, and the optional Rust build) run
locally. They read the tool call or prompt Claude Code passes them on stdin, decide whether to ask
for confirmation or add a short note, and write nothing outside your machine. The only files they
touch are a small per-session marker in your OS temp folder (`slim-claude-council-<session id>`) and,
for `.slim-claude/`, files in your own project that you or the skills created.

**What leaves your machine.**
- Whatever Claude Code itself sends to the model provider you use. This plugin does not change that;
  its agents and skills are additional prompts inside the same conversation.
- Two optional remote MCP servers declared in `.mcp.json`: **context7** (`mcp.context7.com`) and
  **gh_grep** (`mcp.grep.app`). When an agent uses them, the library name or code-search query is sent
  to that service and is governed by its own privacy policy. Delete `.mcp.json` to disable both.
- Skills that call tools you already have (for example the `obsidian` skill using your own Obsidian
  MCP, or `orca` CLI commands) act through those tools only, and only when you ask or your own rules
  say so.

**What the plugin never does.** It does not send telemetry, analytics, or crash reports, does not read
your credentials, and does not contact any server of its own. The secret guard hook inspects content
only to ask you before a write; it does not store or transmit it.

Questions or concerns: open an issue at https://github.com/aw4e/slim-claude/issues.
