// Prototype harness: variant tabs + annotation overlay + screenshot submit.
// Vanilla, no bundler. html2canvas loaded via CDN script tag in index.html.

const $ = (sel) => document.querySelector(sel);

const els = {
  title: $('#title'),
  tabs: $('#tabs'),
  frame: $('#variant-frame'),
  stage: $('#stage'),
  overlay: $('#overlay'),
  popover: $('#popover'),
  noteInput: $('#note-input'),
  noteText: $('#note-text'),
  noteConfirm: $('#note-confirm'),
  noteCancel: $('#note-cancel'),
  noteDelete: $('#note-delete'),
  refUpload: $('#ref-upload'),
  refUrl: $('#ref-url'),
  refPreview: $('#ref-preview'),
  refThumb: $('#ref-thumb'),
  refRemove: $('#ref-remove'),
  btnAnnotate: $('#btn-annotate'),
  btnPick: $('#btn-pick'),
  btnClear: $('#btn-clear'),
  btnSubmit: $('#btn-submit'),
  toast: $('#toast'),
  submittedOverlay: $('#submitted-overlay'),
  submittedPath: $('#submitted-overlay .submitted-path'),
};

let manifest = null;
let activeKey = null;
let annotateMode = false;
let annotationsByVariant = new Map();
let winner = null;

let dragStart = null;
let dragCurrent = null;
let pendingRect = null;
let mouseDownPoint = null;
let editTargetId = null;
let editingAnnotationId = null;
let pendingRefImage = null;

const CLICK_THRESHOLD_PX = 3;
const CAPTION_HEIGHT = 18;
const CAPTION_TRUNCATE_LEN = 40;
const REF_IMAGE_MAX_WIDTH = 1280;
const REF_IMAGE_QUALITY = 0.85;
const URL_RE = /^https?:\/\/\S+$/;

// ---------- Manifest load + tabs ----------

async function loadManifest() {
  const res = await fetch('./manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`manifest.json: ${res.status}`);
  manifest = await res.json();
  els.title.textContent = manifest.title || 'Prototype';
  document.title = manifest.title || 'Prototype';
}

function renderTabs() {
  els.tabs.innerHTML = '';
  for (const v of manifest.variants) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${v.key}: ${v.name}`;
    btn.setAttribute('aria-selected', String(v.key === activeKey));
    btn.dataset.key = v.key;
    if (winner && winner.key === v.key) btn.dataset.winner = 'true';
    btn.addEventListener('click', () => switchTo(v.key));
    els.tabs.appendChild(btn);
  }
}

function switchTo(key) {
  const v = manifest.variants.find(x => x.key === key);
  if (!v) return;
  activeKey = key;
  els.frame.src = v.path;
  dragStart = null;
  dragCurrent = null;
  pendingRect = null;
  hidePopover();
  renderTabs();
  refreshSubmitEnabled();
}

// ---------- Annotation overlay ----------

function annotations() {
  if (!annotationsByVariant.has(activeKey)) annotationsByVariant.set(activeKey, []);
  return annotationsByVariant.get(activeKey);
}

function refreshSubmitEnabled() {
  let total = 0;
  for (const arr of annotationsByVariant.values()) total += arr.length;
  els.btnSubmit.disabled = total === 0;
}

function toggleAnnotate() {
  annotateMode = !annotateMode;
  els.btnAnnotate.setAttribute('aria-pressed', String(annotateMode));
  document.body.classList.toggle('annotate', annotateMode);
  if (!annotateMode) hidePopover();
}

let frameResizeObserver = null;

function sizeStage() {
  const doc = els.frame.contentDocument;
  const width = els.stage.clientWidth;
  if (!doc || !doc.body) {
    els.overlay.width = width;
    els.overlay.height = els.stage.clientHeight;
    els.overlay.style.height = `${els.stage.clientHeight}px`;
    redraw();
    return;
  }
  const contentHeight = Math.max(
    doc.documentElement.scrollHeight,
    doc.body.scrollHeight,
    els.stage.clientHeight,
  );
  els.frame.style.height = `${contentHeight}px`;
  els.overlay.width = width;
  els.overlay.height = contentHeight;
  els.overlay.style.height = `${contentHeight}px`;
  redraw();
}

function attachFrameObserver() {
  if (frameResizeObserver) frameResizeObserver.disconnect();
  const doc = els.frame.contentDocument;
  if (!doc || !doc.body) return;
  frameResizeObserver = new ResizeObserver(() => sizeStage());
  frameResizeObserver.observe(doc.body);
}

function clientToOverlay(e) {
  const rect = els.overlay.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function redraw() {
  const ctx = els.overlay.getContext('2d');
  ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
  const colorFor = (label) => label === 'like' ? '#1a7f37' : label === 'dislike' ? '#cf222e' : '#0969da';
  const pad = 4;
  for (const a of annotations()) {
    const color = colorFor(a.label);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
    ctx.fillStyle = color;
    const labelText = a.label === 'like' ? '👍' : a.label === 'dislike' ? '👎' : '✏️';
    ctx.font = '14px -apple-system, sans-serif';
    const tw = ctx.measureText(labelText).width + pad * 2;
    ctx.fillRect(a.rect.x, a.rect.y - 22, tw, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelText, a.rect.x + pad, a.rect.y - 6);

    const hasRef = !!(a.referenceImage || a.referenceUrl);
    if (a.note || hasRef) {
      ctx.font = '12px -apple-system, sans-serif';
      const display = (() => {
        const base = a.note
          ? (a.note.length > CAPTION_TRUNCATE_LEN ? a.note.slice(0, CAPTION_TRUNCATE_LEN - 1) + '…' : a.note)
          : '';
        return hasRef ? (base ? `${base} 📎` : '📎') : base;
      })();
      const cw = ctx.measureText(display).width + pad * 2;
      ctx.fillStyle = color;
      ctx.fillRect(a.rect.x, a.rect.y + a.rect.h, cw, CAPTION_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.fillText(display, a.rect.x + pad, a.rect.y + a.rect.h + 13);
    }
  }
  if (dragStart && dragCurrent) {
    const r = normalizeRect(dragStart, dragCurrent);
    ctx.strokeStyle = '#0969da';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
  }
}

function hitTestAnnotation(point) {
  for (let i = annotations().length - 1; i >= 0; i--) {
    const a = annotations()[i];
    if (!a.id) continue;
    if (
      point.x >= a.rect.x &&
      point.x <= a.rect.x + a.rect.w &&
      point.y >= a.rect.y &&
      point.y <= a.rect.y + a.rect.h + CAPTION_HEIGHT
    ) {
      return a;
    }
  }
  return null;
}

function normalizeRect(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

function clearOverlay() {
  annotationsByVariant.set(activeKey, []);
  hidePopover();
  dragStart = null;
  dragCurrent = null;
  pendingRect = null;
  redraw();
  refreshSubmitEnabled();
}

els.overlay.addEventListener('mousedown', (e) => {
  if (!annotateMode) return;
  const point = clientToOverlay(e);
  mouseDownPoint = point;
  const hit = hitTestAnnotation(point);
  editTargetId = hit ? hit.id : null;
  dragStart = point;
  dragCurrent = point;
  hidePopover();
});

els.overlay.addEventListener('mousemove', (e) => {
  if (!annotateMode || !dragStart) return;
  dragCurrent = clientToOverlay(e);
  redraw();
});

els.overlay.addEventListener('mouseup', (e) => {
  if (!annotateMode || !mouseDownPoint) return;
  const start = mouseDownPoint;
  const end = clientToOverlay(e);
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const isClick = (dx + dy) < CLICK_THRESHOLD_PX;
  const targetId = editTargetId;
  dragStart = null;
  dragCurrent = null;
  mouseDownPoint = null;
  editTargetId = null;

  if (isClick && targetId) {
    const existing = annotations().find(a => a.id === targetId);
    if (existing) {
      editingAnnotationId = existing.id;
      pendingRect = existing.rect;
      showPopover(existing.rect, existing);
      return;
    }
  }

  if (isClick) {
    redraw();
    return;
  }

  const finalRect = normalizeRect(start, end);
  if (finalRect.w < 6 || finalRect.h < 6) {
    redraw();
    return;
  }
  pendingRect = finalRect;
  showPopover(finalRect);
});

// ---------- Popover ----------

const PLACEHOLDERS = {
  like: 'what made you like this?',
  dislike: "what didn't work?",
  note: 'note…',
};

function showPopover(rect, existing = null) {
  const stageRect = els.stage.getBoundingClientRect();
  const x = rect.x;
  const y = rect.y + rect.h + 6;
  els.popover.style.left = `${Math.min(x, stageRect.width - 220)}px`;
  els.popover.style.top = `${Math.min(y, stageRect.height - 80)}px`;
  els.popover.hidden = false;
  els.popover.querySelectorAll('button[data-label]').forEach(b => b.removeAttribute('aria-pressed'));

  if (existing) {
    setActiveVerb(existing.label);
    els.noteInput.hidden = false;
    els.noteText.placeholder = PLACEHOLDERS[existing.label] || 'note…';
    els.noteText.value = existing.note || '';
    els.refUrl.value = existing.referenceUrl || '';
    if (existing.referenceImage && typeof existing.referenceImage === 'object') {
      pendingRefImage = existing.referenceImage;
      els.refThumb.src = existing.referenceImage.dataUrl;
      els.refPreview.hidden = false;
    } else {
      pendingRefImage = null;
      els.refThumb.removeAttribute('src');
      els.refPreview.hidden = true;
    }
    els.noteDelete.hidden = false;
    setTimeout(() => els.noteText.focus(), 0);
  } else {
    els.popover.dataset.label = '';
    els.noteInput.hidden = true;
    els.noteText.value = '';
    els.refUrl.value = '';
    pendingRefImage = null;
    els.refThumb.removeAttribute('src');
    els.refPreview.hidden = true;
    els.noteDelete.hidden = true;
  }
}

function hidePopover() {
  els.popover.hidden = true;
  els.noteInput.hidden = true;
  els.noteDelete.hidden = true;
  els.refUrl.value = '';
  pendingRefImage = null;
  els.refThumb.removeAttribute('src');
  els.refPreview.hidden = true;
  els.popover.dataset.label = '';
  els.popover.querySelectorAll('button[data-label]').forEach(b => b.removeAttribute('aria-pressed'));
  pendingRect = null;
  editingAnnotationId = null;
  redraw();
}

function setActiveVerb(label) {
  els.popover.dataset.label = label;
  els.popover.querySelectorAll('button[data-label]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.label === label));
  });
}

function commitFromInput() {
  const label = els.popover.dataset.label || 'note';
  commitAnnotation(label, els.noteText.value.trim());
}

els.popover.querySelectorAll('button[data-label]').forEach(btn => {
  btn.addEventListener('click', () => {
    const label = btn.dataset.label;
    setActiveVerb(label);
    els.noteInput.hidden = false;
    els.noteText.placeholder = PLACEHOLDERS[label] || 'note…';
    els.noteText.value = '';
    els.noteText.focus();
  });
});

els.noteConfirm.addEventListener('click', commitFromInput);
els.noteCancel.addEventListener('click', () => hidePopover());
els.noteDelete.addEventListener('click', () => {
  if (!editingAnnotationId) return;
  const arr = annotations();
  const idx = arr.findIndex(a => a.id === editingAnnotationId);
  if (idx >= 0) arr.splice(idx, 1);
  hidePopover();
  refreshSubmitEnabled();
});

els.noteText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    commitFromInput();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    hidePopover();
  }
});

function commitAnnotation(label, note) {
  if (!pendingRect) return;
  const rawUrl = els.refUrl.value.trim();
  const referenceUrl = URL_RE.test(rawUrl) ? rawUrl : '';
  const referenceImage = pendingRefImage;
  if (editingAnnotationId) {
    const existing = annotations().find(a => a.id === editingAnnotationId);
    if (existing) {
      existing.label = label;
      existing.note = note;
      if (referenceUrl) existing.referenceUrl = referenceUrl;
      else delete existing.referenceUrl;
      if (referenceImage) existing.referenceImage = referenceImage;
      else delete existing.referenceImage;
    }
  } else {
    const elements = captureElements(pendingRect);
    const next = {
      id: crypto.randomUUID(),
      rect: pendingRect,
      label,
      note,
      elements,
    };
    if (referenceUrl) next.referenceUrl = referenceUrl;
    if (referenceImage) next.referenceImage = referenceImage;
    annotations().push(next);
  }
  hidePopover();
  refreshSubmitEnabled();
}

async function downscaleImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('image decode failed'));
    i.src = dataUrl;
  });
  const ratio = Math.min(1, REF_IMAGE_MAX_WIDTH / img.width);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const outMime = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ? file.type : 'image/png';
  const outDataUrl = canvas.toDataURL(outMime, REF_IMAGE_QUALITY);
  return { filename: file.name, dataUrl: outDataUrl, mime: outMime };
}

els.refUpload.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    pendingRefImage = await downscaleImage(file);
    els.refThumb.src = pendingRefImage.dataUrl;
    els.refPreview.hidden = false;
  } catch (err) {
    console.error('image processing failed', err);
    toast(`Image failed: ${err.message || err}`, 5000);
  } finally {
    e.target.value = '';
  }
});

els.refRemove.addEventListener('click', () => {
  pendingRefImage = null;
  els.refThumb.removeAttribute('src');
  els.refPreview.hidden = true;
});

// ---------- DOM selector capture ----------

function captureElements(rect) {
  const doc = els.frame.contentDocument;
  if (!doc) return [];
  const stageRect = els.stage.getBoundingClientRect();
  const frameRect = els.frame.getBoundingClientRect();
  // Rect is in stage coords; convert to iframe-viewport coords.
  const frameX = rect.x - (frameRect.left - stageRect.left);
  const frameY = rect.y - (frameRect.top - stageRect.top);
  const target = { x: frameX, y: frameY, w: rect.w, h: rect.h };
  const candidates = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    const r = node.getBoundingClientRect();
    if (intersects(r, target)) {
      candidates.push({ el: node, depth: depthOf(node), area: r.width * r.height });
    }
  }
  candidates.sort((a, b) => (b.depth - a.depth) || (a.area - b.area));
  return candidates.slice(0, 3).map(({ el }) => ({
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    classes: el.className && typeof el.className === 'string' ? el.className : '',
    text: (el.textContent || '').trim().slice(0, 80),
  }));
}

function intersects(a, b) {
  return !(a.right < b.x || a.left > b.x + b.w || a.bottom < b.y || a.top > b.y + b.h);
}

function depthOf(el) {
  let d = 0;
  while (el.parentElement) { d++; el = el.parentElement; }
  return d;
}

function buildSelector(el) {
  const parts = [];
  const doc = el.ownerDocument;
  while (el && el.nodeType === 1 && el !== doc.body && el !== doc.documentElement) {
    const parent = el.parentElement;
    if (!parent) break;
    const tag = el.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(s => s.tagName === el.tagName);
    const idx = siblings.indexOf(el) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
    el = parent;
  }
  return parts.join(' > ');
}

// ---------- Submit ----------

async function submit() {
  const annotated = manifest.variants.filter(v => (annotationsByVariant.get(v.key) || []).length > 0);
  if (annotated.length === 0) return;
  els.btnSubmit.disabled = true;
  const originalKey = activeKey;
  try {
    const timestamp = isoStamp();
    const variantsOut = [];
    const screenshots = [];
    const referenceFiles = [];
    for (let i = 0; i < annotated.length; i++) {
      const v = annotated[i];
      els.btnSubmit.textContent = `Capturing ${v.key} (${i + 1}/${annotated.length})…`;
      const blob = await loadAndScreenshot(v);
      const filename = `${v.key}.png`;
      screenshots.push({ filename, base64: await blobToBase64(blob) });
      const rawAnns = annotationsByVariant.get(v.key) || [];
      const annsOut = rawAnns.map(a => {
        const out = {
          id: a.id,
          rect: a.rect,
          label: a.label,
          note: a.note,
          elements: a.elements,
        };
        if (a.referenceUrl) out.referenceUrl = a.referenceUrl;
        if (a.referenceImage && a.referenceImage.dataUrl) {
          const ext = mimeToExt(a.referenceImage.mime);
          out.referenceImage = `refs/${a.id}.${ext}`;
          referenceFiles.push({
            annotationId: a.id,
            filename: `${a.id}.${ext}`,
            base64: stripDataUrl(a.referenceImage.dataUrl),
            mime: a.referenceImage.mime,
          });
        }
        return out;
      });
      variantsOut.push({
        key: v.key,
        name: v.name,
        path: v.path,
        screenshot: filename,
        annotations: annsOut,
      });
    }
    const bundle = {
      timestamp,
      prototype: manifest.title,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      variants: variantsOut,
    };
    const body = { timestamp, data: bundle, screenshots };
    if (referenceFiles.length > 0) body.referenceFiles = referenceFiles;
    els.btnSubmit.textContent = 'Uploading…';
    const res = await fetch('/__harness/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => `${res.status} ${res.statusText}`);
      toast(`Submit failed: ${errText}`, 10000);
      return;
    }
    const { path } = await res.json();
    const keyList = annotated.map(v => v.key).join('/');
    const clipboardMsg = `claude, read ${path}/data.json and view the per-variant screenshots (${keyList})`;
    try { await navigator.clipboard.writeText(clipboardMsg); } catch (e) { console.warn('clipboard write failed', e); }
    showSubmitted(path);
  } catch (e) {
    console.error('submit failed', e);
    toast(`Submit failed: ${e.message || e}`, 10000);
  } finally {
    if (activeKey !== originalKey) switchTo(originalKey);
    els.btnSubmit.textContent = 'Submit feedback';
    refreshSubmitEnabled();
  }
}

async function loadAndScreenshot(variant) {
  if (activeKey !== variant.key) {
    activeKey = variant.key;
    await new Promise((resolve) => {
      const onLoad = () => {
        els.frame.removeEventListener('load', onLoad);
        resolve();
      };
      els.frame.addEventListener('load', onLoad);
      els.frame.src = variant.path;
    });
    await new Promise(r => setTimeout(r, 400));
  }
  return captureScreenshot();
}

async function captureScreenshot() {
  const doc = els.frame.contentDocument;
  return await window.htmlToImage.toBlob(doc.body, { cacheBust: true, pixelRatio: 1 });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrl(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function stripDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function mimeToExt(mime) {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/gif': return 'gif';
    case 'image/webp': return 'webp';
    default: return 'png';
  }
}

// ---------- Pick winner ----------

async function pickWinner() {
  const variant = manifest.variants.find(v => v.key === activeKey);
  if (!variant) return;
  winner = { ...variant, timestamp: isoStamp() };
  renderTabs();
  try {
    const res = await fetch('/__harness/pick-winner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(winner),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => `${res.status} ${res.statusText}`);
      toast(`Pick winner failed: ${errText}`, 10000);
      return;
    }
    const { path } = await res.json();
    toast(`Pinned ${variant.key}: ${variant.name} as winner. ${path}`);
  } catch (e) {
    console.error('pick winner failed', e);
    toast(`Pick winner failed: ${e.message || e}`, 10000);
  }
}

// ---------- Toast ----------

let toastTimer = null;
function toast(msg, ms = 4000) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, ms);
}

// ---------- Submitted overlay ----------

let submittedTimer = null;

function showSubmitted(pathStr) {
  els.submittedPath.textContent = pathStr;
  els.submittedOverlay.hidden = false;
  if (submittedTimer) clearTimeout(submittedTimer);
  submittedTimer = setTimeout(hideSubmitted, 8000);
}

function hideSubmitted() {
  els.submittedOverlay.hidden = true;
  if (submittedTimer) { clearTimeout(submittedTimer); submittedTimer = null; }
}

els.submittedOverlay.addEventListener('click', hideSubmitted);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.submittedOverlay.hidden) hideSubmitted();
});

// ---------- Utilities ----------

function isoStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}Z`;
}

// ---------- Wiring ----------

els.btnAnnotate.addEventListener('click', toggleAnnotate);
els.btnClear.addEventListener('click', clearOverlay);
els.btnSubmit.addEventListener('click', submit);
els.btnPick.addEventListener('click', pickWinner);

window.addEventListener('resize', sizeStage);
els.frame.addEventListener('load', () => {
  attachFrameObserver();
  sizeStage();
});

// ---------- Init ----------

(async () => {
  try {
    await loadManifest();
    if (!manifest.variants || manifest.variants.length === 0) {
      toast('manifest.json has no variants. Add some and reload.', 8000);
      return;
    }
    activeKey = manifest.variants[0].key;
    renderTabs();
    switchTo(activeKey);
  } catch (e) {
    console.error(e);
    toast(`Init failed: ${e.message}`, 10000);
  }
})();
