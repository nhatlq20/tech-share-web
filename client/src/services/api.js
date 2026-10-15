/**
 * API Client for TechShare Express + MongoDB Backend
 */

const getBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
  } catch (e) {
    // Ignore in environments without import.meta support
  }
  if (typeof window !== 'undefined') {
    // Tự động kết nối trực tiếp backend Express local (bỏ qua proxy CRA tránh bottleneck)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getBaseUrl();

/**
 * Builds endpoint URL with optional query parameters.
 * Automatically excludes undefined, null, and empty string values.
 */
const buildUrl = (endpoint, params) => {
  let url = `${API_BASE_URL}${endpoint}`;
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  return url;
};

/**
 * Xử lý response chung – throw Error nếu không ok
 */
const handleResponse = async (res) => {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const error = new Error(errorBody?.message || `HTTP error! status: ${res.status}`);
    error.status = res.status;
    error.data = errorBody;
    throw error;
  }
  return res.json();
};

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('techshare_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
};

/**
 * Fetch kèm cơ chế timeout (15s) và tự động thử lại 1 lần nếu gặp lỗi mạng (Failed to fetch)
 */
const fetchWithRetry = async (url, fetchOptions = {}, retries = 1) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        ...fetchOptions,
        signal: fetchOptions.signal || controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      // Chờ 350ms rồi thử lại
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
};

export const api = {
  get: async (endpoint, options = {}) => {
    const url = buildUrl(endpoint, options.params);
    const res = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      signal: options.signal,
    });
    return handleResponse(res);
  },

  post: async (endpoint, data, options = {}) => {
    const url = buildUrl(endpoint, options.params);
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      body: JSON.stringify(data),
      signal: options.signal,
    });
    return handleResponse(res);
  },

  patch: async (endpoint, data, options = {}) => {
    const url = buildUrl(endpoint, options.params);
    const res = await fetchWithRetry(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      body: JSON.stringify(data),
      signal: options.signal,
    });
    return handleResponse(res);
  },

  put: async (endpoint, data, options = {}) => {
    const url = buildUrl(endpoint, options.params);
    const res = await fetchWithRetry(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      body: JSON.stringify(data),
      signal: options.signal,
    });
    return handleResponse(res);
  },

  delete: async (endpoint, options = {}) => {
    const url = buildUrl(endpoint, options.params);
    const res = await fetchWithRetry(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      signal: options.signal,
    });
    return handleResponse(res);
  },
};

export default api;
