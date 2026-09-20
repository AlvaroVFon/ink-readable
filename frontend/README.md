# Ink Readable Frontend

React, TypeScript and Vite frontend for Ink Readable.

## Development

```bash
pnpm install
pnpm dev
```

## Checks

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

The project uses:

- Vitest with `happy-dom` for tests.
- Oxlint for linting.
- Oxfmt for formatting.
- shadcn/ui with Tailwind CSS for components.
- Lucide React for icons.

## Data access

The data access layer lives in `src/lib` and is split by responsibility:

- `src/lib/types` — zod schemas and TypeScript types that mirror the JSON
  payloads exposed by the backend under `/api/v1` (vaults, documents and the
  flat secrets map). They validate responses at the edge so the rest of the
  app works with trusted, typed data.

The types are inferred from the schemas, so there is a single source of truth:

```ts
import { vaultSchema, type Vault } from '@/lib/types'

const vault = vaultSchema.parse(payload)
```

- `src/lib/http` — shared axios instance. It centralizes the base URL
  (`/api/v1` by default, overridable with `VITE_API_BASE_URL`), the timeout and
  the JSON headers, and normalizes every failure into an `ApiError` so the UI
  only deals with one error shape.

```ts
import { ApiError, http } from '@/lib/http'

try {
  const { data } = await http.get('/vaults')
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.message)
  }
}
```

- `src/lib/api` — resource-agnostic `ApiClient` built on top of the axios
  instance. It exposes the HTTP verbs plus optional zod validation and knows
  nothing about vaults or documents; the concrete operations (`listDeleted`,
  `restore`, ...) belong in custom hooks per resource built on top of it.

```ts
import { apiClient } from '@/lib/api'
import { vaultSchema } from '@/lib/types'
import { z } from 'zod'

const vaults = await apiClient.get('/vaults', { schema: z.array(vaultSchema) })
await apiClient.delete(`/vaults/${id}`)
```

- `src/lib/vault` — frontend counterpart of the backend `VaultClient`. It reads
  the resolved secrets from the backend `/config` proxy, so the vault API key
  never reaches the browser, and validates the payload before use.

```ts
import { vaultClient } from '@/lib/vault'

const port = await vaultClient.getSecret('app.port')
```
