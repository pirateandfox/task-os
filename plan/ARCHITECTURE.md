# Task OS — Architecture Spec

## Current State

The existing Task OS is a working, battle-tested personal tool: SQLite database, MCP server, Electron app. It has been in daily use for over a year and the schema is proven. This document captures the architecture for **Task OS v2** — adding sync, mobile, and multi-device support without throwing away what works.

**Core principle: evolve, don't rewrite.**

---

## Core Philosophy

**Local-first on desktop, cloud-backed on mobile.**

- Desktop app is fast because it reads/writes local SQLite directly — that stays
- MCP server hits local SQLite — that stays, zero latency for Claude sessions
- Mobile hits the API — always online, simpler
- Sync is a background concern, not the core architecture

---

## Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────┐
│   Desktop (Electron) │         │   Mobile (Expo)       │
│                     │         │                      │
│  SQLite (primary)   │◄──sync──►│  NestleJS API        │
│  MCP server         │         │  (read/write)         │
│  Local SQLite R/W   │         │                      │
└─────────────────────┘         └──────────────────────┘
                                          │
                                ┌─────────▼──────────┐
                                │  NestleJS Backend   │
                                │  Postgres (primary) │
                                │  REST API           │
                                └────────────────────┘
```

### Desktop

- Reads and writes **local SQLite** — same as today, no change
- MCP server talks to local SQLite — stays fast, stays offline-capable
- Background sync worker pushes local changes to the API and pulls remote changes
- Works fully offline — sync catches up when connectivity returns

### Backend (NestleJS + Postgres)

- Canonical remote store
- REST API consumed by mobile and the sync worker
- Postgres mirrors the SQLite schema — same fields, same structure
- Simple timestamp-based sync: `updated_at` on every row, last-write-wins
- Hosted by Justin; self-hostable (open source)

### Mobile (Expo / React Native)

- Reads and writes through the NestleJS API directly
- No local database on mobile — always-online is acceptable for phone usage
- If offline: queue writes locally, flush when connection returns (simple queue, not CRDT)

---

## Sync Strategy

**Last-write-wins on `updated_at`.** Simple, correct for the actual use case.

Real conflict rate for a single user across a desktop and phone is near zero — you're not editing the same task on two devices simultaneously in practice. The complexity of CRDT conflict resolution is not justified by the actual conflict scenarios that occur.

Sync flow (desktop → server):
1. Desktop writes to local SQLite (instant, as today)
2. Sync worker checks for rows where `updated_at > last_synced_at`
3. Pushes changed rows to the API
4. API writes to Postgres, returns server timestamp
5. Desktop records `last_synced_at`

Sync flow (server → desktop):
1. Sync worker polls for changes since `last_synced_at`
2. Pulls changed rows
3. Writes to local SQLite if server `updated_at` > local `updated_at`

Sync runs on a short interval (e.g. 30s) and on every local write.

---

## Data Model

The existing SQLite schema carries forward unchanged into Postgres. No migration of the data model — only a migration of the data itself (a one-time export/import script when v2 launches).

Key tables: `tasks`, `habits`, `habit_logs`, `contexts`, `daily_notes`, `attachments`

Task ordering (`sort_order INTEGER`) stays as-is. Last-write-wins handles concurrent reorders acceptably — the conflict rate is low enough that the simple solution is correct.

---

## Platform Targets

```
taskos/
  packages/
    desktop/       ← Electron app (current codebase, evolved)
    mobile/        ← Expo (React Native) — iOS + Android
    backend/       ← NestleJS + Postgres API + sync endpoint
    billing/       ← Stripe integration (private repo)
```

**Monorepo:** pnpm workspaces. Shared TypeScript types between desktop, mobile, and backend via a lightweight `types/` package.

**Desktop** stays Electron. No rewrite. MCP server stays as a utilityProcess. The sync worker is a new background process added alongside the existing ones.

**Mobile** is Expo (React Native). Hits the NestleJS API. Standard React Native patterns — no CRDT, no local database complexity.

**No web app** for task data. A web app would require trusting the server with decryption keys or abandoning E2E encryption — neither is acceptable. Marketing site only.

---

## File Attachments

Unchanged from current implementation. S3-compatible object storage (Cloudflare R2 recommended). Files upload directly from client to the user's bucket via presigned URLs. The backend stores metadata only.

---

## Identity & Auth

**Email + password for the API.** Standard auth — JWT tokens, refresh tokens. No keypair complexity.

On desktop: credentials stored in the OS keychain. Sync worker authenticates with a long-lived token. User logs in once, stays logged in.

On mobile: standard login screen, token stored in secure storage.

**Privacy position:** Justin's hosted backend stores task data. Standard data custody — privacy policy, no data selling, Postgres with backups. This is the same trust model as Todoist, Things, Linear. It is good enough and honest about what it is.

---

## Billing

- Stripe for payments
- Stripe Customer Portal for subscription management (no custom billing UI needed)
- Subscription status checked by the backend on API requests
- Free tier: local only, no sync
- Paid tier: sync enabled

```
Free:    Local only
$5/mo:   Sync across devices + BYOS file attachments
$10/mo:  Sync + hosted file storage (R2 under the hood)
```

---

## Open Source Strategy

- `desktop`, `mobile`, `backend` packages: MIT licensed, fully open source
- Self-hosters can run the full stack — backend + their own Postgres
- `billing` package: private (Stripe keys, payment logic)
- Hosted backend is the commercial offering — sell convenience, not software

---

## What Carries Forward from v1

Everything. The entire existing codebase is v2 desktop. No rewrite:

- SQLite schema and all migrations
- MCP server and all tools
- All task behaviors: recurrence, surface_after, contexts, projects
- Agent spawning and autorun
- Habits system
- Morning briefing, triage, briefing workflows
- Electron app, UI components, IPC handlers

V2 adds: sync worker, NestleJS backend, Expo mobile app.

---

## Open Questions

- **Sync conflict UI** — what does the app show when a rare conflict is detected and resolved?
- **Selective sync** — do all contexts sync, or can you mark a context as local-only?
- **Team/shared contexts** — future; not in scope for v2
