import type { ReactNode } from 'react';
import { Avatar, Icon } from '../lib/ui';
import type { ViewMode } from '../types';

// Avatar that doubles as the row's select control: shows initials normally,
// a checkbox hint on hover, and a filled check when selected. Replaces a
// separate checkbox + order number, keeping one leading element per row.
export function SelectAvatar({ name, variant = '', selected, onToggle }: {
  name?: string | null; variant?: '' | 'green'; selected: boolean; onToggle: () => void;
}) {
  return (
    <span
      className={`sel-avatar ${selected ? 'selected' : ''}`}
      role="checkbox"
      aria-checked={selected}
      title="Select"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      <Avatar name={name} variant={variant} />
      <span className="sel-avatar-box"><Icon name="check" className="" /></span>
    </span>
  );
}

// Toolbar "select all (on this page)" toggle.
export function SelectAll({ checked, onChange, label = 'Select all' }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <label className="sel-all">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

// Sticky bulk-action bar shown when at least one item is selected.
export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="selection-bar">
      <span className="sel-count"><Icon name="check" className="" /> {count} selected</span>
      <div className="sel-actions">{children}</div>
      <button className="toolbar-btn sel-clear" onClick={onClear}><Icon name="x" className="" /> Clear</button>
    </div>
  );
}

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

export function EmptyState({ icon = 'list', title, text }: { icon?: string; title: string; text?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} className="" /></div>
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
    </div>
  );
}
