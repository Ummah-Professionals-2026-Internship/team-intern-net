//  src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { registerTokenGetter } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { token, role } — token in memory only
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Restore role from sessionStorage, but token is gone on refresh — user must re-login
    const savedRole = sessionStorage.getItem('role');
    if (savedRole) {
      // Token is gone; clear session and send to signin
      sessionStorage.removeItem('role');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    registerTokenGetter(() => user?.token ?? null);
  }, [user]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      // Mock — swap for real api.post('/auth/login', ...) when backend is ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      let mockToken, role;
      if (email === 'admin@test.com' && password === 'password123') {
        mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockAdminToken';
        role = 'admin';
      } else if (email === 'user@test.com' && password === 'password123') {
        mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockUserToken';
        role = 'user';
      } else {
        throw new Error('Invalid email or password credentials.');
      }

      sessionStorage.setItem('role', role); // role only, never the token
      setUser({ token: mockToken, role });
      return { success: true, role };
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please try again.');
      return { success: false };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('role');
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authError }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};