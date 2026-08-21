# Field Tracker

A project management app for NGO field teams — projects, budgets, tasks,
field logs, and expenses — backed by a real multi-user Supabase backend
with role-based access control.

## Tech stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4 (CSS-first config via `@theme` in `src/index.css` — no
  `tailwind.config.js`)
- **Supabase** — Postgres database, authentication, Row-Level Security,
  and realtime notifications
- Material Symbols icons, pre-extracted as inline SVG (see
  `scripts/gen-icons.mjs`) — no icon font, no runtime font loading
- Inter font, self-hosted via `@fontsource/inter`

## Setting up your Supabase backend (one-time)

1. Create a free project at [supabase.com](https://supabase.com).
2. In your new project, open the **SQL Editor** and run the entire
   contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates
   every table, the roles system, Row-Level Security policies, and the
   trigger that sends a notification when a task is assigned.
3. In **Project Settings → API**, copy your **Project URL** and **anon
   public** key.
4. Copy `.env.example` to `.env` and fill in those two values:

   ```bash
   cp .env.example .env
   ```

5. Restart the dev server (or redeploy) so the new env vars are picked up.

If these env vars aren't set, the app shows a setup screen with these same
instructions instead of crashing — so it's safe to deploy before this step
is done.

### Roles

Every person who signs up either **creates a new organization** (becomes
`admin`) or **joins one with an invite code** (becomes `field_officer` by
default). Admins can change anyone's role afterward in **Settings → Team**:

| Role | Can do |
|---|---|
| `admin` | Everything, including changing other people's roles |
| `manager` | Create/edit projects, budgets, tasks; everything a field officer can do |
| `field_officer` | Log expenses and field notes, update tasks assigned to them |
| `viewer` | Read-only — for donors or oversight staff |

The invite code for your organization is on the Settings page for any
admin — share it with new team members so they can join instead of
creating a duplicate organization.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Runs `tsc -b` (type check) then `vite build`. Output goes to `dist/`.

```bash
npm run preview
```

## Adding or changing icons

Icons are extracted at build time from `@material-symbols/svg-400` into
`src/lib/icon-data.ts`. To add one not already included, add its name to
the `ICONS` array in `scripts/gen-icons.mjs` and re-run:

```bash
node scripts/gen-icons.mjs
```

## Deploying to Netlify

`netlify.toml` is already configured (build command, publish directory,
SPA redirect). In the Netlify dashboard, when you import this repo, also
add your two `VITE_SUPABASE_*` values under **Site settings → Environment
variables** — they won't carry over from your local `.env` automatically.

## A note on the Supabase client's TypeScript types

`src/lib/supabaseClient.ts` deliberately does **not** pass a `Database`
generic to `createClient()`. Hand-written schema generics fight
postgrest-js's type inference in ways that aren't worth chasing by hand
(you'll see this show up as query results silently typed `never`). Instead,
the real row shapes live in `src/lib/database.types.ts` and are applied
explicitly at each call site (see `AppContext.tsx`, `AuthContext.tsx`).

If you'd rather have fully inferred, compile-time-checked queries, install
the Supabase CLI and run:

```bash
supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts
```

then pass it back into the client as `createClient<Database>(...)`.

## What's next

This build covers accounts/roles, projects, budgets, expenses, field logs,
and tasks (with owners, due dates, dependencies, recurrence, and
notifications). Not yet built: a Leaflet map view for project/log
locations, seasonal-calendar awareness, compliance/permit tracking, and
offline-first sync. These are frontend-layer additions on top of this
backend and don't require further schema changes to get started.

## Notes on optional dependencies

`@google/genai` is **not** included. Nothing in the app currently calls it.
If a future AI feature needs it, proxy calls through a server-side function
(e.g. a Supabase Edge Function) rather than calling it from the browser
with an exposed key.
