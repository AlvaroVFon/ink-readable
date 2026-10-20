import { Outlet } from 'react-router'

import { AppShell } from './app-shell'

export function ToolsLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
