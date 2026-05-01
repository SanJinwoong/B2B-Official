/**
 * ChangePasswordPage.jsx
 *
 * Página para cambiar la contraseña del usuario autenticado.
 * Ruta: /change-password
 *
 * Para proveedores recién aprobados (mustChangePassword=true):
 *   - Se les redirige aquí automáticamente tras el primer login.
 *   - Deben confirmar la contraseña temporal que recibieron por correo.
 *   - Al guardar, mustChangePassword pasa a false y se redirigen al dashboard.
 *
 * También disponible para cualquier usuario que quiera cambiar su contraseña.
 */

import { useState } from 'react';
import { useNavigate, Link }     from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi }   from '../api/api';
import { useAuth }   from '../context/AuthContext';
import './auth-pages.css';

// ── Mini hook para mostrar/ocultar contraseña ─────────────────────────────────
const useReveal = () => {
  const [show, setShow] = useState(false);
  return { show, toggle: () => setShow((s) => !s) };
};

const PasswordInput = ({ id, label, value, onChange, reveal, placeholder, hint }) => (
  <div className="ap-field">
    <label htmlFor={id} className="ap-label">{label}</label>
    {hint && <p className="ap-hint">{hint}</p>}
    <div className="ap-input-wrap">
      <KeyRound size={16} className="ap-input-icon" />
      <input
        id={id}
        type={reveal.show ? 'text' : 'password'}
        className="ap-input has-icon"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
      />
      <button
        type="button"
        className="ap-reveal-btn"
        onClick={reveal.toggle}
        tabIndex={-1}
        title={reveal.show ? 'Ocultar' : 'Mostrar'}
      >
        {reveal.show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
);

// ── Indicador de fortaleza de contraseña ──────────────────────────────────────
const StrengthBar = ({ password }) => {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score  = checks.filter(Boolean).length;
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

  if (!password) return null;

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1,2,3,4].map((i) => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: i <= score ? colors[score] : 'var(--ap-border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: '11px', color: colors[score], fontWeight: 600 }}>
        {labels[score]}
      </p>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const isMandatory = user?.mustChangePassword === true;

  const [current,     setCurrent]     = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const [loading,     setLoading]     = useState(false);

  const revealCurrent = useReveal();
  const revealNew     = useReveal();
  const revealConfirm = useReveal();

  const getDashboardPath = () => {
    if (user?.role === 'ADMIN')    return '/admin/applications';
    if (user?.role === 'SUPPLIER') return '/products';
    return '/products';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPass.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPass !== confirm) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword:  current,
        newPassword:      newPass,
        confirmPassword:  confirm,
      });

      // Actualizar el contexto para quitar el flag
      updateUser({ mustChangePassword: false });
      setSuccess(true);

      // Redirigir al dashboard tras 2 s
      setTimeout(() => navigate(getDashboardPath()), 2000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message;
      setError(msg || 'Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="ap-page">
        <div className="ap-card" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <CheckCircle2 size={52} style={{ color: '#22c55e', marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--ap-text)', marginBottom: '8px' }}>¡Contraseña actualizada!</h2>
          <p style={{ color: 'var(--ap-text-subtle)', fontSize: '14px' }}>
            Serás redirigido a tu panel en un momento...
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <div className="ap-page">
      <div className="ap-card" style={{ maxWidth: '440px' }}>

        {/* Ícono y título */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
          }}>
            <ShieldCheck size={26} color="#fff" />
          </div>
          <h1 className="ap-title" style={{ fontSize: '1.4rem' }}>
            {isMandatory ? 'Establece tu contraseña' : 'Cambiar contraseña'}
          </h1>
          <p className="ap-subtitle" style={{ fontSize: '13px', marginTop: '4px' }}>
            {isMandatory
              ? 'Por seguridad, debes cambiar la contraseña temporal que recibiste por correo antes de continuar.'
              : 'Ingresa tu contraseña actual y elige una nueva.'}
          </p>
        </div>

        {/* Alerta de obligatoriedad */}
        {isMandatory && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: '8px', padding: '12px 14px', marginBottom: '20px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            fontSize: '13px', color: '#92400e',
          }}>
            <AlertCircle size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
            <span>Tu contraseña temporal fue enviada al correo con el que registraste tu solicitud.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="ap-alert-error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <PasswordInput
            id="current-password"
            label="Contraseña actual"
            hint={isMandatory ? 'La contraseña temporal que recibiste por correo.' : undefined}
            placeholder="Contraseña actual"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            reveal={revealCurrent}
          />

          <div style={{ height: '12px' }} />

          <PasswordInput
            id="new-password"
            label="Nueva contraseña"
            placeholder="Mínimo 8 caracteres"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            reveal={revealNew}
          />
          <StrengthBar password={newPass} />

          <div style={{ height: '12px' }} />

          <PasswordInput
            id="confirm-password"
            label="Confirmar nueva contraseña"
            placeholder="Repite la nueva contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            reveal={revealConfirm}
          />

          <button
            type="submit"
            className="ap-btn ap-btn-primary"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={loading || !current || !newPass || !confirm}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
              : <><ShieldCheck size={16} /> Guardar nueva contraseña</>
            }
          </button>
        </form>

        {/* Link para saltarse si no es obligatorio */}
        {!isMandatory && (
          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--ap-text-subtle)' }}>
            <Link to={getDashboardPath()} style={{ color: 'var(--ap-accent)' }}>
              Cancelar y volver al panel
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordPage;
