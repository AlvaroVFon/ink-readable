import { describe, expect, it } from 'vitest'

import type { Task, TaskStatus } from '@/lib/types'

import { groupByStatus, positionUpdates, reorderColumnIds, sortTasks } from './task-order'

function task(
  id: string,
  status: TaskStatus,
  position: number,
  createdAt = '2026-09-20T10:00:00Z',
): Task {
  return {
    id,
    projectId: 'project-1',
    title: id,
    description: '',
    status,
    position,
    createdAt,
    updatedAt: createdAt,
  }
}

describe('sortTasks', () => {
  it('orders by position', () => {
    const result = sortTasks([task('b', 'backlog', 2), task('a', 'backlog', 1)])

    expect(result.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('breaks position ties with createdAt', () => {
    const result = sortTasks([
      task('late', 'backlog', 1, '2026-09-20T12:00:00Z'),
      task('early', 'backlog', 1, '2026-09-20T10:00:00Z'),
    ])

    expect(result.map((item) => item.id)).toEqual(['early', 'late'])
  })

  it('does not mutate the input', () => {
    const input = [task('b', 'backlog', 2), task('a', 'backlog', 1)]

    sortTasks(input)

    expect(input.map((item) => item.id)).toEqual(['b', 'a'])
  })
})

describe('groupByStatus', () => {
  it('groups and orders each column', () => {
    const groups = groupByStatus([
      task('b2', 'backlog', 2),
      task('t1', 'todo', 1),
      task('b1', 'backlog', 1),
    ])

    expect(groups.backlog.map((item) => item.id)).toEqual(['b1', 'b2'])
    expect(groups.todo.map((item) => item.id)).toEqual(['t1'])
    expect(groups.done).toEqual([])
  })
})

describe('reorderColumnIds', () => {
  it('inserts before the target index within the same column', () => {
    const column = [task('a', 'backlog', 1), task('b', 'backlog', 2), task('c', 'backlog', 3)]

    expect(reorderColumnIds(column, 'a', 1)).toEqual(['b', 'a', 'c'])
  })

  it('appends when the index is past the end', () => {
    const column = [task('a', 'backlog', 1), task('b', 'backlog', 2)]

    expect(reorderColumnIds(column, 'a', 5)).toEqual(['b', 'a'])
  })

  it('inserts a task coming from another column', () => {
    const column = [task('c', 'todo', 1), task('d', 'todo', 2)]

    expect(reorderColumnIds(column, 'x', 1)).toEqual(['c', 'x', 'd'])
  })
})

describe('positionUpdates', () => {
  it('only returns tasks whose position changes', () => {
    const current = new Map([
      ['a', task('a', 'backlog', 1)],
      ['b', task('b', 'backlog', 2)],
      ['c', task('c', 'backlog', 3)],
    ])

    const updates = positionUpdates(['c', 'a', 'b'], current)

    expect(updates).toEqual([
      { id: 'c', position: 1 },
      { id: 'a', position: 2 },
      { id: 'b', position: 3 },
    ])
  })

  it('returns nothing when the order already matches', () => {
    const current = new Map([
      ['a', task('a', 'backlog', 1)],
      ['b', task('b', 'backlog', 2)],
    ])

    expect(positionUpdates(['a', 'b'], current)).toEqual([])
  })
})
