import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';
import { ImageDrop, type PickedImage } from './ImageDrop';

// Sends one message (optionally with a photo) to every selected group.
export function BulkGroupMessageModal({
  groupIds, onClose, onSent,
}: {
  groupIds: number[]; onClose: () => void; onSent: () => void;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim() && images.length === 0) { toast('Add a message or an image'); return; }
    setSending(true);
    try {
      const d = await api.post<{ sent: number; failed: number }>('/groups/bulk-message', {
        group_ids: groupIds,
        text,
        photos: images.map((i) => i.dataUrl),
      });
      toast(`Sent to ${d.sent} group(s)${d.failed ? `, ${d.failed} failed` : ''}`);
      onSent();
    } catch {
      toast('Failed to send');
      setSending(false);
    }
  }

  return (
    <Modal
      title={`Message ${groupIds.length} group${groupIds.length !== 1 ? 's' : ''}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={send} disabled={sending}><Icon name="send" /> {sending ? 'Sending…' : 'Send to all'}</button>
        </>
      }
    >
      <div className="detail-readonly"><Icon name="groups" className="" /> Sending to <strong>{groupIds.length}</strong> selected group{groupIds.length !== 1 ? 's' : ''}.</div>
      <ImageDrop images={images} onChange={setImages} />
      <div className="form-group">
        <label className="form-label">{images.length ? 'Caption (optional)' : 'Message (Markdown supported)'}</label>
        <textarea className="form-input" rows={4} value={text} autoFocus onChange={(e) => setText(e.target.value)} placeholder="Type your message…" />
      </div>
    </Modal>
  );
}
