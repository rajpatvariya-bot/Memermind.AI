import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, LoaderCircle, Sparkles, WandSparkles } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

const moods = [['chaotic', 'Chaotic'], ['relatable', 'Relatable'], ['confident', 'Confident'], ['tired', 'Running on 1%']];
const tones = ['Funny', 'Sarcastic', 'Dark humour', 'Gen-Z slang', 'Relatable', 'Savage'];

export default function CaptionPanel({ aiEnabled = false, aiProvider, aiImageResult, onPromptChange, onApplyCaption }) {
  const [topic, setTopic] = useState('Monday meetings');
  const [mood, setMood] = useState('chaotic');
  const [caption, setCaption] = useState('');
  const [captions, setCaptions] = useState([]);
  const [aiMetadata, setAiMetadata] = useState(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [demoCaption, setDemoCaption] = useState('');
  const [demoCaptions, setDemoCaptions] = useState([]);

  useEffect(() => { onPromptChange?.({ topic, mood }); }, [topic, mood, onPromptChange]);

  async function generateWithAi() {
    if (!aiEnabled) return setError('Real AI is not configured. Add a Gemini key to server/.env and restart the API.');
    if (topic.trim().length < 2) return setError('Add a little more context first.');
    setLoading('generate'); setError('');
    try {
      const result = await apiRequest('/ai/captions', { method: 'POST', body: JSON.stringify({ topic, mood }) });
      setCaptions(result.captions);
      setAiMetadata({ description: result.description, category: result.category, tags: result.tags, stickers: result.stickers, model: result.model });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(''); }
  }

  async function rewriteWithAi(tone) {
    if (!aiEnabled) return setError('Real AI is not configured. Add a Gemini key to server/.env and restart the API.');
    if (caption.trim().length < 2) return setError('Choose an AI caption or write a caption to rewrite.');
    setLoading(tone); setError('');
    try {
      const result = await apiRequest('/ai/rewrite', { method: 'POST', body: JSON.stringify({ caption, tone }) });
      setCaption(result.caption); onApplyCaption(result.caption);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(''); }
  }

  function selectCaption(value) { setCaption(value); onApplyCaption(value); }

  async function runLocalDemo() {
    if (topic.trim().length < 2) return setError('Add a little more context first.');
    setLoading('demo'); setError('');
    try {
      const result = await apiRequest('/tools/captions', { method: 'POST', body: JSON.stringify({ topic, mood }) });
      setDemoCaptions(result.captions);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(''); }
  }

  async function rewriteLocalDemo(tone) {
    if (demoCaption.trim().length < 2) return setError('Type a caption in the offline demo box first.');
    setLoading(`demo-${tone}`); setError('');
    try {
      const result = await apiRequest('/tools/rewrite', { method: 'POST', body: JSON.stringify({ caption: demoCaption, tone }) });
      setDemoCaption(result.caption);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(''); }
  }

  return (
    <section className="tool-panel caption-panel" aria-labelledby="caption-title">
      <div className="panel-heading">
        <span className="section-kicker">01 / THE IDEA</span>
        <h2 id="caption-title">AI caption lab <Sparkles size={17} /></h2>
        <p>Describe the situation. The configured model writes the punchline.</p>
      </div>

      <div className={`ai-status-card ${aiEnabled ? 'ready' : 'offline'}`} role="status">
        <span className="ai-status-dot" />
        <span>{aiEnabled ? `Generative AI ready · ${aiProvider}` : 'Generative AI not configured'}</span>
      </div>
      <label className="field-label" htmlFor="topic">What happened?</label>
      <textarea id="topic" className="text-input topic-input" value={topic} maxLength={180} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. opening my inbox after vacation" />

      <div className="label-row"><span className="field-label">Pick the energy</span><span className="char-count">{topic.length}/180</span></div>
      <div className="mood-grid" role="group" aria-label="Caption mood">
        {moods.map(([value, label]) => <button key={value} type="button" className={`mood-chip ${mood === value ? 'selected' : ''}`} onClick={() => setMood(value)}>{label}</button>)}
      </div>

      <button type="button" className="button-primary generate-button" onClick={generateWithAi} disabled={Boolean(loading) || !aiEnabled} title={!aiEnabled ? 'Configure the backend AI provider to enable real generation' : undefined}>
        {loading === 'generate' ? <LoaderCircle className="spin" size={16} /> : <WandSparkles size={16} />}
        {loading === 'generate' ? 'Asking the model…' : 'Generate captions with AI'}
        <ArrowRight size={16} />
      </button>
      {!aiEnabled && <p className="ai-config-hint">Add <code>GEMINI_API_KEY</code> to <code>server/.env</code>; see the README setup guide.</p>}

      {error && <p className="inline-error" role="alert">{error}</p>}
      {aiMetadata && <div className="ai-metadata"><span className="ai-description">{aiMetadata.description}</span><span className="category-tag">{aiMetadata.category}</span>{aiMetadata.tags.slice(0, 5).map((tag) => <span key={tag} className="tag-muted">#{tag}</span>)}<small>Model: {aiMetadata.model}</small><span className="sticker-ideas">Sticker ideas: {aiMetadata.stickers.join(' · ')}</span></div>}
      {captions.length > 0 && <div className="caption-results" aria-live="polite">
        <div className="result-title"><span>Model generated</span><span className="result-count">{captions.length} ideas</span></div>
        {captions.map((idea, index) => <button type="button" className="caption-option" key={`${idea}-${index}`} onClick={() => selectCaption(idea)}><span>{idea}</span><ArrowDownToLine size={15} aria-label="Use this caption" /></button>)}
      </div>}

      {aiImageResult && <div className="ai-image-result" aria-live="polite">
        <div className="result-title"><span>Image understanding</span><span className="result-count">{aiImageResult.category}</span></div>
        <p>{aiImageResult.description}</p>
        <div className="ai-tag-list">{aiImageResult.tags.map((tag) => <span key={tag} className="tag-muted">#{tag}</span>)}</div>
        <p><strong>Sticker recommendations:</strong> {aiImageResult.stickers.join(' · ')}</p>
        {aiImageResult.captions.map((idea, index) => <button type="button" className="caption-option" key={`${idea}-${index}`} onClick={() => selectCaption(idea)}><span>{idea}</span><ArrowDownToLine size={15} /></button>)}
      </div>}

      <div className="tone-section">
        <div className="result-title"><span>AI tone rewrite</span><span className="tone-note">GENERATIVE</span></div>
        <textarea className="text-input rewrite-input" value={caption} maxLength={180} onChange={(event) => setCaption(event.target.value)} placeholder="Choose an AI caption or write your own..." aria-label="Caption to rewrite with AI" />
        <div className="tone-chips">{tones.map((tone) => <button type="button" key={tone} className="tone-chip" onClick={() => rewriteWithAi(tone)} disabled={Boolean(loading) || !aiEnabled}>{loading === tone ? <LoaderCircle className="spin" size={12} /> : null}{tone}</button>)}</div>
      </div>

      <details className="local-demo-tools">
        <summary>Offline demo tools <span>pattern-based · not generative AI</span></summary>
        <p>These deterministic JavaScript examples work without a provider. They are kept separate from AI results.</p>
        <button type="button" className="gemini-button" onClick={runLocalDemo} disabled={Boolean(loading)}>{loading === 'demo' ? 'Preparing demo…' : 'Show local sample captions'}</button>
        {demoCaptions.map((idea, index) => <button className="caption-option" type="button" key={`${idea}-${index}`} onClick={() => { setDemoCaption(idea); selectCaption(idea); }}>{idea}<ArrowDownToLine size={13} /></button>)}
        <textarea className="text-input rewrite-input" value={demoCaption} maxLength={180} onChange={(event) => setDemoCaption(event.target.value)} placeholder="Local demo caption" aria-label="Offline demo caption" />
        <div className="tone-chips">{tones.map((tone) => <button type="button" key={tone} className="tone-chip" onClick={() => rewriteLocalDemo(tone)} disabled={Boolean(loading)}>{loading === `demo-${tone}` ? <LoaderCircle className="spin" size={12} /> : null}{tone}</button>)}</div>
      </details>
      <p className="local-note"><span className="green-dot" /> AI actions send text or resized images to the configured provider via the backend. This app does not store those requests; provider data-use terms and quota apply.</p>
    </section>
  );
}
