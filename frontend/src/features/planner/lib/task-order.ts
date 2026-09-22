import type { Task, TaskStatus } from '@/lib/types'

/** Kanban columns, in board order. */
export const TASK_STATUSES: readonly TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In progress',
  done: 'Done',
}

/**
 * Orders tasks by `position`, falling back to `createdAt`.
 *
 * The fallback matters because the backend gives every newly created task
 * `position = 1` (creation does not accept a position), so ties are expected
 * until the board assigns real positions.
 */
export function sortTasks(tasks: Task[]): Task[] {
  return tasks.toSorted((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position
    }
    return a.createdAt.localeCompare(b.createdAt)
  })
}

/** Groups tasks into the four board columns, each already ordered. */
export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    done: [],
  }
  for (const task of sortTasks(tasks)) {
    groups[task.status].push(task)
  }
  return groups
}

/**
 * Ordered id list of a column after moving `movedId` to `targetIndex`
 * (0-based, clamped). `movedId` may not belong to `column` yet (cross-column
 * move).
 */
export function reorderColumnIds(column: Task[], movedId: string, targetIndex: number): string[] {
  const ids = column.filter((task) => task.id !== movedId).map((task) => task.id)
  const clamped = Math.max(0, Math.min(targetIndex, ids.length))
  ids.splice(clamped, 0, movedId)
  return ids
}

/**
 * Sequential positions (1..n) for `orderedIds`, keeping only the tasks whose
 * stored position actually changes so a move issues as few requests as
 * possible.
 */
export function positionUpdates(
  orderedIds: string[],
  currentById: Map<string, Task>,
): { id: string; position: number }[] {
  const updates: { id: string; position: number }[] = []
  orderedIds.forEach((id, index) => {
    const position = index + 1
    if (currentById.get(id)?.position !== position) {
      updates.push({ id, position })
    }
  })
  return updates
}
