import { z } from 'zod'

/**
 * Runtime schemas for every payload the backend exposes under `/api/v1`.
 *
 * The field names mirror the JSON tags declared in `backend/internal/api`
 * (`vaultResponse`, `documentResponse`), so parsing a response guarantees the
 * object matches the Go contract before it reaches the React tree.
 */

export const vaultSchema = z.object({
  id: z.string(),
  name: z.string(),
  deleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Vault = z.infer<typeof vaultSchema>

export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  vaultId: z.string(),
  path: z.string(),
  content: z.string(),
  deleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Document = z.infer<typeof documentSchema>

/**
 * Secrets returned by `GET /api/v1/config`. The backend flattens the vault
 * response into a plain `key -> value` map, mirroring `config.GetSecrets`.
 */
export const secretsSchema = z.record(z.string(), z.string())

export type Secrets = z.infer<typeof secretsSchema>

/**
 * Editor preferences returned by `GET /api/v1/editor/config`. The backend
 * stores a single row keyed by `default`, mirroring `editorconfig.EditorConfig`.
 */
export const editorConfigSchema = z.object({
  id: z.string(),
  darkTheme: z.boolean(),
  vimMotion: z.boolean(),
  formatOnSave: z.boolean(),
  relativeLineNumbers: z.boolean(),
})

export type EditorConfig = z.infer<typeof editorConfigSchema>

/**
 * Planner task statuses. Mirrors the typed enum in
 * `backend/internal/planner/tasks/tasks.go`; values are snake_case.
 */
export const taskStatusSchema = z.enum(['backlog', 'todo', 'in_progress', 'done'])

export type TaskStatus = z.infer<typeof taskStatusSchema>

/**
 * Project returned by `GET /api/v1/projects`. `deleted` is computed on the
 * backend from `deleted_at` (soft delete); list endpoints only return active
 * projects.
 */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  deleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Project = z.infer<typeof projectSchema>

/**
 * Task returned by `GET /api/v1/projects/{projectID}/tasks`. `projectId` is
 * camelCase in JSON while the domain field is `ProjectID`. Tasks are
 * hard-deleted, so there is no `deleted` flag.
 */
export const taskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string(),
  status: taskStatusSchema,
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Task = z.infer<typeof taskSchema>

export type CreateVaultInput = {
  name: string
}

export type RenameVaultInput = {
  name: string
}

export type CreateDocumentInput = {
  name: string
  path: string
  content: string
}

export type RenameDocumentInput = {
  name: string
  path: string
}

export type MoveDocumentInput = {
  path: string
}

export type UpdateContentInput = {
  content: string
}

export type CreateProjectInput = {
  name: string
}

export type RenameProjectInput = {
  name: string
}

export type CreateTaskInput = {
  title: string
  description: string
}

export type UpdateTaskTitleInput = {
  title: string
}

export type UpdateTaskDescriptionInput = {
  description: string
}

export type UpdateTaskStatusInput = {
  status: TaskStatus
}

export type UpdateTaskPositionInput = {
  position: number
}
