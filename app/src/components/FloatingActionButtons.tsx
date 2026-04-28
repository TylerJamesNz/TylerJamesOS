import { motion } from 'framer-motion'
import { Mic, Plus, Tag as TagIcon } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import './FloatingActionButtons.css'

const spring = { type: 'spring' as const, stiffness: 260, damping: 20 }

export function FloatingActionButtons() {
  const {
    setVoiceDrawerOpen,
    setManualTaskDrawerOpen,
    setTagDrawerOpen,
    isVoiceDrawerOpen,
    currentView,
  } = useTaskStore()

  if (isVoiceDrawerOpen) return null

  const showTaskButton = currentView === 'today' || currentView === 'upcoming'
  const showTagButton = currentView === 'tags'

  return (
    <div className="floating-actions">
      {showTaskButton && (
        <motion.button
          type="button"
          className="floating-action floating-action-secondary"
          onClick={() => setManualTaskDrawerOpen(true)}
          aria-label="Add task"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring, delay: 0.5 }}
        >
          <Plus size={24} aria-hidden="true" />
        </motion.button>
      )}

      <motion.button
        type="button"
        className="floating-action floating-action-primary"
        onClick={() => setVoiceDrawerOpen(true)}
        aria-label="Voice command"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...spring, delay: 0.6 }}
      >
        <Mic size={24} aria-hidden="true" />
      </motion.button>

      {showTagButton && (
        <motion.button
          type="button"
          className="floating-action floating-action-secondary"
          onClick={() => setTagDrawerOpen(true)}
          aria-label="Manage tags"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring, delay: 0.7 }}
        >
          <TagIcon size={20} aria-hidden="true" />
        </motion.button>
      )}
    </div>
  )
}
