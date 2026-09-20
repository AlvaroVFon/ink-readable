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

