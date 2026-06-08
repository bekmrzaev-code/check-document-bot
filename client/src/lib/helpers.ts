import type { Driver, ApprovedImage, TelegramGroup } from '../types';

export function driverDisplay(d: Driver): string {
  return d.admin_name?.trim() ? d.admin_name.trim() : (d.name || 'Unknown');
}

export function groupDisplay(g: TelegramGroup): string {
  return g.admin_name?.trim() ? g.admin_name.trim() : (g.group_name || 'Unknown');
}

export function imageSrc(img: ApprovedImage): string {
  return img.file_id
    ? `/api/images/file/${encodeURIComponent(img.file_id)}`
    : `/api/images/${img.message_id}`;
}

export function fmtDate(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function driverImages(d: Driver): ApprovedImage[] {
  return (d.images || []).filter((i) => i.file_id || i.message_id);
}
