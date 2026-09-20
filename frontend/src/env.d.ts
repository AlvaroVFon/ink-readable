/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the default `/api/v1` base URL when no proxy is available. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
