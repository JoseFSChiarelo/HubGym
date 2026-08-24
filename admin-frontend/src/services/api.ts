import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001'
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('auth');
  if (stored) {
    const { token } = JSON.parse(stored) as { token?: string };
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export { api };
