# Extras

Optional agents that are not loaded by the plugin. Copy the ones you want into your own agent
folder; the orchestrator routes to them automatically when they exist.

## reverse-engineering

`reverser` (deep teardown, deobfuscation, protocol and debugger work) and `reverser-light`
(bounded chores: dump strings, read one function, check one offset or signature).

```
# user scope (all projects)
cp extras/reverse-engineering/*.md ~/.claude/agents/
# or project scope
cp extras/reverse-engineering/*.md .claude/agents/
```

They use the aliases `opus` and `sonnet`. To pin a specific model, edit the `model:` line
(for example a full model ID). Restart Claude Code afterwards.
