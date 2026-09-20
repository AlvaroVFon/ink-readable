/* oxlint-disable import/no-named-as-default-member -- axios is imported as default on purpose so the instance builder is fully typed */
import axios, {
  isAxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

/**
 * Base URL for the backend API.
 *
 * - Development: Vite proxies `/api` to the backend (see `vite.config.ts`).
 * - Production: nginx proxies `/api/` to the backend (see `nginx.conf`).
 *
 * `VITE_API_BASE_URL` can override it for environments without a proxy.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const API_TIMEOUT_MS = 10_000

/**
 * Error thrown by every request made through {@link http}.
 *
 * Normalizes the different failure shapes into a single object the UI can
 * render: backend errors (`{"error": "..."}` from `httpx.Error`), HTTP errors
 * without a body and network/timeout failures (`status: 0`).
 */
export class ApiError extends Error {
  readonly status: number
  readonly cause?: unknown

  constructor(message: string, status: number, cause?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.cause = cause
  }
}

const NETWORK_ERROR_MESSAGE = 'Unable to reach the server'

function extractErrorMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) {
    return undefined
  }
  if (!('error' in payload)) {
    return undefined
  }
  const { error } = payload
  return typeof error === 'string' && error.length > 0 ? error : undefined
}

function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) {
    return new ApiError('Unexpected error', 0, error)
  }

  const { response } = error
  if (response === undefined) {
    return new ApiError(NETWORK_ERROR_MESSAGE, 0, error)
  }

  const status = response.status
  const message =
    extractErrorMessage(response.data) ?? error.message ?? `Request failed with status ${status}`

  return new ApiError(message, status, error)
}

function onRequestFulfilled(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  return config
}

function onRequestRejected(error: unknown): Promise<never> {
  return Promise.reject(toApiError(error))
}

function onResponseRejected(error: unknown): Promise<never> {
  return Promise.reject(toApiError(error))
}

/**
 * Axios instance shared by the whole data access layer.
 *
 * The request/response interceptors are intentionally minimal: they only
 * normalize errors so callers always deal with {@link ApiError}. Higher level
 * concerns (schema validation, HTTP verbs) live in the API client.
 */
export function createHttpClient(config?: AxiosRequestConfig): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    ...config,
  })

  client.interceptors.request.use(onRequestFulfilled, onRequestRejected)
  client.interceptors.response.use((response) => response, onResponseRejected)

  return client
}

export const http: AxiosInstance = createHttpClient()
