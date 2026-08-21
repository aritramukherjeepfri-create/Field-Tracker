import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../store/AuthContext';
import type { ActiveTab } from '../types';

const TAB_TITLES: Record<ActiveTab, string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  expenses: 'Expenses',
  log: 'Field Log',
  reports: 'Summary Reports',
  settings: 'Settings',
};

interface HeaderProps {
  activeTab: ActiveTab;
  onBack?: () => void;
  overrideTitle?: string;
  onOpenSettings: () => void;
}

export function Header({ activeTab, onBack, overrideTitle, onOpenSettings }: HeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-sm border-b border-outline-variant bg-surface/95 backdrop-blur px-md py-sm">
      <div className="flex items-center gap-sm min-w-0">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="rounded-full p-sm text-on-surface hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary shrink-0"
          >
            <Icon name="arrow_back" />
          </button>
        ) : (
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-on-primary shrink-0">
            <img src="/favicon.svg" alt="" className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-title-lg text-on-surface truncate">{overrideTitle ?? TAB_TITLES[activeTab]}</h1>
        </div>
      </div>
      <div className="flex items-center gap-xs shrink-0">
        <NotificationBell />
        <button
          onClick={onOpenSettings}
          aria-label={profile ? `Signed in as ${profile.name}` : 'Settings'}
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Avatar name={profile?.name ?? '?'} src={profile?.avatar_url ?? undefined} size={36} />
        </button>
      </div>
    </header>
  );
}
