/* oxlint-disable react/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'

import { usePlannerProjects, type UsePlannerProjectsResult } from './hooks/use-planner-projects'

const PlannerProjectsContext = createContext<UsePlannerProjectsResult | null>(null)

/**
 * Owns the planner project list for the whole `/planner` section, so the
 * sidebar and the board share one source of truth.
 */
export function PlannerProjectsProvider({ children }: { children: ReactNode }) {
  const projects = usePlannerProjects()

  return (
    <PlannerProjectsContext.Provider value={projects}>{children}</PlannerProjectsContext.Provider>
  )
}

export function usePlannerProjectsContext(): UsePlannerProjectsResult {
  const projects = useContext(PlannerProjectsContext)
  if (projects === null) {
    throw new Error('usePlannerProjectsContext must be used within a PlannerProjectsProvider')
  }
  return projects
}
