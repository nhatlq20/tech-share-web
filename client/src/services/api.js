/**
 * Minimal API Client Skeleton for Express + MongoDB Backend
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    return res.json();
  },

  post: async (endpoint, data) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

export default api;

