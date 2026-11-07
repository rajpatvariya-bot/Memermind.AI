import { useEffect, useRef, useState } from 'react';
import { Download, Eye, ImagePlus, LoaderCircle, LockKeyhole, Share2, SlidersHorizontal, Sticker } from 'lucide-react';
import { stickers } from '../data/templates.js';

const WIDTH = 960;
const HEIGHT = 720;

function paintWrappedText(context, text, centerY, fontSize) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const maxWidth = WIDTH - 80;
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  const lineHeight = fontSize * 1.08;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((row, index) => {
    const y = startY + index * lineHeight;
    context.lineWidth = Math.max(5, fontSize / 12);
    context.lineJoin = 'round';
    context.strokeStyle = '#171614';
    context.strokeText(row, WIDTH / 2, y, maxWidth);
    context.fillStyle = context.canvas.dataset.captionColor || '#ffffff';
    context.fillText(row, WIDTH / 2, y, maxWidth);
  });
}

export default function MemeEditor({ selectedTemplate, onSelectTemplate, initialImage = '', captionToApply = '', onShare, onSaveDraft, shareBusy = false, saveBusy = false, aiEnabled = false, onAnalyzeImage }) {
  const canvasRef = useRef(null);
  const [uploadedImage, setUploadedImage] = useState(initialImage);
  const [topCaption, setTopCaption] = useState('WHEN YOUR BRAIN HAS 37 TABS OPEN');
  const [bottomCaption, setBottomCaption] = useState('AND THEY ARE ALL PLAYING MUSIC');
  const [fontSize, setFontSize] = useState(52);
  const [textColor, setTextColor] = useState('#ffffff');
  const [topPosition, setTopPosition] = useState(17);
  const [bottomPosition, setBottomPosition] = useState(83);
  const [chosenStickers, setChosenStickers] = useState([]);
  const [notice, setNotice] = useState('');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => { setUploadedImage(initialImage); }, [initialImage]);
  useEffect(() => { if (captionToApply) setBottomCaption(captionToApply); }, [captionToApply]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, WIDTH, HEIGHT);
    setCanvasReady(false);
    let cancelled = false;
    const background = new Image();
    background.onload = () => {
      if (cancelled) return;
      context.fillStyle = '#24221f';
      context.fillRect(0, 0, WIDTH, HEIGHT);
      const scale = Math.max(WIDTH / background.width, HEIGHT / background.height);
      const drawWidth = background.width * scale;
      const drawHeight = background.height * scale;
      context.drawImage(background, (WIDTH - drawWidth) / 2, (HEIGHT - drawHeight) / 2, drawWidth, drawHeight);
      const shade = context.createLinearGradient(0, 0, 0, HEIGHT);
      shade.addColorStop(0, 'rgba(0,0,0,.28)');
      shade.addColorStop(.5, 'rgba(0,0,0,.02)');
      shade.addColorStop(1, 'rgba(0,0,0,.35)');
      context.fillStyle = shade;
      context.fillRect(0, 0, WIDTH, HEIGHT);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `900 ${fontSize}px Impact, "Arial Black", sans-serif`;
      context.canvas.dataset.captionColor = textColor;
      paintWrappedText(context, topCaption, (topPosition / 100) * HEIGHT, fontSize);
      paintWrappedText(context, bottomCaption, (bottomPosition / 100) * HEIGHT, fontSize);
      context.font = '64px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      chosenStickers.forEach((sticker, index) => {
        const x = WIDTH * (.2 + (index % 4) * .2);
        const y = HEIGHT * (.49 + Math.floor(index / 4) * .14);
        context.fillText(sticker, x, y);
      });
      setCanvasReady(true);
    };
    background.onerror = () => {
      if (cancelled) return;
      const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
      gradient.addColorStop(0, '#bdff63'); gradient.addColorStop(1, '#fa7d67');
      context.fillStyle = gradient; context.fillRect(0, 0, WIDTH, HEIGHT);
      context.textAlign = 'center'; context.fillStyle = '#1b1a18'; context.font = 'bold 46px sans-serif';
      context.fillText('Template preview unavailable', WIDTH / 2, HEIGHT / 2);
      setCanvasReady(true);
    };
    background.src = uploadedImage || selectedTemplate?.image || '/templates/brain-buffering.svg';
    return () => { cancelled = true; background.onload = null; background.onerror = null; };
  }, [uploadedImage, selectedTemplate, topCaption, bottomCaption, fontSize, textColor, topPosition, bottomPosition, chosenStickers]);

  function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setNotice('Choose a PNG, JPEG, or WebP image.');
    if (file.size > 10 * 1024 * 1024) return setNotice('Images must be 10 MB or smaller.');
    const reader = new FileReader();
    reader.onload = () => { setUploadedImage(String(reader.result)); onSelectTemplate(null); setNotice('Your image is on the canvas.'); };
    reader.onerror = () => setNotice('That image could not be opened. Try another file.');
    reader.readAsDataURL(file);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !canvasReady) return;
    const link = document.createElement('a');
    link.download = 'mememind-meme.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    setNotice('Downloaded your meme as a PNG.');
  }

  function currentMeme() {
    if (!canvasRef.current || !canvasReady) return;
    let imageData = canvasRef.current.toDataURL('image/jpeg', 0.78);
    if (imageData.length > 1_550_000) imageData = canvasRef.current.toDataURL('image/jpeg', 0.58);
    return {
      title: (bottomCaption || topCaption || 'Fresh meme').slice(0, 100),
      caption: (bottomCaption || topCaption || 'Fresh meme').slice(0, 280),
      templateId: uploadedImage ? 'custom-upload' : (selectedTemplate?.id || 'brain-buffering'),
      imageData,
    };
  }

  function share() { const meme = currentMeme(); if (meme) onShare(meme); }
  function saveDraft() { const meme = currentMeme(); if (meme) onSaveDraft(meme); }

  async function analyzeImage() {
    if (!canvasReady) return;
    const source = uploadedImage || selectedTemplate?.image || '/templates/brain-buffering.svg';
    setAnalysisBusy(true); setNotice('Preparing a private, resized image for AI analysis…');
    try {
      // Resize in the browser before sending; the API never accepts arbitrary file uploads.
      const image = new Image();
      const loaded = new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
      image.src = source;
      await loaded;
      const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      const resized = document.createElement('canvas');
      resized.width = Math.max(1, Math.round(image.naturalWidth * scale));
      resized.height = Math.max(1, Math.round(image.naturalHeight * scale));
      resized.getContext('2d').drawImage(image, 0, 0, resized.width, resized.height);
      let dataUrl = resized.toDataURL('image/jpeg', 0.82);
      if (dataUrl.length > 1_700_000) dataUrl = resized.toDataURL('image/jpeg', 0.65);
      if (dataUrl.length > 1_700_000) throw new Error('This image is still too large after resizing. Choose another image.');
      const result = await onAnalyzeImage(dataUrl);
      setNotice('AI analyzed the image and suggested captions, tags, and stickers.');
      return result;
    } catch (error) {
      setNotice(error.message || 'The image could not be analyzed.');
    } finally { setAnalysisBusy(false); }
  }

  function selectTemplate(template) {
    setUploadedImage('');
    onSelectTemplate(template);
    setNotice(`${template.name} is ready for your caption.`);
  }

  return (
    <section className="editor-panel" aria-labelledby="editor-title">
      <div className="editor-topline">
        <div><span className="section-kicker">03 / MAKE IT YOURS</span><h2 id="editor-title">The meme canvas <span className="live-dot" /></h2></div>
        <span className="canvas-format">960 × 720 <span>PNG ready</span></span>
      </div>
      <div className="canvas-wrap"><canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Live meme preview" /></div>
      <div className="canvas-actions">
        <label className="button-secondary canvas-upload"><ImagePlus size={15} /> Add image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} /></label>
        <button type="button" className="button-secondary analyze-button" onClick={analyzeImage} disabled={!aiEnabled || analysisBusy || !canvasReady} title={!aiEnabled ? 'Configure Gemini in the backend to analyze images' : 'Analyze the selected image with the configured generative model'}>{analysisBusy ? <LoaderCircle size={15} className="spin" /> : <Eye size={15} />}{analysisBusy ? 'Analyzing…' : 'AI image analysis'}</button>
        <button type="button" className="button-secondary" onClick={download} disabled={!canvasReady}><Download size={15} /> Download</button>
        <button type="button" className="button-primary share-button" onClick={share} disabled={shareBusy || !canvasReady}>{shareBusy ? <LoaderCircle size={15} className="spin" /> : <Share2 size={15} />}{shareBusy ? 'Posting...' : 'Post to community'}</button>
      </div>
      {onSaveDraft && <button type="button" className="save-draft-link" onClick={saveDraft} disabled={saveBusy || !canvasReady}>{saveBusy ? <LoaderCircle size={14} className="spin" /> : <LockKeyhole size={14} />}{saveBusy ? 'Saving privately…' : 'Save a private draft'}</button>}
      {notice && <p className="editor-notice" role="status">{notice}</p>}

      <div className="editor-controls">
        <div className="control-block captions-control">
          <div className="control-heading"><SlidersHorizontal size={15} /><span>Caption layers</span><span className="control-small-note">EDIT LIVE</span></div>
          <label className="field-label" htmlFor="top-caption">Top line</label>
          <input id="top-caption" className="text-input single-line" value={topCaption} maxLength={100} onChange={(event) => setTopCaption(event.target.value)} placeholder="Top caption" />
          <label className="field-label" htmlFor="bottom-caption">Bottom line</label>
          <input id="bottom-caption" className="text-input single-line" value={bottomCaption} maxLength={100} onChange={(event) => setBottomCaption(event.target.value)} placeholder="Bottom caption" />
          <div className="two-controls">
            <label className="range-control"><span>Size <b>{fontSize}px</b></span><input type="range" min="24" max="88" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label>
            <label className="color-control"><span>Ink color</span><input aria-label="Caption text color" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label>
          </div>
          <div className="two-controls position-controls">
            <label className="range-control"><span>Top position <b>{topPosition}%</b></span><input type="range" min="8" max="38" value={topPosition} onChange={(event) => setTopPosition(Number(event.target.value))} /></label>
            <label className="range-control"><span>Bottom position <b>{bottomPosition}%</b></span><input type="range" min="62" max="92" value={bottomPosition} onChange={(event) => setBottomPosition(Number(event.target.value))} /></label>
          </div>
        </div>
        <div className="control-block sticker-control">
          <div className="control-heading"><Sticker size={15} /><span>Sticker drawer</span><span className="control-small-note">TAP TO ADD</span></div>
          <div className="sticker-grid">
            {stickers.map((sticker) => <button key={sticker} type="button" className="sticker-button" onClick={() => { setChosenStickers((current) => [...current, sticker].slice(0, 8)); setNotice(`${sticker} sticker added to canvas.`); }} aria-label={`Add ${sticker} sticker`}>{sticker}</button>)}
          </div>
          {chosenStickers.length > 0 && <button type="button" className="clear-stickers" onClick={() => setChosenStickers([])}>Clear stickers ({chosenStickers.length})</button>}
        </div>
      </div>
    </section>
  );
}

