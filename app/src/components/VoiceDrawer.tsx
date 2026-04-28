import { Mic } from 'lucide-react'
import { Drawer } from '@/components/Drawer'
import { useTaskStore } from '@/store/useTaskStore'
import './VoiceDrawer.css'

export function VoiceDrawer() {
  const { isVoiceDrawerOpen, setVoiceDrawerOpen } = useTaskStore()

  return (
    <Drawer
      open={isVoiceDrawerOpen}
      onClose={() => setVoiceDrawerOpen(false)}
      title="Voice command"
    >
      <div className="voice-drawer">
        <div className="voice-drawer-mic" aria-hidden="true">
          <Mic size={32} />
        </div>
        <h3 className="voice-drawer-headline">Tap to speak</h3>
        <p className="voice-drawer-prompt">
          Say something like &quot;Add task to buy groceries tomorrow&quot; or &quot;Complete
          project proposal by Friday&quot;.
        </p>
        <div className="voice-drawer-transcript">
          <p>Voice recognition will appear here.</p>
        </div>
        <div className="voice-drawer-actions">
          <button type="button" className="voice-drawer-start">
            Start listening
          </button>
          <button
            type="button"
            className="voice-drawer-cancel"
            onClick={() => setVoiceDrawerOpen(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </Drawer>
  )
}
