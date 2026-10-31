import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const startSession = useCallback(({ token, user }) => {
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      login: async (email, password) => startSession(await api('/auth/login', { method: 'POST', body: { email, password } })),
      register: async (input) => startSession(await api('/auth/register', { method: 'POST', body: input })),
      logout: () => {
        setToken(null);
        setUser(null);
      },
    }),
    [user, loading, startSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const homePath = (user) => (user?.role === 'admin' ? '/admin' : '/learn');
