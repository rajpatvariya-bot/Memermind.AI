import { useEffect, useState } from 'react';
import { ArrowUpRight, LoaderCircle, Search, Sparkles } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export default function CommunityFeed({ onRemix }) {
  const [memes, setMemes] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadMemes(search = '') {
    setLoading(true); setError('');
    try {
      const result = search.trim().length >= 2
        ? await apiRequest(`/memes/search?q=${encodeURIComponent(search.trim())}`)
        : await apiRequest('/memes');
      setMemes(result.memes);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadMemes(); }, []);

  return (
    <section className="community-page">
      <div className="community-hero">
        <div><span className="section-kicker">THE COMMUNITY WALL</span><h1>Made for the <span>group chat.</span></h1><p>Fresh creations from this studio. Search the punchline, find your people.</p></div>
        <div className="community-sparkle"><Sparkles size={46} /></div>
      </div>
      <form className="search-bar" onSubmit={(event) => { event.preventDefault(); loadMemes(query); }}>
        <Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search captions, tags, or situations..." aria-label="Search memes" maxLength={100} />
        <button type="submit" className="button-primary">Search</button>
      </form>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {loading ? <div className="feed-loading"><LoaderCircle size={22} className="spin" />Loading the wall...</div> : memes.length ? <div className="meme-grid">
        {memes.map((meme) => <article className="meme-card" key={meme._id}>
          <img src={meme.imageData} alt={meme.caption} loading="lazy" />
          <div className="meme-card-copy"><p>{meme.caption}</p><div className="meme-card-tags">{(meme.tags ?? []).slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div><button type="button" onClick={() => onRemix(meme)}>Remix this <ArrowUpRight size={14} /></button></div>
        </article>)}
      </div> : <div className="empty-feed"><span className="empty-emoji">🪩</span><h2>{query.trim().length >= 2 ? 'No matching memes yet.' : 'It’s quiet in here.'}</h2><p>{query.trim().length >= 2 ? 'Try a different word, or make the first meme about it.' : 'Be the first to drop a meme on the wall.'}</p></div>}
      <button type="button" className="refresh-feed" onClick={() => loadMemes(query)} disabled={loading}>Refresh wall</button>
    </section>
  );
}

