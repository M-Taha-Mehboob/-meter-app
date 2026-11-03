# CLAUDE.md

Meter reading tracker PWA (Bijli / Gas / Pani). Sister app of My Expenses (`D:\Projects\ExpenseApp`): same stack, same look, same Supabase project and login. See README.md for stack, data model and commands.

## Working with the user
- Talk in Roman Urdu, the way the user writes. They are a C#/.NET developer (ASP.NET ERP background).
- They prefer answering questions in chat, not multiple-choice prompts.
- They run SQL themselves in the Supabase SQL Editor: write migrations, never run them against a database.
- Never ask for keys in chat; they edit `.env.local` themselves. Never commit `.env*.local`.
- Ask before creating a GitHub repo, pushing, or deploying.

## Architecture rules
- Shared Supabase project with My Expenses: every table, policy, index and trigger is prefixed `meter_`; the Storage bucket is `meter-photos`. Never touch the expense tables.
- Offline-first: the UI reads/writes Dexie (IndexedDB); a sync layer pushes/pulls Supabase. Entry must work with no network.
- IDs are uuids generated on the client (`crypto.randomUUID()`).
- Deletes are soft (`deleted_at`) so they sync. Incremental pulls use `updated_at > lastPulledAt` (server sets `updated_at` via trigger on insert and update).
- Units used, per day, the estimate and the limit status are computed in `src/lib/cycle.ts`, never stored. The opening reading of each month is typed by the user from the bill (no carry-forward).
- A reading belongs to the meter's current cycle (latest `start_date`) and must lie between its neighbours. The bill comes days after its reading date, so starting a new month moves readings dated on or after its start into it (`startCycle`).
- Data is per user (RLS `auth.uid() = user_id`; photos under `<user_id>/` in Storage).
- Look: deliberately different from My Expenses. Numbers that matter sit on the dark "meter display" panel (`.lcd-panel` / `lcdClass`, dark in both modes) with glowing segment digits (`.lcd-digits`, Share Tech Mono). Dials are `RingGauge` (270 degrees: used, faint estimate arc, limit tick). Each category has its own colour (`categoryColor` in `src/lib/category.ts`: Bijli amber, Gas flame blue, Pani cyan). Accent amber by default (amber / cyan / violet / rose in Settings). UI font Outfit.
- Styling: only semantic theme tokens from `src/index.css`, never raw Tailwind palette colours. Chart colours via `src/components/charts/theme.ts` (accent = units, faded accent = spread-out days / month so far, rose = limit). Icons from `lucide-react`.
- Theme keys in localStorage: `my-meters:theme`, `my-meters:last-user`, sync cursors `my-meters:<uid>:pulled:<table>`. Dexie DB `my-meters-<userId>`.
- Dev server port 5174 (strict; 5173 belongs to My Expenses).

## Layout
- `src/pages/*` one component per route: `/` Home, `/meter/:id` Meter, `/summary` Summary (`?meter=`), `/meters` Meters (categories + meters), `/login`.
- Auth: `src/auth/*` copied from My Expenses (email/password, invite-only, set/change/reset password, offline fallback). Dev-only demo user when Supabase keys are missing (`startDemo`).
- Local data: `src/db/schema.ts`, `src/db/repo.ts` (ALL writes go here), `src/db/hooks.ts` (`useMeterViews`, `useMeterView`, `useCycleHistory`).
- Photos: `src/lib/photo.ts` (compress to 1280px JPEG, `usePhotoUrl` caches downloads in Dexie `photos`). Sync uploads queued photos before pushing rows and removes deleted ones after.
- Sync: `src/sync/sync.ts`, `SyncProvider.tsx`, `SyncBadge` in the header (same design as My Expenses).
- Reading flow: `ReadingFlow` = `ReadingForm` then `AlertSheet` when the month crossed or is heading past the limit.

## Check before finishing
`npm run build` (runs `tsc -b`) and `npm run lint` must pass.
