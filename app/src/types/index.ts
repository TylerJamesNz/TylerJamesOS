export interface User {
  id: string
  email: string
  name: string
  image?: string
  provider: 'google'
  createdAt: Date
}

export interface Task {
  id: string
  userId?: string
  title: string
  emoji: string
  description?: string
  dueDate?: Date
  tags: string[]
  completed: boolean
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  syncStatus?: 'local' | 'synced' | 'pending'
}

export interface Tag {
  id: string
  userId?: string
  name: string
  color: string
  createdAt: Date
  syncStatus?: 'local' | 'synced' | 'pending'
}

export interface TaskAction {
  type: 'create' | 'edit' | 'delete' | 'complete'
  taskId?: string
  title?: string
  emoji?: string
  description?: string
  dueDate?: Date
  tags?: string[]
}

export interface VoiceTranscription {
  text: string
  isListening: boolean
  confidence?: number
}

export type ViewType = 'today' | 'upcoming' | 'tags' | 'archive'

export interface AppState {
  currentView: ViewType
  selectedDate: Date
  isVoiceDrawerOpen: boolean
  isTaskDrawerOpen: boolean
  isManualTaskDrawerOpen: boolean
  isTagDrawerOpen: boolean
  isEmojiPickerOpen: boolean
  selectedTaskId: string | null
}

export interface TaskFormData {
  title: string
  emoji: string
  description: string
  dueDate?: Date
  tags: string[]
}
