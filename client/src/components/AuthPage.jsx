import { useState } from 'react';
import { ArrowLeft, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode }) {
  const registering = mode === 'register';
  const { user, loading: authLoading, login, register } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!authLoading && user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const account = registering ? await register(form) : await login({ email: form.email, password: form.password });
      const requested = searchParams.get('next');
      const safePath = requested?.startsWith('/') && !requested.startsWith('//') ? requested : null;
      navigate(safePath || (account.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'We could not complete that request.');
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <Link className="auth-back" to="/"><ArrowLeft size={14} /> Back to access options</Link>
      <section className="auth-card">
        <span className="auth-mark">{registering ? <Sparkles size={20} /> : <ShieldCheck size={20} />}</span>
        <span className="section-kicker">{registering ? 'YOUR CREATIVE SPACE' : 'WELCOME BACK'}</span>
        <h1>{registering ? 'Make it yours.' : 'Good to see you.'}</h1>
        <p>{registering ? 'Create a standard user account. Administrator access can only be provisioned privately.' : 'Sign in to continue to your MemeMind workspace.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {registering && <label>Display name<input autoComplete="name" minLength="2" maxLength="30" required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>}
          <label>Email address<input type="email" autoComplete="email" maxLength="254" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Password<input type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 12 : undefined} maxLength="72" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{registering && <small>Use at least 12 characters.</small>}</label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="button-primary auth-submit" disabled={busy || authLoading}>{busy ? <LoaderCircle size={16} className="spin" /> : null}{busy ? 'One moment…' : registering ? 'Create my account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{registering ? 'Already have an account?' : 'New around here?'} <Link to={registering ? '/login' : '/register'}>{registering ? 'Sign in' : 'Create an account'}</Link></p>
      </section>
    </main>
  );
}
