import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import type { Company } from '../types';

export function EditCompanyModal({
  company, onClose, onSaved,
}: {
  company: Company; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast('Enter a name'); return; }
    setSaving(true);
    try {
      await api.put(`/companies/${company.id}`, { name: name.trim() });
      toast('Saved');
      onSaved();
    } catch (e: any) {
      toast((e?.message || 'Save failed'));
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this company?')) return;
    try {
      await api.del(`/companies/${company.id}`);
      toast('Deleted');
      onSaved();
    } catch (e: any) {
      toast((e?.message || 'Cannot delete — company has drivers'));
    }
  }

  return (
    <Modal
      title="Edit Company"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger" onClick={remove} style={{ marginRight: 'auto' }}>Delete</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Company Name</label>
        <input className="form-input" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>
    </Modal>
  );
}
