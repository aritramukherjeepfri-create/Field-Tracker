import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  Project, FieldLog, Expense, Task, AppNotification, UserRole,
} from '../types';
import type {
  ProjectRow, ProjectMemberRow, BudgetHeadRow, ExpenseRow, FieldLogRow, TaskRow, ProfileRow, NotificationRow,
} from '../lib/database.types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { mapProject } from '../lib/mapRows';

interface OrgMember {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
}

interface AppContextValue {
  projects: Project[];
  orgMembers: OrgMember[];
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  canManage: boolean; // admin or manager
  isViewer: boolean;
  refresh: () => Promise<void>;

  addProject: (input: {
    name: string;
    location: string;
    currency: string;
    startDate: string;
    endDate: string;
    status: Project['status'];
    team: { name: string; role: string }[];
    budgetHeads: { name: string; description: string; sanctioned: number; icon: string }[];
  }) => Promise<string | null>;
  deleteProject: (projectId: string) => Promise<void>;
  updateProjectStatus: (projectId: string, status: Project['status']) => Promise<void>;

  addTeamMember: (projectId: string, member: { name: string; role: string }) => Promise<void>;
  removeTeamMember: (projectId: string, memberId: string) => Promise<void>;

  reallocateBudgetHead: (projectId: string, headId: string, newAllocated: number) => Promise<void>;
  addBudgetHead: (projectId: string, head: { name: string; description: string; sanctioned: number; icon: string }) => Promise<void>;

  addExpense: (expense: Omit<Expense, 'id' | 'projectName'>) => Promise<void>;
  addLog: (log: Omit<FieldLog, 'id' | 'projectName'> & { lat?: number; lng?: number }) => Promise<void>;

  addTask: (task: {
    projectId: string;
    title: string;
    description: string;
    ownerId: string | null;
    dueDate: string | null;
    startDate: string | null;
    dependsOn: string | null;
    recurrenceRule: Task['recurrenceRule'];
  }) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  getProject: (projectId: string) => Project | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = profile?.org_id ?? null;
  const canManage = profile?.role === 'admin' || profile?.role === 'manager';
  const isViewer = profile?.role === 'viewer';

  const refresh = useCallback(async () => {
    if (!orgId) {
      setProjects([]);
      setOrgMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [
      { data: projectRows },
      { data: memberRows },
      { data: headRows },
      { data: expenseRows },
      { data: logRows },
      { data: taskRows },
      { data: profileRows },
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('org_id', orgId).order('created_at', { ascending: true }),
      supabase.from('project_members').select('*').eq('org_id', orgId),
      supabase.from('budget_heads').select('*').eq('org_id', orgId),
      supabase.from('expenses').select('*').eq('org_id', orgId).order('date', { ascending: false }),
      supabase.from('field_logs').select('*').eq('org_id', orgId).order('log_date', { ascending: false }),
      supabase.from('tasks').select('*').eq('org_id', orgId).order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('profiles').select('*').eq('org_id', orgId),
    ]);

    const profilesById = new Map<string, ProfileRow>((profileRows ?? []).map((p) => [p.id, p]));

    const membersByProject = groupBy(memberRows ?? [], (m: ProjectMemberRow) => m.project_id);
    const headsByProject = groupBy(headRows ?? [], (h: BudgetHeadRow) => h.project_id);
    const expensesByProject = groupBy(expenseRows ?? [], (e: ExpenseRow) => e.project_id);
    const logsByProject = groupBy(logRows ?? [], (l: FieldLogRow) => l.project_id);
    const tasksByProject = groupBy(taskRows ?? [], (t: TaskRow) => t.project_id);

    const mapped = (projectRows ?? []).map((row: ProjectRow) =>
      mapProject(
        row,
        membersByProject.get(row.id) ?? [],
        headsByProject.get(row.id) ?? [],
        expensesByProject.get(row.id) ?? [],
        logsByProject.get(row.id) ?? [],
        tasksByProject.get(row.id) ?? [],
        profilesById
      )
    );

    setProjects(mapped);
    setOrgMembers(
      (profileRows ?? []).map((p: ProfileRow) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        avatarUrl: p.avatar_url,
      }))
    );
    setLoading(false);
  }, [orgId]);

  const refreshNotifications = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(
      (data ?? []).map((n: NotificationRow) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        payload: n.payload,
        read: n.read,
        createdAt: n.created_at,
      }))
    );
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshNotifications();
    if (!session) return;

    const channel = supabase
      .channel('notifications-' + session.user.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${session.user.id}` },
        () => refreshNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, refreshNotifications]);

  const value = useMemo<AppContextValue>(() => ({
    projects,
    orgMembers,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    loading,
    canManage,
    isViewer,
    refresh,

    addProject: async (input) => {
      if (!orgId || !session) return null;
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          org_id: orgId,
          name: input.name,
          location: input.location,
          currency: input.currency,
          status: input.status,
          start_date: input.startDate,
          end_date: input.endDate,
          created_by: session.user.id,
        })
        .select()
        .single();
      if (error || !project) return null;

      if (input.team.length > 0) {
        await supabase.from('project_members').insert(
          input.team.map((m) => ({ org_id: orgId, project_id: project.id, name: m.name, member_role: m.role }))
        );
      }
      if (input.budgetHeads.length > 0) {
        await supabase.from('budget_heads').insert(
          input.budgetHeads.map((h) => ({
            org_id: orgId,
            project_id: project.id,
            name: h.name,
            description: h.description,
            sanctioned: h.sanctioned,
            allocated: h.sanctioned,
            icon: h.icon,
          }))
        );
      }
      await refresh();
      return project.id;
    },

    deleteProject: async (projectId) => {
      await supabase.from('projects').delete().eq('id', projectId);
      await refresh();
    },

    updateProjectStatus: async (projectId, status) => {
      await supabase.from('projects').update({ status }).eq('id', projectId);
      await refresh();
    },

    addTeamMember: async (projectId, member) => {
      if (!orgId) return;
      await supabase.from('project_members').insert({
        org_id: orgId, project_id: projectId, name: member.name, member_role: member.role,
      });
      await refresh();
    },

    removeTeamMember: async (projectId, memberId) => {
      await supabase.from('project_members').delete().eq('id', memberId).eq('project_id', projectId);
      await refresh();
    },

    reallocateBudgetHead: async (_projectId, headId, newAllocated) => {
      await supabase.from('budget_heads').update({ allocated: newAllocated }).eq('id', headId);
      await refresh();
    },

    addBudgetHead: async (projectId, head) => {
      if (!orgId) return;
      await supabase.from('budget_heads').insert({
        org_id: orgId, project_id: projectId, name: head.name, description: head.description,
        sanctioned: head.sanctioned, allocated: head.sanctioned, icon: head.icon,
      });
      await refresh();
    },

    addExpense: async (expense) => {
      if (!orgId || !session) return;
      await supabase.from('expenses').insert({
        org_id: orgId,
        project_id: expense.projectId,
        particulars: expense.particulars,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        payment_mode: expense.paymentMode,
        paid_by: expense.paidBy,
        date: expense.date,
        receipt_url: expense.receiptImage,
        created_by: session.user.id,
      });
      await refresh();
    },

    addLog: async (log) => {
      if (!orgId || !session) return;
      await supabase.from('field_logs').insert({
        org_id: orgId,
        project_id: log.projectId,
        author: log.author,
        author_profile_id: session.user.id,
        log_date: log.date,
        log_time: log.timestamp,
        content: log.content,
        location: log.location,
        lat: log.lat,
        lng: log.lng,
        log_type: log.type ?? 'note',
        attachment_url: log.attachments?.[0],
        created_by: session.user.id,
      });
      await refresh();
    },

    addTask: async (task) => {
      if (!orgId || !session) return;
      await supabase.from('tasks').insert({
        org_id: orgId,
        project_id: task.projectId,
        title: task.title,
        description: task.description,
        owner_id: task.ownerId,
        due_date: task.dueDate,
        start_date: task.startDate,
        depends_on: task.dependsOn,
        recurrence_rule: task.recurrenceRule,
        created_by: session.user.id,
      });
      await refresh();
    },

    updateTaskStatus: async (taskId, status) => {
      await supabase.from('tasks').update({ status }).eq('id', taskId);
      await refresh();
    },

    deleteTask: async (taskId) => {
      await supabase.from('tasks').delete().eq('id', taskId);
      await refresh();
    },

    markNotificationRead: async (id) => {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      await refreshNotifications();
    },

    markAllNotificationsRead: async () => {
      if (!session) return;
      await supabase.from('notifications').update({ read: true }).eq('recipient_id', session.user.id).eq('read', false);
      await refreshNotifications();
    },

    getProject: (projectId) => projects.find((p) => p.id === projectId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [projects, orgMembers, notifications, loading, canManage, isViewer, orgId, session, refresh, refreshNotifications]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export type { OrgMember };
