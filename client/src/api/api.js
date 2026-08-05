// api.js - Web API client, interceptors, and network request wrappers
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let _getToken = () => null;

export const registerTokenGetter = (fn) => { 
  _getToken = fn; 
};

// Attach bearer token dynamically if present
api.interceptors.request.use((config) => {
  const token = _getToken() || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses & redirect
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRoute = err.config?.url?.includes('/auth/login');
    
    // Clear credentials and route to signin on unauthenticated API calls
    if (err.response?.status === 401 && !isLoginRoute) {
      sessionStorage.removeItem('role');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    
    return Promise.reject(err);
  }
);

/**
 * Sends form data and associated files to the backend intake router.
 * @param {FormData} formData - Instance of JavaScript FormData containing fields and files.
 * @param {(progress: number) => void} [onProgress] - Optional upload progress callback (0-100).
 */
export const submitIntakeForm = async (formData, onProgress) => {
  const response = await api.post('/intake', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Auto-overrides JSON header for file uploads
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

export default api;