# Future Ideas

Low-priority or speculative ideas that aren't worth building yet but shouldn't be forgotten.

---

## Sync layer (Asana / Linear / Notion)

Automated two-way state sync: pull tasks in, push completions back. Originally planned but made redundant by having Asana/Linear/Notion MCP connections available in chat. Current workflow (triage in chat → create task with source_url → complete both in same conversation) covers the need without the complexity of webhooks, polling, and token storage. Only worth revisiting if closing tasks in two places becomes consistently annoying in practice.

---

## Bug: Completing a missed recurring task drifts the cadence

**Observed (2026-04-13):** Weekly task due Tue Apr 7 was missed. Auto-skip surfaced it on Mon Apr 13 with `due_date = today` — which is correct behavior (keep it visible until done). But when the user completes it on Apr 13, the next recurrence will land on **Mon Apr 20** (today + 7 days) instead of **Tue Apr 14** (original cadence + 7 days). The weekday alignment drifts permanently.

**Expected behavior:** Auto-skip surfacing a missed task as due-today is correct. The problem is in **completion recurrence**: the next occurrence should be anchored to `original_due_date + recurrence_period`, not `completion_date + recurrence_period`. For tasks missed by multiple periods, advance by the minimum number of periods to land in the future: `original_due_date + ceil((today - original_due_date) / period) * period`.

**Impact:** Any missed weekly task that gets completed on a different weekday permanently shifts its schedule. User has to manually correct due dates to restore Tuesday/Thursday/etc. cadences.

**Fix:** In the completion recurrence handler, use the task's `due_date` (not today) as the base for the next occurrence calculation. Since auto-skip already sets `due_date = today` on the missed instance, the workaround is: before completing a missed task, set `due_date` to the correct next cadence date — then completion recurrence lands correctly.

---

## `defer_context` / bulk triage

A single MCP call to snooze all active tasks in a context by N days (e.g. "Monroe is on hold for 2 weeks"). Currently solvable via chat — just say "snooze all active Monroe tasks until X" and Claude loops through them. Only worth building if the one-by-one approach becomes noticeably burdensome in practice.

---

## Agent job queue

Fire-and-forget automated agent tasks — dispatch a prompt to a folder-agent and let it run without a human in the loop. The folder-as-agent architecture is already built; this is the async execution layer on top of it.

**Schema addition:**
```sql
CREATE TABLE agent_jobs (
  id INTEGER PRIMARY KEY,
  agent_path TEXT,           -- resolved from agent.config scan
  prompt TEXT,               -- the task instruction
  status TEXT,               -- queued | running | done | failed
  result TEXT,               -- stdout summary from agent
  output_path TEXT,          -- where the artifact was written
  priority INTEGER DEFAULT 5,
  created_at DATETIME,
  started_at DATETIME,
  completed_at DATETIME
);
```

**Worker:** polls every 2 seconds, respects a concurrency cap (recommended: 3-4 simultaneous Claude Code instances). Runs `claude -p '{prompt}' --output-format json` in the agent's folder via `exec()`.

**When to build:** when the pattern of "open terminal → navigate to agent folder → run Claude manually" becomes the bottleneck. The terminal is currently sufficient for interactive use.
