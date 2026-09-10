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

## Applying updates to an existing project

If you already ran `schema.sql` before, don't re-run it. Instead, open the
SQL Editor again and run
[`supabase/migration_02_financial_controls_and_work_items.sql`](./supabase/migration_02_financial_controls_and_work_items.sql).
This is additive and safe to run once on top of the original schema. It adds:

- **Per-person financial visibility.** Admins can control, per team
  member, whether they can see budget totals and how much has been spent
  (Settings → Team). Everyone can still log expenses and field notes
  regardless of this setting — masking is enforced in the database itself
  (via a Postgres view), not just hidden in the UI, so it holds even
  against direct API calls.
- **Fully editable projects and budgets.** Admins/managers can now add
  new budget heads at any time, edit or delete existing ones (name,
  description, sanctioned and allocated amounts), and edit core project
  details (name, location, currency, dates) from the project page.
- **Work targets.** Admins/managers set a target quantity for a piece of
  work up front (e.g. "40 borewells"); any team member logs daily
  progress against it, and the project page shows a running total vs.
  target.
- **Budget visualization.** The Reports tab now includes charts —
  budget vs. spent per project, spend by category, and cumulative spend
  over time — visible only to people with financial access.

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

## Deploying — GitHub Pages (fully GitHub-based, no third-party host)

This repo includes a GitHub Actions workflow
([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)) that
automatically builds and deploys the app to GitHub Pages every time you
push to `main`. No Netlify account, no separate hosting service — GitHub
does the whole thing.

**One-time setup, done entirely in your browser on github.com:**

1. **Add your Supabase keys as repository secrets.** In your repo, go to
   **Settings → Secrets and variables → Actions → New repository secret**,
   and add two secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (These are secrets, not the `.env` file — there is no `.env` in the
   repo itself, on purpose. The workflow injects them at build time.)

2. **Turn on Pages with the right source.** Go to **Settings → Pages**,
   and under "Build and deployment", set **Source** to **GitHub Actions**
   (not "Deploy from a branch" — that's the older method and won't use
   the workflow file).

3. **Push something to `main`** (or re-upload a changed file through the
   web UI, which commits to `main` the same way) to trigger the first
   run. Watch it build under the repo's **Actions** tab — it takes about
   a minute.

4. Once it finishes, your live URL appears both in the Actions run's
   summary and under **Settings → Pages**. It'll look like
   `https://yourusername.github.io/field-tracker/`.

Every future update — new features, bug fixes, anything — just means
uploading the changed files to the repo again; the workflow rebuilds and
redeploys automatically. If your default branch isn't called `main` (older
repos sometimes use `master`), edit the `branches: [main]` line near the
top of the workflow file to match.

## Alternative: deploying to Netlify

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
