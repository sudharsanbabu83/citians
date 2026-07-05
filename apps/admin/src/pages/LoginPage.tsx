import { type FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signIn, authError, clearError, profile, isLoading } = useAuth();
  const [email, setEmail] = useState('admin.campusflow@citchennai.net');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && profile?.role === 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // error shown via authError
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>CampusFlow Admin</h1>
        <p>Sign in with your admin college email to manage departments, users, and OD workflows.</p>
        {authError && <div className="error-banner">{authError}</div>}
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
