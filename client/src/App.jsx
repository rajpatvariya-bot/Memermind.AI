import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, CircleHelp, LogOut, Sparkles } from 'lucide-react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Brand from './components/Brand.jsx';
import StatusPill from './components/StatusPill.jsx';
import CaptionPanel from './components/CaptionPanel.jsx';
import MemeEditor from './components/MemeEditor.jsx';
import TemplatePanel from './components/TemplatePanel.jsx';
import CommunityFeed from './components/CommunityFeed.jsx';
import AccessPage from './components/AccessPage.jsx';
import AuthPage from './components/AuthPage.jsx';
import UserDashboard from './components/UserDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { templates } from './data/templates.js';
import { apiRequest } from './lib/api.js';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const [health, setHealth] = useState(null);
  const [toast, setToast] = useState('');
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { apiRequest('/health').then(setHealth).catch(() => setHealth({ offline: true })); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function signOut() {
    try { await logout(); navigate('/', { replace: true }); setToast('You are signed out.'); }
    catch (error) { setToast(error.message); }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/explore" className={({ isActive }) => isActive ? 'active' : ''}>Studio</NavLink>
          <NavLink to="/community" className={({ isActive }) => isActive ? 'active' : ''}>Community</NavLink>
          {!authLoading && user && <NavLink to={user.role === 'admin' ? '/admin' : '/dashboard'} className={({ isActive }) => isActive ? 'active' : ''}>{user.role === 'admin' ? 'Admin' : 'My space'}</NavLink>}
        </nav>
        <div className="topbar-right">
          <StatusPill status={health} />
          {!authLoading && (user ? <button type="button" className="session-button" onClick={signOut}><span>{user.displayName}</span><LogOut size={14} /></button> : <Link className="topbar-signin" to="/login">Sign in</Link>)}
          <button type="button" className="help-button" title="Real model actions require a configured backend provider." onClick={() => setToast(health?.ai?.enabled ? `Generative AI is connected through ${health.ai.provider} using ${health.ai.model}.` : 'Real AI is not configured. Set AI_PROVIDER and GEMINI_API_KEY in server/.env. Offline examples are labeled and are not generative AI.')}><CircleHelp size={17} /></button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<AccessPage user={user} />} />
        <Route path="/explore" element={<StudioPage health={health} user={user} setToast={setToast} />} />
        <Route path="/community" element={<CommunityPage setToast={setToast} />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/dashboard" element={<RequireUser user={user} loading={authLoading}><UserDashboard onRemix={(meme) => navigate('/explore', { state: { meme } })} /></RequireUser>} />
        <Route path="/admin" element={<RequireAdmin user={user} loading={authLoading}><AdminDashboard /></RequireAdmin>} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {toast && <div className="toast-message" role="status">{toast}</div>}
      <span className="sr-only" aria-live="polite">{location.pathname === '/' ? 'Choose a MemeMind access level.' : ''}</span>
    </div>
  );
}

function RequireUser({ user, loading, children }) {
  const location = useLocation();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

function RequireAdmin({ user, loading, children }) {
  const location = useLocation();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.role !== 'admin') return <Navigate to="/forbidden" replace />;
  return children;
}

function RouteLoading() { return <main className="route-loading"><span className="spin">✳</span>Checking your access…</main>; }

function ForbiddenPage() {
  return <main className="auth-page"><section className="auth-card forbidden-card"><span className="auth-mark">403</span><span className="section-kicker">RESTRICTED AREA</span><h1>This space is private.</h1><p>Your account does not have administrator access.</p><Link className="button-primary auth-submit" to="/dashboard">Back to my dashboard</Link></section></main>;
}

function CommunityPage({ setToast }) {
  const navigate = useNavigate();
  return <main className="community-wrap"><CommunityFeed onRemix={(meme) => { navigate('/explore', { state: { meme } }); setToast('Meme loaded into your canvas. Make it yours.'); }} /></main>;
}

function StudioPage({ health, user, setToast }) {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [editorImage, setEditorImage] = useState('');
  const [captionToApply, setCaptionToApply] = useState('');
  const [aiPrompt, setAiPrompt] = useState({ topic: 'Monday meetings', mood: 'chaotic' });
  const [aiImageResult, setAiImageResult] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const meme = location.state?.meme;
    if (!meme) return;
    setSelectedTemplate(null); setEditorImage(meme.imageData); setCaptionToApply(meme.caption); setAiImageResult(null);
  }, [location.key]);

  const updateAiPrompt = useCallback((value) => setAiPrompt(value), []);

  async function analyzeImageWithAi(image) {
    const result = await apiRequest('/ai/image-context', { method: 'POST', body: JSON.stringify({ image, ...aiPrompt }) });
    setAiImageResult(result);
    return result;
  }

  function selectTemplate(template) {
    setAiImageResult(null);
    setSelectedTemplate(template);
    if (template) setEditorImage('');
  }

  async function postToCommunity(meme) {
    setShareBusy(true);
    try {
      const { tags } = await apiRequest('/tools/tags', { method: 'POST', body: JSON.stringify({ text: `${meme.title} ${meme.caption}` }) });
      await apiRequest('/memes', { method: 'POST', body: JSON.stringify({ ...meme, tags: tags.slice(0, 6) }) });
      setToast('Your meme is on the community wall.');
    } catch (error) { setToast(error.message); }
    finally { setShareBusy(false); }
  }

  async function saveDraft(meme) {
    setSaveBusy(true);
    try {
      const { tags } = await apiRequest('/tools/tags', { method: 'POST', body: JSON.stringify({ text: `${meme.title} ${meme.caption}` }) });
      await apiRequest('/memes/drafts', { method: 'POST', body: JSON.stringify({ ...meme, tags: tags.slice(0, 6) }) });
      setToast('Saved privately to your dashboard.');
    } catch (error) { setToast(error.message); }
    finally { setSaveBusy(false); }
  }

  return (
    <main className="studio-page">
      <motion.section className="hero-strip" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
        <div className="hero-copy"><span className="hero-eyebrow"><span className="hero-star">✳</span> GENERATIVE AI MEETS MEME CULTURE</span><h1>Make a meme.<br /><span>Make someone’s day.</span></h1><p>Give a model the context, then make the punchline your own.</p></div>
        <div className="hero-side"><div className="hero-sticker sticker-top">NO THOUGHTS<br />JUST MEMES</div><div className="hero-doodle">✳</div><div className="hero-count"><span>∞</span><small>ways to<br />say it</small></div><ArrowDownRight className="hero-arrow" size={28} /></div>
        <div className="hero-bottomline"><span><span className="green-dot" /> {health?.ai?.enabled ? `AI connected · ${health.ai.model}` : 'AI provider setup needed'}</span><span>MODEL-POWERED MEMES <ArrowUpRight size={13} /></span></div>
      </motion.section>
      <div className="studio-heading"><div><span className="section-kicker">THE CREATION STUDIO</span><h2>Start with a thought.</h2></div><span className="step-count">01 <i>/</i> 03 <span>idea → canvas → internet</span></span></div>
      <div className="studio-grid">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .08 }}><CaptionPanel onApplyCaption={setCaptionToApply} onPromptChange={updateAiPrompt} aiEnabled={health?.ai?.enabled} aiProvider={health?.ai?.provider} aiImageResult={aiImageResult} /></motion.div>
        <motion.div className="editor-column" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}><MemeEditor key="meme-editor" selectedTemplate={selectedTemplate} onSelectTemplate={selectTemplate} initialImage={editorImage} captionToApply={captionToApply} onShare={postToCommunity} onSaveDraft={user ? saveDraft : null} shareBusy={shareBusy} saveBusy={saveBusy} aiEnabled={health?.ai?.enabled} onAnalyzeImage={analyzeImageWithAi} /></motion.div>
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .16 }}><TemplatePanel templates={templates} selectedId={selectedTemplate?.id} onSelect={selectTemplate} onUpload={(event) => {
          const file = event.target.files?.[0]; event.target.value = '';
          if (!file) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { setToast('Choose a PNG, JPEG, or WebP image up to 10 MB.'); return; }
          const reader = new FileReader(); reader.onload = () => { setAiImageResult(null); setSelectedTemplate(null); setEditorImage(String(reader.result)); }; reader.readAsDataURL(file);
        }} /></motion.div>
      </div>
      <section className="workflow-note"><span className="workflow-icon"><Sparkles size={15} /></span><div><strong>AI runs through the private backend</strong><p>When configured, a multimodal model writes captions, rewrites tones, and reads image context. The backend validates structured responses; this app does not save prompts or image-analysis requests.</p></div><a href="https://ai.google.dev/gemini-api/docs/interactions-overview" target="_blank" rel="noreferrer">Provider docs <ArrowUpRight size={13} /></a></section>
      <footer className="page-footer"><span>MEMEMIND AI <i>·</i> MAKE SOMETHING SILLY</span><span>BUILT FOR CREATIVITY, NOT CREDENTIALS</span></footer>
    </main>
  );
}
