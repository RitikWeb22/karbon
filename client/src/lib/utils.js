import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function isOverdue(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date < now;
}

export const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgent',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    indicator: 'bg-rose-500',
  },
  high: {
    label: 'High',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    indicator: 'bg-amber-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    indicator: 'bg-indigo-500',
  },
  low: {
    label: 'Low',
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    indicator: 'bg-zinc-500',
  },
};
