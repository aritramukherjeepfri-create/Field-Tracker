// Row shapes matching supabase/schema.sql. Kept hand-written (rather than
// `supabase gen types`) so this project has zero dependency on the
// Supabase CLI being installed — copy/paste the schema, copy/paste this
// file, done.

export type UserRole = 'admin' | 'manager' | 'field_officer' | 'viewer';
export type ProjectStatusDB = 'ONGOING' | 'STALLED' | 'NEW' | 'ARCHIVE';
export type PaymentModeDB = 'UPI / DIGITAL' | 'CASH';
export type LogTypeDB = 'note' | 'alert' | 'checkpoint';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | 'quarterly' | null;

export interface OrganizationRow {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  org_id: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  can_view_financials: boolean;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  location: string;
  status: ProjectStatusDB;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProjectMemberRow {
  id: string;
  org_id: string;
  project_id: string;
  profile_id: string | null;
  name: string;
  member_role: string;
  created_at: string;
}

export interface BudgetHeadRow {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  description: string;
  sanctioned: number | null;
  allocated: number | null;
  icon: string;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  org_id: string;
  project_id: string;
  particulars: string;
  category: string;
  amount: number | null;
  currency: string;
  payment_mode: PaymentModeDB;
  paid_by: string;
  paid_by_profile_id: string | null;
  date: string;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FieldLogRow {
  id: string;
  org_id: string;
  project_id: string;
  author: string;
  author_profile_id: string | null;
  log_date: string;
  log_time: string;
  content: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  log_type: LogTypeDB;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TaskRow {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  description: string;
  owner_id: string | null;
  status: TaskStatus;
  due_date: string | null;
  start_date: string | null;
  depends_on: string | null;
  recurrence_rule: RecurrenceRule;
  recurrence_parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  org_id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface WorkItemRow {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  unit: string;
  target_quantity: number;
  created_by: string | null;
  created_at: string;
}

export interface WorkLogRow {
  id: string;
  org_id: string;
  work_item_id: string;
  project_id: string;
  author_id: string | null;
  author_name: string;
  log_date: string;
  quantity: number;
  notes: string;
  created_at: string;
}

// Note: no `Database` wrapper type here — see supabaseClient.ts for why
// the client itself is untyped. These row interfaces are used directly
// at call sites (AppContext, AuthContext, mapRows, seedRemote) to type
// query results and insert payloads by hand instead.
