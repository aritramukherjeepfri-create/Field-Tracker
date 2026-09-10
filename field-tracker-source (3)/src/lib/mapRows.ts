import type {
  ProjectRow, ProjectMemberRow, BudgetHeadRow, ExpenseRow, FieldLogRow, TaskRow, ProfileRow,
  WorkItemRow, WorkLogRow,
} from './database.types';
import type { Project, TeamMember, BudgetHead, Expense, FieldLog, Task, WorkItem, WorkLog } from '../types';
import { recomputeProject } from './projectStats';

export function mapProject(
  row: ProjectRow,
  members: ProjectMemberRow[],
  heads: BudgetHeadRow[],
  expenses: ExpenseRow[],
  logs: FieldLogRow[],
  tasks: TaskRow[],
  workItemRows: WorkItemRow[],
  workLogRows: WorkLogRow[],
  profilesById: Map<string, ProfileRow>
): Project {
  const team: TeamMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.member_role,
    avatar: m.profile_id ? profilesById.get(m.profile_id)?.avatar_url ?? undefined : undefined,
  }));

  // sanctioned/allocated come back `null` from budget_heads_secure when
  // this viewer isn't allowed to see financials — pass that through
  // as-is rather than coercing to 0, so recomputeProject can tell the
  // difference between "genuinely zero budget" and "hidden from you".
  const budgetHeads: BudgetHead[] = heads.map((h) => ({
    id: h.id,
    name: h.name,
    description: h.description,
    sanctioned: h.sanctioned,
    allocated: h.allocated,
    spent: 0, // recomputed below
    status: 'PENDING',
    icon: h.icon,
  }));

  const mappedExpenses: Expense[] = expenses.map((e) => ({
    id: e.id,
    projectId: e.project_id,
    projectName: row.name,
    particulars: e.particulars,
    category: e.category,
    amount: e.amount,
    currency: e.currency,
    paymentMode: e.payment_mode,
    paidBy: e.paid_by,
    date: e.date,
    receiptImage: e.receipt_url ?? undefined,
  }));

  const mappedLogs: FieldLog[] = logs.map((l) => ({
    id: l.id,
    projectId: l.project_id,
    projectName: row.name,
    author: l.author,
    timestamp: l.log_time,
    date: l.log_date,
    content: l.content,
    attachments: l.attachment_url ? [l.attachment_url] : undefined,
    location: l.location ?? undefined,
    type: l.log_type,
  }));

  const mappedTasks: Task[] = tasks.map((t) => ({
    id: t.id,
    projectId: t.project_id,
    projectName: row.name,
    title: t.title,
    description: t.description,
    ownerId: t.owner_id,
    ownerName: t.owner_id ? profilesById.get(t.owner_id)?.name ?? null : null,
    status: t.status,
    dueDate: t.due_date,
    startDate: t.start_date,
    dependsOn: t.depends_on,
    recurrenceRule: t.recurrence_rule,
    createdAt: t.created_at,
  }));

  const workLogsByItem = new Map<string, WorkLogRow[]>();
  for (const wl of workLogRows) {
    const list = workLogsByItem.get(wl.work_item_id);
    if (list) list.push(wl);
    else workLogsByItem.set(wl.work_item_id, [wl]);
  }

  const mappedWorkItems: WorkItem[] = workItemRows.map((wi) => {
    const itemLogs = (workLogsByItem.get(wi.id) ?? []).map((wl): WorkLog => ({
      id: wl.id,
      workItemId: wl.work_item_id,
      authorId: wl.author_id,
      authorName: wl.author_name,
      date: wl.log_date,
      quantity: Number(wl.quantity),
      notes: wl.notes,
    }));
    return {
      id: wi.id,
      projectId: wi.project_id,
      projectName: row.name,
      title: wi.title,
      unit: wi.unit,
      targetQuantity: Number(wi.target_quantity),
      logs: itemLogs.sort((a, b) => b.date.localeCompare(a.date)),
      totalLogged: itemLogs.reduce((sum, l) => sum + l.quantity, 0),
    };
  });

  return recomputeProject({
    id: row.id,
    name: row.name,
    location: row.location,
    status: row.status,
    currency: row.currency,
    budgetTotal: 0,
    budgetSpent: 0,
    efficiency: 0,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    lastLogTime: '',
    team,
    budgetHeads,
    logs: mappedLogs,
    expenses: mappedExpenses,
    tasks: mappedTasks,
    workItems: mappedWorkItems,
  });
}
