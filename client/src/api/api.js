// api.js will be used to manage Web APIs, bundle functions, external data communication
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.emv.VITE_API_BASE_URL || "https://localhost:8000",
    timeout: 15000
});

let _getToken = () => null;

export const registerTokenGetter = (fn) => { _getToken = fn; };

api.interceptors.request.use((config) => {
  const token = _getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('role');
      window.location.href = '/signin';
    }
    return Promise.reject(err);
  }
);
/**
 * Sends form data and associated files to the backend intake router.
 * @param {FormData} formData - An instance of JavaScript FormData containing fields and files.
 * @param {(progress: number) => void} [onProgress] - Optional upload progress callback (0-100).
 */

export const submitIntakeForm = async (formData, onProgress) => {
  const response = await api.post('/intake', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // sending/uploading files
    },

    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });
  return response.data;
};

export default api;