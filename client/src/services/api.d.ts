export interface RequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  [key: string]: unknown;
}

export interface ApiClient {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) => Promise<T>;
  post: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) => Promise<T>;
}

export const api: ApiClient;
export default api;
