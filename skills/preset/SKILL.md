---
name: preset
description: Switch the model tier of all oh-my-claudecode agents at once (cheap, balanced, max). Use when the user wants to cut cost, raise quality, or asks about model presets.
---

# Model presets

Presets rewrite the `model:` line in each agent's frontmatter. Claude models only
(`haiku`, `sonnet`, `opus`, or `inherit` = the session model). The orchestrator,
`reverser`, and `reverser-light` are never changed.

| Preset | Idea |
|---|---|
| `cheap` | haiku for search/chores, sonnet for the rest |
| `balanced` | default: opus only for oracle and council, audit agents inherit the session model |
| `max` | opus almost everywhere |

## Run

1. List: `node <this skill's base directory>/scripts/preset.mjs --list`
2. Confirm the preset with the user, because it changes cost and applies to every future run.
3. Apply: `node <this skill's base directory>/scripts/preset.mjs <name>`
4. Tell the user to restart Claude Code for it to take effect.

The script edits the plugin's own `agents/` directory. An installed plugin cache is
overwritten on update, so re-run the preset afterwards, or keep a durable copy of an
agent in `~/.claude/agents/` (see the `oh-my-claudecode` skill). Change which agent gets
which model by editing `presets.json` next to this file.
