import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState({
    checked: false,
    connected: true,
    error: null,
    database: null,
  });

  const checkHealth = async () => {
    try {
      const res = await api.checkHealth();
      if (res && res.database) {
        setDbStatus({
          checked: true,
          connected: res.database.success,
          error: res.database.error || null,
          database: res.database.database || 'gridguard',
        });
      }
    } catch (err) {
      setDbStatus({
        checked: true,
        connected: false,
        error: err.message,
        database: 'gridguard',
      });
    }
  };

  useEffect(() => {
    async function initAuth() {
      await checkHealth();

      const token = api.getToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            api.clearToken();
            setUser(null);
          }
        } catch (err) {
          console.warn('Initial session validation error:', err.message);
          if (err.status === 401) {
            api.clearToken();
          }
          setUser(null);
        }
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    const res = await api.login({ identifier, password });
    if (res.success && res.user) {
      setUser(res.user);
      await checkHealth();
    }
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.user) {
      setUser(res.user);
      await checkHealth();
    }
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    dbStatus,
    checkHealth,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
