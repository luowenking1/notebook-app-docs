import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

export default function AuthScreen() {
  const { login, register, authError, clearAuthError } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    clearAuthError();
    setLocalError(null);
    setInfo(null);
  }

  async function handleLoginOrRegister(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'register') await register(email, password);
      else await login(email, password);
    } catch {
      // authError is already set by AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const result = await api.forgotPassword(email);
      setInfo(
        result.devResetToken
          ? `Dev mode: no email provider is configured, so here's the reset token directly: ${result.devResetToken}`
          : result.message
      );
      if (result.devResetToken) setResetToken(result.devResetToken);
      setMode('reset');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await api.resetPassword(resetToken, newPassword);
      setInfo('Password updated. You can log in now.');
      setMode('login');
      setPassword('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const errorToShow = mode === 'login' || mode === 'register' ? authError : localError;

  return (
    <section className="auth-screen">
      <div className="auth-panel">
        <h1 className="auth-title">Notebook</h1>
        <p className="auth-subtitle">A quiet place to keep what you're thinking.</p>

        {info && mode !== 'reset' ? <p className="auth-error" style={{ color: 'var(--color-accent-dark)', background: 'var(--color-accent-soft)' }}>{info}</p> : null}

        {(mode === 'login' || mode === 'register') && (
          <form className="auth-form" onSubmit={handleLoginOrRegister}>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {errorToShow ? <p className="auth-error">{errorToShow}</p> : null}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {mode === 'register' ? 'Sign up' : 'Log in'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form className="auth-form" onSubmit={handleForgot}>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            {errorToShow ? <p className="auth-error">{errorToShow}</p> : null}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              Send reset link
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form className="auth-form" onSubmit={handleReset}>
            <label className="field">
              <span>Reset token</span>
              <input type="text" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>
            {errorToShow ? <p className="auth-error">{errorToShow}</p> : null}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              Reset password
            </button>
          </form>
        )}

        <p className="auth-toggle">
          {mode === 'login' && (
            <>
              <span>Don't have an account? </span>
              <button type="button" className="link-btn" onClick={() => switchMode('register')}>
                Sign up
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              <span>Already have an account? </span>
              <button type="button" className="link-btn" onClick={() => switchMode('login')}>
                Log in
              </button>
            </>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button type="button" className="link-btn" onClick={() => switchMode('login')}>
              Back to log in
            </button>
          )}
        </p>

        {mode === 'login' && (
          <p className="auth-forgot">
            <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>
              Forgot password?
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
