import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import brandBody from '../content/brand-kit-body.html?raw'
import { initTjMotionTypeHeadings } from '../lib/tjMotion'
import TokensSnippet from './TokensSnippet'

export default function BrandKitShell() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    el.innerHTML = brandBody
    setPortalTarget(document.getElementById('tokens-snippet-root'))
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => initTjMotionTypeHeadings(el))
    })
  }, [])

  return (
    <>
      <div ref={hostRef} />
      {portalTarget ? createPortal(<TokensSnippet />, portalTarget) : null}
    </>
  )
}
