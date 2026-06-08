import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import type { TelegramGroup } from '../types';

export function EditGroupModal({
  group, onClose, onSaved,
}: {
  group: TelegramGroup; onClose: () => void; onSaved: () => void;
}) {
  const [adminName, setAdminName] = useState(group.admin_name || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/groups/${group.group_id}`, { admin_name: adminName });
      toast('✅ Group renamed');
      onSaved();
    } catch {
      toast('❌ Failed to rename');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Rename Group"
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
    </Modal>
  );
}
