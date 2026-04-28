/**
 * ClientRegisterPage.jsx
 *
 * Formulario de registro para CLIENTES en /register/cliente.
 * Crea cuenta con role=CLIENT en el backend existente.
 * El botón de dark mode está en la esquina superior derecha.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Eye, EyeOff, UserPlus, Building2, ChevronLeft } from 'lucide-react';
import { authApi }  from '../api/api';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './auth-pages.css';

const ClientRegisterPage = () => {
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const { isDark, toggle } = useTheme();

  const [form,      setForm]      = useState({ name: '', email: '', password: '', role: 'CLIENT' });
  const [error,     setError]     = useState('');
  const [fieldErrs, setFieldErrs] = useState({});
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFieldErrs((p) => { const n = { ...p }; delete n[e.target.name]; return n; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrs({});
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      login(data.token, data.user);
      navigate('/products', { replace: true });
    } catch (err) {
      const res = err.response?.data;
      if (res?.errors) {
        const map = {};
        res.errors.forEach(({ field, message }) => { map[field] = message; });
        setFieldErrs(map);
      } else {
        setError(res?.message || 'Error al registrarse. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-page">

      {/* Toggle dark mode */}
      <button className="ap-theme-btn" onClick={toggle} title="Cambiar tema">
        {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
      </button>

      <div className="ap-card">

        {/* Back */}
        <Link to="/register" className="ap-back-link">
          <ChevronLeft size={15} /> Volver a opciones
        </Link>

        {/* Logo */}
        <div className="ap-logo">
          <Building2 size={22} strokeWidth={2} />
        </div>

        <h1 className="ap-title">Crear Cuenta Cliente</h1>
        <p className="ap-subtitle">
          Accede al catálogo de proveedores verificados y gestiona tus compras empresariales.
        </p>

        {error && <div className="ap-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="ap-form" noValidate>

          <div className="ap-field">
            <label htmlFor="cr-name" className="ap-label">Nombre completo</label>
            <input
              id="cr-name"
              className={`ap-input ${fieldErrs.name ? 'error' : ''}`}
              type="text"
              name="name"
              value={form.name}
              onChange={handle}
              placeholder="Juan Pérez"
              autoComplete="name"
              required
            />
            {fieldErrs.name && <span className="ap-field-error">{fieldErrs.name}</span>}
          </div>

          <div className="ap-field">
            <label htmlFor="cr-email" className="ap-label">Correo electrónico corporativo</label>
            <input
              id="cr-email"
              className={`ap-input ${fieldErrs.email ? 'error' : ''}`}
              type="email"
              name="email"
              value={form.email}
              onChange={handle}
              placeholder="juan@empresa.com"
              autoComplete="email"
              required
            />
            {fieldErrs.email && <span className="ap-field-error">{fieldErrs.email}</span>}
          </div>

          <div className="ap-field">
            <label htmlFor="cr-pass" className="ap-label">Contraseña</label>
            <div className="ap-input-wrap">
              <input
                id="cr-pass"
                className={`ap-input ${fieldErrs.password ? 'error' : ''}`}
                type={showPass ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handle}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
              <button type="button" className="ap-eye-btn" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {fieldErrs.password && <span className="ap-field-error">{fieldErrs.password}</span>}
          </div>

          <button type="submit" className="ap-btn-primary" disabled={loading}>
            {loading
              ? <span className="ap-spinner" />
              : <><UserPlus size={16} /> Crear Cuenta</>}
          </button>
        </form>

        <p className="ap-footer-link" style={{ marginTop: '1.25rem' }}>
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default ClientRegisterPage;
