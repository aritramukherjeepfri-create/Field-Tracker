import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/StatusBadge';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FloatingInput } from '../components/FloatingInput';
import { formatCurrency, formatDate } from '../lib/projectStats';
import { downloadCSV, printAsPDF } from '../lib/csv';
import type { BudgetHead } from '../types';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export function ProjectDetail({ projectId, onBack, onDeleted }: ProjectDetailProps) {
  const { getProject, deleteProject, addTeamMember, removeTeamMember, reallocateBudgetHead, updateProjectStatus, canManage } = useApp();
  const project = getProject(projectId);

  const [reallocHead, setReallocHead] = useState<BudgetHead | null>(null);
  const [reallocValue, setReallocValue] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="px-md py-xl text-center text-body-sm text-on-surface-variant">
        This project no longer exists.
        <div className="mt-md">
          <Button onClick={onBack}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  // Narrowed local alias: TS can't propagate the `!project` guard's
  // narrowing into nested function declarations below, since those
  // closures could in principle run after further renders. `project`
  // is confirmed non-null at this point, so alias it once.
  const proj = project;

  function openRealloc(head: BudgetHead) {
    setReallocHead(head);
    setReallocValue(String(head.allocated));
  }

  function saveRealloc() {
    if (!reallocHead) return;
    const val = Number(reallocValue);
    if (Number.isFinite(val) && val >= 0) {
      reallocateBudgetHead(proj.id, reallocHead.id, val);
    }
    setReallocHead(null);
  }

  function saveMember() {
    if (!newMemberName.trim()) return;
    addTeamMember(proj.id, { name: newMemberName.trim(), role: newMemberRole.trim() || 'Team Member' });
    setNewMemberName('');
    setNewMemberRole('');
    setAddMemberOpen(false);
  }

  function exportExpensesCSV() {
    downloadCSV(`${proj.name.replace(/\s+/g, '_')}_expenses.csv`, [
      ['Date', 'Particulars', 'Category', 'Amount', 'Currency', 'Payment Mode', 'Paid By'],
      ...proj.expenses.map((e) => [e.date, e.particulars, e.category, e.amount, e.currency, e.paymentMode, e.paidBy]),
    ]);
  }

  function exportLogsCSV() {
    downloadCSV(`${proj.name.replace(/\s+/g, '_')}_logs.csv`, [
      ['Date', 'Time', 'Author', 'Type', 'Location', 'Content'],
      ...proj.logs.map((l) => [l.date, l.timestamp, l.author, l.type ?? '', l.location ?? '', l.content]),
    ]);
  }

  function exportPDF() {
    const html = `
      <h1>${proj.name}</h1>
      <p>${proj.location} · ${formatDate(proj.startDate)} – ${formatDate(proj.endDate)}</p>
      <h2 style="font-size:15px;margin-top:20px;">Budget Heads</h2>
      <table>
        <thead><tr><th>Name</th><th>Sanctioned</th><th>Allocated</th><th>Spent</th><th>Status</th></tr></thead>
        <tbody>
          ${proj.budgetHeads.map((h) => `<tr><td>${h.name}</td><td>${formatCurrency(h.sanctioned, proj.currency)}</td><td>${formatCurrency(h.allocated, proj.currency)}</td><td>${formatCurrency(h.spent, proj.currency)}</td><td>${h.status}</td></tr>`).join('')}
        </tbody>
      </table>
      <h2 style="font-size:15px;margin-top:20px;">Expenses</h2>
      <table>
        <thead><tr><th>Date</th><th>Particulars</th><th>Category</th><th>Amount</th><th>Paid By</th></tr></thead>
        <tbody>
          ${proj.expenses.map((e) => `<tr><td>${formatDate(e.date)}</td><td>${e.particulars}</td><td>${e.category}</td><td>${formatCurrency(e.amount, e.currency)}</td><td>${e.paidBy}</td></tr>`).join('')}
        </tbody>
      </table>
      <h2 style="font-size:15px;margin-top:20px;">Field Logs</h2>
      <table>
        <thead><tr><th>Date</th><th>Author</th><th>Content</th></tr></thead>
        <tbody>
          ${proj.logs.map((l) => `<tr><td>${formatDate(l.date)} ${l.timestamp}</td><td>${l.author}</td><td>${l.content}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
    printAsPDF(`${proj.name} — Report`, html);
  }

  const pct = project.budgetTotal > 0 ? Math.min(100, Math.round((project.budgetSpent / project.budgetTotal) * 100)) : 0;

  return (
    <div className="px-md py-lg flex flex-col gap-xl pb-2xl">
      <section className="flex flex-col gap-sm">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <StatusBadge status={project.status} />
            <h2 className="text-headline-md-mobile text-on-surface mt-xs">{project.name}</h2>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-[2px] mt-[2px]">
              <Icon name="location_on" size={14} /> {project.location}
            </p>
          </div>
          <select
            value={project.status}
            onChange={(e) => updateProjectStatus(project.id, e.target.value as typeof project.status)}
            disabled={!canManage}
            className="text-body-sm rounded-full border border-outline-variant bg-surface-container-lowest px-sm py-xs shrink-0 disabled:opacity-60"
            aria-label="Change project status"
          >
            <option value="NEW">New</option>
            <option value="ONGOING">Ongoing</option>
            <option value="STALLED">Stalled</option>
            <option value="ARCHIVE">Archived</option>
          </select>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {formatDate(project.startDate)} – {formatDate(project.endDate)}
        </p>
      </section>

      <section className="rounded-2xl bg-surface-container-low p-lg flex flex-col gap-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-title-lg text-on-surface">{formatCurrency(project.budgetSpent, project.currency)}</span>
          <span className="text-body-sm text-on-surface-variant">of {formatCurrency(project.budgetTotal, project.currency)}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-on-surface-variant">{pct}% utilized · {project.efficiency}% remaining</span>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Budget breakdown</h2>
        {project.budgetHeads.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No budget heads have been set up for this project yet.</p>
        ) : (
          <div className="flex flex-col gap-sm">
            {project.budgetHeads.map((h) => {
              const headPct = h.allocated > 0 ? Math.min(100, Math.round((h.spent / h.allocated) * 100)) : 0;
              return (
                <button
                  key={h.id}
                  onClick={() => canManage && openRealloc(h)}
                  disabled={!canManage}
                  className="text-left rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
                >
                  <div className="flex items-center justify-between gap-sm">
                    <div className="flex items-center gap-sm min-w-0">
                      <Icon name={h.icon} className="text-primary shrink-0" />
                      <span className="text-body-lg font-medium text-on-surface truncate">{h.name}</span>
                    </div>
                    <span
                      className={`text-[10px] label-caps px-sm py-[2px] rounded-full shrink-0 ${
                        h.status === 'OVERLIMIT'
                          ? 'bg-error-container text-on-error-container'
                          : h.status === 'SANCTIONED'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {h.status}
                    </span>
                  </div>
                  {h.description && <p className="text-body-sm text-on-surface-variant">{h.description}</p>}
                  <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className={`h-full rounded-full ${h.status === 'OVERLIMIT' ? 'bg-error' : 'bg-primary'}`}
                      style={{ width: `${headPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-on-surface-variant">
                    {formatCurrency(h.spent, project.currency)} spent of {formatCurrency(h.allocated, project.currency)} allocated
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-title-lg text-on-surface">Team</h2>
          {canManage && (
            <Button size="sm" variant="outline" icon={<Icon name="add" size={16} />} onClick={() => setAddMemberOpen(true)}>
              Add Member
            </Button>
          )}
        </div>
        {project.team.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No team members yet. Add one to assign expenses and logs to them.</p>
        ) : (
          <div className="flex flex-col gap-xs">
            {project.team.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-surface-container-low px-md py-sm">
                <div className="flex items-center gap-sm min-w-0">
                  <Avatar name={m.name} src={m.avatar} size={36} />
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-on-surface truncate">{m.name}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{m.role}</p>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => setConfirmRemoveMember(m.id)}
                    aria-label={`Remove ${m.name}`}
                    className="rounded-full p-xs text-on-surface-variant hover:bg-surface-container-high shrink-0"
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-lg text-on-surface">Export</h2>
        <div className="flex flex-wrap gap-sm">
          <Button size="sm" variant="outline" icon={<Icon name="download" size={16} />} onClick={exportExpensesCSV}>
            Expenses CSV
          </Button>
          <Button size="sm" variant="outline" icon={<Icon name="download" size={16} />} onClick={exportLogsCSV}>
            Logs CSV
          </Button>
          <Button size="sm" variant="outline" icon={<Icon name="print" size={16} />} onClick={exportPDF}>
            Full Report PDF
          </Button>
        </div>
      </section>

      {canManage && (
        <section>
          <Button variant="danger" icon={<Icon name="delete" size={18} />} onClick={() => setConfirmDelete(true)}>
            Delete Project
          </Button>
        </section>
      )}

      <Modal open={!!reallocHead} onClose={() => setReallocHead(null)} title="Reallocate budget" footer={
        <>
          <Button variant="ghost" onClick={() => setReallocHead(null)}>Cancel</Button>
          <Button onClick={saveRealloc}>Save</Button>
        </>
      }>
        {reallocHead && (
          <div className="flex flex-col gap-sm">
            <p className="text-body-sm text-on-surface-variant">
              {reallocHead.name} · Sanctioned {formatCurrency(reallocHead.sanctioned, project.currency)}
            </p>
            <FloatingInput
              label="New allocated amount"
              type="number"
              min="0"
              value={reallocValue}
              onChange={(e) => setReallocValue(e.target.value)}
            />
          </div>
        )}
      </Modal>

      <Modal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add team member" footer={
        <>
          <Button variant="ghost" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
          <Button onClick={saveMember}>Add</Button>
        </>
      }>
        <div className="flex flex-col gap-sm">
          <FloatingInput label="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
          <FloatingInput label="Role" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete project?"
        message={`This permanently deletes "${project.name}" along with all of its ${project.expenses.length} expense record(s) and ${project.logs.length} log entr${project.logs.length === 1 ? 'y' : 'ies'}. This can't be undone.`}
        confirmLabel="Delete Project"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteProject(project.id);
          setConfirmDelete(false);
          onDeleted();
        }}
      />

      <ConfirmDialog
        open={!!confirmRemoveMember}
        title="Remove team member?"
        message="This removes them from the project team. Expenses already logged under their name will keep the name on record."
        confirmLabel="Remove"
        onCancel={() => setConfirmRemoveMember(null)}
        onConfirm={() => {
          if (confirmRemoveMember) removeTeamMember(project.id, confirmRemoveMember);
          setConfirmRemoveMember(null);
        }}
      />
    </div>
  );
}
