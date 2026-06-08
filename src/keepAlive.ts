import axios from 'axios';

/**
 * Keeps a free-tier host (e.g. Render) from spinning the service down.
 * Render free Web Services sleep after ~15 min with no inbound traffic, so we
 * ping our own /health endpoint on an interval. No-op locally (only runs when
 * RENDER_EXTERNAL_URL or KEEPALIVE_URL is set).
 */
export function startKeepAlive(): void {
  const base = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base) {
    console.log('💤 Keep-alive disabled (no RENDER_EXTERNAL_URL / KEEPALIVE_URL)');
    return;
  }

  const target = base.replace(/\/+$/, '') + '/health';
  // Default 14 min — comfortably under Render's ~15 min idle window.
  const intervalMs = Number(process.env.KEEPALIVE_INTERVAL_MS) || 14 * 60 * 1000;

  const ping = async () => {
    try {
      await axios.get(target, { timeout: 10_000 });
    } catch (error: any) {
      console.warn('[keep-alive] ping failed:', error?.message || error);
    }
  };

  setInterval(ping, intervalMs);
  console.log(`💓 Keep-alive: pinging ${target} every ${Math.round(intervalMs / 60000)} min`);
}
