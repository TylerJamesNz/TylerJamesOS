import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react'
import { Drawer } from '@/components/Drawer'
import './EmojiPickerDrawer.css'

type Props = {
  isOpen: boolean
  onClose: () => void
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPickerDrawer({ isOpen, onClose, onEmojiSelect }: Props) {
  const handleSelect = (data: EmojiClickData) => {
    onEmojiSelect(data.emoji)
    onClose()
  }

  return (
    <Drawer open={isOpen} onClose={onClose} title="Choose emoji">
      <div className="emoji-picker-drawer">
        <EmojiPicker
          onEmojiClick={handleSelect}
          theme={Theme.AUTO}
          width="100%"
          height={420}
          searchDisabled={false}
          previewConfig={{ showPreview: true }}
        />
      </div>
    </Drawer>
  )
}
