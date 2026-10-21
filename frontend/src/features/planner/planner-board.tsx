import { Plus } from 'lucide-react'
import { useState, type DragEvent as ReactDragEvent } from 'react'
import { useNavigate, useParams } from 'react-router'

import type { Task, TaskStatus } from '@/lib/types'

import { InlineNameForm } from '@/components/forms/inline-name-form'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { TaskCard } from './components/task-card'
import { TaskDialog, type TaskDialogSubmit } from './components/task-dialog'
import { useProjectTasks } from './hooks/use-project-tasks'
import { TASK_STATUSES, TASK_STATUS_LABELS } from './lib/task-order'
import { usePlannerProjectsContext } from './planner-projects-context'

function toMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong'
}

type DropTarget = { status: TaskStatus; index: number }

/** Placeholder shown at `/planner` before a project is selected. */
export function PlannerEmpty() {
  const { createProject } = usePlannerProjectsContext()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const create = async (name: string) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const project = await createProject(name)
      setCreating(false)
      void navigate(`/planner/${project.id}`)
    } catch (cause) {
      setError(toMessage(cause))
      setIsSubmitting(false)
    }
  }

  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <section className='flex max-w-sm flex-col items-center gap-3 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Planner</h1>
        <p className='text-sm text-muted-foreground'>
          Select or create a project to start planning.
        </p>
        {creating ? (
          <div className='w-full pt-1 text-left'>
            <InlineNameForm
              error={error}
              isBusy={isSubmitting}
              label='Project name'
              onCancel={() => {
                setCreating(false)
                setError(null)
              }}
              onSubmit={(name) => {
                void create(name)
              }}
              placeholder='Project name'
              submitLabel='Create project'
            />
          </div>
        ) : (
          <Button
            onClick={() => {
              setCreating(true)
            }}
          >
            New project
          </Button>
        )}
        <p className='text-xs text-muted-foreground'>Projects live in the sidebar.</p>
      </section>
    </div>
  )
}

export function PlannerBoard() {
  const { projectId } = useParams()
  const { projects } = usePlannerProjectsContext()
  const { tasksByStatus, isLoading, error, createTask, updateTask, deleteTask, moveTask } =
    useProjectTasks(projectId)

  const [dialog, setDialog] = useState<{
    open: boolean
    task: Task | null
    defaultStatus: TaskStatus
  }>({ open: false, task: null, defaultStatus: 'backlog' })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const project = projects.find((item) => item.id === projectId)

  const openCreate = (status: TaskStatus) => {
    setActionError(null)
    setDialog({ open: true, task: null, defaultStatus: status })
  }

  const openEdit = (task: Task) => {
    setActionError(null)
    setDialog({ open: true, task, defaultStatus: task.status })
  }

  const handleSubmit = async (input: TaskDialogSubmit) => {
    if (dialog.task !== null) {
      await updateTask(dialog.task.id, input)
    } else {
      await createTask(input)
    }
    setDialog((current) => ({ ...current, open: false }))
  }

  const handleDelete = async (task: Task) => {
    setActionError(null)
    try {
      await deleteTask(task.id)
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const handleDragStart = (task: Task) => {
    setDraggingId(task.id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDropTarget(null)
  }

  const handleDragOverCard = (task: Task, event: ReactDragEvent) => {
    if (draggingId === null) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    const column = tasksByStatus[task.status]
    const index = column
      .filter((item) => item.id !== draggingId)
      .findIndex((item) => item.id === task.id)
    setDropTarget({ status: task.status, index: index === -1 ? column.length : index })
  }

  const handleDrop = async (status: TaskStatus) => {
    const id = draggingId
    const target = dropTarget
    setDraggingId(null)
    setDropTarget(null)
    if (id === null) {
      return
    }
    const index =
      target !== null && target.status === status ? target.index : tasksByStatus[status].length
    setActionError(null)
    try {
      await moveTask(id, status, index)
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  if (projectId === undefined) {
    return <PlannerEmpty />
  }

  const totalTasks = TASK_STATUSES.reduce(
    (total, status) => total + tasksByStatus[status].length,
    0,
  )
  const doneTasks = tasksByStatus.done.length
  const liveTasks = tasksByStatus.todo.length + tasksByStatus.in_progress.length

  return (
    <div className='flex flex-1 flex-col gap-5 p-4 sm:p-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-1'>
          <h1 className='truncate text-2xl font-semibold tracking-tight'>
            {project?.name ?? 'Planner'}
          </h1>
          <p className='text-sm text-muted-foreground tabular-nums'>
            {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} · {liveTasks} in play · {doneTasks}{' '}
            done
          </p>
        </div>
        <Button
          onClick={() => {
            openCreate('backlog')
          }}
        >
          <Plus aria-hidden='true' />
          New task
        </Button>
      </div>

      {actionError !== null && <p className='text-sm text-destructive'>{actionError}</p>}
      {error !== null && <p className='text-sm text-destructive'>{error.message}</p>}

      <div className='grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {TASK_STATUSES.map((status) => (
          <PlannerColumn
            key={status}
            draggingId={draggingId}
            dropTarget={dropTarget}
            isLoading={isLoading}
            onDelete={(task) => {
              void handleDelete(task)
            }}
            onDragEnd={handleDragEnd}
            onDragOverCard={handleDragOverCard}
            onDragStart={handleDragStart}
            onDrop={(dropStatus) => {
              void handleDrop(dropStatus)
            }}
            onDropOnCard={(task, event) => {
              event.stopPropagation()
              void handleDrop(task.status)
            }}
            onNewTask={openCreate}
            onOpenTask={openEdit}
            onSetDropTarget={setDropTarget}
            status={status}
            tasks={tasksByStatus[status]}
          />
        ))}
      </div>

      <TaskDialog
        defaultStatus={dialog.defaultStatus}
        onOpenChange={(open) => {
          setDialog((current) => ({ ...current, open }))
        }}
        onSubmit={handleSubmit}
        open={dialog.open}
        task={dialog.task}
      />
    </div>
  )
}

type PlannerColumnProps = {
  status: TaskStatus
  tasks: Task[]
  isLoading: boolean
  draggingId: string | null
  dropTarget: DropTarget | null
  onNewTask: (status: TaskStatus) => void
  onOpenTask: (task: Task) => void
  onDelete: (task: Task) => void
  onDragStart: (task: Task) => void
  onDragEnd: () => void
  onDragOverCard: (task: Task, event: ReactDragEvent) => void
  onDropOnCard: (task: Task, event: ReactDragEvent) => void
  onSetDropTarget: (target: DropTarget) => void
  onDrop: (status: TaskStatus) => void
}

function PlannerColumn({
  status,
  tasks,
  isLoading,
  draggingId,
  dropTarget,
  onNewTask,
  onOpenTask,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropOnCard,
  onSetDropTarget,
  onDrop,
}: PlannerColumnProps) {
  const isDropTarget = draggingId !== null && dropTarget?.status === status

  return (
    <section
      className={cn(
        'flex flex-col gap-2.5 rounded-lg bg-muted/60 p-2.5 transition-colors',
        isDropTarget && 'bg-accent',
      )}
      onDragOver={(event) => {
        if (draggingId === null) {
          return
        }
        event.preventDefault()
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move'
        }
        onSetDropTarget({ status, index: tasks.length })
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(status)
      }}
    >
      <div className='flex items-center justify-between gap-1'>
        <h2 className='flex items-baseline gap-1.5 text-sm font-medium text-muted-foreground'>
          {TASK_STATUS_LABELS[status]}
          <span className='text-xs tabular-nums text-muted-foreground'>{tasks.length}</span>
        </h2>
        <Button
          aria-label={`New task in ${TASK_STATUS_LABELS[status]}`}
          onClick={() => {
            onNewTask(status)
          }}
          size='icon-xs'
          variant='ghost'
        >
          <Plus aria-hidden='true' />
        </Button>
      </div>

      <div className='flex min-h-8 flex-col gap-2'>
        {isLoading && <p className='text-xs text-muted-foreground'>Loading…</p>}
        {!isLoading && tasks.length === 0 && (
          <p className='rounded-md border border-dashed border-border px-2 py-3 text-center text-[13px] text-muted-foreground'>
            No tasks
          </p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            isDragging={task.id === draggingId}
            onDelete={onDelete}
            onDragEnd={onDragEnd}
            onDragOverCard={onDragOverCard}
            onDragStart={onDragStart}
            onDropOnCard={onDropOnCard}
            onOpen={onOpenTask}
            task={task}
          />
        ))}
      </div>
    </section>
  )
}
