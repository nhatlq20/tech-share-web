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
    if (window.location.hostname === 'localhost' && window.location.port === '3000') {
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

export const api = {
  get: async (endpoint, options = {}) => {
    const url = buildUrl(endpoint, options.params);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const error = new Error(errorBody?.message || `HTTP error! status: ${res.status}`);
      error.status = res.status;
      error.data = errorBody;
      throw error;
    }

    return res.json();
  },

  post: async (endpoint, data, options = {}) => {
    const url = buildUrl(endpoint, options.params);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const error = new Error(errorBody?.message || `HTTP error! status: ${res.status}`);
      error.status = res.status;
      error.data = errorBody;
      throw error;
    }

    return res.json();
  },
};

export default api;
