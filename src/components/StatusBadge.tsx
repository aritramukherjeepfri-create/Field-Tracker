import type { ProjectStatus } from '../types';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

const STATUS_STYLES: Record<ProjectStatus, string> = {
  ONGOING: 'bg-secondary-container text-on-secondary-container',
  NEW: 'bg-primary-container/20 text-primary',
  STALLED: 'bg-error-container text-on-error-container',
  ARCHIVE: 'bg-surface-container-high text-on-surface-variant',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  ONGOING: 'Ongoing',
  NEW: 'New',
  STALLED: 'Stalled',
  ARCHIVE: 'Archived',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-sm py-[2px] text-label-caps label-caps ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface EmptyStateProps {
  icon: IconName | string;
  title: string;
  description: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, action, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-lg py-2xl gap-sm">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-container/15 text-primary mb-sm">
        <Icon name={icon} size={32} />
      </div>
      <h3 className="text-title-lg text-on-surface">{title}</h3>
      <p className="text-body-sm text-on-surface-variant max-w-sm">{description}</p>
      {action}
      {actionLabel && onAction && (
        <Button onClick={onAction} icon={<Icon name="add" />} className="mt-sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
