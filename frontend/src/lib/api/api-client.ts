import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { ZodType } from 'zod'

import { http } from '@/lib/http'

/**
 * Options accepted by every {@link ApiClient} method.
 *
 * `schema` is optional: when provided, the response body is validated and
 * parsed before being returned, so callers get a typed value instead of
 * `unknown`. Endpoints that answer `204 No Content` should omit it.
 */
export type RequestOptions<T> = {
  schema?: ZodType<T>
  config?: AxiosRequestConfig
}

/* oxlint-disable typescript/no-unsafe-type-assertion -- the unvalidated body is only returned when the caller opts out of providing a schema */
async function parseResponse<T>(data: unknown, schema?: ZodType<T>): Promise<T> {
  if (schema === undefined) {
    return data as T
  }
  return schema.parseAsync(data)
}
/* oxlint-enable typescript/no-unsafe-type-assertion */

/**
 * Thin, resource-agnostic client on top of the shared axios instance.
 *
 * It only knows about HTTP verbs and optional schema validation; it has no
 * knowledge of vaults or documents on purpose. Resource specific operations
 * (`listDeleted`, `restore`, ...) belong in the custom hooks built on top.
 *
 * ```ts
 * const vaults = await apiClient.get('/vaults', { schema: z.array(vaultSchema) })
 * await apiClient.delete(`/vaults/${id}`)
 * ```
 */
export class ApiClient {
  private readonly http: AxiosInstance

  constructor(httpClient: AxiosInstance = http) {
    this.http = httpClient
  }

  get<T = void>(path: string, options?: RequestOptions<T>): Promise<T> {
    return this.request<T>('get', path, undefined, options)
  }

  post<T = void>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T> {
    return this.request<T>('post', path, body, options)
  }

  patch<T = void>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T> {
    return this.request<T>('patch', path, body, options)
  }

  put<T = void>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T> {
    return this.request<T>('put', path, body, options)
  }

  delete<T = void>(path: string, options?: RequestOptions<T>): Promise<T> {
    return this.request<T>('delete', path, undefined, options)
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    body?: unknown,
    options?: RequestOptions<T>,
  ): Promise<T> {
    const { schema, config } = options ?? {}

    const response = await this.http.request<unknown>({
      ...config,
      method,
      url: path,
      data: body,
    })

    return parseResponse(response.data, schema)
  }
}

export const apiClient = new ApiClient()
