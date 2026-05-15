// Prototype harness: variant tabs + annotation overlay + screenshot submit.
// Vanilla, no bundler. html-to-image loaded via CDN script tag in index.html.

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
  btnAnnotate: $('#btn-annotate'),
  btnPick: $('#btn-pick'),
  btnClear: $('#btn-clear'),
  btnSubmit: $('#btn-submit'),
  toast: $('#toast'),
};

let manifest = null;
let activeKey = null;
let annotateMode = false;
let annotationsByVariant = new Map();
let winner = null;

let dragStart = null;
let dragCurrent = null;
let pendingRect = null;

let boxDrag = null;
const BOX_DRAG_THRESHOLD = 5;

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

function hitTestAnnotation(pt) {
  const arr = annotations();
  for (let i = arr.length - 1; i >= 0; i--) {
    const r = arr[i].rect;
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return arr[i];
  }
  return null;
}

function redraw() {
  const ctx = els.overlay.getContext('2d');
  ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
  const colorFor = (label) => label === 'like' ? '#1a7f37' : label === 'dislike' ? '#cf222e' : '#0969da';
  ctx.font = '14px -apple-system, sans-serif';
  for (const a of annotations()) {
    const color = colorFor(a.label);
    ctx.fillStyle = color + '1f';
    ctx.fillRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
    ctx.fillStyle = color;
    const labelText = a.label === 'like' ? '👍' : a.label === 'dislike' ? '👎' : '✏️';
    const pad = 4;
    const tw = ctx.measureText(labelText).width + pad * 2;
    ctx.fillRect(a.rect.x, a.rect.y - 22, tw, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelText, a.rect.x + pad, a.rect.y - 6);
    if (a.note) {
      drawNoteCaption(ctx, a, color);
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

function drawNoteCaption(ctx, a, color) {
  const captionWidth = Math.max(a.rect.w, 240);
  const padX = 6;
  const padY = 6;
  const lineHeight = 18;
  const gap = 4;
  const words = a.note.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const w of words) {
    const trial = current ? current + ' ' + w : w;
    if (ctx.measureText(trial).width + padX * 2 > captionWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0) return;
  const height = lines.length * lineHeight + padY * 2;
  const top = a.rect.y + a.rect.h + gap;
  ctx.fillStyle = color;
  ctx.fillRect(a.rect.x, top, captionWidth, height);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], a.rect.x + padX, top + padY + lineHeight * i + 13);
  }
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
  const pt = clientToOverlay(e);
  const hit = hitTestAnnotation(pt);
  if (hit) {
    boxDrag = {
      annotation: hit,
      dx: pt.x - hit.rect.x,
      dy: pt.y - hit.rect.y,
      startX: pt.x,
      startY: pt.y,
      active: false,
    };
    hidePopover();
    return;
  }
  dragStart = pt;
  dragCurrent = dragStart;
  hidePopover();
});

els.overlay.addEventListener('mousemove', (e) => {
  if (!annotateMode) return;
  const pt = clientToOverlay(e);
  if (boxDrag) {
    if (!boxDrag.active) {
      const moved = Math.hypot(pt.x - boxDrag.startX, pt.y - boxDrag.startY);
      if (moved < BOX_DRAG_THRESHOLD) return;
      boxDrag.active = true;
    }
    boxDrag.annotation.rect.x = pt.x - boxDrag.dx;
    boxDrag.annotation.rect.y = pt.y - boxDrag.dy;
    redraw();
    return;
  }
  if (!dragStart) return;
  dragCurrent = pt;
  redraw();
});

els.overlay.addEventListener('mouseup', (e) => {
  if (!annotateMode) return;
  if (boxDrag) {
    boxDrag = null;
    return;
  }
  if (!dragStart) return;
  dragCurrent = clientToOverlay(e);
  const rect = normalizeRect(dragStart, dragCurrent);
  dragStart = null;
  dragCurrent = null;
  if (rect.w < 6 || rect.h < 6) {
    redraw();
    return;
  }
  pendingRect = rect;
  showPopover(rect);
});

// ---------- Popover ----------

const PLACEHOLDERS = {
  like: 'what made you like this?',
  dislike: "what didn't work?",
  note: 'note…',
};

function showPopover(rect) {
  const x = rect.x;
  const y = rect.y + rect.h + 6;
  const maxLeft = Math.max(0, els.stage.scrollWidth - 220);
  const maxTop = Math.max(0, els.stage.scrollHeight - 80);
  els.popover.style.left = `${Math.min(Math.max(0, x), maxLeft)}px`;
  els.popover.style.top = `${Math.min(Math.max(0, y), maxTop)}px`;
  els.popover.hidden = false;
  els.noteInput.hidden = true;
  els.noteText.value = '';
  els.popover.dataset.label = '';
  els.popover.querySelectorAll('button[data-label]').forEach(b => b.removeAttribute('aria-pressed'));
}

function hidePopover() {
  els.popover.hidden = true;
  els.noteInput.hidden = true;
  els.popover.dataset.label = '';
  els.popover.querySelectorAll('button[data-label]').forEach(b => b.removeAttribute('aria-pressed'));
  pendingRect = null;
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
    requestAnimationFrame(() => els.noteText.focus());
  });
});

let popDrag = null;
const POP_DRAG_THRESHOLD = 5;
els.popover.addEventListener('mousedown', (e) => {
  if (e.target.closest('button, textarea, input')) return;
  const r = els.popover.getBoundingClientRect();
  popDrag = {
    dx: e.clientX - r.left,
    dy: e.clientY - r.top,
    startX: e.clientX,
    startY: e.clientY,
    active: false,
  };
});
window.addEventListener('mousemove', (e) => {
  if (!popDrag) return;
  if (!popDrag.active) {
    const moved = Math.hypot(e.clientX - popDrag.startX, e.clientY - popDrag.startY);
    if (moved < POP_DRAG_THRESHOLD) return;
    popDrag.active = true;
  }
  const stageRect = els.stage.getBoundingClientRect();
  const left = e.clientX - stageRect.left - popDrag.dx + els.stage.scrollLeft;
  const top  = e.clientY - stageRect.top  - popDrag.dy + els.stage.scrollTop;
  els.popover.style.left = `${left}px`;
  els.popover.style.top  = `${top}px`;
});
window.addEventListener('mouseup', () => { popDrag = null; });

els.noteConfirm.addEventListener('click', commitFromInput);
els.noteCancel.addEventListener('click', () => hidePopover());

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
  const elements = captureElements(pendingRect);
  annotations().push({ rect: pendingRect, label, note, elements });
  hidePopover();
  redraw();
  refreshSubmitEnabled();
}

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
    for (let i = 0; i < annotated.length; i++) {
      const v = annotated[i];
      els.btnSubmit.textContent = `Capturing ${v.key} (${i + 1}/${annotated.length})…`;
      const blob = await loadAndScreenshot(v);
      const filename = `${v.key}.png`;
      screenshots.push({ filename, base64: await blobToBase64(blob) });
      variantsOut.push({
        key: v.key,
        name: v.name,
        path: v.path,
        screenshot: filename,
        annotations: annotationsByVariant.get(v.key) || [],
      });
    }
    const bundle = {
      timestamp,
      prototype: manifest.title,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      variants: variantsOut,
    };
    els.btnSubmit.textContent = 'Uploading…';
    const res = await fetch('/__harness/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp, data: bundle, screenshots }),
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
    toast(`Submitted. ${path}. Claude is watching.`, 8000);
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
    reader.onload = () => {
      const result = reader.result;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
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
  forwardIframeWheel();
});

function forwardIframeWheel() {
  const doc = els.frame.contentDocument;
  if (!doc) return;
  doc.addEventListener('wheel', (e) => {
    els.stage.scrollBy({ left: e.deltaX, top: e.deltaY, behavior: 'auto' });
    e.preventDefault();
  }, { passive: false });
}

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
