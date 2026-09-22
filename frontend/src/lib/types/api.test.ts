import { describe, expect, it } from 'vitest'

import { documentSchema, projectSchema, secretsSchema, taskSchema, vaultSchema } from './api'

const validVault = {
  id: '2f0d2f2a-0000-4000-8000-000000000000',
  name: 'Notes',
  deleted: false,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

const validDocument = {
  id: '3a1e3a3b-0000-4000-8000-000000000000',
  name: 'Untitled',
  vaultId: validVault.id,
  path: '/untitled.md',
  content: '# Hello',
  deleted: false,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

describe('vaultSchema', () => {
  it('parses a vault response', () => {
    expect(vaultSchema.parse(validVault)).toEqual(validVault)
  })

  it('rejects a response without the deleted flag', () => {
    const { deleted, ...incomplete } = validVault

    expect(deleted).toBe(false)
    expect(vaultSchema.safeParse(incomplete).success).toBe(false)
  })
})

describe('documentSchema', () => {
  it('parses a document response', () => {
    expect(documentSchema.parse(validDocument)).toEqual(validDocument)
  })

  it('rejects a response missing vaultId', () => {
    const { vaultId, ...incomplete } = validDocument

    expect(vaultId).toBe(validVault.id)
    expect(documentSchema.safeParse(incomplete).success).toBe(false)
  })
})

const validProject = {
  id: '4b2f4b4c-0000-4000-8000-000000000000',
  name: 'Website',
  deleted: false,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

const validTask = {
  id: '5c3f5c5d-0000-4000-8000-000000000000',
  projectId: validProject.id,
  title: 'Design the board',
  description: '',
  status: 'backlog',
  position: 1,
  createdAt: '2026-09-20T10:00:00Z',
  updatedAt: '2026-09-20T10:00:00Z',
}

describe('projectSchema', () => {
  it('parses a project response', () => {
    expect(projectSchema.parse(validProject)).toEqual(validProject)
  })

  it('rejects a project missing the deleted flag', () => {
    const { deleted, ...incomplete } = validProject

    expect(deleted).toBe(false)
    expect(projectSchema.safeParse(incomplete).success).toBe(false)
  })
})

describe('taskSchema', () => {
  it('parses a task response', () => {
    expect(taskSchema.parse(validTask)).toEqual(validTask)
  })

  it('rejects an unknown status', () => {
    expect(taskSchema.safeParse({ ...validTask, status: 'archived' }).success).toBe(false)
  })

  it('rejects a task missing projectId', () => {
    const { projectId, ...incomplete } = validTask

    expect(projectId).toBe(validProject.id)
    expect(taskSchema.safeParse(incomplete).success).toBe(false)
  })
})

describe('secretsSchema', () => {
  it('parses a flat key/value map', () => {
    const secrets = { 'app.baseURL': 'localhost', 'app.port': '8080' }

    expect(secretsSchema.parse(secrets)).toEqual(secrets)
  })

  it('accepts an empty map', () => {
    expect(secretsSchema.parse({})).toEqual({})
  })

  it('rejects non string values', () => {
    expect(secretsSchema.safeParse({ 'app.port': 8080 }).success).toBe(false)
  })
})
