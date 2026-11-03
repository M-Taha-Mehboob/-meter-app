# My Meters

Meter reading tracker (Bijli, Gas, Pani). Enter the opening reading from the bill, note the meter whenever you can, and see units used this month, the daily average, where the month is heading, and an alert before it crosses your limit. Installable PWA for Android, iOS and desktop. Offline-first, synced to Supabase.

Built like My Expenses (`D:\Projects\ExpenseApp`), and it uses the **same Supabase project**, so the same email and password work in both apps.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4, React Router
- vite-plugin-pwa (manifest + auto-updating service worker)
- Dexie (IndexedDB) for offline storage, synced to Supabase (Postgres + Auth + RLS + Storage)
- Recharts for the charts

## Data model

| Table | Purpose | Key columns |
|---|---|---|
| `meter_categories` | Bijli, Gas, Pani... | `name`, `icon`, `unit`, `sort_order` |
| `meter_meters` | A meter with the user's own name | `category_id`, `name`, `alert_limit`, `is_active` |
| `meter_cycles` | One billing month, started from the bill | `meter_id`, `start_date`, `end_date` (next bill date), `opening_reading` |
| `meter_readings` | A reading noted during a month | `meter_id`, `cycle_id`, `reading`, `taken_at`, `note`, `photo_path` |

Every table also has `id` (uuid, generated on the client), `user_id`, `created_at`, `updated_at`, `deleted_at` (soft delete). Photos live in the private Storage bucket `meter-photos` under `<user_id>/`.

Computed, never stored (`src/lib/cycle.ts`):

- **Used** = last reading - opening reading
- **Per day** = used / days from the start of the month to the last reading
- **Heading for** = used + per day x days left until the next bill date
- **Status**: crossed when used >= limit, heading over when the estimate > limit
- A finished month counts from its opening to the next month's opening (the units the bill shows)

Schema: [supabase/migrations/001_meter_init.sql](supabase/migrations/001_meter_init.sql)

## Setup

1. Install Node 22+ and run `npm install`.
2. In the **My Expenses** Supabase project, run `supabase/migrations/001_meter_init.sql` in the SQL Editor. It only adds `meter_*` tables and the `meter-photos` bucket; the expense tables are untouched.
3. Copy `.env.example` to `.env.local` and fill in the same two values as in My Expenses' `.env.local`.

Without keys, `npm run dev` shows a **Try the demo** button on the login page: a local demo user whose data stays in that browser (dev only, never in a production build).

## Commands

```bash
npm run dev       # dev server at http://localhost:5174 (5173 is My Expenses)
npm run build     # type-check + production build to dist/
npm run preview   # serve dist/ at http://localhost:4174 (test the service worker / install here)
npm run lint      # oxlint
```

Icons: `npm i --no-save sharp && node scripts/make-icons.cjs public`

## Deploy (Cloudflare Pages)

Same as My Expenses, as a separate Pages project:

- Framework preset **None**, build command `npm run build`, output directory `dist`.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=24`.
- Add the new pages.dev URL to Supabase -> Authentication -> URL Configuration -> Redirect URLs (the Site URL stays My Expenses').

## Roadmap

1. Categories, meters, monthly opening, readings, limit alerts, charts, monthly summary, photos (done)
2. Daily reminder at a time each user picks (web push: needs a Supabase Edge Function, a cron job and VAPID keys; on iPhone only when the app is installed to the home screen)
3. Cloudflare Pages deploy + phone install
