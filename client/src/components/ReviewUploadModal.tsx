import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Lightbox } from './Lightbox';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';
import type { Company, PendingUpload } from '../types';

interface PendingImage { fileId: string; url: string; }

const CHECKS: { key: 'no_manuals' | 'no_tablet' | 'no_paperlog'; label: string }[] = [
  { key: 'no_manuals', label: 'No manuals' },
  { key: 'no_tablet', label: 'No tablet holder' },
  { key: 'no_paperlog', label: 'No paperlog' },
];

// Review a driver's pending documents: preview the photos (zoom via lightbox),
// pick which to approve, set the checklist + company/truck, then approve.
export function ReviewUploadModal({ upload, companies, onClose, onDone }: {
  upload: PendingUpload; companies: Company[]; onClose: () => void; onDone: () => void;
}) {
  const [images, setImages] = useState<PendingImage[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [companyId, setCompanyId] = useState('');
  const [truck, setTruck] = useState('');
  const [checklist, setChecklist] = useState({ no_manuals: false, no_tablet: false, no_paperlog: false });
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ images: PendingImage[] }>(`/uploads/${upload.id}/images`)
      .then((d) => {
        const imgs = d.images || [];
        setImages(imgs);
        setSelected(new Set(imgs.map((_, i) => i)));
      })
      .catch(() => setImages([]));
  }, [upload.id]);

  function toggle(i: number) {
    setSelected((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  async function approve() {
    if (!images || images.length === 0) { toast('No documents to approve'); return; }
    if (selected.size === 0) { toast('Select at least one photo'); return; }
    setBusy(true);
    try {
      await api.post(`/uploads/${upload.id}/approve`, {
        company_id: companyId || undefined,
        truck_number: truck.trim() || undefined,
        selected_indexes: Array.from(selected).sort((a, b) => a - b),
        checklist,
      });
      toast('Driver approved');
      onDone();
    } catch (e: any) {
      toast(e?.message || 'Approval failed');
      setBusy(false);
    }
  }

  async function reject() {
    if (!confirm('Reject this application?')) return;
    setBusy(true);
    try { await api.post(`/uploads/${upload.id}/reject`); toast('Application rejected'); onDone(); }
    catch { toast('Failed to reject'); setBusy(false); }
  }

  async function blockDriver() {
    if (!confirm('Never get requests from this driver again? Their future uploads will be ignored until you allow them again.')) return;
    setBusy(true);
    try { await api.post(`/drivers/${upload.driver_id}/block`); toast('Driver blocked — no more requests'); onDone(); }
    catch { toast('Failed to block'); setBusy(false); }
  }

  const displayName = upload.driver_admin_name?.trim() ? upload.driver_admin_name.trim() : upload.driver_name;
  const urls = (images || []).map((im) => im.url).filter(Boolean);

  return (
    <>
      <Modal
        title={`Review — ${displayName}`}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-secondary" onClick={blockDriver} disabled={busy} style={{ marginRight: 'auto' }} title="Never get requests from this driver">
              <Icon name="x" /> Never request
            </button>
            <button className="btn btn-danger" onClick={reject} disabled={busy}>
              <Icon name="close" /> Reject
            </button>
            <button className="btn btn-success" onClick={approve} disabled={busy}>
              <Icon name="check" /> {busy ? 'Approving…' : `Approve (${selected.size})`}
            </button>
          </>
        }
      >
        <div className="detail-readonly"><Icon name="groups" className="" /> {upload.group_name} · {upload.image_count} photo{upload.image_count !== 1 ? 's' : ''}</div>

        {/* Documents */}
        <div className="form-group">
          <label className="form-label">Documents — tap to zoom, checkbox to include</label>
          {images === null ? (
            <div className="list-sub">Loading documents…</div>
          ) : images.length === 0 ? (
            <div className="list-sub">No document images found for this upload.</div>
          ) : (
            <div className="review-grid">
              {images.map((im, i) => (
                <div className={`review-thumb ${selected.has(i) ? 'on' : ''}`} key={im.fileId + i}>
                  <img src={im.url} alt="" loading="lazy" onClick={() => setLightbox(i)} onError={(e) => (e.currentTarget.style.opacity = '0.2')} />
                  <label className="review-check" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                  </label>
                  <button className="review-zoom" title="Zoom" onClick={() => setLightbox(i)}><Icon name="maximize" className="" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="form-group">
          <label className="form-label">Checklist</label>
          <div className="check-row">
            {CHECKS.map((c) => (
              <label className={`check-pill ${checklist[c.key] ? 'on' : ''}`} key={c.key}>
                <input type="checkbox" checked={checklist[c.key]} onChange={(e) => setChecklist((s) => ({ ...s, [c.key]: e.target.checked }))} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        {/* Company + truck */}
        <div className="form-row-2">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Company (optional)</label>
            <select className="form-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— None —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Truck number (optional)</label>
            <input className="form-input" value={truck} onChange={(e) => setTruck(e.target.value)} placeholder="e.g. TX-1024" />
          </div>
        </div>
      </Modal>

      {lightbox !== null && urls.length > 0 && (
        <Lightbox
          images={urls}
          index={Math.min(lightbox, urls.length - 1)}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox(i)}
        />
      )}
    </>
  );
}
