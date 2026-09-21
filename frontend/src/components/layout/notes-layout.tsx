import { Outlet } from 'react-router'

import { NotesSidebar } from '@/features/notes/notes-sidebar'
import { NotesWorkspaceProvider } from '@/features/notes/notes-workspace-context'

import { AppShell } from './app-shell'

export function NotesLayout() {
  return (
    <NotesWorkspaceProvider>
      <AppShell sidebar={<NotesSidebar />}>
        <Outlet />
      </AppShell>
    </NotesWorkspaceProvider>
  )
}
