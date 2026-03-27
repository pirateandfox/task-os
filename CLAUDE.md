# Task OS — Developer CLAUDE.md

Task OS is Justin's personal task management system: a local SQLite database with an MCP server (for Claude integration) and an Electron/React UI.

---

## Architecture

```
~/IdeaProjects/task-os/
├── electron-main.js        ← Electron main process; spawns api.js + mcp/http-server.js via utilityProcess
├── api-entry.cjs           ← CJS shim so utilityProcess.fork() can load ESM api.js
├── api.js                  ← HTTP backend, port 3456
├── s3.js                   ← S3/R2 attachment helpers
├── mcp/
│   ├── http-server.js      ← MCP HTTP server, port 3457 (primary, used by Claude Code)
│   ├── http-server-entry.cjs ← CJS shim for utilityProcess.fork()
│   ├── server.js           ← Legacy stdio MCP server (kept as fallback)
│   ├── db.js               ← SQLite helpers, schema migrations, recurrence logic
│   └── tools/              ← MCP tool definitions (tasks, triage, briefing, notes, etc.)
├── ui/                     ← Vite + React + TypeScript frontend, port 5173
│   └── src/
│       ├── components/     ← TaskList, TaskRow, TaskSection, DetailPanel, Settings, etc.
│       ├── lib/            ← constants, utilities
│       ├── mdpdf/          ← Markdown editor/PDF export overlay
│       └── api.ts          ← frontend API client
├── plan/                   ← Planning docs
│   ├── EVOLUTION.md        ← Running log of shipped features and known gaps
│   ├── ARCHITECTURE.md     ← v2 vision (Automerge, Tauri, sync relay)
│   └── FUTURE_IDEAS.md     ← Deferred ideas
├── electron-builder.yml    ← Packaging config (DMG, signing, publish)
├── entitlements.mac.plist  ← macOS hardened runtime entitlements
├── scripts/notarize.mjs    ← Apple notarization hook (runs after electron-builder signs)
└── assets/                 ← App icon source files
```

---

## Running Locally

```bash
cd ~/IdeaProjects/task-os
npm run electron-dev        # starts api.js + Vite + Electron all at once
```

- Backend: `api.js` on port 3456
- Frontend: Vite dev server on port 5173
- Electron: wraps the Vite frontend

---

## Database

SQLite at `~/IdeaProjects/task-os/db/tasks.db`. Schema is managed via inline migrations in `api.js` (`migrate()` function at the top). Migrations use `ALTER TABLE ... ADD COLUMN` wrapped in try/catch so they're idempotent.

**Key fields:** `id`, `title`, `status`, `context`, `due_date`, `surface_after`, `sort_order`, `my_priority`, `energy_required`, `recurrence`, `parent_id`, `task_type`, `source_url`, `links`, `notes`, `project`, `created_at`, `last_touched_human`

**Statuses:** `active`, `done`, `snoozed`, `archived`
**Task types:** `task`, `event`, `reminder`
**Contexts:** stored in the `contexts` table. Use `list_contexts` to see all registered contexts. Use `create_context` to register a new one. Default contexts: `monroe`, `biztobiz`, `pirateandfox`, `silvermouse`, `flightdesk`, `personal`, `internal`.

---

## MCP Server

Runs as an HTTP server on port **3457** (StreamableHTTP transport). Registered in `~/.claude.json` as:
```json
{ "type": "http", "url": "http://localhost:3457/mcp" }
```

The port and `~/.claude.json` entry can be changed in the app's Settings panel (MCP Server section) — it saves the port and rewrites the entry automatically. Restart Claude Code after changing.

The MCP tools are the primary interface for Claude to interact with Task OS during PM sessions. All task management goes through these tools.

---

## Git & Release Workflow

**Repo:** `github.com/pirateandfox/task-os`

**Branch strategy:**
- `develop` — all day-to-day work and commits go here
- `main` — stable releases only; never commit directly

**Cutting a release:**
```bash
# 1. Merge develop → main
git checkout main && git merge develop && git push origin main

# 2. Tag the release (triggers GitHub Actions build)
git tag v1.0.1 && git push origin v1.0.1

# 3. Return to develop
git checkout develop
```

Tagging triggers the GitHub Actions workflow (`.github/workflows/release.yml`) which:
- Builds the macOS DMG + ZIP (arm64 + x64)
- Code-signs with Developer ID certificate
- Notarizes via Apple notarytool
- Publishes to GitHub Releases

The in-app auto-updater (`electron-updater`) checks GitHub Releases on launch and prompts to install when a new version is available.

---

## Development Autonomy

**You have full autonomy to evolve this system** — add fields, add MCP tools, restructure queries, fix edge cases, improve the UI. You do not need to ask permission before making changes. If you spot something that would make the system work better, just do it and tell Justin what you changed and why.

The only exception: **destructive schema changes** (dropping columns, renaming existing fields that have live data) — flag those briefly before running.

**Keep `plan/EVOLUTION.md` updated** as you make changes — it's the running record of what was built, why, and what's next.

---

## Recurrence

Stored as RRULE strings (e.g. `FREQ=MONTHLY;BYMONTHDAY=1`). Legacy shorthands (`daily`, `weekdays`, `weekly`, `monthly`) still work. On complete/skip, next occurrence auto-spawns with `due_date = nextDate`. `nextRecurrenceDate` and `rruleToText` live in `mcp/db.js`.

**Never set `surface_after` on recurring tasks** — use only `due_date`. Setting `surface_after` on a recurring task causes it to appear in "Waking Up" incorrectly.

---

## Building the App Icon

```bash
# Export from Icon Composer → assets/Icon-iOS-Dark-1024x1024@1x.png
node assets/build-icon.mjs
```

---

## Key Behaviors & Gotchas

- `sort_order` controls priority view ordering — `ORDER BY sort_order ASC NULLS LAST` is the primary sort for active tasks
- Events (`task_type = 'event'`) are permanent dated records — never go overdue, never get status transitions
- `surface_after` is strictly for snoozing existing tasks — never set it when creating a new task
