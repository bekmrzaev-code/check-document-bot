import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import type { Driver, Company } from '../types';

export function EditDriverModal({
  driver, companies, onClose, onSaved,
}: {
  driver: Driver; companies: Company[]; onClose: () => void; onSaved: () => void;
}) {
  const [adminName, setAdminName] = useState(driver.admin_name || '');
  const [truck, setTruck] = useState(driver.truck_number || '');
  const [company, setCompany] = useState(driver.company_id || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/drivers/${driver.id}`, { admin_name: adminName, truck_number: truck });
      if (company) await api.post(`/drivers/${driver.id}/assign`, { company_id: company });
      toast('✅ Saved');
      onSaved();
    } catch {
      toast('❌ Save failed');
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this driver permanently?')) return;
    try {
      await api.del(`/drivers/${driver.id}`);
      toast('✅ Deleted');
      onSaved();
    } catch {
      toast('❌ Failed');
    }
  }

  return (
    <Modal
      title="Edit Driver"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger" onClick={remove} style={{ marginRight: 'auto' }}>Delete</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <div className="detail-readonly"><span className="og-tag">TG</span> Telegram name: <strong>{driver.name}</strong></div>
      <div className="form-group">
        <label className="form-label">Display name (admin label)</label>
        <input className="form-input" value={adminName} autoFocus onChange={(e) => setAdminName(e.target.value)} placeholder="A clear name only you see, e.g. “John — Volvo, MD-1204”" />
      </div>
      <div className="form-group">
        <label className="form-label">Truck Number</label>
        <input className="form-input" value={truck} onChange={(e) => setTruck(e.target.value)} placeholder="e.g. TRK-001" />
      </div>
      <div className="form-group">
        <label className="form-label">Company</label>
        <select className="form-select" value={company} onChange={(e) => setCompany(e.target.value)}>
          <option value="">— Select company —</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </Modal>
  );
}
