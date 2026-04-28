/**
 * ClientRegisterPage.jsx — Fase 1 (actualizado)
 *
 * Registro rápido: nombre, email, contraseña, teléfono.
 * Hint visual si el correo es de dominio personal (@gmail, @hotmail…).
 * Al registrarse → va a /products (con banner para completar perfil).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Eye, EyeOff, UserPlus, Building2, ChevronLeft,
         Phone, AlertCircle } from 'lucide-react';
import { authApi }  from '../api/api';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './auth-pages.css';

// Dominios personales comunes
const PERSONAL_DOMAINS = ['gmail', 'hotmail', 'outlook', 'yahoo', 'live', 'icloud', 'msn', 'aol'];

const isPersonalEmail = (email) => {
  if (!email.includes('@')) return false;
  const domain = email.split('@')[1]?.split('.')[0]?.toLowerCase() || '';
  return PERSONAL_DOMAINS.includes(domain);
};

const ClientRegisterPage = () => {
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const { isDark, toggle } = useTheme();

  const [form,      setForm]      = useState({ name: '', email: '', password: '', phone: '', role: 'CLIENT' });
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

  const showEmailHint = isPersonalEmail(form.email) && form.email.length > 4;

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

        {/* Indicador de pasos */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          margin: '0 0 20px', padding: '10px 14px',
          background: 'var(--ap-input-bg, #f8fafc)',
          border: '1px solid var(--ap-border, #e2e8f0)',
          borderRadius: '8px', fontSize: '12px',
        }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--ap-accent, #2563eb)',
            color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0,
          }}>1</div>
          <span style={{ color: 'var(--ap-text, #0f172a)', fontWeight: 600 }}>Datos de acceso</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--ap-border, #e2e8f0)', margin: '0 4px' }} />
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--ap-border, #e2e8f0)',
            color: 'var(--ap-text-subtle, #94a3b8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0,
          }}>2</div>
          <span style={{ color: 'var(--ap-text-subtle, #94a3b8)' }}>Perfil empresarial</span>
        </div>

        {error && <div className="ap-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="ap-form" noValidate>

          {/* Nombre */}
          <div className="ap-field">
            <label htmlFor="cr-name" className="ap-label">Nombre completo</label>
            <input
              id="cr-name"
              className={`ap-input ${fieldErrs.name ? 'error' : ''}`}
              type="text" name="name" value={form.name} onChange={handle}
              placeholder="Juan Pérez" autoComplete="name" required
            />
            {fieldErrs.name && <span className="ap-field-error">{fieldErrs.name}</span>}
          </div>

          {/* Email */}
          <div className="ap-field">
            <label htmlFor="cr-email" className="ap-label">Correo electrónico</label>
            <input
              id="cr-email"
              className={`ap-input ${fieldErrs.email ? 'error' : ''}`}
              type="email" name="email" value={form.email} onChange={handle}
              placeholder="juan@empresa.com" autoComplete="email" required
            />
            {/* Hint correo personal */}
            {showEmailHint && (
              <div style={{
                display: 'flex', gap: '6px', alignItems: 'flex-start',
                marginTop: '6px', padding: '8px 10px',
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '6px', fontSize: '12px', color: '#92400e',
              }}>
                <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Para un perfil profesional, te recomendamos usar tu correo corporativo
                  <strong> @tuempresa.com</strong> en lugar de uno personal.
                </span>
              </div>
            )}
            {fieldErrs.email && <span className="ap-field-error">{fieldErrs.email}</span>}
          </div>

          {/* Contraseña */}
          <div className="ap-field">
            <label htmlFor="cr-pass" className="ap-label">Contraseña</label>
            <div className="ap-input-wrap">
              <input
                id="cr-pass"
                className={`ap-input ${fieldErrs.password ? 'error' : ''}`}
                type={showPass ? 'text' : 'password'}
                name="password" value={form.password} onChange={handle}
                placeholder="Mínimo 6 caracteres" autoComplete="new-password" required
              />
              <button type="button" className="ap-eye-btn" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {fieldErrs.password && <span className="ap-field-error">{fieldErrs.password}</span>}
          </div>

          {/* Teléfono / WhatsApp */}
          <div className="ap-field">
            <label htmlFor="cr-phone" className="ap-label">
              Teléfono / WhatsApp
              <span style={{ fontWeight: 400, color: 'var(--ap-text-subtle, #94a3b8)', fontSize: '11px', marginLeft: '6px' }}>
                (opcional, recomendado para seguimiento)
              </span>
            </label>
            <div className="ap-input-wrap">
              <Phone size={15} className="ap-input-icon" />
              <input
                id="cr-phone"
                className={`ap-input has-icon ${fieldErrs.phone ? 'error' : ''}`}
                type="tel" name="phone" value={form.phone} onChange={handle}
                placeholder="+52 55 1234 5678" autoComplete="tel"
              />
            </div>
            {fieldErrs.phone && <span className="ap-field-error">{fieldErrs.phone}</span>}
          </div>

          <button type="submit" className="ap-btn-primary" disabled={loading}>
            {loading
              ? <span className="ap-spinner" />
              : <><UserPlus size={16} /> Crear Cuenta y Explorar →</>}
          </button>
        </form>

        <p style={{
          marginTop: '12px', fontSize: '11.5px',
          color: 'var(--ap-text-subtle, #94a3b8)', textAlign: 'center',
        }}>
          El perfil empresarial (Fase 2) lo puedes completar después desde el dashboard.
        </p>

        <p className="ap-footer-link" style={{ marginTop: '0.75rem' }}>
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default ClientRegisterPage;
