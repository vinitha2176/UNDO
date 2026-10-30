import { FileCategory } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCategoryBadgeClass(category: FileCategory): string {
  switch (category) {
    case 'documents':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'spreadsheets':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'presentations':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'images':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'videos':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'audio':
      return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'archives':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'source code':
      return 'bg-slate-100 text-slate-800 border-slate-300';
    case 'others':
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
}

