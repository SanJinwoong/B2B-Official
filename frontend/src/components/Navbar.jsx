/**
 * Navbar.jsx
 *
 * Barra de navegación persistente.
 * Vive en el layout raíz (App.jsx) fuera del árbol de Routes.
 *
 * Features:
 *  - Logo B2B a la izquierda.
 *  - Links contextuales según el rol del usuario autenticado.
 *  - Nombre de usuario + badge de rol a la derecha.
 *  - Botón de Dark Mode (Sol/Luna de lucide-react) usando useTheme().
 *  - Botón "Cerrar sesión".
 *  - Se oculta automáticamente en rutas públicas de registro y consulta.
 */

import { Link, NavLink, useLocation } from 'react-router-dom';
import { Sun, Moon, LogOut, Building2, ShieldCheck, Package, ClipboardList } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth }  from '../context/AuthContext';

// Rutas donde NO mostrar la navbar (flujos públicos sin autenticación)
const HIDDEN_ROUTES = [
  '/registro-proveedor',
  '/estado-solicitud',
  '/login',
  '/register',   // cubre /register, /register/cliente, etc.
];

const Navbar = () => {
  const { isDark, toggle } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // Ocultar en rutas públicas
  const isHidden = HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r));
  if (isHidden) return null;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="nb-bar">
      <div className="nb-inner">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <Link to="/" className="nb-brand">
          <div className="nb-brand-icon">
            <Building2 size={16} strokeWidth={2} />
          </div>
          <span className="nb-brand-name">B2B<span className="nb-brand-accent">Platform</span></span>
        </Link>

        {/* ── Links de navegación ───────────────────────────────────────── */}
        {isAuthenticated && (
          <nav className="nb-nav">
            <NavLink to="/products" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>
              <Package size={14} strokeWidth={2} />
              Productos
            </NavLink>

            {isAdmin && (
              <>
                <NavLink to="/admin/users" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>
                  <ShieldCheck size={14} strokeWidth={2} />
                  Admin
                </NavLink>
                <NavLink to="/admin/applications" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>
                  <ClipboardList size={14} strokeWidth={2} />
                  Proveedores
                </NavLink>
              </>
            )}
          </nav>
        )}

        {/* ── Lado derecho ─────────────────────────────────────────────── */}
        <div className="nb-right">

          {/* Toggle dark mode */}
          <button
            className="nb-icon-btn"
            onClick={toggle}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Toggle dark mode"
          >
            {isDark
              ? <Sun  size={17} strokeWidth={1.75} />
              : <Moon size={17} strokeWidth={1.75} />}
          </button>

          {isAuthenticated ? (
            <>
              {/* Usuario + badge rol */}
              <div className="nb-user">
                <div className="nb-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                <div className="nb-user-info">
                  <span className="nb-user-name">{user?.name}</span>
                  <span className={`nb-role-badge nb-role-${user?.role?.toLowerCase()}`}>
                    {user?.role}
                  </span>
                </div>
              </div>

              {/* Cerrar sesión */}
              <button className="nb-icon-btn nb-logout" onClick={logout} title="Cerrar sesión">
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <Link to="/login" className="nb-login-btn">
              Iniciar sesión
            </Link>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
