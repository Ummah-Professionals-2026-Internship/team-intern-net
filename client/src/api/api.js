// api.js will be used to manage Web APIs, bundle functions, external data communication
import axios from 'axios';

const api = axios.create({
    baseURL: "https://localhost:8000"
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

export default api;