import { Icon, type IconName } from './Icon';
import type { ActiveTab } from '../types';

const TABS: { id: ActiveTab; label: string; icon: IconName }[] = [
  { id: 'projects', label: 'Projects', icon: 'dashboard' },
  { id: 'tasks', label: 'Tasks', icon: 'checklist' },
  { id: 'expenses', label: 'Expenses', icon: 'payments' },
  { id: 'log', label: 'Log', icon: 'description' },
  { id: 'reports', label: 'Reports', icon: 'summarize' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

interface BottomNavProps {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest px-sm py-xs">
      <ul className="flex items-center justify-between max-w-xl mx-auto">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} className="flex-1">
              <button
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className="w-full flex flex-col items-center gap-[2px] py-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-xl"
              >
                <span
                  className={`flex items-center justify-center rounded-full px-sm py-[2px] transition-colors ${
                    isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
                  }`}
                >
                  <Icon name={tab.icon} filled={isActive} size={20} />
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
