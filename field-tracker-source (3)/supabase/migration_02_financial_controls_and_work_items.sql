-- ============================================================================
-- Field Tracker — Migration 02
-- ============================================================================
-- Run this in your Supabase SQL Editor AFTER schema.sql has already been
-- applied. This is additive — it does not touch or re-create anything
-- from the original schema.
--
-- Adds:
--   1. Per-person, admin-controlled financial visibility (hides budget
--      totals / spend from anyone the admin hasn't explicitly allowed,
--      enforced in Postgres — not just hidden in the UI).
--   2. Two secure views (budget_heads_secure, expenses_secure) that the
--      app now reads from instead of the raw tables.
--   3. Work items + work logs: admin/manager sets a target quantity for
--      a piece of work up front; team members log daily progress
--      against it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Per-person financial visibility
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column can_view_financials boolean not null default false;

-- Reasonable default on upgrade: don't lock existing admins/managers out
-- of numbers they could already see yesterday. Field officers/viewers
-- stay masked until an admin explicitly turns this on for them.
update public.profiles set can_view_financials = true where role in ('admin', 'manager');

create or replace function public.can_view_financials()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((select can_view_financials from public.profiles where id = auth.uid()), false)
$$;

-- New org creators (admins) start able to see financials; people who
-- join via invite code start masked, same as their default role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_invite_code text := new.raw_user_meta_data ->> 'invite_code';
  v_org_name text := new.raw_user_meta_data ->> 'org_name';
  v_display_name text := coalesce(new.raw_user_meta_data ->> 'display_name', new.email);
begin
  if v_invite_code is not null then
    select id into v_org_id from public.organizations where invite_code = v_invite_code;
    if v_org_id is null then
      raise exception 'Invalid invite code';
    end if;
    insert into public.profiles (id, org_id, name, role, can_view_financials)
    values (new.id, v_org_id, v_display_name, 'field_officer', false);
  else
    insert into public.organizations (name) values (coalesce(v_org_name, 'My Organization'))
    returning id into v_org_id;
    insert into public.profiles (id, org_id, name, role, can_view_financials)
    values (new.id, v_org_id, v_display_name, 'admin', true);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Secure (masked) views for budget heads and expenses
-- ---------------------------------------------------------------------------
-- Deliberately NOT `security_invoker` — these run with the view owner's
-- privileges (the classic Postgres column-masking pattern), which is why
-- the org-scoping filter is written explicitly in the WHERE clause below
-- instead of relying on the base table's RLS. The masking itself
-- (the CASE WHEN) is what makes this different from just hiding a
-- number in the UI: a field officer calling the API directly gets the
-- same masked result, because they never touch the underlying columns.

create view public.budget_heads_secure as
select
  id,
  org_id,
  project_id,
  name,
  description,
  icon,
  created_at,
  case when public.can_view_financials() then sanctioned else null end as sanctioned,
  case when public.can_view_financials() then allocated else null end as allocated
from public.budget_heads
where org_id = public.current_org_id();

grant select on public.budget_heads_secure to authenticated;

create view public.expenses_secure as
select
  id,
  org_id,
  project_id,
  particulars,
  category,
  currency,
  payment_mode,
  paid_by,
  paid_by_profile_id,
  date,
  receipt_url,
  created_by,
  created_at,
  -- You can always see the amount on an expense YOU logged — this hides
  -- the team's total spend from you, not what you personally typed in.
  case when public.can_view_financials() or created_by = auth.uid() then amount else null end as amount
from public.expenses
where org_id = public.current_org_id();

grant select on public.expenses_secure to authenticated;

-- Block direct reads of the raw tables so the views above can't be
-- bypassed by querying the table directly. Write policies (insert /
-- update / delete) are untouched — logging an expense or editing a
-- budget head still works exactly as before, only direct SELECT is
-- removed. The app now reads through *_secure instead.
drop policy "budget_heads: select same org" on public.budget_heads;
drop policy "expenses: select same org" on public.expenses;

-- ---------------------------------------------------------------------------
-- 3. Work items (targets) and work logs (daily progress)
-- ---------------------------------------------------------------------------

create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  unit text not null default 'units',
  target_quantity numeric not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id),
  author_name text not null,
  log_date date not null default current_date,
  quantity numeric not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.work_items enable row level security;
alter table public.work_logs enable row level security;

-- Work items (the target-setting) are readable by the whole org so
-- everyone knows what they're working toward; only admin/manager set
-- or change the target itself.
create policy "work_items: select same org" on public.work_items
  for select using (org_id = public.current_org_id());

create policy "work_items: write admin/manager" on public.work_items
  for all using (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'))
  with check (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

-- Work logs (daily progress entries) are readable by the whole org.
-- Any non-viewer can log their own progress; authors and admins/managers
-- can edit or delete an entry afterward.
create policy "work_logs: select same org" on public.work_logs
  for select using (org_id = public.current_org_id());

create policy "work_logs: insert non-viewer" on public.work_logs
  for insert with check (org_id = public.current_org_id() and public.current_role() <> 'viewer');

create policy "work_logs: modify own or admin" on public.work_logs
  for update using (
    org_id = public.current_org_id()
    and (author_id = auth.uid() or public.current_role() in ('admin', 'manager'))
  );

create policy "work_logs: delete own or admin" on public.work_logs
  for delete using (
    org_id = public.current_org_id()
    and (author_id = auth.uid() or public.current_role() in ('admin', 'manager'))
  );

alter publication supabase_realtime add table public.work_logs;
