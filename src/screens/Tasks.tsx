import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { FloatingInput, FloatingSelect, FloatingTextarea } from '../components/FloatingInput';
import { EmptyState } from '../components/StatusBadge';
import { formatDate, todayISO } from '../lib/projectStats';
import type { Task, TaskStatus, RecurrenceRule } from '../types';

const STATUS_COLUMNS: { id: TaskStatus; label: string; icon: string }[] = [
  { id: 'todo', label: 'To do', icon: 'checklist' },
  { id: 'in_progress', label: 'In progress', icon: 'sync' },
  { id: 'blocked', label: 'Blocked', icon: 'warning' },
  { id: 'done', label: 'Done', icon: 'task_alt' },
];

const RECURRENCE_LABEL: Record<Exclude<RecurrenceRule, null>, string> = {
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  monthly: 'Repeats monthly',
  quarterly: 'Repeats quarterly',
};

export function Tasks() {
  const { projects, orgMembers, canManage, addTask, updateTaskStatus, deleteTask } = useApp();
  const [view, setView] = useState<'board' | 'timeline'>('board');
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const allTasks = useMemo(
    () => projects.flatMap((p) => p.tasks),
    [projects]
  );
  const tasksById = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);
  const visibleTasks = projectFilter === 'all' ? allTasks : allTasks.filter((t) => t.projectId === projectFilter);

  if (projects.length === 0) {
    return (
      <div className="px-md py-lg">
        <EmptyState
          icon="checklist"
          title="No projects to assign tasks to"
          description="Create a project first, then you can assign tasks with owners, due dates, and dependencies."
        />
      </div>
    );
  }

  return (
    <div className="px-md py-lg flex flex-col gap-lg pb-2xl">
      <div className="flex items-center justify-between gap-sm flex-wrap">
        <div className="flex rounded-full bg-surface-container-low p-[3px]">
          {(['board', 'timeline'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-md py-xs text-[12px] font-medium capitalize transition-colors ${
                view === v ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {canManage && (
          <Button size="sm" icon={<Icon name="add" size={16} />} onClick={() => setNewTaskOpen(true)}>
            New Task
          </Button>
        )}
      </div>

      <FloatingSelect label="Project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
        <option value="all">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </FloatingSelect>

      {visibleTasks.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant py-lg text-center">No tasks yet for this filter.</p>
      ) : view === 'board' ? (
        <BoardView
          tasks={visibleTasks}
          tasksById={tasksById}
          canManage={canManage}
          onStatusChange={updateTaskStatus}
          onDelete={deleteTask}
        />
      ) : (
        <TimelineView tasks={visibleTasks} />
      )}

      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        projects={projects}
        orgMembers={orgMembers}
        allTasks={allTasks}
        onCreate={addTask}
      />
    </div>
  );
}

function BoardView({
  tasks,
  tasksById,
  canManage,
  onStatusChange,
  onDelete,
}: {
  tasks: Task[];
  tasksById: Map<string, Task>;
  canManage: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-lg">
      {STATUS_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        if (colTasks.length === 0) return null;
        return (
          <section key={col.id} className="flex flex-col gap-sm">
            <h2 className="text-title-lg text-on-surface flex items-center gap-xs">
              <Icon name={col.icon} size={18} className="text-primary" />
              {col.label}
              <span className="text-[11px] text-on-surface-variant font-normal">({colTasks.length})</span>
            </h2>
            <div className="flex flex-col gap-xs">
              {colTasks.map((task) => {
                const blockingTask = task.dependsOn ? tasksById.get(task.dependsOn) : undefined;
                const isBlockedByIncomplete = blockingTask && blockingTask.status !== 'done';
                const overdue = task.dueDate && task.dueDate < todayISO() && task.status !== 'done';
                return (
                  <div key={task.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-xs">
                    <div className="flex items-start justify-between gap-sm">
                      <div className="min-w-0">
                        <p className="text-body-lg font-medium text-on-surface">{task.title}</p>
                        <p className="text-[11px] text-on-surface-variant">{task.projectName}</p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => onDelete(task.id)}
                          aria-label={`Delete task ${task.title}`}
                          className="rounded-full p-xs text-on-surface-variant hover:bg-surface-container-high shrink-0"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      )}
                    </div>
                    {task.description && <p className="text-body-sm text-on-surface-variant">{task.description}</p>}

                    <div className="flex items-center flex-wrap gap-sm mt-xs">
                      {task.ownerName && (
                        <span className="flex items-center gap-xs text-[11px] text-on-surface-variant">
                          <Avatar name={task.ownerName} size={18} /> {task.ownerName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={`flex items-center gap-[2px] text-[11px] ${overdue ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
                          <Icon name="schedule" size={12} /> {formatDate(task.dueDate)}{overdue ? ' · overdue' : ''}
                        </span>
                      )}
                      {task.recurrenceRule && (
                        <span className="flex items-center gap-[2px] text-[11px] text-tertiary">
                          <Icon name="refresh" size={12} /> {RECURRENCE_LABEL[task.recurrenceRule]}
                        </span>
                      )}
                      {blockingTask && (
                        <span className={`flex items-center gap-[2px] text-[11px] ${isBlockedByIncomplete ? 'text-error' : 'text-on-surface-variant'}`}>
                          <Icon name="swap_horiz" size={12} /> Depends on: {blockingTask.title}
                        </span>
                      )}
                    </div>

                    <select
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                      className="mt-xs text-[12px] rounded-full border border-outline-variant bg-surface-container-low px-sm py-xs self-start"
                    >
                      {STATUS_COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TimelineView({ tasks }: { tasks: Task[] }) {
  const dated = tasks.filter((t) => t.dueDate);
  if (dated.length === 0) {
    return <p className="text-body-sm text-on-surface-variant py-lg text-center">No tasks have due dates yet, so there's nothing to plot on a timeline.</p>;
  }

  const dates = dated.flatMap((t) => [t.startDate ?? t.dueDate!, t.dueDate!]);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));
  const rangeMs = Math.max(1, new Date(maxDate).getTime() - new Date(minDate).getTime());

  function pct(dateStr: string): number {
    return ((new Date(dateStr).getTime() - new Date(minDate).getTime()) / rangeMs) * 100;
  }

  const sorted = [...dated].sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
        <span>{formatDate(minDate)}</span>
        <span>{formatDate(maxDate)}</span>
      </div>
      <div className="flex flex-col gap-sm">
        {sorted.map((task) => {
          const start = task.startDate ?? task.dueDate!;
          const startPct = pct(start);
          const endPct = Math.max(startPct + 2, pct(task.dueDate!));
          const overdue = task.dueDate! < todayISO() && task.status !== 'done';
          return (
            <div key={task.id} className="flex flex-col gap-[2px]">
              <p className="text-[12px] text-on-surface truncate">{task.title}</p>
              <div className="relative h-5 rounded-full bg-surface-container-high">
                <div
                  className={`absolute top-0 h-full rounded-full ${
                    task.status === 'done' ? 'bg-secondary' : overdue ? 'bg-error' : 'bg-primary'
                  }`}
                  style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewTaskModal({
  open,
  onClose,
  projects,
  orgMembers,
  allTasks,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  projects: ReturnType<typeof useApp>['projects'];
  orgMembers: ReturnType<typeof useApp>['orgMembers'];
  allTasks: Task[];
  onCreate: ReturnType<typeof useApp>['addTask'];
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dependsOn, setDependsOn] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(null);

  const candidateDependencies = allTasks.filter((t) => t.projectId === projectId && t.status !== 'done');

  function reset() {
    setTitle('');
    setDescription('');
    setOwnerId('');
    setDueDate('');
    setStartDate('');
    setDependsOn('');
    setRecurrence(null);
  }

  async function handleCreate() {
    if (!title.trim() || !projectId) return;
    await onCreate({
      projectId,
      title: title.trim(),
      description: description.trim(),
      ownerId: ownerId || null,
      dueDate: dueDate || null,
      startDate: startDate || null,
      dependsOn: dependsOn || null,
      recurrenceRule: recurrence,
    });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>Create Task</Button>
        </>
      }
    >
      <div className="flex flex-col gap-sm">
        <FloatingSelect label="Project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setDependsOn(''); }}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FloatingSelect>
        <FloatingInput label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <FloatingTextarea label="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <FloatingSelect label="Assign to" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">Unassigned</option>
          {orgMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.name} — {m.role.replace('_', ' ')}</option>
          ))}
        </FloatingSelect>
        <div className="grid grid-cols-2 gap-sm">
          <FloatingInput label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <FloatingInput label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <FloatingSelect label="Depends on (optional)" value={dependsOn} onChange={(e) => setDependsOn(e.target.value)}>
          <option value="">No dependency</option>
          {candidateDependencies.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </FloatingSelect>
        <FloatingSelect label="Recurrence" value={recurrence ?? ''} onChange={(e) => setRecurrence((e.target.value || null) as RecurrenceRule)}>
          <option value="">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </FloatingSelect>
        {ownerId && (
          <p className="text-[11px] text-on-surface-variant flex items-center gap-xs">
            <Icon name="notifications" size={14} /> The assigned person will get a notification.
          </p>
        )}
      </div>
    </Modal>
  );
}
