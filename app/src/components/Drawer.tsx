import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import './Drawer.css'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Drawer({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="drawer-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
          <motion.div
            className="drawer-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="drawer-header">
              <h2 id="drawer-title" className="drawer-title">
                {title}
              </h2>
              <button
                type="button"
                className="drawer-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            <div className="drawer-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
