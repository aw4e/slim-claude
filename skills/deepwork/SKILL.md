---
name: deepwork
description: "High-cost orchestrator workflow for large, high-risk, multi-phase coding efforts with meaningful dependencies and review gates. Do not activate for routine multi-file changes."
---

# Deepwork

Deepwork is an orchestrator workflow for heavy coding sessions: a whole
product or subsystem, cross-cutting architectural change, unsafe-to-partially-
ship migration, or sustained coordination across specialist lanes. Never infer
it merely because a task touches multiple files; skip it for trivial edits,
quick docs changes, simple bug fixes, or routine bounded features.

## Work Like a Painter

Build the whole picture in passes, each at a higher fidelity, keeping it easy
to adjust:

1. **Sketch** — every major flow works end to end, thinly. Rough is fine;
   faked or hidden is not.
2. **Structure** — real data model, real module boundaries, the main failure
   paths.
3. **Detail** — hardening, crash recovery, edge cases, polish. Repeat as
   needed.

Every pass ends with a committed, usable product and a ranked known-issues
list. Stop when the task's goal is met at a fidelity that serves it, and hand
the remaining known issues over — leftovers are expected, not failure.

Two things are never deferred to a later pass: security and money/data
correctness.

## Autonomy

Run autonomously to the end by default. Make reasonable decisions yourself,
record them in the progress file, and keep moving. Ask the user only when
truly blocked: credentials, paid commitments, irreversible or public external
actions, or a decision with no safe default.

## Role

Act as scheduler and integrator, not the default implementation worker. Make
small integration and remediation edits yourself when you already hold the
context.

## Planning a Pass

- Define the pass goal in one or two lines.
- Split the pass into about four or fewer lanes with disjoint write scopes.
  Agree the interfaces between lanes before dispatching.
- Plan `designer` and `fixer` as separate lanes: designer owns visuals; fixer
  owns wiring, types, and tests.
- If a lane touches persistent state, money, concurrency, crash recovery, or
  destructive operations, get one short `oracle` design review of the pass
  plan before dispatch.
- Record the pass plan in the progress file; give the user a compact version.

## Running a Pass

- Every delegation states scope, interfaces it relies on, and acceptance
  evidence. Every lane report lists changed files, exact commands run with
  exit codes, and what remains unverified.
- Accept a lane after checking one decisive artifact — source for interfaces,
  real output for runtime, screenshots for UI. A passing build proves neither
  behavior nor visual quality.
- After two misses from a lane, change the boundary or the specialist instead
  of sending a longer version of the same prompt.
- Lanes run focused checks only. Run the broad suite once per pass, after
  reconciling all writers.
- If the pass runs about twice its expected effort, step back and re-plan.

## Gate and Step Back

At the end of each pass:

1. Run the broad validation once on the reconciled state.
2. Request one `oracle` gate scoped to this pass: is the whole picture right
   at this fidelity? Findings for a later pass go to the known-issues list.
   Fix blockers in one bounded pass; at most two re-reviews. State the attempt
   in every gate prompt, e.g. `Pass 2 gate — attempt 2 of 3`.
3. Commit the pass (only if the user has allowed commits).
4. Step back: run the product as a whole and re-plan the next pass from what
   you see. If files grew huge or module boundaries blurred, make
   reorganization part of the next pass.

## State

`.slim-claude/deepwork/<task-slug>/progress.md` is the resume file, rewritten in
place, at most about 40 lines of plain prose: status, pass and goal, next
step, constraints and decisions, running lanes (one line each), a References
list of project files, and the ranked known-issues list. No activity log.

Setup: ensure `.gitignore` contains `.slim-claude/deepwork/`, adding it only if
missing. Update state at pass transitions, decisions, and blockers — not after
every lane.

Resume: read the progress file, then only the References it points to.

## Completion

Rewrite the progress file as a tombstone of at most 15 lines: first line
`status: completed`, then the final outcome, pointers to key deliverables, the
remaining known issues, and the date. Finish with final validation and a
concise summary. If obsidian MCP tools are available and the user keeps notes there, load the `obsidian` skill to save the outcome.
