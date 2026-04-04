import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import brandBody from '../content/brand-kit-body.html?raw'
import { initTjMotionTypeHeadings } from '../lib/tjMotion'
import TokensSnippet from './TokensSnippet'
import IconsSection from './IconsSection'

export default function BrandKitShell() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [tokensTarget, setTokensTarget] = useState<HTMLElement | null>(null)
  const [iconsTarget, setIconsTarget] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    el.innerHTML = brandBody
    setTokensTarget(document.getElementById('tokens-snippet-root'))
    setIconsTarget(document.getElementById('icons-root'))
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => initTjMotionTypeHeadings(el))
    })
  }, [])

  return (
    <>
      <div ref={hostRef} />
      {tokensTarget ? createPortal(<TokensSnippet />, tokensTarget) : null}
      {iconsTarget ? createPortal(<IconsSection />, iconsTarget) : null}
    </>
  )
}
