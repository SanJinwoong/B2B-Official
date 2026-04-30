/**
 * LoginPage.jsx  —  v2
 *
 * Login unificado para todos los roles (ADMIN / CLIENT / SUPPLIER).
 * El backend devuelve user.role y el cliente redirige según sea necesario.
 * Incluye toggle Dark Mode en la esquina superior derecha.
 * Branding: azul #2563eb + blanco, tipografía Inter.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Eye, EyeOff, LogIn, Building2 } from 'lucide-react';
import { authApi }   from '../api/api';
import { useAuth }   from '../context/AuthContext';
import { useTheme }  from '../context/ThemeContext';
import './auth-pages.css';

const ROLE_REDIRECT = {
  ADMIN:    '/admin/applications',
  SUPPLIER: '/products',
  CLIENT:   '/client',
};

const LoginPage = () => {
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const { isDark, toggle } = useTheme();

  const [form,     setForm]     = useState({ email: '', password: '' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      login(data.token, data.user);
      // Si es primer login de proveedor → forzar cambio de contraseña
      if (data.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        const dest = ROLE_REDIRECT[data.user?.role] || '/products';
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-page">

      {/* Toggle dark mode — esquina superior derecha */}
      <button className="ap-theme-btn" onClick={toggle} title="Cambiar tema">
        {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
      </button>

      <div className="ap-card">

        {/* Logo */}
        <div className="ap-logo">
          <Building2 size={22} strokeWidth={2} />
        </div>

        {/* Encabezado */}
        <h1 className="ap-title">Bienvenido</h1>
        <p className="ap-subtitle">
          Inicia sesión en <strong>B2B Platform</strong> con tu cuenta de cliente,
          proveedor o administrador.
        </p>

        {/* Error */}
        {error && (
          <div className="ap-alert">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="ap-form" noValidate>
          <div className="ap-field">
            <label htmlFor="login-email" className="ap-label">Correo electrónico</label>
            <input
              id="login-email"
              className="ap-input"
              type="email"
              name="email"
              value={form.email}
              onChange={handle}
              placeholder="tu@empresa.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="ap-field">
            <label htmlFor="login-pass" className="ap-label">Contraseña</label>
            <div className="ap-input-wrap">
              <input
                id="login-pass"
                className="ap-input"
                type={showPass ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handle}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="ap-eye-btn"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="ap-btn-primary" disabled={loading}>
            {loading
              ? <span className="ap-spinner" />
              : <><LogIn size={16} /> Iniciar Sesión</>}
          </button>
        </form>

        {/* Divisor */}
        <div className="ap-divider"><span>¿No tienes cuenta?</span></div>

        {/* Enlace a selector de registro */}
        <Link to="/register" className="ap-btn-ghost">
          Crear cuenta
        </Link>

        {/* Link consulta sin login */}
        <p className="ap-footer-link">
          ¿Registraste tu empresa?{' '}
          <Link to="/estado-solicitud">Consultar estado de solicitud</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
