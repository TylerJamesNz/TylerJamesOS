import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import './FloatingMicButton.css'

export function FloatingMicButton() {
  const { setVoiceDrawerOpen, isVoiceDrawerOpen } = useTaskStore()

  if (isVoiceDrawerOpen) return null

  return (
    <motion.button
      type="button"
      className="floating-mic"
      onClick={() => setVoiceDrawerOpen(true)}
      aria-label="Voice command"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
    >
      <Mic size={24} aria-hidden="true" />
    </motion.button>
  )
}
