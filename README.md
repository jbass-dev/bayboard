# BayBoard

[![CI](https://github.com/jbass-dev/bayboard/actions/workflows/ci.yml/badge.svg)](https://github.com/jbass-dev/bayboard/actions/workflows/ci.yml)

**Live demo:** [bayboard-1zyz.vercel.app](https://bayboard-1zyz.vercel.app) · sign in and hit **Load demo data** to explore a busy Saturday in ten seconds.

Quick-lube shops run on whiteboards, sticky notes, and the manager's memory. I managed one for seven years — BayBoard is the shop-floor board I wish I had: a real-time dashboard showing what's waiting, what's in each bay, how long it's been running, and whether we're about to run out of the parts the next car needs.

<!-- Demo GIF: record the board syncing across two windows and drop it here -->
<!-- ![BayBoard live board](docs/demo.gif) -->

## Features

- **Live Bay Board** — waiting queue plus one column per bay; ticket moves sync instantly across every connected device through Firestore real-time listeners.
- **Ticket lifecycle** — vehicle, service, and technician per ticket; an elapsed-time badge shifts colour (and shape) as a service runs long.
- **Inventory** — a stocked shelf of oil grades and filters with per-item low-stock thresholds. Completing a ticket decrements the parts it used inside a Firestore transaction; crossing a threshold raises a live alert banner on the board.
- **Checklists** — digital opening and closing procedures that reset each day, every item tappable and time-stamped.
- **Day summary** — cars served, average time per bay, and services by type, including a bar chart.

## Why the inventory decrement is the interesting part

Completing a ticket doesn't just flip its status — it writes the status change and the stock decrements in a **single Firestore transaction**. That means a ticket can never be marked complete without its parts coming off the shelf, and two bays closing at the same moment can't both read the same quantity and double-count it. It's a small piece of real business logic that shows *when* data should change, not just *how*.

## Stack

- **Next.js (App Router) + TypeScript** — ticket status is a discriminated union, so invalid states (a completed ticket with no bay) can't be represented.
- **Tailwind CSS** — dense, glanceable board layout that stays responsive on the counter tablet and the bay screen.
- **Firebase Auth + Firestore** — real-time sync out of the box; a generic typed converter keeps documents fully typed coming out of the database.
- **Jest + React Testing Library** — pure logic and board/inventory flows tested on every push.
- **GitHub Actions + Vercel** — lint and the full test suite run on every push; deployed on Vercel.

## Testing & accessibility

- **59 tests** run in CI on every push: **41 unit tests** (status transitions, next-service dates, inventory decrement, low-stock detection, checklist toggling, day-summary rollups) and **18 React Testing Library / component tests** (board cards, complete flow, inventory restock and low-stock banner, add-item form).
- **Keyboard operable** — every board action (assign, complete, return to waiting) is a real button; dialogs close on `Escape` and expose `role="dialog"` with a labelled title.
- **Announced** — ticket moves and completions are announced through an ARIA live region; the low-stock banner uses `role="status"`.
- **Not colour alone** — the elapsed-time badge carries a shape marker and a spoken label ("running long", "well over target") alongside its colour, and low inventory is labelled "Low stock" in text.
- **Lighthouse accessibility: 95** on the deployed build (alongside Performance 99, Best Practices 96, SEO 100).

## Data model

Firestore collections:

| Collection | Purpose |
|---|---|
| `tickets` | Vehicle, service, status (`waiting` → `in-bay` → `complete`), parts used, next-service date |
| `bays` | Service bays shown as board columns |
| `technicians` | Who's on the floor |
| `inventoryItems` | Oil grades and filter part numbers, quantity + low-stock threshold |
| `checklists` | Opening/closing lists, one document per day (`YYYY-MM-DD_opening`) |

Types live in [`src/types/index.ts`](src/types/index.ts). Status transitions, next-service dates, inventory decrement, checklist, and summary logic are pure functions in [`src/lib`](src/lib) — that's what the unit tests target.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Firebase config
npm run dev
```

Run the test suite: `npm test` · lint: `npm run lint`

To try it locally, sign in and click **Load demo data** on the empty board — it seeds bays, technicians, a stocked shelf (with one item deliberately low), and cars across every state.

## What I'd build next

- **Role-based views** — manager vs. technician permissions via Firebase custom claims.
- **Customer service reminders** — email when a vehicle's next-service date approaches.
- **Offline-first PWA** — a service worker so the bay tablet survives a Wi-Fi drop.
- **Printable end-of-day report** — a print stylesheet for the day summary.
