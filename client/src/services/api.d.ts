export interface RequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  [key: string]: unknown;
}

export interface ApiClient {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) => Promise<T>;
  post: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) => Promise<T>;
  patch: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) => Promise<T>;
  put: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) => Promise<T>;
  delete: <T = unknown>(endpoint: string, options?: RequestOptions) => Promise<T>;
}

export const api: ApiClient;
export default api;
