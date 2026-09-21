import { Outlet } from 'react-router'

import { NotesSidebar } from '@/features/notes/notes-sidebar'

import { AppShell } from './app-shell'

export function NotesLayout() {
  return (
    <AppShell sidebar={<NotesSidebar />}>
      <Outlet />
    </AppShell>
  )
}
