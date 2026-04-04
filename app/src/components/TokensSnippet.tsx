import { usePalette } from '../context/PaletteContext'

const SNIPPET_KEYS = [
  '--color-bg',
  '--color-surface',
  '--color-surface-2',
  '--color-border',
  '--color-border-soft',
  '--color-primary',
  '--color-accent',
  '--color-accent-hover',
  '--color-text',
  '--color-text-muted',
  '--color-text-subtle',
  '--color-info',
  '--color-sidebar-bg',
  '--color-sidebar-border',
  '--color-sidebar-text',
  '--color-sidebar-text-hi',
  '--color-sidebar-accent',
] as const

/** Live CSS paste block for the active palette (mirrors palettes.ts). */
export default function TokensSnippet() {
  const { activePalette } = usePalette()
  const v = activePalette.cssVars

  return (
    <div className="code-block">
      <span className="code-comment">
        {'/* Paste into your app stylesheet — active palette: '}
        {activePalette.label}
        {' */'}
      </span>
      <br />
      <br />
      <span className="code-key">:root</span> {'{'}
      <br />
      {SNIPPET_KEYS.map((key) => (
        <span key={key}>
          &nbsp;&nbsp;<span className="code-key">{key}</span>:{' '}
          <span className="code-value">{v[key]}</span>;
          <br />
        </span>
      ))}
      <br />
      &nbsp;&nbsp;<span className="code-comment">{'/* Semantic */'}</span>
      <br />
      &nbsp;&nbsp;<span className="code-key">--color-success</span>:{' '}
      <span className="code-value">{v['--color-success']}</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--color-warning</span>:{' '}
      <span className="code-value">{v['--color-warning']}</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--color-destructive</span>:{' '}
      <span className="code-value">{v['--color-destructive']}</span>;
      <br />
      <br />
      &nbsp;&nbsp;<span className="code-comment">{'/* Shadows + tints (from palettes.ts) */'}</span>
      <br />
      &nbsp;&nbsp;<span className="code-key">--shadow-sm</span>:{' '}
      <span className="code-value">{v['--shadow-sm']}</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--shadow-md</span>:{' '}
      <span className="code-value">{v['--shadow-md']}</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--shadow-lg</span>:{' '}
      <span className="code-value">{v['--shadow-lg']}</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--accent-rgb</span>:{' '}
      <span className="code-value">{v['--accent-rgb']}</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--btn-secondary-hover</span>:{' '}
      <span className="code-value">{v['--btn-secondary-hover']}</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--tag-demo-accent</span>:{' '}
      <span className="code-value">{v['--tag-demo-accent']}</span>;
      <br />
      <br />
      &nbsp;&nbsp;<span className="code-comment">{'/* Fonts */'}</span>
      <br />
      &nbsp;&nbsp;<span className="code-key">--font-display</span>:{' '}
      <span className="code-string">&apos;Bricolage Grotesque&apos;, sans-serif</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--font-sans</span>:{' '}
      <span className="code-string">&apos;Inter&apos;, -apple-system, sans-serif</span>;
      <br />
      &nbsp;&nbsp;<span className="code-key">--font-mono</span>:{' '}
      <span className="code-string">&apos;Geist Mono&apos;, monospace</span>;
      <br />
      {'}'}
    </div>
  )
}
