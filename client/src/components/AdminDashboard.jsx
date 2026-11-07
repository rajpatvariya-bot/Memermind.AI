import { useCallback, useEffect, useState } from 'react';
import { Activity, LoaderCircle, ShieldCheck, Users } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 10;

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true); setError('');
    try {
      const [summary, list] = await Promise.all([
        apiRequest('/admin/overview'),
        apiRequest(`/admin/users?page=${requestedPage}&limit=${pageSize}`),
      ]);
      setOverview(summary); setUsers(list.users); setTotal(list.total); setPage(requestedPage);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(1); }, []); // load the first real server page once

  async function changeStatus(account) {
    const status = account.status === 'active' ? 'suspended' : 'active';
    setBusyId(account.id); setError('');
    try {
      await apiRequest(`/admin/users/${account.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load(page);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <main className="dashboard-page admin-dashboard">
      <section className="dashboard-heading">
        <div><span className="section-kicker">RESTRICTED MANAGEMENT</span><h1>Admin console.</h1><p>Account and content totals come directly from MongoDB.</p></div>
        <span className="admin-secure"><ShieldCheck size={15} /> ADMIN ACCESS</span>
      </section>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {loading && !overview ? <div className="dashboard-loading"><LoaderCircle size={22} className="spin" />Loading management data…</div> : <>
        <section className="admin-stat-grid" aria-label="Live application overview">
          <article><span><Users size={15} /> REGISTERED ACCOUNTS</span><strong>{overview?.users ?? '—'}</strong><small>Counted from the user collection</small></article>
          <article><span>MEME RECORDS</span><strong>{overview?.memes ?? '—'}</strong><small>Public creations and saved drafts</small></article>
          <article><span><Activity size={15} /> AI PROVIDER</span><strong>{overview?.ai?.enabled ? 'Online' : 'Not configured'}</strong><small>{overview?.ai?.provider || 'No provider'} · {overview?.ai?.model || '—'}</small></article>
        </section>
        <section className="admin-users-panel">
          <div className="dashboard-section-heading"><div><span className="section-kicker">ACCOUNT CONTROLS</span><h2>Users</h2></div><span className="admin-result-count">{total} total</span></div>
          {loading ? <div className="dashboard-loading"><LoaderCircle size={20} className="spin" />Updating accounts…</div> : <div className="admin-table-scroll"><table className="admin-users-table"><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
            {users.map((account) => <tr key={account.id}><td><strong>{account.displayName}</strong><small>{account.email}</small></td><td><span className={`role-tag role-tag-${account.role}`}>{account.role}</span></td><td><span className={`account-status account-status-${account.status}`}>{account.status}</span></td><td>{new Date(account.createdAt).toLocaleDateString()}</td><td><button type="button" className="account-action" disabled={busyId === account.id || account.role === 'admin'} onClick={() => changeStatus(account)}>{busyId === account.id ? 'Saving…' : account.status === 'active' ? 'Suspend' : 'Reactivate'}</button></td></tr>)}
            {!users.length && <tr><td colSpan="5" className="admin-no-users">No registered accounts yet.</td></tr>}
          </tbody></table></div>}
          <div className="admin-pagination"><span>Page {page} of {pages}</span><div><button type="button" className="button-secondary" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>Previous</button><button type="button" className="button-secondary" disabled={page >= pages || loading} onClick={() => load(page + 1)}>Next</button></div></div>
        </section>
        <p className="admin-scope-note">Reports, audit logs, and storage monitoring are not connected yet, so this console does not display placeholder data for them.</p>
      </>}
    </main>
  );
}
