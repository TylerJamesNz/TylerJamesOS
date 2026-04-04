import { useState, useCallback, useMemo } from 'react'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './IconsSection.css'

// Curated featured 20 shown in main brand kit section
const FEATURED: string[] = [
  'Home', 'Search', 'Bell', 'User', 'Settings',
  'Plus', 'Pencil', 'Trash2', 'Check', 'X',
  'ChevronRight', 'Calendar', 'Clock', 'Wallet', 'CheckSquare',
  'Tag', 'Filter', 'TrendingUp', 'Download', 'LogOut',
]

// Full curated 100 shown in modal
const ALL_100: string[] = [
  ...FEATURED,
  'Menu', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown',
  'ChevronLeft', 'ChevronDown', 'ChevronUp', 'Minus', 'Copy',
  'Upload', 'Share2', 'ExternalLink', 'RefreshCw', 'Save',
  'CreditCard', 'TrendingDown', 'DollarSign', 'Percent', 'Landmark',
  'Receipt', 'BarChart2', 'PieChart', 'Activity', 'Square',
  'List', 'Bookmark', 'Flag', 'Star', 'Heart',
  'FileText', 'Folder', 'Image', 'Link', 'Mail',
  'Send', 'MessageCircle', 'Phone', 'AlertCircle', 'AlertTriangle',
  'Info', 'HelpCircle', 'Lock', 'Eye', 'Shield',
  'LogIn', 'LayoutGrid', 'Sidebar', 'Sliders', 'Plane',
  'ShoppingCart', 'ShoppingBag', 'MapPin', 'Globe', 'Code',
  'Terminal', 'Database', 'Zap', 'Cloud', 'Sun',
  'Moon', 'Maximize2', 'Minimize2', 'Layers', 'LayoutDashboard',
  'Package', 'Truck', 'Users', 'UserPlus', 'AtSign',
  'Hash', 'MoreHorizontal', 'MoreVertical', 'Move', 'RotateCw',
  'Flame', 'Coffee', 'CheckCircle2', 'XCircle', 'EyeOff',
]

// PascalCase → kebab-case for display
function toKebab(name: string): string {
  return name.replace(/([A-Z])/g, (_m, l: string, i: number) => (i > 0 ? '-' : '') + l.toLowerCase())
}

function IconTile({
  name,
  size = 20,
  onCopy,
  copied,
}: {
  name: string
  size?: number
  onCopy: (name: string) => void
  copied: string | null
}) {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[name]
  if (!Icon) return null
  const kebab = toKebab(name)
  const isCopied = copied === name
  const importStr = `import { ${name} } from 'lucide-react'`

  return (
    <button
      className={`icons-tile${isCopied ? ' icons-tile--copied' : ''}`}
      onClick={() => onCopy(name)}
      title={`Click to copy import for ${name}`}
      aria-label={`Copy import for ${name}`}
    >
      <Icon size={size} strokeWidth={1.75} />
      <span className="icons-tile-name">{kebab}</span>
      <span className="icons-tile-copy">{isCopied ? '✓ copied' : importStr}</span>
    </button>
  )
}

export default function IconsSection() {
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const copy = useCallback((name: string) => {
    const importStr = `import { ${name} } from 'lucide-react'`
    navigator.clipboard.writeText(importStr).catch(() => {})
    setCopied(name)
    setTimeout(() => setCopied(null), 1800)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_100
    const q = query.toLowerCase()
    return ALL_100.filter(name => toKebab(name).includes(q) || name.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="icons-section">
      {/* Featured 20 */}
      <div className="icons-grid icons-grid--featured">
        {FEATURED.map(name => (
          <IconTile key={name} name={name} size={22} onCopy={copy} copied={copied} />
        ))}
      </div>

      <button className="icons-view-more" onClick={() => setModalOpen(true)}>
        View all {ALL_100.length} icons →
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="icons-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="icons-modal" onClick={e => e.stopPropagation()}>
            <div className="icons-modal-header">
              <h3 className="icons-modal-title">Icon library</h3>
              <input
                className="icons-modal-search"
                type="search"
                placeholder="Search icons…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              <button className="icons-modal-close" onClick={() => setModalOpen(false)} aria-label="Close">
                <Icons.X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <p className="icons-modal-hint">
              Click any icon to copy its import statement to clipboard.
            </p>
            <div className="icons-grid icons-grid--modal">
              {filtered.map(name => (
                <IconTile key={name} name={name} size={20} onCopy={copy} copied={copied} />
              ))}
              {filtered.length === 0 && (
                <p className="icons-modal-empty">No icons match "{query}"</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
