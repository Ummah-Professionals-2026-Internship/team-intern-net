// api.js will be used to manage Web APIs, bundle functions, external data communication
import axios from 'axios';

const api = axios.create({
    baseURL: "http://localhost:8000",
    headers: {
    'Content-Type': 'application/json'
  }

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
    const isLoginRoute = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRoute) {
      sessionStorage.removeItem('role');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    
    return Promise.reject(err);

  }
);

export default api;