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
  nothing about vaults or documents. Concrete operations live next to it as
  plain functions and, when they need React state, as hooks on top.

```ts
import { apiClient, fetchSecrets } from '@/lib/api'
import { vaultSchema } from '@/lib/types'
import { z } from 'zod'

const vaults = await apiClient.get('/vaults', { schema: z.array(vaultSchema) })
await apiClient.delete(`/vaults/${id}`)

// /config is just another resource
const secrets = await fetchSecrets()
```

- `src/hooks/use-secrets` — React binding for `fetchSecrets`. It caches the
  in-flight request at module level so every consumer shares it, and exposes
  `refetch` to invalidate it. The browser never talks to the vault directly:
  the API key stays on the backend `/config` proxy.

```ts
import { useSecrets } from '@/hooks/use-secrets'

const { secrets, isLoading, error, refetch } = useSecrets()
```
