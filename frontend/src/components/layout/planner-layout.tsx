import { Outlet } from 'react-router'

import { PlannerSidebar } from '@/features/planner/planner-sidebar'

import { AppShell } from './app-shell'

export function PlannerLayout() {
  return (
    <AppShell sidebar={<PlannerSidebar />}>
      <Outlet />
    </AppShell>
  )
}
