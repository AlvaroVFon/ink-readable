import { Outlet } from 'react-router'

import { NotesFileFinder } from '@/features/notes/components/notes-file-finder'
import { NotesSidebar } from '@/features/notes/notes-sidebar'
import { NotesVimProvider } from '@/features/notes/notes-vim-context'
import { NotesWorkspaceProvider } from '@/features/notes/notes-workspace-context'

import { AppShell } from './app-shell'

export function NotesLayout() {
  return (
    <NotesWorkspaceProvider>
      <NotesVimProvider>
        <AppShell sidebar={<NotesSidebar />}>
          <Outlet />
        </AppShell>
        <NotesFileFinder />
      </NotesVimProvider>
    </NotesWorkspaceProvider>
  )
}
