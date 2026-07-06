# BayBoard

Quick-lube shops run on whiteboards, sticky notes, and the manager's memory. I managed one for seven years — BayBoard is the shop-floor board I wish I had: a real-time dashboard showing what's waiting, what's in each bay, how long it's been running, and whether we're about to run out of the parts the next car needs.

<!-- Demo GIF and live link go here (week 6) -->

## Features (MVP)

- **Live Bay Board** — waiting queue + one column per bay; ticket moves sync instantly across every connected device via Firestore real-time listeners.
- **Ticket lifecycle** — vehicle, service, technician; elapsed-time badges shift colour as a service runs long.
- **Inventory** — completing a ticket decrements the parts it used; crossing a low-stock threshold raises an alert on the board.
- **Checklists** — opening/closing procedures that reset daily, each item time-stamped.
- **Day summary** — cars served, average bay time, services by type.

## Stack

- **Next.js (App Router) + TypeScript** — ticket status modelled as a discriminated union so invalid states can't be represented.
- **Tailwind CSS** — dense, glanceable board layout.
- **Firebase Auth + Firestore** — real-time sync out of the box; a generic typed converter keeps documents fully typed.
- **Jest + React Testing Library** — unit tests for status transitions, next-service dates, and inventory logic; RTL flow tests for the board.
- **GitHub Actions + Vercel** — lint and tests on every push.

## Data model

Firestore collections:

| Collection | Purpose |
|---|---|
| `tickets` | Vehicle, service, status (`waiting` → `in-bay` → `complete`), parts used, next-service date |
| `bays` | Service bays shown as board columns |
| `technicians` | Who's on the floor |
| `inventoryItems` | Oil grades and filter part numbers, quantity + low-stock threshold |
| `checklists` | Opening/closing lists, one per day |

Types live in [`src/types/index.ts`](src/types/index.ts). Status transitions, next-service date calculation, and inventory decrement logic are pure functions in [`src/lib/ticket-logic.ts`](src/lib/ticket-logic.ts).

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Firebase config
npm run dev
```

Run tests: `npm test`

## Roadmap

Week-by-week plan: live board → ticket lifecycle → inventory → testing & accessibility (15+ unit tests, 5+ flow tests, Lighthouse a11y ≥ 95) → checklists, day summary, polish.
