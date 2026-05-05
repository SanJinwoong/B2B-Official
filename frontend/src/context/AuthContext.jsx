import { createContext, useContext, useState, useCallback } from 'react';
import { meApi } from '../api/api';

// ─── AuthContext ──────────────────────────────────────────────────────────────
// Provee el estado de autenticación a toda la app.
// El token y el user se persisten en localStorage para sobrevivir
// recargas de página.

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  /**
   * Guarda token y datos del usuario tras login/register exitoso.
   */
  const login = useCallback((newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }, []);

  /**
   * Limpia el estado y localStorage al cerrar sesión.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Actualiza datos del usuario en el contexto y localStorage
   * (por ejemplo, tras cambiar contraseña: mustChangePassword → false).
   */
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  /**
   * Recarga los datos del usuario desde el backend y actualiza el contexto.
   */
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const res = await meApi.get();
      const fresh = res.data?.data;
      if (fresh) {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        const merged = { ...stored, ...fresh };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
      }
    } catch (e) {
      console.warn('[refreshUser] error:', e.message);
    }
  }, []);

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook para consumir el contexto de autenticación.
 * Uso: const { user, login, logout, isAuthenticated } = useAuth();
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
