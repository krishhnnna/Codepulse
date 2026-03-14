import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authGetMe, authUpdateMe } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'codepulse_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { email, username, handles, profile }
  const [loading, setLoading] = useState(true);  // initial check

  // On mount — check if we have a token and validate it
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    authGetMe()
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('codepulse_handles');
    localStorage.removeItem('codepulse_profile');
    setUser(null);
  }, []);

  const syncToServer = useCallback(async (handles, profile) => {
    try {
      const updated = await authUpdateMe(handles, profile);
      setUser(updated);
    } catch {
      // silently fail — local data still works
    }
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, loading,
      login, logout, syncToServer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
