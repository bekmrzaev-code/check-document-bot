import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';
import { groupDisplay } from '../lib/helpers';
import type { TelegramGroup } from '../types';

export function SendMessageModal({ group, onClose }: { group: TelegramGroup; onClose: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim()) { toast('Enter a message'); return; }
    setSending(true);
    try {
      await api.post(`/groups/${group.group_id}/message`, { text });
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
      <div className="form-group">
        <label className="form-label">Message (Markdown supported)</label>
        <textarea className="form-input" rows={4} value={text} autoFocus onChange={(e) => setText(e.target.value)} placeholder="Type your message..." />
      </div>
    </Modal>
  );
}
