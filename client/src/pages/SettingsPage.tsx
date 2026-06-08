import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';

function GuideItem({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`guide-item ${open ? 'open' : ''}`}>
      <div className="guide-head" onClick={() => setOpen((o) => !o)}>
        <div className="guide-ico"><Icon name={icon} className="" /></div>
        <div className="guide-htext"><div className="guide-htitle">{title}</div><div className="guide-hsub">{sub}</div></div>
        <span className="guide-chevron">›</span>
      </div>
      <div className="guide-body"><div className="guide-inner">{children}</div></div>
    </div>
  );
}

export default function SettingsPage() {
  const [channelId, setChannelId] = useState('');
  const [savedChannel, setSavedChannel] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  async function loadChannel() {
    try {
      const d = await api.get<{ channelId: string | null }>('/settings/channel');
      setChannelId(d.channelId || '');
      setSavedChannel(d.channelId || '');
    } catch { /* ignore */ }
  }
  useEffect(() => { loadChannel(); }, []);

  async function saveChannel() {
    if (!channelId.trim()) { toast('Enter a channel ID'); return; }
    try { await api.post('/settings/channel', { channelId: channelId.trim() }); setSavedChannel(channelId.trim()); toast('✅ Channel saved'); }
    catch { toast('❌ Failed to save'); }
  }

  async function sendDrivers() {
    setSyncStatus('Sending…');
    try {
      const d = await api.post<{ message: string; count: number }>('/settings/channel/sync');
      setSyncStatus(`✅ ${d.message} (${d.count} drivers)`);
    } catch (e: any) {
      setSyncStatus(`❌ ${e?.message || 'Failed'}`);
    }
    setTimeout(() => setSyncStatus(''), 6000);
  }

  async function clearCompanies() {
    if (!confirm('Delete ALL companies permanently?')) return;
    if (!confirm('Final warning — this cannot be undone. Proceed?')) return;
    try { await api.post('/settings/clear/companies', { confirm: 'DELETE_ALL_COMPANIES' }); toast('✅ All companies deleted'); }
    catch { toast('❌ Failed'); }
  }

  async function clearDrivers() {
    if (!confirm('Delete ALL drivers permanently?')) return;
    if (!confirm('Final warning — this cannot be undone. Proceed?')) return;
    try { await api.post('/settings/clear/drivers', { confirm: 'DELETE_ALL_DRIVERS' }); toast('✅ All drivers deleted'); }
    catch { toast('❌ Failed'); }
  }

  return (
    <>
      <div className="section-header"><div><h2>Settings &amp; Guide</h2><p>How to use the dashboard, plus bot &amp; channel configuration</p></div></div>

      <div className="panel">
        <div className="panel-title">📖 Admin Guide — how to use this dashboard</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Tap any topic to expand. New here? Start with <strong style={{ color: 'var(--text)' }}>How it works</strong>.</p>
        <div className="guide-grid">
          <GuideItem icon="pending" title="How it works" sub="The big picture in 30 seconds">
            Drivers send document photos in a Telegram group → the bot bundles them into a <strong>Pending review</strong> → you check the photos, assign a company &amp; truck, and approve. Approved drivers are organized by company and can auto-post to a channel.
            <ol>
              <li><strong>Driver</strong> sends photos in a group the bot is in.</li>
              <li>Bot creates a review in <span className="gk">Pending Reviews</span>.</li>
              <li>You <strong>review &amp; approve</strong> (or reject).</li>
              <li>Approved driver appears under <span className="gk">Drivers</span>.</li>
            </ol>
          </GuideItem>

          <GuideItem icon="check" title="Reviewing &amp; approving" sub="Pending Reviews tab">
            <ul>
              <li>Open a row, <strong>select the photos</strong> to approve, optionally set company &amp; truck, then <strong>Approve</strong>.</li>
              <li>The green <span className="gk">✓</span> approves all photos instantly; the red <span className="gk">✕</span> rejects.</li>
            </ul>
          </GuideItem>

          <GuideItem icon="drivers" title="The two-name system" sub="Drivers &amp; Groups">
            Each driver/group shows a <strong>big admin label</strong> (a clear name you set) and a <strong>small grey</strong> <span className="gk">TG</span> name (the original Telegram name, never overwritten). Add a label via <strong>Edit</strong> / <strong>Rename</strong>. Search matches both.
          </GuideItem>

          <GuideItem icon="companies" title="Companies" sub="Organize drivers">
            Add a company, assign drivers (on approval or via Edit Driver), and click a company to see its drivers. A company with drivers can't be deleted until you reassign them.
          </GuideItem>

          <GuideItem icon="groups" title="Telegram groups &amp; sync" sub="Groups tab">
            <ul>
              <li>Add the bot to a group; press <strong>Sync Groups</strong> to refresh names, counts &amp; status.</li>
              <li>Expanding a group shows its drivers split into <strong>Approved / Not approved / Rejected</strong>.</li>
              <li>A group goes inactive only when the bot is actually removed.</li>
            </ul>
            <div className="guide-tip"><strong>Important:</strong> in <span className="gk">@BotFather → /setprivacy → Disable</span> so the bot sees group photos.</div>
          </GuideItem>

          <GuideItem icon="send" title="Daily scheduled messages" sub="Auto-send every day">
            In the Groups tab, open <strong>Daily scheduled message</strong>: type the message, pick a time, choose <strong>All</strong> or specific groups (or quick-select by driver category), then schedule. The bot resends it every day until you delete it. Pause/resume anytime.
          </GuideItem>

          <GuideItem icon="tag" title="Channel auto-posting" sub="Publish approved drivers">
            Set your <strong>Channel ID</strong> below (the bot must be a channel <strong>admin</strong>). Approving a driver posts their info + photos to the channel. Use <strong>Send Drivers List</strong> for a full summary on demand.
            <div className="guide-tip">Find a channel ID by forwarding a channel post to <span className="gk">@userinfobot</span>. IDs look like <span className="gk">-1001234567890</span>.</div>
          </GuideItem>

          <GuideItem icon="settings" title="Shortcuts &amp; tips" sub="Work faster">
            <ul>
              <li>Use the <strong>grid/list toggle</strong> on every section.</li>
              <li>The <span className="gk">&lt;1&gt; &lt;2&gt;</span> numbers help you reference rows.</li>
              <li>Lists paginate at 20 items per page.</li>
            </ul>
          </GuideItem>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">🚀 First-time setup checklist</div>
        <div className="setup-list">
          <div className="setup-step"><div className="setup-num">1</div><div className="s-body"><strong>Disable bot privacy</strong><p>In <code>@BotFather → /setprivacy → Disable</code>, so the bot sees group photos.</p></div></div>
          <div className="setup-step"><div className="setup-num">2</div><div className="s-body"><strong>Add the bot to your driver groups</strong><p>Then open <strong>Groups</strong> and press <strong>Sync Groups</strong>.</p></div></div>
          <div className="setup-step"><div className="setup-num">3</div><div className="s-body"><strong>Create your companies</strong><p>In the <strong>Companies</strong> tab, so you can assign drivers on approval.</p></div></div>
          <div className="setup-step"><div className="setup-num">4</div><div className="s-body"><strong>Set your channel (optional)</strong><p>Add the bot as a channel admin and save the Channel ID below.</p></div></div>
          <div className="setup-step"><div className="setup-num">5</div><div className="s-body"><strong>You're ready</strong><p>Drivers send photos → review in <strong>Pending Reviews</strong> → approve.</p></div></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">📢 Telegram Channel <span className={`settings-status ${savedChannel ? 'ok' : 'off'}`} style={{ marginLeft: '0.5rem' }}>{savedChannel ? 'Connected' : 'Not set'}</span></div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Approved drivers are automatically posted here. The bot must be an <strong style={{ color: 'var(--text)' }}>admin</strong> of the channel.</p>
        <div className="form-group">
          <label className="form-label">Channel ID</label>
          <input className="form-input" placeholder="e.g. -1001234567890" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={saveChannel}>💾 Save Channel</button>
          <button className="btn btn-secondary" onClick={loadChannel}>↻ Reload</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">📤 Post drivers list to channel</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Send a formatted summary of all approved drivers to your channel right now.</p>
        <button className="btn btn-success" onClick={sendDrivers}>Send Drivers List</button>
        {syncStatus && <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>{syncStatus}</div>}
      </div>

      <div className="danger-panel">
        <h3>⚠️ Danger Zone</h3>
        <p>Permanently delete all records. This cannot be undone.</p>
        <div className="btn-group">
          <button className="btn btn-danger" onClick={clearCompanies}>Delete All Companies</button>
          <button className="btn btn-danger" onClick={clearDrivers}>Delete All Drivers</button>
        </div>
      </div>
    </>
  );
}
