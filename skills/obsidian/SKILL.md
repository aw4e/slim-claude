---
name: obsidian
description: "Save session summaries, decisions, findings, and finished specs or deepwork outcomes to the user's Obsidian vault through the obsidian MCP. Use at the end of meaningful work, or when the user says to save or log something to Obsidian. Skip if no obsidian MCP tools are available."
---

# Obsidian notes

Optional. Needs an Obsidian MCP server (tools named `mcp__obsidian__*`, loaded on demand
with ToolSearch query `obsidian`). This plugin does not install one. If none is
available, say so in one line and skip; never invent a path on disk instead.

If the user's own `CLAUDE.md` already defines Obsidian save rules (vault, folder, naming),
those win over the defaults below.

## When to save

At the end of meaningful work: a finished deepwork pass or task, a completed interview
spec, a reflect report, a hard bug and its fix, a design or architecture decision, a
how-to worth reusing. Skip trivial chat, greetings, and venting.

## How

1. Find the vault id with `obsidian_list_vaults` (do not guess it).
2. Search first with `obsidian_search_vault` for the topic. If a note for the same topic
   and day exists, update it with `obsidian_edit_note` instead of creating a duplicate.
   Link related notes with `[[wikilinks]]`.
3. Otherwise `obsidian_create_note`. Defaults: folder `Claude/`, name
   `YYYY-MM-DD <topic>.md`, frontmatter `tags`, `date`, `project`.
4. Body, short and factual: what was done, decisions and why, key findings (file paths,
   commands, offsets), open issues. Prefer links to repo paths over pasted code.
5. Never store secrets, tokens, passwords, or personal data. Redact them.
6. Finish the reply with one line: the note path saved.

Writing to the vault is a persistent, outward change: do it when the user asked, or when
their standing rules say to save automatically. Otherwise offer once and wait.
