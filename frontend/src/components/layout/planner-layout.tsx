import { Outlet } from 'react-router'

import { PlannerProjectsProvider } from '@/features/planner/planner-projects-context'
import { PlannerSidebar } from '@/features/planner/planner-sidebar'

import { AppShell } from './app-shell'

export function PlannerLayout() {
  return (
    <PlannerProjectsProvider>
      <AppShell sidebar={<PlannerSidebar />}>
        <Outlet />
      </AppShell>
    </PlannerProjectsProvider>
  )
}
