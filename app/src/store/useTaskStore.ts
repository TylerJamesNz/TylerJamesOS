import chroma from 'chroma-js'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, Tag, Task, User } from '@/types'

interface TaskStore extends AppState {
  tasks: Task[]
  tags: Tag[]
  user: User | null

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  completeTask: (id: string) => void
  uncompleteTask: (id: string) => void

  addTag: (name: string) => void
  updateTag: (id: string, updates: Partial<Tag>) => void
  deleteTag: (id: string) => void
  getTagUsageCount: (tagId: string) => number

  setUser: (user: User | null) => void

  setCurrentView: (view: AppState['currentView']) => void
  setSelectedDate: (date: Date) => void
  setVoiceDrawerOpen: (open: boolean) => void
  setTaskDrawerOpen: (open: boolean) => void
  setManualTaskDrawerOpen: (open: boolean) => void
  setTagDrawerOpen: (open: boolean) => void

  setSelectedTaskId: (id: string | null) => void

  getTodayTasks: () => Task[]
  getTodayTasksWithOverdue: () => Task[]
  getUpcomingTasks: () => Task[]
  getOverdueTasks: () => Task[]
  getArchivedTasks: () => Task[]
  getTasksByDate: (date: Date) => Task[]
  getTasksByTag: (tagId: string) => Task[]
  getTasksGroupedByTags: (tasks: Task[]) => { [tagName: string]: Task[] }
}

const generatePastelColor = (): string => {
  const hue = Math.random() * 360
  return chroma.hsl(hue, 0.4, 0.8).hex()
}

const isToday = (date: Date): boolean => {
  try {
    if (!date || typeof date.toDateString !== 'function') {
      return false
    }
    const today = new Date()
    return date.toDateString() === today.toDateString()
  } catch (error) {
    console.warn('isToday error:', error, 'date:', date)
    return false
  }
}

const isOverdue = (date: Date): boolean => {
  try {
    if (!date || typeof date.getTime !== 'function') {
      return false
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  } catch (error) {
    console.warn('isOverdue error:', error, 'date:', date)
    return false
  }
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      tags: [],
      user: null,
      currentView: 'today',
      selectedDate: new Date('2024-01-01'),
      isVoiceDrawerOpen: false,
      isTaskDrawerOpen: false,
      isManualTaskDrawerOpen: false,
      isTagDrawerOpen: false,
      isEmojiPickerOpen: false,

      selectedTaskId: null,

      addTask: (taskData) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...taskData,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task,
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),

      completeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, completed: true, completedAt: new Date(), updatedAt: new Date() }
              : task,
          ),
        })),

      uncompleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, completed: false, completedAt: undefined, updatedAt: new Date() }
              : task,
          ),
        })),

      addTag: (name) =>
        set((state) => ({
          tags: [
            ...state.tags,
            {
              id: crypto.randomUUID(),
              name,
              color: generatePastelColor(),
              createdAt: new Date(),
            },
          ],
        })),

      updateTag: (id, updates) =>
        set((state) => ({
          tags: state.tags.map((tag) => (tag.id === id ? { ...tag, ...updates } : tag)),
        })),

      deleteTag: (id) =>
        set((state) => ({
          tags: state.tags.filter((tag) => tag.id !== id),
          tasks: state.tasks.map((task) => ({
            ...task,
            tags: task.tags.filter((tagId) => tagId !== id),
          })),
        })),

      getTagUsageCount: (tagId) => {
        const { tasks } = get()
        return tasks.filter((task) => task.tags.includes(tagId)).length
      },

      setUser: (user) => set({ user }),

      setCurrentView: (view) => set({ currentView: view }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setVoiceDrawerOpen: (open) => set({ isVoiceDrawerOpen: open }),
      setTaskDrawerOpen: (open) => set({ isTaskDrawerOpen: open }),
      setManualTaskDrawerOpen: (open) => set({ isManualTaskDrawerOpen: open }),
      setTagDrawerOpen: (open) => set({ isTagDrawerOpen: open }),

      setSelectedTaskId: (id) => set({ selectedTaskId: id }),

      getTodayTasks: () => {
        const { tasks } = get()
        return tasks.filter((task) => !task.completed && task.dueDate && isToday(task.dueDate))
      },

      getTodayTasksWithOverdue: () => {
        const { tasks } = get()
        return tasks.filter(
          (task) =>
            !task.completed && task.dueDate && (isToday(task.dueDate) || isOverdue(task.dueDate)),
        )
      },

      getUpcomingTasks: () => {
        const { tasks } = get()
        const today = new Date()
        return tasks.filter((task) => !task.completed && task.dueDate && task.dueDate > today)
      },

      getOverdueTasks: () => {
        const { tasks } = get()
        return tasks.filter((task) => !task.completed && task.dueDate && isOverdue(task.dueDate))
      },

      getArchivedTasks: () => {
        const { tasks } = get()
        return tasks.filter((task) => task.completed)
      },

      getTasksByDate: (date) => {
        const { tasks } = get()
        return tasks.filter((task) => {
          try {
            return (
              task.dueDate &&
              typeof task.dueDate.toDateString === 'function' &&
              typeof date.toDateString === 'function' &&
              task.dueDate.toDateString() === date.toDateString()
            )
          } catch (error) {
            console.warn(
              'getTasksByDate error:',
              error,
              'task.dueDate:',
              task.dueDate,
              'date:',
              date,
            )
            return false
          }
        })
      },

      getTasksByTag: (tagId) => {
        const { tasks } = get()
        return tasks.filter((task) => task.tags.includes(tagId))
      },

      getTasksGroupedByTags: (tasks) => {
        const { tags } = get()
        const grouped: { [tagName: string]: Task[] } = {}

        tasks.forEach((task) => {
          if (task.tags.length === 0) {
            if (!grouped['No Tags']) grouped['No Tags'] = []
            grouped['No Tags'].push(task)
          } else {
            task.tags.forEach((tagId) => {
              const tag = tags.find((t) => t.id === tagId)
              if (tag) {
                if (!grouped[tag.name]) grouped[tag.name] = []
                grouped[tag.name].push(task)
              }
            })
          }
        })

        Object.keys(grouped).forEach((tagName) => {
          grouped[tagName].sort((a, b) => a.title.localeCompare(b.title))
        })

        return grouped
      },
    }),
    {
      name: 'tjos-tasks-storage',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.tasks = state.tasks.map((task) => ({
            ...task,
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
          }))

          state.tags = state.tags.map((tag) => ({
            ...tag,
            createdAt: new Date(tag.createdAt),
          }))

          if (state.selectedDate) {
            state.selectedDate = new Date(state.selectedDate)
          }
        }
      },
    },
  ),
)
