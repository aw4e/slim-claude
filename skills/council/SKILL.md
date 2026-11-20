---
name: council
description: Multi-model consensus for high-stakes decisions. Use when the user asks for a council, second opinions, consensus, a roundtable, or several models' views on one question. Not for routine work.
---

# Council Mode

Orchestrator-only. Runs the same question past several independent seats (each a
different Claude model), then merges the answers. Claude Code subagents can only
use Claude models, so diversity comes from model tier (opus, sonnet, haiku),
not provider. Edit the roster below to change it.

## Roster

| Seat | Dispatch with |
|---|---|
| alpha | `model: "opus"` |
| beta | `model: "sonnet"` |
| gamma | `model: "haiku"` |

## Procedure

1. Write one self-contained question. Seats receive only their prompt, so embed
   a brief summary of needed context and file paths. Do not tell a seat what the
   others think.
2. Dispatch every seat in parallel: one `Agent` call per seat in a single
   message, `subagent_type` `councillor` (namespaced `oh-my-claudecode:councillor` if
   needed), with the seat's `model` override and a description naming the seat.
3. Collect all replies. Retry an empty seat once; mark failed seats; do not wait
   on stragglers.
4. Dispatch one `Agent` call with `subagent_type` `council`, `model` default,
   prompt = the question plus each seat's name, model, and full reply. Preserve
   its structured report when answering the user.

Never use the council as the only lane on a task, and never for single-specialist
questions. It costs one call per seat plus one for synthesis.
