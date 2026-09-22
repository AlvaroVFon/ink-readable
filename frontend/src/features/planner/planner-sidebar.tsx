import { Menu } from '@base-ui/react/menu'
import { FolderKanban, MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useMatch, useNavigate } from 'react-router'

import { InlineNameForm } from '@/components/forms/inline-name-form'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

import { usePlannerProjectsContext } from './planner-projects-context'

const MENU_ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'

type PendingAction = 'create' | 'rename' | null

function toMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong'
}

export function PlannerSidebar() {
  const { projects, isLoading, error, createProject, renameProject, deleteProject } =
    usePlannerProjectsContext()
  const match = useMatch('/planner/:projectId')
  const activeProjectId = match?.params.projectId
  const navigate = useNavigate()

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [projectPendingDelete, setProjectPendingDelete] = useState<string | null>(null)

  const handleCreate = async (name: string) => {
    setIsSubmitting(true)
    setActionError(null)
    try {
      const project = await createProject(name)
      setPendingAction(null)
      setIsSubmitting(false)
      void navigate(`/planner/${project.id}`)
    } catch (cause) {
      setActionError(toMessage(cause))
      setIsSubmitting(false)
    }
  }

  const handleRename = async (id: string, name: string) => {
    setActionError(null)
    try {
      await renameProject(id, name)
      setRenamingId(null)
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const handleConfirmDelete = async () => {
    const id = projectPendingDelete
    if (id === null) {
      return
    }
    setProjectPendingDelete(null)
    setActionError(null)
    try {
      await deleteProject(id)
      if (id === activeProjectId) {
        void navigate('/planner')
      }
    } catch (cause) {
      setActionError(toMessage(cause))
    }
  }

  const cancelForm = () => {
    setPendingAction(null)
    setActionError(null)
  }

  const pendingDeleteName =
    projects.find((project) => project.id === projectPendingDelete)?.name ?? ''

  return (
    <SidebarGroup className='p-2'>
      <div className='flex items-center justify-between gap-1 px-1 group-data-[collapsible=icon]:hidden'>
        <SidebarGroupLabel className='gap-2 px-1'>
          <FolderKanban aria-hidden='true' />
          Projects
        </SidebarGroupLabel>
        <Button
          aria-label='New project'
          onClick={() => {
            setActionError(null)
            setPendingAction('create')
          }}
          size='icon-sm'
          variant='ghost'
        >
          <Plus aria-hidden='true' />
        </Button>
      </div>

      {pendingAction === 'create' && (
        <div className='px-1 pb-2 group-data-[collapsible=icon]:hidden'>
          <InlineNameForm
            error={actionError}
            isBusy={isSubmitting}
            label='Project name'
            onCancel={cancelForm}
            onSubmit={(name) => {
              void handleCreate(name)
            }}
            placeholder='Project name'
            submitLabel='Create project'
          />
        </div>
      )}

      {actionError !== null && pendingAction === null && (
        <p className='px-2 py-1 text-xs text-destructive group-data-[collapsible=icon]:hidden'>
          {actionError}
        </p>
      )}

      <SidebarGroupContent className='group-data-[collapsible=icon]:hidden'>
        {isLoading && (
          <div className='flex flex-col gap-1 py-1'>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </div>
        )}

        {error !== null && <p className='px-2 py-1 text-sm text-destructive'>{error.message}</p>}

        {!isLoading && error === null && projects.length === 0 && (
          <div className='flex flex-col items-start gap-2 px-2 py-1'>
            <p className='text-sm text-muted-foreground'>No projects yet.</p>
            <Button
              onClick={() => {
                setActionError(null)
                setPendingAction('create')
              }}
              size='xs'
            >
              New project
            </Button>
          </div>
        )}

        {!isLoading && error === null && projects.length > 0 && (
          <SidebarMenu>
            {projects.map((project) =>
              renamingId === project.id ? (
                <SidebarMenuItem key={project.id}>
                  <div className='px-1'>
                    <InlineNameForm
                      error={actionError}
                      initialValue={project.name}
                      isBusy={false}
                      label='Project name'
                      onCancel={() => {
                        setRenamingId(null)
                        setActionError(null)
                      }}
                      onSubmit={(name) => {
                        void handleRename(project.id, name)
                      }}
                      placeholder='Project name'
                      submitLabel='Rename'
                    />
                  </div>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    isActive={project.id === activeProjectId}
                    render={<Link to={`/planner/${project.id}`} />}
                  >
                    <FolderKanban aria-hidden='true' />
                    <span>{project.name}</span>
                  </SidebarMenuButton>
                  <Menu.Root>
                    <Menu.Trigger
                      aria-label={`Actions for ${project.name}`}
                      render={<SidebarMenuAction showOnHover />}
                    >
                      <MoreHorizontal aria-hidden='true' />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner
                        align='end'
                        className='z-50'
                        sideOffset={4}
                      >
                        <Menu.Popup className='z-50 min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-hidden'>
                          <Menu.Item
                            className={MENU_ITEM_CLASS}
                            onClick={() => {
                              setActionError(null)
                              setRenamingId(project.id)
                            }}
                          >
                            Rename
                          </Menu.Item>
                          <Menu.Item
                            className={cn(MENU_ITEM_CLASS, 'text-destructive')}
                            onClick={() => {
                              setProjectPendingDelete(project.id)
                            }}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        )}
      </SidebarGroupContent>

      <AlertDialog
        open={projectPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProjectPendingDelete(null)
          }
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            {`"${pendingDeleteName}" and all of its tasks will be deleted. This cannot be undone.`}
          </AlertDialogDescription>
          <div className='flex justify-end gap-2'>
            <AlertDialogClose
              render={
                <Button
                  variant='ghost'
                  size='sm'
                />
              }
            >
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              render={
                <Button
                  variant='destructive'
                  size='sm'
                />
              }
              onClick={() => {
                void handleConfirmDelete()
              }}
            >
              Delete project
            </AlertDialogClose>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </SidebarGroup>
  )
}
