/* global React */
/* =====================================================
   amrit.os ADMIN — interactive image crop modal
   Pan (drag) + zoom (slider/wheel) inside a fixed-aspect frame,
   exports to the slot's exact target resolution. The frame's aspect
   ratio is locked to the front-end's fixed dimensions so the cropped
   asset always drops into the site at the right size.
   ===================================================== */
const { useState, useRef, useEffect, useCallback, useLayoutEffect } = React;

function CropModal({ src, target, title, outputType = 'image/jpeg', onCancel, onSave }) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  const STAGE_H = 340;
  const PAD = 0.86;
  const aw = target.w, ah = target.h;

  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const [stageW, setStageW] = useState(640);
  const [nat, setNat] = useState(null);          // {w,h} natural size
  const [zoom, setZoom] = useState(1);            // 1..4
  const [off, setOff] = useState({ x: 0, y: 0 }); // image top-left in stage coords
  const drag = useRef(null);

  // measure stage width
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageW(el.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', measure); };
  }, []);

  // crop frame geometry (centered, fixed aspect)
  const frame = (() => {
    const maxW = stageW * PAD, maxH = STAGE_H * PAD;
    let fw = maxW, fh = fw * (ah / aw);
    if (fh > maxH) { fh = maxH; fw = fh * (aw / ah); }
    return { w: fw, h: fh, x: (stageW - fw) / 2, y: (STAGE_H - fh) / 2 };
  })();

  // zoom 1 = "fill the frame" (the old floor). A square source in a wider frame
  // can only fill it by losing its top and bottom, so allow zooming below 1
  // down to the point where the whole image fits — the leftover space stays
  // transparent in WebP and reads as the folder's own background on the site.
  const baseScale = nat ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1;
  const fitScale = nat ? Math.min(frame.w / nat.w, frame.h / nat.h) : 1;
  const minZoom = nat ? fitScale / baseScale : 1;
  const scale = baseScale * zoom;
  const dw = nat ? nat.w * scale : 0;
  const dh = nat ? nat.h * scale : 0;

  const clampOff = useCallback((o, dW, dH) => {
    // Larger than the frame: pan, but never past an edge. Smaller than the
    // frame (only reachable now that zoom can go below 1): pin to centre, since
    // there is no meaningful pan and the old min/max would invert.
    const centreX = frame.x + (frame.w - dW) / 2;
    const centreY = frame.y + (frame.h - dH) / 2;
    const x = dW <= frame.w ? centreX : Math.min(frame.x, Math.max(frame.x + frame.w - dW, o.x));
    const y = dH <= frame.h ? centreY : Math.min(frame.y, Math.max(frame.y + frame.h - dH, o.y));
    return { x, y };
  }, [frame.x, frame.y, frame.w, frame.h]);

  const onImgLoad = (e) => {
    const w = e.target.naturalWidth, h = e.target.naturalHeight;
    setNat({ w, h });
  };

  // center image when nat or zoom geometry initializes
  useEffect(() => {
    if (!nat) return;
    setOff(clampOff({ x: frame.x + (frame.w - dw) / 2, y: frame.y + (frame.h - dh) / 2 }, dw, dh));
    // eslint-disable-next-line
  }, [nat, stageW]);

  // re-clamp on zoom change keeping center stable
  useEffect(() => {
    if (!nat) return;
    setOff((prev) => {
      const cx = frame.x + frame.w / 2, cy = frame.y + frame.h / 2;
      // keep the frame-center image point fixed across zoom
      return clampOff(prev, dw, dh);
    });
    // eslint-disable-next-line
  }, [zoom]);

  const onPointerDown = (e) => {
    if (!nat) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: off.x, oy: off.y };
    const move = (ev) => {
      if (!drag.current) return;
      const o = { x: drag.current.ox + (ev.clientX - drag.current.sx), y: drag.current.oy + (ev.clientY - drag.current.sy) };
      setOff(clampOff(o, dw, dh));
    };
    const up = () => { drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); stageRef.current && stageRef.current.classList.remove('grabbing'); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    stageRef.current && stageRef.current.classList.add('grabbing');
  };

  const onWheel = (e) => {
    if (!nat) return;
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(minZoom, z - e.deltaY * 0.0015)));
  };

  const doSave = () => {
    if (!nat) return;
    const sx = (frame.x - off.x) / scale;
    const sy = (frame.y - off.y) / scale;
    const sW = frame.w / scale;
    const sH = frame.h / scale;
    const canvas = document.createElement('canvas');
    canvas.width = aw; canvas.height = ah;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    // JPEG has no alpha, so a transparent source would composite onto white
    // without this. WebP and PNG both keep the alpha channel.
    if (outputType === 'image/jpeg') { ctx.fillStyle = '#0c0d0a'; ctx.fillRect(0, 0, aw, ah); }
    try {
      ctx.drawImage(imgRef.current, sx, sy, sW, sH, 0, 0, aw, ah);
      let url = canvas.toDataURL(outputType, 0.92);
      // Every current browser encodes WebP, but if one refuses, toDataURL
      // returns PNG — which for a photo is far bigger than the JPEG we used to
      // produce. Fall back explicitly rather than silently regressing.
      if (outputType === 'image/webp' && !url.startsWith('data:image/webp')) {
        ctx.fillStyle = '#0c0d0a';
        ctx.fillRect(0, 0, aw, ah);
        ctx.drawImage(imgRef.current, sx, sy, sW, sH, 0, 0, aw, ah);
        url = canvas.toDataURL('image/jpeg', 0.92);
      }
      onSave(url);
    } catch (err) {
      // tainted canvas (cross-origin source) — fall back to original
      onSave(src);
    }
  };

  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target.classList.contains('modal-bg')) onCancel(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__bar">
          <AdminIcon name="crop" size={14} />
          <span>{title || 'Crop image'}</span>
          <span className="spacer" />
          <button className="x" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <div className="modal__bd">
          <div ref={stageRef} className="cropstage" onPointerDown={onPointerDown} onWheel={onWheel}>
            <span className="cropbadge">{aw} × {ah}px · drag to reposition</span>
            {/* hidden measuring image always rendered to get natural dims */}
            <img ref={imgRef} src={src} alt="" onLoad={onImgLoad}
              style={nat ? { width: dw + 'px', height: dh + 'px', transform: `translate(${off.x}px, ${off.y}px)` } : { opacity: 0 }} />
            {nat && <div className="cropframe" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }} />}
          </div>
          <div className="zoomrow">
            <AdminIcon name="image" size={14} />
            {/* step="any": minZoom is a computed fraction, so a fixed step would
                make the thumb snap to min + n*step and never sit exactly on 1. */}
            <input className="rng" type="range" min={minZoom} max="4" step="any" value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))} />
            <span className="lbl">{Math.round(zoom * 100)}%</span>
            <Btn sm kind="ghost" onClick={() => setZoom(minZoom)} disabled={!nat || zoom <= minZoom + 0.001}>Fit whole image</Btn>
            <Btn sm kind="ghost" onClick={() => setZoom(1)} disabled={!nat || Math.abs(zoom - 1) < 0.001}>Fill frame</Btn>
          </div>
          <p className="helptext" style={{ marginTop: 12 }}>
            Output locked to <b style={{ color: 'var(--fg)' }}>{aw}×{ah}px</b> — the exact size this asset renders at on the site.
            Drag the image or scroll to zoom; the lime frame is what gets saved.
            {nat && minZoom < 0.999 && <> This image isn{'\''}t the same shape as the frame — <b style={{ color: 'var(--fg)' }}>Fit whole image</b> keeps all of it and leaves the rest transparent.</>}
          </p>
        </div>
        <div className="modal__ft">
          <span className="helptext mono">{nat ? `source ${nat.w}×${nat.h}` : 'loading…'}</span>
          <span className="spacer" />
          <Btn kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={doSave} disabled={!nat}>Apply crop</Btn>
        </div>
      </div>
    </div>
  );
}

/* ImageSlot — preview + upload/crop/replace controls for one fixed-size asset.
   The cropped result is uploaded to Firebase Storage and the field stores the
   download URL (never a giant data-URL — that would blow the content doc's 1MB
   limit). `storageKey` namespaces the file, e.g. "projects/rx-thumb". */
function ImageSlot({ label, value, target, hint, previewW = 90, outputType = 'image/webp', onChange, storageKey }) {
  const { AdminIcon, Btn, Field, fileToDataURL, uploadToStorage, storageReady } = window.ADMIN_UI;
  const [raw, setRaw] = useState(null);     // freshly selected data url, awaiting crop
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);

  const ratio = target.h / target.w;
  const pw = previewW, ph = Math.round(previewW * ratio);

  const handleFiles = async (files) => {
    const f = files && files[0];
    if (!f || !f.type.startsWith('image/')) return;
    setRaw(await fileToDataURL(f));
  };

  const onCropped = async (dataUrl) => {
    setRaw(null); setErr(null);
    // Trust what the canvas actually produced, not what we asked for: toDataURL
    // silently falls back to PNG when a format is unsupported, and a .webp
    // filename holding PNG bytes would be served with the wrong content type.
    const actualType = (dataUrl.match(/^data:([^;,]+)/) || [, outputType])[1];
    const ext = actualType === 'image/png' ? 'png' : actualType === 'image/webp' ? 'webp' : 'jpg';
    const key = (storageKey || (label || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '-' + Date.now() + '.' + ext;
    if (!storageReady()) {
      setErr('Sign in to upload images to Storage.');
      return;
    }
    setBusy(true);
    try {
      const url = await uploadToStorage('images/' + key, dataUrl);
      onChange(url);
    } catch (e) { setErr((e && e.message) || 'upload failed'); }
    finally { setBusy(false); }
  };

  return (
    <Field label={label} hint={`${target.w}×${target.h}`}>
      <div className={'drop' + (over ? ' over' : '')}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}>
        {value
          ? <img className="drop__preview" src={window.assetUrl(value)} alt="" style={{ width: pw, height: ph }} />
          : <div className="drop__preview" style={{ width: pw, height: ph, display: 'grid', placeItems: 'center', color: 'var(--fg-mute)' }}><AdminIcon name="image" size={22} /></div>}
        <div className="drop__info">
          <div className="nm">{label}</div>
          <div className="dim">{busy ? 'Uploading…' : (err ? '⚠ ' + err : (hint || 'Drop an image or browse — you\'ll crop it to size'))}</div>
          <div className="act">
            <Btn sm icon="upload" onClick={() => inputRef.current.click()} disabled={busy}>{value ? 'Replace' : 'Upload'}</Btn>
            {value && <Btn sm icon="crop" onClick={() => setRaw(value)} disabled={busy}>Re-crop</Btn>}
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {raw && (
        <CropModal src={raw} target={target} outputType={outputType} title={`Crop · ${label}`}
          onCancel={() => setRaw(null)}
          onSave={onCropped} />
      )}
    </Field>
  );
}

window.ADMIN_CROP = { CropModal, ImageSlot };
