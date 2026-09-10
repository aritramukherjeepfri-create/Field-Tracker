import type { Project, BudgetHead } from '../types';

/**
 * Recomputes every derived field on a project from its real
 * sub-records (budget heads, expenses, logs, team). Nothing here is
 * ever a fallback placeholder — a project with zero budget heads
 * correctly ends up with budgetTotal: 0.
 *
 * Financial masking: when the database has redacted budget-head
 * amounts for this viewer (see budget_heads_secure in the Supabase
 * schema — sanctioned comes back `null` for anyone without
 * can_view_financials), every aggregate figure derived from it
 * (budgetTotal, budgetSpent, per-head spent, efficiency) is set to
 * `null` too, rather than silently computing a wrong/partial number.
 * Individual expense rows the viewer is allowed to see (e.g. their
 * own entries) keep their real amount for the ledger display — only
 * the aggregates are suppressed.
 */
export function recomputeProject(project: Project): Project {
  const financialsHidden = project.budgetHeads.some((h) => h.sanctioned === null);

  const budgetTotal = financialsHidden
    ? null
    : project.budgetHeads.reduce((sum, h) => sum + (h.sanctioned ?? 0), 0);

  const budgetSpent = financialsHidden
    ? null
    : project.expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const budgetHeads: BudgetHead[] = project.budgetHeads.map((head) => {
    if (financialsHidden) {
      return { ...head, spent: null, allocated: null, status: 'HIDDEN' };
    }
    const spent = project.expenses
      .filter((e) => e.category === head.name)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const allocated = head.allocated ?? head.sanctioned ?? 0;
    let status: BudgetHead['status'] = 'PENDING';
    if (spent > allocated && allocated > 0) status = 'OVERLIMIT';
    else if (allocated > 0) status = 'SANCTIONED';
    return { ...head, spent, allocated, status };
  });

  const efficiency = financialsHidden
    ? null
    : budgetTotal! > 0
    ? Math.round(Math.max(0, Math.min(100, 100 - ((budgetSpent ?? 0) / budgetTotal!) * 100)))
    : 0;

  const lastLogTime = [...project.logs]
    .sort((a, b) => `${b.date}T${b.timestamp}`.localeCompare(`${a.date}T${a.timestamp}`))[0]?.timestamp
    ?? project.lastLogTime
    ?? '';

  const mostRecentLog = [...project.logs]
    .sort((a, b) => `${b.date}T${b.timestamp}`.localeCompare(`${a.date}T${a.timestamp}`))[0];

  return {
    ...project,
    budgetHeads,
    budgetTotal,
    budgetSpent,
    efficiency,
    lastLogTime,
    recentActivity: mostRecentLog?.content,
  };
}

export function formatCurrency(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${currency}${formatted}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function addMonthsISO(dateISO: string, months: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function nowTimeHHMM(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}
