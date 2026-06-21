import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';
import type { TelegramGroup, Company } from '../types';

export function EditGroupModal({
  group, companies, onClose, onSaved,
}: {
  group: TelegramGroup; companies: Company[]; onClose: () => void; onSaved: () => void;
}) {
  const [adminName, setAdminName] = useState(group.admin_name || '');
  const [companyId, setCompanyId] = useState(group.company_id || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/groups/${group.group_id}`, {
        admin_name: adminName,
        company_id: companyId || null,
      });
      toast('Group updated');
      onSaved();
    } catch {
      toast('Failed to save');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Edit Group"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <div className="detail-readonly"><span className="og-tag">TG</span> Telegram name: <strong>{group.group_name}</strong></div>
      <div className="form-group">
        <label className="form-label">Display name (admin label)</label>
        <input className="form-input" value={adminName} autoFocus onChange={(e) => setAdminName(e.target.value)} placeholder="A clear name only you see, e.g. “Region 5 — Day shift”" />
      </div>
      <div className="form-group">
        <label className="form-label"><Icon name="building" className="" /> Company</label>
        <select className="form-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="">— No company —</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <p className="side-hint" style={{ marginTop: '0.4rem' }}>Attach this group to a company so it appears under that company.</p>
      </div>
    </Modal>
  );
}
