/**
 * ClientRegisterPage.jsx — Fase 1 con sistema de referidos / scouters
 *
 * Registro rápido: nombre, email, contraseña, teléfono.
 * + Campo: ¿Cómo llegaste aquí? (Nadie, Página web, Scouter)
 * + Si es Scouter: selector de scouter activo + rating de estrellas
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sun, Moon, Eye, EyeOff, UserPlus, Building2, ChevronLeft,
  Phone, AlertCircle, Star, Users, Globe, UserX,
} from 'lucide-react';
import { authApi, scouterApi } from '../api/api';
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

// ── Componente: selector de estrellas ─────────────────────────────────────────
const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);

  const labels = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= (hovered || value);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${star} estrellas`}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                transform: active ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s ease, color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Star
                size={26}
                fill={active ? '#f59e0b' : 'none'}
                color={active ? '#f59e0b' : 'var(--ap-border, #cbd5e1)'}
                strokeWidth={1.5}
              />
            </button>
          );
        })}

        {(hovered || value) > 0 && (
          <span style={{
            fontSize: '12px', fontWeight: 600,
            color: '#f59e0b', marginLeft: '4px',
            animation: 'fadeIn 0.2s ease',
          }}>
            {labels[hovered || value]}
          </span>
        )}
      </div>

      {value === 0 && (
        <p style={{ fontSize: '11px', color: 'var(--ap-text-subtle, #94a3b8)', margin: 0 }}>
          Haz clic en las estrellas para calificar al scouter
        </p>
      )}
    </div>
  );
};

// ── Componente: opción de referido ────────────────────────────────────────────
const ReferralOption = ({ id, icon: Icon, label, description, selected, onClick, color }) => (
  <button
    id={id}
    type="button"
    onClick={onClick}
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      padding: '12px 8px',
      border: `2px solid ${selected ? color : 'var(--ap-border, #e2e8f0)'}`,
      borderRadius: '10px',
      background: selected ? `${color}12` : 'var(--ap-input-bg, #f8fafc)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'center',
    }}
  >
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%',
      background: selected ? `${color}22` : 'var(--ap-border, #e2e8f0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.2s',
    }}>
      <Icon size={18} color={selected ? color : 'var(--ap-text-subtle, #94a3b8)'} />
    </div>
    <span style={{
      fontSize: '12px', fontWeight: 700,
      color: selected ? color : 'var(--ap-text, #0f172a)',
    }}>{label}</span>
    <span style={{ fontSize: '10.5px', color: 'var(--ap-text-subtle, #94a3b8)', lineHeight: 1.3 }}>
      {description}
    </span>
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────

const ClientRegisterPage = () => {
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const { isDark, toggle } = useTheme();

  const [form,      setForm]      = useState({
    name: '', email: '', password: '', phone: '', role: 'CLIENT',
  });
  const [error,     setError]     = useState('');
  const [fieldErrs, setFieldErrs] = useState({});
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);

  // ── Referido ────────────────────────────────────────────────────────────────
  const [referredBy,     setReferredBy]     = useState('NONE');   // NONE | PAGE | SCOUTER
  const [scouters,       setScouters]       = useState([]);
  const [scoutersLoading, setScoutersLoading] = useState(false);
  const [selectedScouter, setSelectedScouter] = useState(null);  // objeto scouter
  const [scouterRating,  setScouterRating]  = useState(0);
  const [scouterComment, setScouterComment] = useState('');

  // Cargar scouters cuando el usuario elige "SCOUTER"
  useEffect(() => {
    if (referredBy !== 'SCOUTER') return;
    setScoutersLoading(true);
    scouterApi.listActive()
      .then(({ data }) => setScouters(data))
      .catch(() => setScouters([]))
      .finally(() => setScoutersLoading(false));
  }, [referredBy]);

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFieldErrs((p) => { const n = { ...p }; delete n[e.target.name]; return n; });
  };

  const handleReferralChange = (type) => {
    setReferredBy(type);
    setSelectedScouter(null);
    setScouterRating(0);
    setScouterComment('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrs({});

    if (referredBy === 'SCOUTER' && !selectedScouter) {
      setError('Por favor selecciona un scouter de la lista.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        referredBy,
        scouterId:     selectedScouter?.id    || null,
        scouterRating: scouterRating || null,
        scouterComment: scouterComment || null,
      };
      const { data } = await authApi.register(payload);
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

          {/* ── ¿Cómo llegaste aquí? ─────────────────────────────────────────── */}
          <div className="ap-field" style={{ marginTop: '4px' }}>
            <label className="ap-label" style={{ marginBottom: '10px', display: 'block' }}>
              ¿Cómo llegaste aquí?
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <ReferralOption
                id="ref-none"
                icon={UserX}
                label="Nadie"
                description="Llegué por mi cuenta"
                selected={referredBy === 'NONE'}
                onClick={() => handleReferralChange('NONE')}
                color="#64748b"
              />
              <ReferralOption
                id="ref-page"
                icon={Globe}
                label="Página web"
                description="Vi un anuncio o búsqueda"
                selected={referredBy === 'PAGE'}
                onClick={() => handleReferralChange('PAGE')}
                color="#0ea5e9"
              />
              <ReferralOption
                id="ref-scouter"
                icon={Users}
                label="Scouter"
                description="Alguien me recomendó"
                selected={referredBy === 'SCOUTER'}
                onClick={() => handleReferralChange('SCOUTER')}
                color="#8b5cf6"
              />
            </div>
          </div>

          {/* ── Selector de Scouter + Rating ─────────────────────────────────── */}
          {referredBy === 'SCOUTER' && (
            <div style={{
              marginTop: '2px',
              padding: '16px',
              background: '#8b5cf608',
              border: '1px solid #8b5cf630',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'fadeIn 0.25s ease',
            }}>

              {/* Selector de scouter */}
              <div className="ap-field" style={{ margin: 0 }}>
                <label htmlFor="cr-scouter" className="ap-label">
                  Selecciona al scouter que te recomendó
                </label>

                {scoutersLoading ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--ap-text-subtle)' }}>
                    <span className="ap-spinner" style={{ marginRight: '8px' }} />
                    Cargando scouters...
                  </div>
                ) : scouters.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--ap-text-subtle)' }}>
                    No hay scouters disponibles en este momento.
                  </div>
                ) : (
                  <select
                    id="cr-scouter"
                    className="ap-input"
                    value={selectedScouter?.id || ''}
                    onChange={(e) => {
                      const found = scouters.find((s) => s.id === parseInt(e.target.value));
                      setSelectedScouter(found || null);
                      setScouterRating(0);
                    }}
                  >
                    <option value="">— Elige un scouter —</option>
                    {scouters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.ratingCount > 0 ? ` ★ ${s.avgRating.toFixed(1)} (${s.ratingCount} votos)` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Rating del scouter seleccionado */}
              {selectedScouter && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* Info del scouter */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    background: 'var(--ap-input-bg, #f8fafc)',
                    border: '1px solid var(--ap-border, #e2e8f0)',
                    borderRadius: '8px',
                  }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {selectedScouter.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '13.5px', color: 'var(--ap-text, #0f172a)' }}>
                        {selectedScouter.name}
                      </p>
                      {selectedScouter.ratingCount > 0 ? (
                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--ap-text-subtle)' }}>
                          ★ {selectedScouter.avgRating.toFixed(1)} promedio · {selectedScouter.ratingCount} {selectedScouter.ratingCount === 1 ? 'voto' : 'votos'}
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--ap-text-subtle)' }}>
                          Sin calificaciones aún · ¡sé el primero!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Estrellas */}
                  <div>
                    <label className="ap-label" style={{ marginBottom: '8px', display: 'block' }}>
                      Califica su desempeño
                      <span style={{ fontWeight: 400, color: 'var(--ap-text-subtle, #94a3b8)', fontSize: '11px', marginLeft: '6px' }}>
                        (opcional)
                      </span>
                    </label>
                    <StarRating value={scouterRating} onChange={setScouterRating} />
                  </div>

                  {/* Comentario opcional */}
                  {scouterRating > 0 && (
                    <div className="ap-field" style={{ margin: 0, animation: 'fadeIn 0.2s ease' }}>
                      <label htmlFor="cr-comment" className="ap-label">
                        Comentario
                        <span style={{ fontWeight: 400, color: 'var(--ap-text-subtle)', fontSize: '11px', marginLeft: '6px' }}>
                          (opcional)
                        </span>
                      </label>
                      <textarea
                        id="cr-comment"
                        className="ap-input"
                        style={{ resize: 'vertical', minHeight: '70px', fontSize: '13px' }}
                        placeholder="¿Cómo fue tu experiencia con el scouter?"
                        value={scouterComment}
                        onChange={(e) => setScouterComment(e.target.value)}
                        maxLength={300}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="ap-btn-primary"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
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
