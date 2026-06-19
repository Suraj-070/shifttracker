# ShiftTracker

Track your work shifts, who you covered for, where, and what you earned.

## Stack

Next.js (App Router) + Supabase (Postgres, via the JS client — not Prisma at
runtime, despite `prisma/schema.prisma` documenting the shape) + NextAuth
(single-account "Continue" login, no real per-person accounts yet).

## Setup

1. `npm install`
2. Run `supabase/migration.sql` against your Supabase project (it creates
   `users` and `shifts` tables with no Row Level Security — see the comment
   at the top of that file for why).
3. Copy `.env.example` → `.env` and fill in your Supabase + NextAuth values.
4. `npm run dev`

There is no seed/demo data step. The first time you open the app it creates
one account row for you automatically and you start from a genuinely empty
shift list.

## PWA / Install as an app

The app ships a manifest, app icons, and a service worker, so phones and
desktops can install it like a native app (Settings → Install App, or the
browser's own "Install" / "Add to Home Screen" option).

What the service worker does and doesn't do:
- Caches the app shell (HTML/JS/CSS/icons) so the app opens instantly and
  shows a friendly offline page if there's no connection.
- Never caches `/api/*` calls. Shift data is always fetched fresh — the
  service worker intentionally does **not** let you view or edit shifts
  while offline, so you never see stale numbers or silently lose an edit.

To test installability locally, run a production build (`npm run build &&
npm run start`) rather than `next dev` — Chrome only reliably fires the
install prompt over a built, served app (or via `localhost`, which dev mode
also satisfies, but a real build is the most faithful test before
deploying).

## Known limitations (not addressed in this pass)

- **Single shared account.** Anyone who opens the deployed URL uses the same
  account/data — there's no real signup or per-person login. Fine for
  private solo use; risky if you share the link.
- **Notification toggles in Settings are inert.** "Weekly earnings reminder"
  and "Shift payment reminder" save a preference but nothing currently
  reads it or sends anything.
