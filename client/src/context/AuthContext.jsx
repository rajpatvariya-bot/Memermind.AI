import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/auth/me').then(({ user: currentUser }) => setUser(currentUser)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      setUser(result.user);
      return result.user;
    },
    async register(profile) {
      const result = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(profile) });
      setUser(result.user);
      return result.user;
    },
    async logout() {
      try { await apiRequest('/auth/logout', { method: 'POST', body: '{}' }); }
      finally { setUser(null); }
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
