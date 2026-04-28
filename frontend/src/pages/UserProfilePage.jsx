/**
 * UserProfilePage.jsx
 *
 * Ruta: /perfil
 *
 * Perfil personal disponible para CLIENT y SUPPLIER.
 * Secciones:
 *  1. Datos personales — nombre, teléfono (editables)
 *  2. Cambio de contraseña — con confirmación de la actual
 *
 * Diseño: usa variables CSS del sistema de diseño (compatible light/dark).
 * Sin emojis — solo iconos Lucide.
 */

import { useState }        from 'react';
import { Link }             from 'react-router-dom';
import {
  User, Phone, Mail, KeyRound, Eye, EyeOff,
  Save, Loader2, CheckCircle2,
  AlertCircle, ShieldCheck, BadgeCheck,
} from 'lucide-react';
import { meApi }   from '../api/api';
import { useAuth } from '../context/AuthContext';
import './auth-pages.css';

// ── Mini reveal hook ──────────────────────────────────────────────────────────
const useReveal = () => {
  const [show, setShow] = useState(false);
  return { show, toggle: () => setShow((s) => !s) };
};

// ── Sub-componente: campo con icono ───────────────────────────────────────────
const Field = ({ id, label, error, children }) => (
  <div className="ap-field">
    <label htmlFor={id} className="ap-label">{label}</label>
    {children}
    {error && <span className="ap-field-error"><AlertCircle size={12} style={{marginRight:4}} />{error}</span>}
  </div>
);

// ── Alerta de feedback ────────────────────────────────────────────────────────
const Feedback = ({ type, message }) => {
  if (!message) return null;
  const isOk = type === 'success';
  return (
    <div style={{
      display: 'flex', gap: '8px', alignItems: 'center',
      padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
      background: isOk ? 'var(--success-bg)' : '#450a0a',
      color:      isOk ? 'var(--success)' : '#fca5a5',
      border:     `1px solid ${isOk ? 'var(--success)' : '#7f1d1d'}`,
      marginBottom: '14px',
    }}>
      {isOk ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
};

// ── Sección: Datos personales ─────────────────────────────────────────────────
const PersonalSection = ({ user, updateUser }) => {
  const [form,    setForm]    = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => { const n = { ...p }; delete n[e.target.name]; return n; });
    setFeedback(null);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'El nombre debe tener al menos 2 caracteres.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await meApi.update({ name: form.name.trim(), phone: form.phone.trim() || null });
      updateUser({ name: data.data.name, phone: data.data.phone });
      setFeedback({ type: 'success', message: 'Datos actualizados correctamente.' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message;
      setFeedback({ type: 'error', message: msg || 'Error al actualizar. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={CARD_STYLE}>
      <div style={SECTION_HEADER}>
        <div style={ICON_BOX('#6366f1')}>
          <User size={18} color="#fff" />
        </div>
        <div>
          <h2 style={SECTION_TITLE}>Datos personales</h2>
          <p style={SECTION_SUBTITLE}>Nombre y teléfono de contacto</p>
        </div>
      </div>

      <Feedback {...(feedback || {})} />

      <form onSubmit={handleSubmit} noValidate>
        <Field id="pf-name" label="Nombre completo" error={errors.name}>
          <div className="ap-input-wrap">
            <User size={15} className="ap-input-icon" />
            <input
              id="pf-name" name="name" type="text"
              className={`ap-input has-icon ${errors.name ? 'error' : ''}`}
              value={form.name} onChange={handle}
              placeholder="Tu nombre completo"
            />
          </div>
        </Field>

        <div style={{ height: '12px' }} />

        <Field id="pf-email" label="Correo electrónico">
          <div className="ap-input-wrap">
            <Mail size={15} className="ap-input-icon" />
            <input
              id="pf-email" type="email"
              className="ap-input has-icon"
              value={user?.email || ''} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--ap-text-subtle)', marginTop: '4px' }}>
            El correo no puede modificarse por seguridad.
          </p>
        </Field>

        <div style={{ height: '12px' }} />

        <Field id="pf-phone" label="Teléfono / WhatsApp">
          <div className="ap-input-wrap">
            <Phone size={15} className="ap-input-icon" />
            <input
              id="pf-phone" name="phone" type="tel"
              className="ap-input has-icon"
              value={form.phone} onChange={handle}
              placeholder="+52 55 1234 5678"
            />
          </div>
        </Field>

        <button
          type="submit"
          className="ap-btn ap-btn-primary"
          style={{ width: '100%', marginTop: '20px' }}
          disabled={loading}
        >
          {loading
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
            : <><Save size={15} /> Guardar cambios</>
          }
        </button>
      </form>
    </section>
  );
};

// ── Sección: Cambio de contraseña ─────────────────────────────────────────────
const PasswordSection = () => {
  const [form,    setForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const revealCurrent = useReveal();
  const revealNew     = useReveal();
  const revealConfirm = useReveal();

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFeedback(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setFeedback({ type: 'error', message: 'Completa todos los campos.' });
      return;
    }
    if (form.newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }

    setLoading(true);
    try {
      await meApi.changePassword(form);
      setFeedback({ type: 'success', message: 'Contraseña cambiada correctamente.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message;
      setFeedback({ type: 'error', message: msg || 'Error al cambiar la contraseña.' });
    } finally {
      setLoading(false);
    }
  };

  const PwInput = ({ id, name, label, reveal, placeholder }) => (
    <Field id={id} label={label}>
      <div className="ap-input-wrap">
        <KeyRound size={15} className="ap-input-icon" />
        <input
          id={id} name={name}
          type={reveal.show ? 'text' : 'password'}
          className="ap-input has-icon"
          value={form[name]} onChange={handle}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button type="button" className="ap-reveal-btn" onClick={reveal.toggle} tabIndex={-1}>
          {reveal.show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </Field>
  );

  return (
    <section style={CARD_STYLE}>
      <div style={SECTION_HEADER}>
        <div style={ICON_BOX('#8b5cf6')}>
          <ShieldCheck size={18} color="#fff" />
        </div>
        <div>
          <h2 style={SECTION_TITLE}>Cambiar contraseña</h2>
          <p style={SECTION_SUBTITLE}>Confirma la actual antes de establecer una nueva</p>
        </div>
      </div>

      <Feedback {...(feedback || {})} />

      <form onSubmit={handleSubmit} noValidate>
        <PwInput id="pf-cur"  name="currentPassword" label="Contraseña actual"
          reveal={revealCurrent} placeholder="Tu contraseña actual" />
        <div style={{ height: '12px' }} />
        <PwInput id="pf-new"  name="newPassword"     label="Nueva contraseña"
          reveal={revealNew}     placeholder="Mínimo 6 caracteres" />
        <div style={{ height: '12px' }} />
        <PwInput id="pf-conf" name="confirmPassword"  label="Confirmar nueva contraseña"
          reveal={revealConfirm} placeholder="Repite la nueva contraseña" />

        <button
          type="submit"
          className="ap-btn ap-btn-primary"
          style={{ width: '100%', marginTop: '20px' }}
          disabled={loading}
        >
          {loading
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Cambiando...</>
            : <><ShieldCheck size={15} /> Cambiar contraseña</>
          }
        </button>
      </form>
    </section>
  );
};

// ── Estilos compartidos ───────────────────────────────────────────────────────
const CARD_STYLE = {
  background:   'var(--ap-card-bg, var(--bg-card, #fff))',
  border:       '1px solid var(--ap-border, var(--border, #e2e8f0))',
  borderRadius: '12px',
  padding:      '24px',
  marginBottom: '20px',
};
const SECTION_HEADER = {
  display: 'flex', alignItems: 'center', gap: '14px',
  marginBottom: '20px',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--ap-border, var(--border, #e2e8f0))',
};
const SECTION_TITLE    = { fontSize: '1rem',  fontWeight: 700, color: 'var(--ap-text, var(--text))', margin: 0 };
const SECTION_SUBTITLE = { fontSize: '12px',  color: 'var(--ap-text-subtle, var(--text-muted))', margin: 0, marginTop: '2px' };
const ICON_BOX = (bg) => ({
  width: '40px', height: '40px', borderRadius: '10px',
  background: bg, display: 'flex', alignItems: 'center',
  justifyContent: 'center', flexShrink: 0,
});

// ── Componente principal ──────────────────────────────────────────────────────
const UserProfilePage = () => {
  const { user, updateUser } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.2s' }}>
      <main style={{ maxWidth: '620px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Cabecera de perfil */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '18px',
          padding: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          marginBottom: '20px',
        }}>
          {/* Avatar grande */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 800, color: '#fff',
            flexShrink: 0, boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{
                fontSize: '1.15rem', fontWeight: 700,
                color: 'var(--text)', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name}
              </h1>
              {user?.role === 'SUPPLIER' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'var(--success-bg)', color: 'var(--success)',
                  border: '1px solid var(--success)', borderRadius: '20px',
                  padding: '2px 10px 2px 6px', fontSize: '11px', fontWeight: 700,
                }}>
                  <BadgeCheck size={12} />
                  Verificado
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              {user?.email}
            </p>
            <span className="role-badge" style={{ marginLeft: 0, marginTop: '6px', display: 'inline-block' }}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Secciones */}
        <PersonalSection user={user} updateUser={updateUser} />
        <PasswordSection />
      </main>
    </div>
  );
};

export default UserProfilePage;
