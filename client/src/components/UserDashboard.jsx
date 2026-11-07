import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, ImagePlus, LoaderCircle, LockKeyhole, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';

export default function UserDashboard({ onRemix }) {
  const [overview, setOverview] = useState(null);
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [summary, creations] = await Promise.all([apiRequest('/users/me/overview'), apiRequest('/memes/mine')]);
      setOverview(summary); setMemes(creations.memes);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function removeMeme(id) {
    if (!window.confirm('Delete this saved creation? This cannot be undone.')) return;
    try { await apiRequest(`/memes/mine/${id}`, { method: 'DELETE' }); await load(); }
    catch (deleteError) { setError(deleteError.message); }
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-heading">
        <div><span className="section-kicker">YOUR CREATIVE SPACE</span><h1>Your dashboard.</h1><p>Your account and saved creations, together in one place.</p></div>
        <Link to="/explore" className="button-primary"><ImagePlus size={15} />Create a meme</Link>
      </section>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {loading ? <div className="dashboard-loading"><LoaderCircle size={22} className="spin" />Loading your workspace…</div> : <>
        <section className="dashboard-summary" aria-label="Your account overview">
          <article><span>ACCOUNT</span><strong>{overview?.user.displayName}</strong><small>{overview?.user.email}</small></article>
          <article><span>SAVED CREATIONS</span><strong>{overview?.creations ?? 0}</strong><small>Private drafts and your shared memes</small></article>
        </section>
        <section className="dashboard-creations">
          <div className="dashboard-section-heading"><div><span className="section-kicker">MADE BY YOU</span><h2>My creations</h2></div><button type="button" className="button-secondary" onClick={load} disabled={loading}>Refresh</button></div>
          {memes.length ? <div className="dashboard-meme-grid">{memes.map((meme) => <article className="dashboard-meme" key={meme._id}>
            <img src={meme.imageData} alt={meme.caption} loading="lazy" />
            <div className="dashboard-meme-copy"><span className="visibility-label">{meme.visibility === 'private' ? <><LockKeyhole size={12} /> PRIVATE</> : 'SHARED'}</span><p>{meme.caption}</p><div><button type="button" onClick={() => onRemix(meme)}>Open in studio <ArrowUpRight size={13} /></button><button type="button" className="icon-danger" aria-label={`Delete ${meme.caption}`} onClick={() => removeMeme(meme._id)}><Trash2 size={14} /></button></div></div>
          </article>)}</div> : <div className="dashboard-empty"><span>✳</span><h2>Your first creation is waiting.</h2><p>Make a meme, then save a private draft or share it with the community.</p><Link to="/explore" className="button-primary">Open the studio <ArrowUpRight size={14} /></Link></div>}
        </section>
      </>}
    </main>
  );
}
