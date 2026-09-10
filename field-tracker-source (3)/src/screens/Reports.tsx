import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/StatusBadge';
import { FloatingSelect } from '../components/FloatingInput';
import { formatCurrency, formatDate } from '../lib/projectStats';
import { downloadCSV, printAsPDF } from '../lib/csv';

const CHART_COLORS = {
  budget: '#8fb3e0',
  spent: '#00478d',
  overBudget: '#ba1a1a',
  line: '#006e06',
  grid: '#e5e2e1',
  text: '#727783',
};

export function Reports() {
  const { projects, canViewFinancials } = useApp();
  const [scopeId, setScopeId] = useState<string>('all');

  const scopedProjects = scopeId === 'all' ? projects : projects.filter((p) => p.id === scopeId);

  const totals = useMemo(() => {
    const budgetTotal = scopedProjects.reduce((s, p) => s + (p.budgetTotal ?? 0), 0);
    const budgetSpent = scopedProjects.reduce((s, p) => s + (p.budgetSpent ?? 0), 0);
    const teamCount = new Set(scopedProjects.flatMap((p) => p.team.map((m) => m.name))).size;
    const logCount = scopedProjects.reduce((s, p) => s + p.logs.length, 0);
    const expenseCount = scopedProjects.reduce((s, p) => s + p.expenses.length, 0);
    const utilization = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0;
    return { budgetTotal, budgetSpent, teamCount, logCount, expenseCount, utilization };
  }, [scopedProjects]);

  const budgetVsSpentData = useMemo(
    () => scopedProjects.map((p) => ({
      name: p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name,
      Budget: p.budgetTotal ?? 0,
      Spent: p.budgetSpent ?? 0,
    })),
    [scopedProjects]
  );

  const categorySpendData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const p of scopedProjects) {
      for (const e of p.expenses) {
        if (e.amount === null) continue;
        byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
      }
    }
    return [...byCategory.entries()]
      .map(([name, Spent]) => ({ name: name.length > 16 ? `${name.slice(0, 15)}…` : name, Spent }))
      .sort((a, b) => b.Spent - a.Spent)
      .slice(0, 8);
  }, [scopedProjects]);

  const cumulativeSpendData = useMemo(() => {
    const allExpenses = scopedProjects
      .flatMap((p) => p.expenses)
      .filter((e) => e.amount !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const byDate = new Map<string, number>();
    for (const e of allExpenses) {
      running += e.amount ?? 0;
      byDate.set(e.date, running);
    }
    return [...byDate.entries()].map(([date, Cumulative]) => ({ date: formatDate(date), Cumulative }));
  }, [scopedProjects]);

  function exportCSV() {
    downloadCSV('field_tracker_summary.csv', [
      ['Project', 'Status', 'Location', 'Currency', 'Budget Total', 'Budget Spent', 'Utilization %', 'Team Size', 'Logs', 'Expenses'],
      ...scopedProjects.map((p) => [
        p.name,
        p.status,
        p.location,
        p.currency,
        p.budgetTotal ?? 'hidden',
        p.budgetSpent ?? 'hidden',
        p.budgetTotal && p.budgetTotal > 0 ? Math.round(((p.budgetSpent ?? 0) / p.budgetTotal) * 100) : 0,
        p.team.length,
        p.logs.length,
        p.expenses.length,
      ]),
    ]);
  }

  function exportPDF() {
    const html = `
      <h1>Field Tracker — Summary Report</h1>
      <p>${scopeId === 'all' ? 'All projects' : scopedProjects[0]?.name}</p>
      <table>
        <thead>
          <tr><th>Project</th><th>Status</th><th>Budget</th><th>Spent</th><th>Utilization</th><th>Team</th><th>Logs</th><th>Expenses</th></tr>
        </thead>
        <tbody>
          ${scopedProjects.map((p) => `
            <tr>
              <td>${p.name}</td>
              <td>${p.status}</td>
              <td>${p.budgetTotal !== null ? formatCurrency(p.budgetTotal, p.currency) : 'Hidden'}</td>
              <td>${p.budgetSpent !== null ? formatCurrency(p.budgetSpent, p.currency) : 'Hidden'}</td>
              <td>${p.budgetTotal && p.budgetTotal > 0 ? Math.round(((p.budgetSpent ?? 0) / p.budgetTotal) * 100) : 0}%</td>
              <td>${p.team.length}</td>
              <td>${p.logs.length}</td>
              <td>${p.expenses.length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    printAsPDF('Field Tracker — Summary Report', html);
  }

  if (projects.length === 0) {
    return (
      <div className="px-md py-lg">
        <EmptyState
          icon="summarize"
          title="No data to summarize yet"
          description="Once you have projects with budgets, logs, or expenses, their rollups will appear here."
        />
      </div>
    );
  }

  return (
    <div className="px-md py-lg flex flex-col gap-xl pb-2xl">
      <section className="flex flex-col gap-sm">
        <FloatingSelect label="Scope" value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FloatingSelect>

        <div className="grid grid-cols-2 gap-sm">
          {canViewFinancials ? (
            <>
              <StatCard label="Budget Utilization" value={`${totals.utilization}%`} icon="trending_up" />
              <StatCard label="Total Spent" value={formatCurrency(totals.budgetSpent, scopedProjects[0]?.currency ?? '₹')} icon="payments" />
            </>
          ) : (
            <div className="col-span-2 rounded-xl bg-surface-container-low p-md flex items-center gap-sm text-on-surface-variant">
              <Icon name="warning" size={18} className="shrink-0" />
              <p className="text-body-sm">Budget figures are hidden for your account by your admin.</p>
            </div>
          )}
          <StatCard label="Team Members" value={String(totals.teamCount)} icon="groups" />
          <StatCard label="Field Logs" value={String(totals.logCount)} icon="description" />
        </div>

        <div className="flex gap-sm">
          <Button size="sm" variant="outline" icon={<Icon name="download" size={16} />} onClick={exportCSV}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" icon={<Icon name="print" size={16} />} onClick={exportPDF}>
            Export PDF
          </Button>
        </div>
      </section>

      {canViewFinancials && (
        <>
          <section className="flex flex-col gap-sm">
            <h2 className="text-title-lg text-on-surface">Budget vs. spent</h2>
            {budgetVsSpentData.every((d) => d.Budget === 0 && d.Spent === 0) ? (
              <p className="text-body-sm text-on-surface-variant">No budget data yet for this scope.</p>
            ) : (
              <div className="h-56 -ml-md">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetVsSpentData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.text }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Budget" fill={CHART_COLORS.budget} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Spent" fill={CHART_COLORS.spent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {categorySpendData.length > 0 && (
            <section className="flex flex-col gap-sm">
              <h2 className="text-title-lg text-on-surface">Spend by category</h2>
              <div className="h-56 -ml-md">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySpendData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="Spent" fill={CHART_COLORS.spent} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {cumulativeSpendData.length > 1 && (
            <section className="flex flex-col gap-sm">
              <h2 className="text-title-lg text-on-surface">Cumulative spend over time</h2>
              <div className="h-56 -ml-md">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeSpendData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="Cumulative" stroke={CHART_COLORS.line} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Project rollups</h2>
        <div className="flex flex-col gap-sm">
          {scopedProjects.map((p) => {
            const pct = p.budgetTotal && p.budgetTotal > 0 ? Math.round(((p.budgetSpent ?? 0) / p.budgetTotal) * 100) : 0;
            return (
              <div key={p.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-xs">
                <div className="flex items-center justify-between gap-sm">
                  <span className="text-body-lg font-medium text-on-surface truncate">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                {canViewFinancials && (
                  <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                )}
                <div className="flex flex-wrap gap-md text-[11px] text-on-surface-variant">
                  {canViewFinancials && p.budgetTotal !== null && (
                    <span>{formatCurrency(p.budgetSpent ?? 0, p.currency)} / {formatCurrency(p.budgetTotal, p.currency)}</span>
                  )}
                  <span>{p.team.length} team</span>
                  <span>{p.logs.length} logs</span>
                  <span>{p.expenses.length} expenses</span>
                  <span>Since {formatDate(p.startDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-md flex flex-col gap-[2px]">
      <Icon name={icon} className="text-primary" size={20} />
      <span className="text-title-lg text-on-surface leading-tight">{value}</span>
      <span className="text-[10px] label-caps text-on-surface-variant">{label}</span>
    </div>
  );
}
