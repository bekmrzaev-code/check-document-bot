import { Icon } from '../lib/ui';
import type { ViewMode } from '../types';

export function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="view-toggle">
      <button className={`vt-btn ${view === 'list' ? 'active' : ''}`} onClick={() => onChange('list')} title="List view">
        <Icon name="list" className="" />
      </button>
      <button className={`vt-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => onChange('grid')} title="Grid view">
        <Icon name="grid" className="" />
      </button>
    </div>
  );
}

export function Loading() {
  return <div className="center-screen" style={{ minHeight: '40vh' }}><div className="spinner" /></div>;
}

export function EmptyState({ icon = '📭', title, text }: { icon?: string; title: string; text?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
    </div>
  );
}
