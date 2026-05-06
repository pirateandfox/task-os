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

---

## Agent editor UI

Edit agent definitions (`agent.config` + `CLAUDE.md`) directly inside Qalatra without touching the filesystem manually.

**Scope:** Small — ~3–5 hours. Backend plumbing is almost entirely there already.

**What already exists:**
- `file:read` and `file:write` IPC handlers (restricted to `~/IdeaProjects` — needs one-line broadening to also allow `agentsRoot`)
- `fetchAgents()` returns the absolute `path` for each agent directory
- `agent.config` is plain JSON: `name`, `context`, `project`, `description`, `command`, `coding`
- `CLAUDE.md` is a plain markdown file in the same directory (may not exist yet)

**UI: an `AgentEditor` modal triggered from wherever agents are listed (e.g., `ProjectDashboardView`)**

Fields:
- Config form: name, context dropdown, project combobox, description, command, coding toggle
- Textarea for `CLAUDE.md` content (plain text is fine — no rich editor needed)
- "Create new agent" path: pick a parent directory, enter a folder name → scaffolds dir + writes initial `agent.config`

**On save:** write `agent.config` as JSON, write `CLAUDE.md` as text, call `agents:rescan` so the UI reflects changes immediately.

**Backend changes needed:**
1. Loosen `file:read`/`file:write` path guard to also allow `agentsRoot` setting (or just `HOME` with a list of permitted extensions)
2. Add `agent:create-dir` IPC handler to `mkdir -p` the new agent directory before writing files

**When to build:** when editing `agent.config` files by hand in the terminal feels like friction.

---

## Terminal improvements (xterm.js / Warp-like experience)

Qalatra already uses xterm.js + node-pty — the same stack as VS Code. Current setup only uses FitAddon (canvas renderer). Three tiers of improvement, each independent:

### Tier 1: WebGL renderer (1–2 hours, high ROI)
Add `@xterm/addon-webgl` and enable it on terminal init. Switches rendering from canvas to GPU-accelerated WebGL — meaningfully faster output, especially for agent runs with heavy stdout. VS Code ships with this enabled. Immediate visible improvement.

```ts
import { WebglAddon } from '@xterm/addon-webgl'
term.loadAddon(new WebglAddon())
```

### Tier 2: Fix React/mount jank (half-day)
Currently the terminal re-mounts or loses focus when the docked/fullscreen state changes. The fix: mount the xterm instance once and keep it alive, just show/hide the container via CSS. Eliminates most of the "janky" feeling that distinguishes it from a native terminal.

### Tier 3: Terminal pane splits / grid (2–3 days)
Multiple independent terminal panes in a resizable grid. Each pane gets its own node-pty process. Needs a split-pane layout manager (e.g. `react-resizable-panels`) and a `pty:create` / `pty:write` / `pty:close` IPC model that supports multiple sessions by ID. Enables Warp-style multi-terminal layouts without leaving Qalatra.

**Ceiling:** With all three tiers, the terminal will feel solid for agent monitoring and quick file edits. It won't feel as "native" as a standalone Warp window — Electron has overhead that can't be eliminated. The right mental model is "good enough that you don't need to switch apps," not "replace Warp entirely."

**When to build Tier 1:** basically any time — it's low risk and high payoff.
**When to build Tier 3:** when you find yourself constantly switching to Warp just to have two terminals side by side.

---

## Embedded file editor (Monaco)

VS Code's editor — Monaco Editor — is fully open source, embeddable via npm, and brings syntax highlighting, search, keybindings, and multi-language support for free. VS Code itself is Electron + TypeScript, same stack as Qalatra. Monaco is the extractable core.

**Goal:** Quick file review without leaving Qalatra. Primary use case: agent finishes a task, links an output file, you want to glance at the diff or read the result without opening an IDE. Light editing (tweak a config, fix a line) is a bonus, not the core. Deep coding work still happens in a real IDE.

**Scope:** 1–2 days for a solid read/edit/save panel.

**Shape:**
- A slide-in panel or full-screen overlay (like the existing MdView overlay)
- Triggered from: file links on tasks, agent output paths, the agent editor, terminal `open` commands
- Reads via `file:read` IPC, saves via `file:write` IPC (path guard already exists)
- Monaco handles syntax highlighting automatically from file extension

**Dependencies:**
```
npm install @monaco-editor/react
```

**What you get for free from Monaco:** syntax highlighting for JS/TS/Python/JSON/Markdown/etc., find & replace, multi-cursor, minimap, theme integration.

**What you don't get without more work:** LSP (autocomplete, go-to-definition), git diff view, debugger. Those are VS Code features built on top of Monaco, not part of it.

**When to build:** when you find yourself opening a file in another editor just to make a small change and come back. The agent editor (above) is a precursor — if that feels good, Monaco is the natural next step for arbitrary files.

---

## File browser + workspace view

A file tree panel rooted at `agentsRoot`, combined with the Monaco viewer, turns Qalatra into a self-contained workspace. The vision: tasks reference agent folders → you open the folder in the tree → read or edit the CLAUDE.md → the agent runs better next time. Everything is text files. Qalatra already knows where they all live.

**What already exists:**
- `agentsRoot` setting defines the root
- Directory-walking logic exists in `scanAgents()` in `ipc-handlers.js` — can be repurposed
- `file:read` / `file:write` IPC handlers cover opening and saving files
- Monaco (once added) handles the viewing/editing

**What needs building:**
- `directory:list` IPC handler — returns entries (files + subdirs) for a given path, one level deep
- File tree UI component — collapsible folders, file icons by extension, click to open in Monaco panel
- Probably lives as a toggleable left panel or a dedicated sidebar section

**Scope:** 2–3 days once Monaco is in. The IPC side is a morning; the tree UI is the main work.

**Self-editing loop this enables:**
1. Agent finishes a task and links an output file → click to open it in the viewer
2. Notice the agent's CLAUDE.md needs updating → navigate to it in the tree → edit in Monaco → save
3. Task references a project folder → browse it without switching apps
4. Edit an `agent.config`, trigger a rescan, updated agent appears in the task creation dropdown

Everything Qalatra manages (tasks, agents, projects) lives in folders it already knows about. The file browser closes the loop so the system can evolve itself from within.

**When to build:** naturally after Monaco is in — the file browser without a viewer is much less useful. Together they form a coherent feature.
