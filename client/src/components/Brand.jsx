import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="MemeMind home">
      <span className="brand-mark"><Sparkles size={18} strokeWidth={2.5} /></span>
      <span>meme<span className="brand-accent">mind</span></span>
      <span className="brand-ai">AI</span>
    </Link>
  );
}

