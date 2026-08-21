-- ============================================================================
-- Field Tracker — Supabase schema
-- ============================================================================
-- Run this once in your Supabase project's SQL Editor (or via the CLI:
-- `supabase db push` after adding it to a migrations folder).
--
-- This sets up:
--   1. Organizations + user profiles (roles: admin / manager / field_officer / viewer)
--   2. Projects, budget heads, expenses, field logs, project members
--   3. Tasks (with owner, due date, status, dependency, recurrence)
--   4. Notifications (auto-created when a task is assigned)
--   5. Row-Level Security so every table is scoped to the caller's org,
--      with role-based write restrictions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Organizations & profiles
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'manager', 'field_officer', 'viewer')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Helper functions used throughout RLS policies below. SECURITY DEFINER +
-- a fixed search_path so they can read `profiles` regardless of the
-- calling role's own RLS visibility, without being injectable.
create or replace function public.current_org_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql security definer stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Auto-create a profile whenever a new auth user signs up. Reads
-- `org_name` / `invite_code` / `display_name` out of the signup call's
-- user_metadata (see src/lib/auth.ts). Exactly one of org_name /
-- invite_code should be supplied by the client.
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
    insert into public.profiles (id, org_id, name, role)
    values (new.id, v_org_id, v_display_name, 'field_officer');
  else
    insert into public.organizations (name) values (coalesce(v_org_name, 'My Organization'))
    returning id into v_org_id;
    insert into public.profiles (id, org_id, name, role)
    values (new.id, v_org_id, v_display_name, 'admin');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Projects & related records
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  location text not null default '',
  status text not null default 'NEW' check (status in ('ONGOING', 'STALLED', 'NEW', 'ARCHIVE')),
  currency text not null default '₹',
  start_date date,
  end_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  member_role text not null default 'Team Member',
  created_at timestamptz not null default now()
);

create table public.budget_heads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text not null default '',
  sanctioned numeric not null default 0,
  allocated numeric not null default 0,
  icon text not null default 'category',
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  particulars text not null,
  category text not null default '',
  amount numeric not null,
  currency text not null default '₹',
  payment_mode text not null default 'UPI / DIGITAL' check (payment_mode in ('UPI / DIGITAL', 'CASH')),
  paid_by text not null,
  paid_by_profile_id uuid references public.profiles(id),
  date date not null default current_date,
  receipt_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.field_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  author text not null,
  author_profile_id uuid references public.profiles(id),
  log_date date not null default current_date,
  log_time text not null default to_char(now(), 'HH24:MI'),
  content text not null,
  location text,
  lat double precision,
  lng double precision,
  log_type text not null default 'note' check (log_type in ('note', 'alert', 'checkpoint')),
  attachment_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Tasks (owners, due dates, status, dependency, recurrence)
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  owner_id uuid references public.profiles(id),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'blocked')),
  due_date date,
  start_date date,
  depends_on uuid references public.tasks(id) on delete set null,
  recurrence_rule text check (recurrence_rule in (null, 'daily', 'weekly', 'monthly', 'quarterly')),
  recurrence_parent_id uuid references public.tasks(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Notify the new owner whenever a task is created with an owner, or an
-- existing task's owner changes. Skips self-assignment (no need to notify
-- yourself) and skips when owner is cleared.
create or replace function public.notify_task_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null
     and new.owner_id <> auth.uid()
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then
    insert into public.notifications (org_id, recipient_id, type, title, body, payload)
    values (
      new.org_id,
      new.owner_id,
      'task_assigned',
      'New task assigned to you',
      new.title,
      jsonb_build_object('task_id', new.id, 'project_id', new.project_id)
    );
  end if;
  return new;
end;
$$;

create trigger tasks_notify_assignment
  after insert or update of owner_id on public.tasks
  for each row execute procedure public.notify_task_assignment();

-- ---------------------------------------------------------------------------
-- 5. Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.budget_heads enable row level security;
alter table public.expenses enable row level security;
alter table public.field_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

-- Organizations: visible to your own org only. Creation happens via the
-- SECURITY DEFINER trigger above, not directly by clients.
create policy "org: select own" on public.organizations
  for select using (id = public.current_org_id());

-- Profiles: everyone in an org can see each other (needed for assigning
-- tasks, showing team lists, avatars). Only admins can change roles;
-- anyone can update their own name/avatar.
create policy "profiles: select same org" on public.profiles
  for select using (org_id = public.current_org_id());

create policy "profiles: update self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: admin manages roles" on public.profiles
  for update using (org_id = public.current_org_id() and public.current_role() = 'admin');

-- Projects: readable by whole org. Only admin/manager can create, edit,
-- or delete.
create policy "projects: select same org" on public.projects
  for select using (org_id = public.current_org_id());

create policy "projects: write admin/manager" on public.projects
  for all using (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'))
  with check (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

-- Project members: readable by org; writable by admin/manager.
create policy "members: select same org" on public.project_members
  for select using (org_id = public.current_org_id());

create policy "members: write admin/manager" on public.project_members
  for all using (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'))
  with check (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

-- Budget heads: readable by org; writable by admin/manager only (field
-- staff shouldn't be able to reallocate budgets).
create policy "budget_heads: select same org" on public.budget_heads
  for select using (org_id = public.current_org_id());

create policy "budget_heads: write admin/manager" on public.budget_heads
  for all using (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'))
  with check (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

-- Expenses: readable by org; any non-viewer can log an expense; only
-- admin/manager can edit or delete one after the fact.
create policy "expenses: select same org" on public.expenses
  for select using (org_id = public.current_org_id());

create policy "expenses: insert non-viewer" on public.expenses
  for insert with check (org_id = public.current_org_id() and public.current_role() <> 'viewer');

create policy "expenses: modify admin/manager" on public.expenses
  for update using (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

create policy "expenses: delete admin/manager" on public.expenses
  for delete using (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

-- Field logs: readable by org; any non-viewer can add one; authors and
-- admins/managers can edit or delete.
create policy "field_logs: select same org" on public.field_logs
  for select using (org_id = public.current_org_id());

create policy "field_logs: insert non-viewer" on public.field_logs
  for insert with check (org_id = public.current_org_id() and public.current_role() <> 'viewer');

create policy "field_logs: modify own or admin" on public.field_logs
  for update using (
    org_id = public.current_org_id()
    and (created_by = auth.uid() or public.current_role() in ('admin', 'manager'))
  );

create policy "field_logs: delete own or admin" on public.field_logs
  for delete using (
    org_id = public.current_org_id()
    and (created_by = auth.uid() or public.current_role() in ('admin', 'manager'))
  );

-- Tasks: readable by org. Admin/manager can create/delete any task.
-- The assigned owner can update their own task's status/notes even if
-- they aren't a manager (that's the whole point of assigning it to them).
create policy "tasks: select same org" on public.tasks
  for select using (org_id = public.current_org_id());

create policy "tasks: insert admin/manager" on public.tasks
  for insert with check (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

create policy "tasks: update owner or admin" on public.tasks
  for update using (
    org_id = public.current_org_id()
    and (owner_id = auth.uid() or public.current_role() in ('admin', 'manager'))
  );

create policy "tasks: delete admin/manager" on public.tasks
  for delete using (org_id = public.current_org_id() and public.current_role() in ('admin', 'manager'));

-- Notifications: strictly private to the recipient.
create policy "notifications: select own" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "notifications: update own (mark read)" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Realtime
-- ---------------------------------------------------------------------------
-- Enable realtime so the notification bell and shared boards update live.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.field_logs;
alter publication supabase_realtime add table public.expenses;

-- ---------------------------------------------------------------------------
-- 7. Storage buckets (receipt photos, field log attachments, avatars)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true)
  on conflict (id) do nothing;

create policy "attachments: org members can upload"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

create policy "attachments: public read"
  on storage.objects for select
  using (bucket_id = 'attachments');
