import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/StatusBadge';
import { Avatar } from '../components/Avatar';
import { formatCurrency, formatDate } from '../lib/projectStats';

interface ProjectsDashboardProps {
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
}

export function ProjectsDashboard({ onSelectProject, onNewProject }: ProjectsDashboardProps) {
  const { projects, canManage } = useApp();

  const totalBudget = projects.reduce((s, p) => s + p.budgetTotal, 0);
  const totalSpent = projects.reduce((s, p) => s + p.budgetSpent, 0);
  const activeCount = projects.filter((p) => p.status === 'ONGOING').length;
  const allLogs = [...projects]
    .flatMap((p) => p.logs)
    .sort((a, b) => `${b.date}T${b.timestamp}`.localeCompare(`${a.date}T${a.timestamp}`))
    .slice(0, 5);

  if (projects.length === 0) {
    return (
      <div className="px-md py-lg">
        <EmptyState
          icon="dashboard"
          title="No projects yet"
          description={
            canManage
              ? "Field Tracker has nothing to show until you start your first project. Add one to begin logging budgets, team activity, and field notes."
              : "No projects have been created for your organization yet. Ask an admin or program manager to add one."
          }
          actionLabel={canManage ? 'Start New Project' : undefined}
          onAction={canManage ? onNewProject : undefined}
        />
      </div>
    );
  }

  const featured = projects.find((p) => p.status === 'ONGOING') ?? projects[0];
  const rest = projects.filter((p) => p.id !== featured.id);

  return (
    <div className="px-md py-lg flex flex-col gap-lg">
      {/* Top summary strip — real computed numbers only */}
      <div className="grid grid-cols-3 gap-sm">
        <SummaryStat label="Active Projects" value={String(activeCount)} icon="apartment" />
        <SummaryStat label="Total Budget" value={formatCurrency(totalBudget, '₹')} icon="account_balance_wallet" />
        <SummaryStat label="Total Spent" value={formatCurrency(totalSpent, '₹')} icon="payments" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-headline-md-mobile text-on-surface">Projects</h2>
        {canManage && (
          <Button size="sm" icon={<Icon name="add" size={18} />} onClick={onNewProject}>
            New Project
          </Button>
        )}
      </div>

      {/* Bento grid: one large featured card + smaller cards */}
      <div className="grid grid-cols-2 gap-sm">
        <FeaturedCard project={featured} onClick={() => onSelectProject(featured.id)} />
        {rest.map((p) => (
          <SmallCard key={p.id} project={p} onClick={() => onSelectProject(p.id)} />
        ))}
      </div>

      <div>
        <h2 className="text-title-lg text-on-surface mb-sm">Recent Field Logs</h2>
        {allLogs.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-lg text-center text-body-sm text-on-surface-variant">
            No field logs recorded yet. Log a visit from the Field Log tab.
          </div>
        ) : (
          <div className="flex flex-col gap-xs">
            {allLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-tertiary-container/20 text-tertiary shrink-0 mt-[2px]">
                  <Icon
                    name={log.type === 'alert' ? 'warning' : log.type === 'checkpoint' ? 'task_alt' : 'description'}
                    size={18}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-sm">
                    <p className="text-body-sm font-medium text-on-surface truncate">{log.projectName}</p>
                    <span className="text-[11px] text-on-surface-variant shrink-0">
                      {formatDate(log.date)} · {log.timestamp}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant line-clamp-2">{log.content}</p>
                  <p className="text-[11px] text-outline mt-[2px]">by {log.author}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-sm flex flex-col gap-[2px]">
      <Icon name={icon} className="text-primary" size={18} />
      <span className="text-title-lg text-on-surface leading-tight truncate">{value}</span>
      <span className="text-[10px] label-caps text-on-surface-variant">{label}</span>
    </div>
  );
}

function FeaturedCard({ project, onClick }: { project: ReturnType<typeof useApp>['projects'][number]; onClick: () => void }) {
  const pct = project.budgetTotal > 0 ? Math.min(100, Math.round((project.budgetSpent / project.budgetTotal) * 100)) : 0;
  return (
    <button
      onClick={onClick}
      className="col-span-2 text-left rounded-2xl bg-primary text-on-primary p-lg flex flex-col gap-md relative overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fixed-dim"
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <StatusBadge status={project.status} />
          <h3 className="text-headline-md-mobile mt-xs truncate">{project.name}</h3>
          <p className="text-body-sm opacity-80 flex items-center gap-[2px] mt-[2px]">
            <Icon name="location_on" size={14} /> {project.location}
          </p>
        </div>
        <Icon name="north_east" size={20} className="shrink-0 opacity-80" />
      </div>

      <div>
        <div className="flex items-baseline justify-between text-body-sm mb-xs">
          <span className="opacity-90">
            {formatCurrency(project.budgetSpent, project.currency)} of {formatCurrency(project.budgetTotal, project.currency)}
          </span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full rounded-full bg-secondary-fixed-dim" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {project.team.slice(0, 4).map((m) => (
            <Avatar key={m.id} name={m.name} src={m.avatar} size={28} className="ring-2 ring-primary" />
          ))}
          {project.team.length === 0 && (
            <span className="text-body-sm opacity-70">No team members yet</span>
          )}
        </div>
        <span className="text-body-sm opacity-80">{project.logs.length} log{project.logs.length === 1 ? '' : 's'}</span>
      </div>
    </button>
  );
}

function SmallCard({ project, onClick }: { project: ReturnType<typeof useApp>['projects'][number]; onClick: () => void }) {
  const pct = project.budgetTotal > 0 ? Math.min(100, Math.round((project.budgetSpent / project.budgetTotal) * 100)) : 0;
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl bg-surface-container-low p-md flex flex-col gap-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <StatusBadge status={project.status} />
      <h3 className="text-body-lg font-semibold text-on-surface leading-snug line-clamp-2">{project.name}</h3>
      <p className="text-[11px] text-on-surface-variant flex items-center gap-[2px]">
        <Icon name="location_on" size={12} /> {project.location}
      </p>
      <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-on-surface-variant">{pct}% of budget used</span>
    </button>
  );
}
