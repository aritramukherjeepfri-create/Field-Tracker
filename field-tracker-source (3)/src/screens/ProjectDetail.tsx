import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/StatusBadge';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FloatingInput, FloatingSelect, FloatingTextarea } from '../components/FloatingInput';
import { formatCurrency, formatDate, todayISO } from '../lib/projectStats';
import { downloadCSV, printAsPDF } from '../lib/csv';
import type { BudgetHead, WorkItem } from '../types';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onDeleted: () => void;
}

const ICON_CHOICES = ['construction', 'groups', 'inventory_2', 'category', 'my_location', 'account_balance_wallet'];

export function ProjectDetail({ projectId, onBack, onDeleted }: ProjectDetailProps) {
  const {
    getProject, deleteProject, addTeamMember, removeTeamMember, updateProjectStatus, updateProject,
    addBudgetHead, updateBudgetHead, deleteBudgetHead, addWorkItem, deleteWorkItem, addWorkLog,
    canManage, isViewer, canViewFinancials,
  } = useApp();
  const project = getProject(projectId);

  const [editHead, setEditHead] = useState<BudgetHead | null>(null);
  const [addHeadOpen, setAddHeadOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<string | null>(null);
  const [confirmDeleteHead, setConfirmDeleteHead] = useState<string | null>(null);
  const [addWorkItemOpen, setAddWorkItemOpen] = useState(false);
  const [logProgressItem, setLogProgressItem] = useState<WorkItem | null>(null);
  const [confirmDeleteWorkItem, setConfirmDeleteWorkItem] = useState<string | null>(null);

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

  function saveMember() {
    if (!newMemberName.trim()) return;
    addTeamMember(project!.id, { name: newMemberName.trim(), role: newMemberRole.trim() || 'Team Member' });
    setNewMemberName('');
    setNewMemberRole('');
    setAddMemberOpen(false);
  }

  function exportExpensesCSV() {
    downloadCSV(`${project!.name.replace(/\s+/g, '_')}_expenses.csv`, [
      ['Date', 'Particulars', 'Category', 'Amount', 'Currency', 'Payment Mode', 'Paid By'],
      ...project!.expenses.map((e) => [e.date, e.particulars, e.category, e.amount ?? 'hidden', e.currency, e.paymentMode, e.paidBy]),
    ]);
  }

  function exportLogsCSV() {
    downloadCSV(`${project!.name.replace(/\s+/g, '_')}_logs.csv`, [
      ['Date', 'Time', 'Author', 'Type', 'Location', 'Content'],
      ...project!.logs.map((l) => [l.date, l.timestamp, l.author, l.type ?? '', l.location ?? '', l.content]),
    ]);
  }

  function exportPDF() {
    const p = project!;
    const html = `
      <h1>${p.name}</h1>
      <p>${p.location} · ${formatDate(p.startDate)} – ${formatDate(p.endDate)}</p>
      ${canViewFinancials ? `
      <h2 style="font-size:15px;margin-top:20px;">Budget Heads</h2>
      <table>
        <thead><tr><th>Name</th><th>Sanctioned</th><th>Allocated</th><th>Spent</th><th>Status</th></tr></thead>
        <tbody>
          ${p.budgetHeads.map((h) => `<tr><td>${h.name}</td><td>${formatCurrency(h.sanctioned ?? 0, p.currency)}</td><td>${formatCurrency(h.allocated ?? 0, p.currency)}</td><td>${formatCurrency(h.spent ?? 0, p.currency)}</td><td>${h.status}</td></tr>`).join('')}
        </tbody>
      </table>` : '<p>Budget figures are hidden for your account.</p>'}
      <h2 style="font-size:15px;margin-top:20px;">Expenses</h2>
      <table>
        <thead><tr><th>Date</th><th>Particulars</th><th>Category</th><th>Amount</th><th>Paid By</th></tr></thead>
        <tbody>
          ${p.expenses.map((e) => `<tr><td>${formatDate(e.date)}</td><td>${e.particulars}</td><td>${e.category}</td><td>${e.amount !== null ? formatCurrency(e.amount, e.currency) : 'Hidden'}</td><td>${e.paidBy}</td></tr>`).join('')}
        </tbody>
      </table>
      <h2 style="font-size:15px;margin-top:20px;">Field Logs</h2>
      <table>
        <thead><tr><th>Date</th><th>Author</th><th>Content</th></tr></thead>
        <tbody>
          ${p.logs.map((l) => `<tr><td>${formatDate(l.date)} ${l.timestamp}</td><td>${l.author}</td><td>${l.content}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
    printAsPDF(`${p.name} — Report`, html);
  }

  const pct = project.budgetTotal !== null && project.budgetTotal > 0
    ? Math.min(100, Math.round(((project.budgetSpent ?? 0) / project.budgetTotal) * 100))
    : 0;

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
          <div className="flex flex-col items-end gap-xs shrink-0">
            <select
              value={project.status}
              onChange={(e) => updateProjectStatus(project.id, e.target.value as typeof project.status)}
              disabled={!canManage}
              className="text-body-sm rounded-full border border-outline-variant bg-surface-container-lowest px-sm py-xs disabled:opacity-60"
              aria-label="Change project status"
            >
              <option value="NEW">New</option>
              <option value="ONGOING">Ongoing</option>
              <option value="STALLED">Stalled</option>
              <option value="ARCHIVE">Archived</option>
            </select>
            {canManage && (
              <button onClick={() => setEditProjectOpen(true)} className="text-[11px] text-primary font-medium flex items-center gap-[2px]">
                <Icon name="edit" size={12} /> Edit details
              </button>
            )}
          </div>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {formatDate(project.startDate)} – {formatDate(project.endDate)}
        </p>
      </section>

      {canViewFinancials ? (
        <section className="rounded-2xl bg-surface-container-low p-lg flex flex-col gap-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-title-lg text-on-surface">{formatCurrency(project.budgetSpent ?? 0, project.currency)}</span>
            <span className="text-body-sm text-on-surface-variant">of {formatCurrency(project.budgetTotal ?? 0, project.currency)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-on-surface-variant">{pct}% utilized · {project.efficiency ?? 0}% remaining</span>
        </section>
      ) : (
        <section className="rounded-2xl bg-surface-container-low p-lg flex items-center gap-sm text-on-surface-variant">
          <Icon name="warning" size={20} className="shrink-0" />
          <p className="text-body-sm">Budget totals are hidden for your account. You can still log expenses below.</p>
        </section>
      )}

      <section className="flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-title-lg text-on-surface">Budget breakdown</h2>
          {canManage && (
            <Button size="sm" variant="outline" icon={<Icon name="add" size={16} />} onClick={() => setAddHeadOpen(true)}>
              Add Head
            </Button>
          )}
        </div>
        {project.budgetHeads.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No budget heads have been set up for this project yet.</p>
        ) : (
          <div className="flex flex-col gap-sm">
            {project.budgetHeads.map((h) => {
              const headPct = canViewFinancials && h.allocated && h.allocated > 0
                ? Math.min(100, Math.round(((h.spent ?? 0) / h.allocated) * 100))
                : 0;
              return (
                <button
                  key={h.id}
                  onClick={() => canManage && setEditHead(h)}
                  disabled={!canManage}
                  className="text-left rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
                >
                  <div className="flex items-center justify-between gap-sm">
                    <div className="flex items-center gap-sm min-w-0">
                      <Icon name={h.icon} className="text-primary shrink-0" />
                      <span className="text-body-lg font-medium text-on-surface truncate">{h.name}</span>
                    </div>
                    {canViewFinancials && (
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
                    )}
                  </div>
                  {h.description && <p className="text-body-sm text-on-surface-variant">{h.description}</p>}
                  {canViewFinancials ? (
                    <>
                      <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                        <div
                          className={`h-full rounded-full ${h.status === 'OVERLIMIT' ? 'bg-error' : 'bg-primary'}`}
                          style={{ width: `${headPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-on-surface-variant">
                        {formatCurrency(h.spent ?? 0, project.currency)} spent of {formatCurrency(h.allocated ?? 0, project.currency)} allocated
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-[2px]">
                      <Icon name="warning" size={12} /> Amounts hidden — log expenses under this category from the Expenses tab
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-title-lg text-on-surface">Work targets</h2>
          {canManage && (
            <Button size="sm" variant="outline" icon={<Icon name="add" size={16} />} onClick={() => setAddWorkItemOpen(true)}>
              Add Target
            </Button>
          )}
        </div>
        {project.workItems.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">
            No work targets set yet. {canManage ? 'Add one to have the team log daily progress against it.' : 'Ask an admin or manager to add one.'}
          </p>
        ) : (
          <div className="flex flex-col gap-sm">
            {project.workItems.map((w) => {
              const workPct = w.targetQuantity > 0 ? Math.min(100, Math.round((w.totalLogged / w.targetQuantity) * 100)) : 0;
              return (
                <div key={w.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-xs">
                  <div className="flex items-start justify-between gap-sm">
                    <div className="min-w-0">
                      <p className="text-body-lg font-medium text-on-surface">{w.title}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {w.totalLogged} / {w.targetQuantity} {w.unit}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => setConfirmDeleteWorkItem(w.id)}
                        aria-label={`Delete work target ${w.title}`}
                        className="rounded-full p-xs text-on-surface-variant hover:bg-surface-container-high shrink-0"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className={`h-full rounded-full ${workPct >= 100 ? 'bg-secondary' : 'bg-primary'}`}
                      style={{ width: `${workPct}%` }}
                    />
                  </div>
                  {!isViewer && (
                    <Button size="sm" variant="outline" icon={<Icon name="add" size={14} />} className="self-start mt-xs" onClick={() => setLogProgressItem(w)}>
                      Log today's progress
                    </Button>
                  )}
                  {w.logs.length > 0 && (
                    <div className="flex flex-col gap-[2px] mt-xs">
                      {w.logs.slice(0, 3).map((l) => (
                        <p key={l.id} className="text-[11px] text-on-surface-variant">
                          {formatDate(l.date)} · {l.authorName} logged {l.quantity} {w.unit}{l.notes ? ` — ${l.notes}` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
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

      {/* Edit project details */}
      <EditProjectModal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
        onSave={updateProject}
      />

      {/* Edit / delete a budget head */}
      <EditBudgetHeadModal
        head={editHead}
        currency={project.currency}
        onClose={() => setEditHead(null)}
        onSave={updateBudgetHead}
        onDelete={(id) => { setEditHead(null); setConfirmDeleteHead(id); }}
      />

      {/* Add a new budget head */}
      <AddBudgetHeadModal
        open={addHeadOpen}
        onClose={() => setAddHeadOpen(false)}
        onAdd={(head) => addBudgetHead(project.id, head)}
      />

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

      <AddWorkItemModal
        open={addWorkItemOpen}
        onClose={() => setAddWorkItemOpen(false)}
        onAdd={(input) => addWorkItem(project.id, input)}
      />

      <LogProgressModal
        item={logProgressItem}
        onClose={() => setLogProgressItem(null)}
        onLog={(input) => logProgressItem && addWorkLog(logProgressItem.id, project.id, input)}
      />

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

      <ConfirmDialog
        open={!!confirmDeleteHead}
        title="Delete budget head?"
        message="This removes the category. Expenses already logged under it stay on record but will no longer roll up into a budget total."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteHead(null)}
        onConfirm={() => {
          if (confirmDeleteHead) deleteBudgetHead(confirmDeleteHead);
          setConfirmDeleteHead(null);
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteWorkItem}
        title="Delete work target?"
        message="This removes the target and its logged progress history."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteWorkItem(null)}
        onConfirm={() => {
          if (confirmDeleteWorkItem) deleteWorkItem(confirmDeleteWorkItem);
          setConfirmDeleteWorkItem(null);
        }}
      />
    </div>
  );
}

function EditProjectModal({
  open, onClose, project, onSave,
}: {
  open: boolean;
  onClose: () => void;
  project: ReturnType<typeof useApp>['projects'][number];
  onSave: ReturnType<typeof useApp>['updateProject'];
}) {
  const [name, setName] = useState(project.name);
  const [location, setLocation] = useState(project.location);
  const [currency, setCurrency] = useState(project.currency);
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate);

  async function handleSave() {
    if (!name.trim() || !location.trim()) return;
    await onSave(project.id, { name: name.trim(), location: location.trim(), currency, startDate, endDate });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit project details" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name.trim() || !location.trim()}>Save</Button>
      </>
    }>
      <div className="flex flex-col gap-sm">
        <FloatingInput label="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <FloatingInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <div className="grid grid-cols-2 gap-sm">
          <FloatingSelect label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['₹', '$', '€', '£'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </FloatingSelect>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-sm">
          <FloatingInput label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <FloatingInput label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function EditBudgetHeadModal({
  head, currency, onClose, onSave, onDelete,
}: {
  head: BudgetHead | null;
  currency: string;
  onClose: () => void;
  onSave: ReturnType<typeof useApp>['updateBudgetHead'];
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sanctioned, setSanctioned] = useState('');
  const [allocated, setAllocated] = useState('');
  const [icon, setIcon] = useState(ICON_CHOICES[0]);

  const key = head?.id ?? '';
  const [loadedFor, setLoadedFor] = useState('');
  if (head && loadedFor !== key) {
    setName(head.name);
    setDescription(head.description);
    setSanctioned(head.sanctioned !== null ? String(head.sanctioned) : '0');
    setAllocated(head.allocated !== null ? String(head.allocated) : head.sanctioned !== null ? String(head.sanctioned) : '0');
    setIcon(head.icon);
    setLoadedFor(key);
  }

  async function handleSave() {
    if (!head || !name.trim()) return;
    await onSave(head.id, {
      name: name.trim(),
      description: description.trim(),
      sanctioned: Number(sanctioned) || 0,
      allocated: Number(allocated) || 0,
      icon,
    });
    onClose();
  }

  return (
    <Modal open={!!head} onClose={onClose} title="Edit budget head" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
      </>
    }>
      {head && (
        <div className="flex flex-col gap-sm">
          <FloatingInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <FloatingTextarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-sm">
            <FloatingInput label={`Sanctioned (${currency})`} type="number" min="0" value={sanctioned} onChange={(e) => setSanctioned(e.target.value)} />
            <FloatingInput label={`Allocated (${currency})`} type="number" min="0" value={allocated} onChange={(e) => setAllocated(e.target.value)} />
          </div>
          <FloatingSelect label="Icon" value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICON_CHOICES.map((ic) => (
              <option key={ic} value={ic}>{ic.replace(/_/g, ' ')}</option>
            ))}
          </FloatingSelect>
          <button
            onClick={() => onDelete(head.id)}
            className="self-start text-body-sm text-error font-medium flex items-center gap-xs mt-xs"
          >
            <Icon name="delete" size={16} /> Delete this budget head
          </button>
        </div>
      )}
    </Modal>
  );
}

function AddBudgetHeadModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (head: { name: string; description: string; sanctioned: number; icon: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sanctioned, setSanctioned] = useState('');
  const [icon, setIcon] = useState(ICON_CHOICES[0]);

  function reset() {
    setName('');
    setDescription('');
    setSanctioned('');
    setIcon(ICON_CHOICES[0]);
  }

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), description: description.trim(), sanctioned: Number(sanctioned) || 0, icon });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add budget head" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={!name.trim()}>Add</Button>
      </>
    }>
      <div className="flex flex-col gap-sm">
        <FloatingInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <FloatingTextarea label="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <FloatingInput label="Sanctioned amount (0 is fine)" type="number" min="0" value={sanctioned} onChange={(e) => setSanctioned(e.target.value)} />
        <FloatingSelect label="Icon" value={icon} onChange={(e) => setIcon(e.target.value)}>
          {ICON_CHOICES.map((ic) => (
            <option key={ic} value={ic}>{ic.replace(/_/g, ' ')}</option>
          ))}
        </FloatingSelect>
      </div>
    </Modal>
  );
}

function AddWorkItemModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: { title: string; unit: string; targetQuantity: number }) => void;
}) {
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');

  function reset() {
    setTitle('');
    setUnit('');
    setTarget('');
  }

  function handleAdd() {
    if (!title.trim() || !unit.trim()) return;
    onAdd({ title: title.trim(), unit: unit.trim(), targetQuantity: Number(target) || 0 });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add work target" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={!title.trim() || !unit.trim()}>Add</Button>
      </>
    }>
      <div className="flex flex-col gap-sm">
        <FloatingInput label="What's the work?" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Borewells drilled" />
        <div className="grid grid-cols-2 gap-sm">
          <FloatingInput label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. wells, households" />
          <FloatingInput label="Target quantity" type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <p className="text-[11px] text-on-surface-variant">
          Team members will log how much they completed each day against this target.
        </p>
      </div>
    </Modal>
  );
}

function LogProgressModal({
  item, onClose, onLog,
}: {
  item: WorkItem | null;
  onClose: () => void;
  onLog: (input: { date: string; quantity: number; notes: string }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  function reset() {
    setDate(todayISO());
    setQuantity('');
    setNotes('');
  }

  function handleLog() {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    onLog({ date, quantity: qty, notes: notes.trim() });
    reset();
    onClose();
  }

  return (
    <Modal open={!!item} onClose={onClose} title={item ? `Log progress — ${item.title}` : 'Log progress'} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleLog} disabled={!quantity || Number(quantity) <= 0}>Log</Button>
      </>
    }>
      {item && (
        <div className="flex flex-col gap-sm">
          <p className="text-body-sm text-on-surface-variant">
            {item.totalLogged} / {item.targetQuantity} {item.unit} so far
          </p>
          <div className="grid grid-cols-2 gap-sm">
            <FloatingInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
            <FloatingInput label={`Quantity (${item.unit})`} type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <FloatingTextarea label="Notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
