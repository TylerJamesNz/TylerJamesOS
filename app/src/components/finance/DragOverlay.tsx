import { useEffect, useState, type DragEvent } from 'react'
import './DragOverlay.css'

type Props = {
  onFileDropped: (file: File) => void
}

export function DragOverlay({ onFileDropped }: Props) {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let depth = 0
    const onEnter = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer) return
      depth++
      if (depth === 1) setDragging(true)
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = () => {
      depth = 0
      setDragging(false)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  function onDropOverlay(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type === 'application/pdf') onFileDropped(file)
  }

  if (!dragging) return null
  return (
    <div
      className="drag-overlay"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropOverlay}
      role="region"
      aria-label="Drop a PDF to import"
    >
      <div className="drag-overlay-inner">
        <div className="drag-overlay-title">Drop a PDF to import</div>
        <div className="drag-overlay-subtitle">Bank statements only. Other files are ignored.</div>
      </div>
    </div>
  )
}
