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
let prototypeDirHandle = null;

let dragStart = null;
let dragCurrent = null;
let pendingRect = null;

// ---------- IndexedDB (handle persistence) ----------

const DB_NAME = 'prototype-harness';
const STORE = 'handles';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Directory handle ----------

async function ensurePrototypeDir() {
  if (prototypeDirHandle) {
    const perm = await prototypeDirHandle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return prototypeDirHandle;
    const req = await prototypeDirHandle.requestPermission({ mode: 'readwrite' });
    if (req === 'granted') return prototypeDirHandle;
    prototypeDirHandle = null;
  }
  const cached = await idbGet(manifest.title);
  if (cached) {
    try {
      const perm = await cached.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        prototypeDirHandle = cached;
        return prototypeDirHandle;
      }
      const req = await cached.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') {
        prototypeDirHandle = cached;
        return prototypeDirHandle;
      }
    } catch (e) {
      // stale; fall through to picker
    }
  }
  toast('Pick the prototype/ directory (where index.html lives) so feedback can be written.', 6000);
  prototypeDirHandle = await window.showDirectoryPicker({ id: 'prototype-root', mode: 'readwrite' });
  await idbSet(manifest.title, prototypeDirHandle);
  return prototypeDirHandle;
}

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
  clearOverlay();
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
  els.btnSubmit.disabled = annotations().length === 0;
}

function toggleAnnotate() {
  annotateMode = !annotateMode;
  els.btnAnnotate.setAttribute('aria-pressed', String(annotateMode));
  document.body.classList.toggle('annotate', annotateMode);
  if (!annotateMode) hidePopover();
}

function resizeOverlay() {
  const rect = els.stage.getBoundingClientRect();
  els.overlay.width = rect.width;
  els.overlay.height = rect.height;
  redraw();
}

function clientToOverlay(e) {
  const rect = els.overlay.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function redraw() {
  const ctx = els.overlay.getContext('2d');
  ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
  const colorFor = (label) => label === 'like' ? '#1a7f37' : label === 'dislike' ? '#cf222e' : '#0969da';
  for (const a of annotations()) {
    ctx.strokeStyle = colorFor(a.label);
    ctx.lineWidth = 2;
    ctx.strokeRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
    ctx.fillStyle = colorFor(a.label);
    const labelText = a.label === 'like' ? '👍' : a.label === 'dislike' ? '👎' : '✏️';
    ctx.font = '14px -apple-system, sans-serif';
    const pad = 4;
    const tw = ctx.measureText(labelText).width + pad * 2;
    ctx.fillRect(a.rect.x, a.rect.y - 22, tw, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelText, a.rect.x + pad, a.rect.y - 6);
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
  dragStart = clientToOverlay(e);
  dragCurrent = dragStart;
  hidePopover();
});

els.overlay.addEventListener('mousemove', (e) => {
  if (!annotateMode || !dragStart) return;
  dragCurrent = clientToOverlay(e);
  redraw();
});

els.overlay.addEventListener('mouseup', (e) => {
  if (!annotateMode || !dragStart) return;
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

function showPopover(rect) {
  const stageRect = els.stage.getBoundingClientRect();
  const x = rect.x;
  const y = rect.y + rect.h + 6;
  els.popover.style.left = `${Math.min(x, stageRect.width - 220)}px`;
  els.popover.style.top = `${Math.min(y, stageRect.height - 80)}px`;
  els.popover.hidden = false;
  els.noteInput.hidden = true;
  els.noteText.value = '';
}

function hidePopover() {
  els.popover.hidden = true;
  els.noteInput.hidden = true;
  pendingRect = null;
  redraw();
}

els.popover.querySelectorAll('button[data-label]').forEach(btn => {
  btn.addEventListener('click', () => {
    const label = btn.dataset.label;
    if (label === 'note') {
      els.noteInput.hidden = false;
      els.noteText.focus();
      return;
    }
    commitAnnotation(label, '');
  });
});

els.noteConfirm.addEventListener('click', () => {
  commitAnnotation('note', els.noteText.value.trim().slice(0, 200));
});

els.noteCancel.addEventListener('click', () => hidePopover());

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
  if (annotations().length === 0) return;
  els.btnSubmit.disabled = true;
  els.btnSubmit.textContent = 'Capturing…';
  try {
    const timestamp = isoStamp();
    const variant = manifest.variants.find(v => v.key === activeKey);
    const screenshotBlob = await captureScreenshot();
    const bundle = {
      timestamp,
      prototype: manifest.title,
      variant,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      annotations: annotations(),
    };
    const dataJson = JSON.stringify(bundle, null, 2);
    let written = false;
    let writePath = null;
    try {
      const root = await ensurePrototypeDir();
      const feedbackDir = await root.getDirectoryHandle('feedback', { create: true });
      const tsDir = await feedbackDir.getDirectoryHandle(timestamp, { create: true });
      await writeFile(tsDir, 'data.json', dataJson);
      await writeFile(tsDir, 'screenshot.png', screenshotBlob);
      written = true;
      writePath = `${manifest.pathFromRepoRoot || 'prototype'}/feedback/${timestamp}`;
    } catch (e) {
      console.warn('FS Access write failed; falling back to download', e);
      downloadFallback(timestamp, dataJson, screenshotBlob);
      writePath = `~/Downloads/${timestamp}-*`;
    }
    const clipboardMsg = written
      ? `claude, read ${writePath}/data.json and view ${writePath}/screenshot.png`
      : `claude, read the two ${timestamp}-* files I just downloaded from the prototype harness`;
    try { await navigator.clipboard.writeText(clipboardMsg); } catch (e) { console.warn('clipboard write failed', e); }
    toast(written
      ? `Wrote ${writePath}/. Clipboard ready to paste into chat.`
      : `Downloaded data.json + screenshot.png. Move them to ${manifest.pathFromRepoRoot || 'prototype'}/feedback/${timestamp}/ and tell Claude.`, 8000);
  } finally {
    els.btnSubmit.textContent = 'Submit feedback';
    refreshSubmitEnabled();
  }
}

async function captureScreenshot() {
  const doc = els.frame.contentDocument;
  const canvas = await window.html2canvas(doc.body, { useCORS: true, scale: 1, logging: false });
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

async function writeFile(dirHandle, name, content) {
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  const stream = await fileHandle.createWritable();
  await stream.write(content);
  await stream.close();
}

function downloadFallback(timestamp, dataJson, screenshotBlob) {
  triggerDownload(`${timestamp}-data.json`, new Blob([dataJson], { type: 'application/json' }));
  triggerDownload(`${timestamp}-screenshot.png`, screenshotBlob);
}

function triggerDownload(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Pick winner ----------

async function pickWinner() {
  const variant = manifest.variants.find(v => v.key === activeKey);
  if (!variant) return;
  winner = { ...variant, timestamp: isoStamp() };
  renderTabs();
  const json = JSON.stringify(winner, null, 2);
  try {
    const root = await ensurePrototypeDir();
    await writeFile(root, 'winner.json', json);
    toast(`Pinned ${variant.key}: ${variant.name} as winner. winner.json written.`);
  } catch (e) {
    console.warn('winner.json write failed; falling back to download', e);
    triggerDownload('winner.json', new Blob([json], { type: 'application/json' }));
    toast(`Downloaded winner.json. Move it to ${manifest.pathFromRepoRoot || 'prototype'}/winner.json.`, 8000);
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

window.addEventListener('resize', resizeOverlay);
els.frame.addEventListener('load', () => {
  resizeOverlay();
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
