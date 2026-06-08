import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Icon } from '../lib/ui';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already signed in, skip the login page
  useEffect(() => {
    api.get('/auth/me').then(() => navigate('/', { replace: true })).catch(() => {});
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/login', { password });
      navigate('/', { replace: true });
    } catch {
      setError('Invalid password');
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><Icon name="truck" className="" /></div>
        <div className="login-title">DriverFlow</div>
        <div className="login-sub">Admin Console — sign in to continue</div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
          />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="login-error">{error}</div>
      </form>
    </div>
  );
}
