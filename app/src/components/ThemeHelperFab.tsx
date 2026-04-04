import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePalette } from '../context/PaletteContext'
import { normalizeHex } from '../lib/colorSpace'
import { CUSTOM_DEFAULT_PRIMARY } from '../lib/deriveCustomPalette'
import {
  pickNearestSecondary,
  proposeComplementarySecondaries,
  randomHarmonySecondary,
} from '../lib/proposeComplementarySecondaries'
import { CUSTOM_PALETTE_ID } from '../themes/palettes'

const HEX6 = /^#[0-9a-fA-F]{6}$/
const SLIDE_TOAST_MS = 2800
/** After primary stops changing (picker drag / hex), pick a random harmony secondary. */
const PRIMARY_AUTO_SECONDARY_MS = 320

export default function ThemeHelperFab() {
  const {
    activePalette,
    setPaletteId,
    palettes,
    customPrimary,
    customSecondary,
    customAccentPreview,
    saveCustomPalette,
    darkMode,
    setDarkMode,
  } = usePalette()

  const [open, setOpen] = useState(false)
  const [customEditorOpen, setCustomEditorOpen] = useState(false)
  const [draftPrimary, setDraftPrimary] = useState(customPrimary)
  const [draftSecondary, setDraftSecondary] = useState(customSecondary)
  const [slideToast, setSlideToast] = useState<{ key: number; message: string } | null>(null)
  const slideToastClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const primaryAutoSecondaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Primary we last synced without auto-randomizing (open state + after each random). */
  const lastPrimaryForAutoSecondaryRef = useRef<string | null>(null)
  const prevCustomEditorOpenRef = useRef(false)

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
      if (primaryAutoSecondaryTimerRef.current) {
        clearTimeout(primaryAutoSecondaryTimerRef.current)
        primaryAutoSecondaryTimerRef.current = null
      }
      lastPrimaryForAutoSecondaryRef.current = null
    }
  }, [customEditorOpen])

  useEffect(() => {
    if (customEditorOpen && !prevCustomEditorOpenRef.current && HEX6.test(draftPrimary)) {
      lastPrimaryForAutoSecondaryRef.current = normalizeHex(draftPrimary)
    }
    prevCustomEditorOpenRef.current = customEditorOpen
  }, [customEditorOpen, draftPrimary])

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
    if (!HEX6.test(draftPrimary)) return
    const n = normalizeHex(draftPrimary)
    if (lastPrimaryForAutoSecondaryRef.current === n) return
    if (primaryAutoSecondaryTimerRef.current) clearTimeout(primaryAutoSecondaryTimerRef.current)
    primaryAutoSecondaryTimerRef.current = setTimeout(() => {
      primaryAutoSecondaryTimerRef.current = null
      const next = randomHarmonySecondary(n)
      setDraftSecondary(next)
      lastPrimaryForAutoSecondaryRef.current = n
    }, PRIMARY_AUTO_SECONDARY_MS)
    return () => {
      if (primaryAutoSecondaryTimerRef.current) {
        clearTimeout(primaryAutoSecondaryTimerRef.current)
        primaryAutoSecondaryTimerRef.current = null
      }
    }
  }, [customEditorOpen, draftPrimary])

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
      showSlideToast('Accent applied, theme saved.')
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
                <span className="theme-helper-custom-title">Custom</span>
                <button
                  type="button"
                  className="theme-helper-close"
                  onClick={() => setCustomEditorOpen(false)}
                  aria-label="Close custom editor"
                >
                  ×
                </button>
              </div>

              <p className="theme-helper-hint theme-helper-custom-intro">
                Pick a <strong>primary</strong> and a <strong>secondary</strong> from fifteen swatches we build to
                harmonise with your pick. <strong>Dark mode</strong> below inverts this palette for night, other themes
                keep their usual look.
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
                <div className="theme-helper-secondary-readout">
                  <input
                    id="tjos-custom-secondary-readout"
                    type="text"
                    readOnly
                    tabIndex={-1}
                    className="theme-helper-hex-input theme-helper-hex-input--readonly"
                    value={effectiveSecondary}
                    aria-describedby="tjos-custom-secondary-heading"
                    aria-label={`Selected secondary accent ${effectiveSecondary}`}
                  />
                </div>
              </div>

              <div className="theme-helper-slide-dark">
                <label className="theme-helper-dark-switch">
                  <span className="theme-helper-dark-switch-label">Dark mode</span>
                  <span className="theme-helper-dark-switch-control">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={darkMode}
                      className="theme-helper-dark-switch-input"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                    <span className="theme-helper-dark-switch-track">
                      <span className="theme-helper-dark-switch-thumb" />
                    </span>
                  </span>
                </label>
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
              <strong>Choose a colour theme</strong> for the whole operating system. Built in palettes and{' '}
              <strong>Custom</strong> live in <code>src/themes/palettes.ts</code>.
            </p>
            <ul className="theme-helper-list">
              {palettes.map((p) => {
                const active = p.id === activePalette.id
                const opensSlide = p.id === CUSTOM_PALETTE_ID
                const swatch =
                  p.id === CUSTOM_PALETTE_ID ? customAccentPreview : p.cssVars['--color-accent']
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`theme-helper-option${opensSlide ? ' theme-helper-option--opens-slide' : ''}`}
                      data-active={active ? 'true' : 'false'}
                      data-opens-slide={opensSlide ? 'true' : 'false'}
                      aria-haspopup={opensSlide ? 'dialog' : undefined}
                      aria-expanded={
                        opensSlide ? (active && customEditorOpen ? 'true' : 'false') : undefined
                      }
                      onClick={() => handlePaletteClick(p.id)}
                    >
                      <span className="theme-helper-swatch" style={{ background: swatch }} aria-hidden />
                      <span className="theme-helper-option-text">
                        <span className="theme-helper-option-label">{p.label}</span>
                        <span className="theme-helper-option-desc">{p.description}</span>
                        <span className="theme-helper-option-source">{p.source}</span>
                      </span>
                      {opensSlide ? (
                        <span className="theme-helper-option-slide-cue" aria-hidden>
                          <span className="theme-helper-option-slide-cue-arrow">‹</span>
                        </span>
                      ) : null}
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
