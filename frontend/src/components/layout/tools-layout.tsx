import { Outlet } from 'react-router'

import { ToolsSidebar } from '@/features/tools/tools-sidebar'

import { AppShell } from './app-shell'

export function ToolsLayout() {
  return (
    <AppShell sidebar={<ToolsSidebar />}>
      <Outlet />
    </AppShell>
  )
}
