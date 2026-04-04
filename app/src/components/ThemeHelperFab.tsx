import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePalette } from '../context/PaletteContext'
import { normalizeHex } from '../lib/colorSpace'
import { CUSTOM_DEFAULT_PRIMARY } from '../lib/deriveCustomPalette'
import { pickNearestSecondary, proposeComplementarySecondaries } from '../lib/proposeComplementarySecondaries'
import { CUSTOM_PALETTE_ID } from '../themes/palettes'

const HEX6 = /^#[0-9a-fA-F]{6}$/
const SLIDE_TOAST_MS = 2800

export default function ThemeHelperFab() {
  const {
    activePalette,
    setPaletteId,
    palettes,
    customPrimary,
    customSecondary,
    customAccentPreview,
    saveCustomPalette,
  } = usePalette()

  const [open, setOpen] = useState(false)
  const [customEditorOpen, setCustomEditorOpen] = useState(false)
  const [draftPrimary, setDraftPrimary] = useState(customPrimary)
  const [draftSecondary, setDraftSecondary] = useState(customSecondary)
  const [slideToast, setSlideToast] = useState<{ key: number; message: string } | null>(null)
  const slideToastClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeAll = useCallback(() => {
    setOpen(false)
    setCustomEditorOpen(false)
  }, [])

  useEffect(() => {
    if (activePalette.id !== CUSTOM_PALETTE_ID) {
      setCustomEditorOpen(false)
    }
  }, [activePalette.id])

  useEffect(() => {
    return () => {
      if (slideToastClearRef.current) clearTimeout(slideToastClearRef.current)
    }
  }, [])

  useEffect(() => {
    if (!customEditorOpen) {
      setSlideToast(null)
      if (slideToastClearRef.current) {
        clearTimeout(slideToastClearRef.current)
        slideToastClearRef.current = null
      }
    }
  }, [customEditorOpen])

  const openCustomEditorFromList = useCallback(() => {
    setDraftPrimary(customPrimary)
    setDraftSecondary(pickNearestSecondary(customPrimary, customSecondary))
    setCustomEditorOpen(true)
  }, [customPrimary, customSecondary])

  const handlePaletteClick = (id: string) => {
    if (id === CUSTOM_PALETTE_ID) {
      setPaletteId(CUSTOM_PALETTE_ID)
      openCustomEditorFromList()
    } else {
      setPaletteId(id)
      setCustomEditorOpen(false)
    }
  }

  const complementarySwatches = useMemo(
    () => proposeComplementarySecondaries(draftPrimary),
    [draftPrimary]
  )

  const effectiveSecondary = useMemo(() => {
    const n = normalizeHex(draftSecondary)
    return complementarySwatches.includes(n) ? n : pickNearestSecondary(draftPrimary, draftSecondary)
  }, [complementarySwatches, draftPrimary, draftSecondary])

  useEffect(() => {
    if (!customEditorOpen) return
    setDraftSecondary((prev) => {
      const n = normalizeHex(prev)
      return complementarySwatches.includes(n) ? n : pickNearestSecondary(draftPrimary, prev)
    })
  }, [customEditorOpen, draftPrimary, complementarySwatches])

  useEffect(() => {
    if (!customEditorOpen) return
    if (!HEX6.test(draftPrimary)) return
    saveCustomPalette(normalizeHex(draftPrimary), effectiveSecondary)
  }, [customEditorOpen, draftPrimary, effectiveSecondary, saveCustomPalette])

  const syncPrimaryFromColor = (hex: string) => {
    setDraftPrimary(normalizeHex(hex))
  }

  const showSlideToast = useCallback((message: string) => {
    if (slideToastClearRef.current) {
      clearTimeout(slideToastClearRef.current)
      slideToastClearRef.current = null
    }
    setSlideToast({ key: Date.now(), message })
    slideToastClearRef.current = setTimeout(() => {
      setSlideToast(null)
      slideToastClearRef.current = null
    }, SLIDE_TOAST_MS)
  }, [])

  const handleSecondaryPick = useCallback(
    (hex: string) => {
      setDraftSecondary(hex)
      const pri = HEX6.test(draftPrimary) ? normalizeHex(draftPrimary) : normalizeHex(customPrimary)
      saveCustomPalette(pri, hex)
      showSlideToast('Accent applied — theme saved.')
    },
    [customPrimary, draftPrimary, saveCustomPalette, showSlideToast]
  )

  return (
    <div
      className="theme-helper"
      data-open={open ? 'true' : 'false'}
      data-custom-editor={customEditorOpen ? 'true' : 'false'}
    >
      {open && (
        <div className="theme-helper-dock">
          <div
            className={`theme-helper-slide${customEditorOpen ? ' theme-helper-slide--open' : ''}`}
            aria-hidden={!customEditorOpen}
          >
            <div className="theme-helper-slide-inner">
              <div className="theme-helper-custom-header">
                <span className="theme-helper-custom-title">Custom colours</span>
                <button
                  type="button"
                  className="theme-helper-close"
                  onClick={() => setCustomEditorOpen(false)}
                  aria-label="Close custom editor"
                >
                  ×
                </button>
              </div>
              <p className="theme-helper-custom-hint">
                <strong>Primary</strong> fills the sidebar and tints neutrals; <strong>secondary</strong> is chosen from
                a harmony grid (complements, triads, and related rotations) so accents stay coherent. Changes apply as
                you edit; picking a secondary shows a short notice in this panel. Body copy and sidebar type auto-adjust for
                contrast (WCAG-style), so bright primaries stay readable.
              </p>

              <div className="theme-helper-field">
                <label htmlFor="tjos-custom-primary">Primary</label>
                <div className="theme-helper-color-row">
                  <input
                    id="tjos-custom-primary"
                    type="color"
                    value={HEX6.test(draftPrimary) ? draftPrimary : CUSTOM_DEFAULT_PRIMARY}
                    onChange={(e) => syncPrimaryFromColor(e.target.value)}
                    aria-label="Primary colour"
                  />
                  <input
                    type="text"
                    className="theme-helper-hex-input"
                    value={draftPrimary}
                    onChange={(e) => setDraftPrimary(e.target.value)}
                    onBlur={() => setDraftPrimary(normalizeHex(draftPrimary))}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="theme-helper-field">
                <p id="tjos-custom-secondary-heading" className="theme-helper-field-heading">
                  Secondary (accent family)
                </p>
                <p className="theme-helper-secondary-caption">
                  Ten options from your primary — complement, split-complement, and triads. Tap one to apply.
                </p>
                <div
                  className="theme-helper-secondary-grid"
                  role="group"
                  aria-labelledby="tjos-custom-secondary-heading"
                >
                  {complementarySwatches.map((hex) => {
                    const selected = normalizeHex(draftSecondary) === hex
                    return (
                      <button
                        key={hex}
                        type="button"
                        className="theme-helper-secondary-swatch"
                        style={{ backgroundColor: hex }}
                        aria-pressed={selected}
                        aria-label={`Secondary accent ${hex}`}
                        title={hex}
                        onClick={() => handleSecondaryPick(hex)}
                      />
                    )
                  })}
                </div>
              </div>

              {slideToast ? (
                <div
                  key={slideToast.key}
                  className="theme-helper-slide-notice"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {slideToast.message}
                </div>
              ) : null}

              <div className="theme-helper-custom-actions">
                <button
                  type="button"
                  className="theme-helper-btn theme-helper-btn-primary"
                  onClick={() => setCustomEditorOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>

          <div className="theme-helper-panel theme-helper-panel--main" role="dialog" aria-label="Colour palettes">
            <div className="theme-helper-panel-header">
              <span>Theme</span>
              <button type="button" className="theme-helper-close" onClick={closeAll} aria-label="Close">
                ×
              </button>
            </div>
            <p className="theme-helper-hint">
              Presets live in <code>src/themes/palettes.ts</code>. <strong>Custom</strong> uses{' '}
              <code>deriveCustomPalette()</code> — primary updates live; secondary applies when you tap a swatch.
            </p>
            <ul className="theme-helper-list">
              {palettes.map((p) => {
                const active = p.id === activePalette.id
                const swatch =
                  p.id === CUSTOM_PALETTE_ID ? customAccentPreview : p.cssVars['--color-accent']
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="theme-helper-option"
                      data-active={active ? 'true' : 'false'}
                      onClick={() => handlePaletteClick(p.id)}
                    >
                      <span className="theme-helper-swatch" style={{ background: swatch }} aria-hidden />
                      <span className="theme-helper-option-text">
                        <span className="theme-helper-option-label">{p.label}</span>
                        <span className="theme-helper-option-desc">{p.description}</span>
                        <span className="theme-helper-option-source">{p.source}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
      <button
        type="button"
        className="theme-helper-fab"
        onClick={() => {
          if (open) closeAll()
          else setOpen(true)
        }}
        aria-expanded={open}
        aria-label={open ? 'Close theme helper' : 'Open theme helper'}
        title="Theme palettes"
      >
        <span className="theme-helper-fab-icon" aria-hidden>
          ◐
        </span>
      </button>
    </div>
  )
}
