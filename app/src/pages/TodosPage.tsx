import { FloatingActionButtons } from '@/components/FloatingActionButtons'
import { ManualTaskDrawer } from '@/components/ManualTaskDrawer'
import { Sidebar } from '@/components/Sidebar'
import { SupabaseSync } from '@/components/SupabaseSync'
import { TagManagementDrawer } from '@/components/TagManagementDrawer'
import { TaskDrawer } from '@/components/TaskDrawer'
import { TaskList } from '@/components/TaskList'
import { VoiceDrawer } from '@/components/VoiceDrawer'
import './TodosPage.css'

export default function TodosPage() {
  return (
    <div className="todos-page">
      <aside className="todos-page-sidebar">
        <Sidebar />
      </aside>
      <main className="todos-page-main">
        <TaskList />
      </main>

      <FloatingActionButtons />

      <TaskDrawer />
      <ManualTaskDrawer />
      <VoiceDrawer />
      <TagManagementDrawer />

      <SupabaseSync />
    </div>
  )
}
