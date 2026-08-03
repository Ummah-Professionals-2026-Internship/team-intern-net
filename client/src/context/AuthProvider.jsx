import { useState, useEffect } from 'react';
import { registerTokenGetter } from '../api/api';
import api from '../api/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Initialize directly from localStorage — no effect needed
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        return { ...JSON.parse(storedUser), token: storedToken };
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    registerTokenGetter(() => user?.token ?? null);
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
        const res = await api.post('/auth/login', { email, password });
        const { access_token, user: userData } = res.data;

      // Store token and user info in localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser({ ...userData, token: access_token });
      return { success: true, role: userData.role };

    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map(d => d.msg).join(', ')
        : detail || 'Login failed. Please try again.';
      setAuthError(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAuthError(null);
    window.location.href = '/signin';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authError }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}