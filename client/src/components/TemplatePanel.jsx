import { Check, ImagePlus, Shapes } from 'lucide-react';

export default function TemplatePanel({ templates, selectedId, onSelect, onUpload }) {
  return (
    <section className="tool-panel template-panel" aria-labelledby="template-title">
      <div className="panel-heading compact-heading">
        <span className="section-kicker">02 / THE CANVAS</span>
        <h2 id="template-title">Pick your base <Shapes size={17} /></h2>
        <p>Five original starter scenes, zero copyright stress.</p>
      </div>
      <label className="upload-tile">
        <ImagePlus size={17} />
        <span>Upload your own image</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} />
      </label>
      <div className="template-list">
        {templates.map((template, index) => <button key={template.id} type="button" className={`template-card ${selectedId === template.id ? 'active' : ''}`} onClick={() => onSelect(template)}>
          <img src={template.image} alt="" loading={index > 2 ? 'lazy' : 'eager'} />
          <span className="template-card-title">{template.name}</span>
          <span className="template-card-mood">{template.mood}</span>
          {selectedId === template.id && <span className="template-selected"><Check size={11} /></span>}
        </button>)}
      </div>
      <div className="template-footnote"><span className="green-dot" /> Built for your punchline, not the algorithm.</div>
    </section>
  );
}

