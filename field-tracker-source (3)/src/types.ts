export type ProjectStatus = 'ONGOING' | 'STALLED' | 'NEW' | 'ARCHIVE';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  logCount?: number;
  lastActive?: string;
  recentNote?: string;
}

export type BudgetHeadStatus = 'SANCTIONED' | 'PENDING' | 'OVERLIMIT' | 'HIDDEN';

export interface BudgetHead {
  id: string;
  name: string;
  description: string;
  sanctioned: number | null; // null means hidden from this viewer, not zero
  allocated: number | null;
  spent: number | null;
  status: BudgetHeadStatus;
  icon: string;
}

export type FieldLogType = 'note' | 'alert' | 'checkpoint';

export interface FieldLog {
  id: string;
  projectId: string;
  projectName: string;
  author: string;
  timestamp: string;
  date: string;
  content: string;
  attachments?: string[];
  location?: string;
  type?: FieldLogType;
}

export type PaymentMode = 'UPI / DIGITAL' | 'CASH';

export interface Expense {
  id: string;
  projectId: string;
  projectName: string;
  particulars: string;
  category: string;
  amount: number | null; // null means hidden from this viewer (someone else's entry)
  currency: string;
  paymentMode: PaymentMode;
  paidBy: string;
  date: string;
  receiptImage?: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  status: ProjectStatus;
  currency: string;
  budgetTotal: number | null; // null means financials are hidden from this viewer
  budgetSpent: number | null;
  efficiency: number | null;
  startDate: string;
  endDate: string;
  lastLogTime: string;
  recentActivity?: string;
  team: TeamMember[];
  budgetHeads: BudgetHead[];
  logs: FieldLog[];
  expenses: Expense[];
  tasks: Task[];
  workItems: WorkItem[];
}

export interface WorkItem {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  unit: string;
  targetQuantity: number;
  logs: WorkLog[];
  totalLogged: number;
}

export interface WorkLog {
  id: string;
  workItemId: string;
  authorId: string | null;
  authorName: string;
  date: string;
  quantity: number;
  notes: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | 'quarterly' | null;

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  ownerId: string | null;
  ownerName: string | null;
  status: TaskStatus;
  dueDate: string | null;
  startDate: string | null;
  dependsOn: string | null;
  recurrenceRule: RecurrenceRule;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  role: string;
  organization: string;
  avatar?: string;
}

export type ActiveTab = 'projects' | 'tasks' | 'expenses' | 'log' | 'reports' | 'settings';

export type UserRole = 'admin' | 'manager' | 'field_officer' | 'viewer';

export type Theme = 'light' | 'dark';
