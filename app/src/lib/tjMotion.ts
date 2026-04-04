/**
 * Optional glyph stagger for headings marked with `.tj-motion-type`.
 * Run after fonts load (see App.tsx). Skips when prefers-reduced-motion: reduce.
 * Safe to call multiple times; already-processed nodes carry `data-tj-motion-typed`.
 */

const SKIP_TAGS = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'SVG'])
const STAGGER_MS = 6

function makeCharSpans(text: string, nextMs: () => number): DocumentFragment {
  const frag = document.createDocumentFragment()
  for (const char of Array.from(text)) {
    const span = document.createElement('span')
    span.className = 'tj-motion-type__char'
    span.textContent = char === ' ' ? '\u00a0' : char
    span.style.animationDelay = `${nextMs()}ms`
    frag.appendChild(span)
  }
  return frag
}

function processNode(el: HTMLElement, nextMs: () => number): void {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? ''
      if (!raw) continue
      node.parentNode?.replaceChild(makeCharSpans(raw, nextMs), node)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as HTMLElement
      if (SKIP_TAGS.has(child.tagName)) continue
      processNode(child, nextMs)
    }
  }
}

export function initTjMotionTypeHeadings(root: ParentNode = document.body): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const candidates = root.querySelectorAll<HTMLElement>('.tj-motion-type:not([data-tj-motion-typed])')
  if (candidates.length === 0) return

  for (const el of candidates) {
    if (!(el.textContent ?? '').trim()) continue
    el.dataset.tjMotionTyped = 'true'
    let acc = 0
    const tick = () => {
      const d = acc
      acc += STAGGER_MS
      return d
    }
    processNode(el, tick)
  }
}
