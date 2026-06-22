import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';
import { ImageDrop, type PickedImage } from './ImageDrop';
import { groupDisplay } from '../lib/helpers';
import type { TelegramGroup } from '../types';

export function SendMessageModal({ group, onClose }: { group: TelegramGroup; onClose: () => void }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim() && images.length === 0) { toast('Add a message or an image'); return; }
    setSending(true);
    try {
      await api.post(`/groups/${group.group_id}/message`, { text, photos: images.map((i) => i.dataUrl) });
      toast('Message sent');
      onClose();
    } catch {
      toast('Failed to send');
      setSending(false);
    }
  }

  return (
    <Modal
      title={groupDisplay(group)}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={send} disabled={sending}><Icon name="send" /> {sending ? 'Sending…' : 'Send'}</button>
        </>
      }
    >
      <ImageDrop images={images} onChange={setImages} />
      <div className="form-group">
        <label className="form-label">{images.length ? 'Caption (optional)' : 'Message (Markdown supported)'}</label>
        <textarea className="form-input" rows={4} value={text} autoFocus onChange={(e) => setText(e.target.value)} placeholder="Type your message..." />
      </div>
    </Modal>
  );
}
