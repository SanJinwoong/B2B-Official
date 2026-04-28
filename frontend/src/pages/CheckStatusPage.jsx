/**
 * CheckStatusPage.jsx
 *
 * Vista pública de consulta de estado de solicitud.
 * Ruta: /estado-solicitud
 *
 * SEGURIDAD:
 *  - Requiere AMBOS campos: ID de seguimiento + Correo electrónico.
 *  - El backend valida que el correo coincida con el de la solicitud.
 *  - Si no coinciden → 404 genérico (no se revela si el ID existe).
 *  - Si el status es APPROVED → muestra botón de ir al Login real.
 *
 * UX:
 *  - Soporta pre-relleno de campos vía query params (?id=...&email=...).
 *  - Muestra el detalle de estado incluyendo actionNote si aplica.
 */

import { useState, useEffect }     from 'react';
import { Link, useSearchParams }   from 'react-router-dom';
import {
  Search, AlertCircle, Loader2, CheckCircle,
  Clock, AlertTriangle, XCircle, ArrowRight,
  Mail, Hash, ChevronRight,
} from 'lucide-react';
import { supplierApplicationApi } from '../api/api';

// ── Configuración de estados ──────────────────────────────────────────────────
const STATUS_MAP = {
  PENDING: {
    icon:      <Clock size={28} strokeWidth={1.5} />,
    iconClass: 'cs-status-icon-pending',
    title:     'Solicitud Pendiente',
    desc:      'Tu solicitud está en cola y será revisada en breve.',
    showNote:  false,
  },
  REVIEWING: {
    icon:      <Search size={28} strokeWidth={1.5} />,
    iconClass: 'cs-status-icon-reviewing',
    title:     'En Revisión',
    desc:      'Un revisor de nuestro equipo está evaluando tu solicitud actualmente.',
    showNote:  false,
  },
  ACTION_REQUIRED: {
    icon:      <AlertTriangle size={28} strokeWidth={1.5} />,
    iconClass: 'cs-status-icon-action',
    title:     'Se Requieren Cambios',
    desc:      'El equipo revisó tu solicitud y necesita que corrijas algunos puntos.',
    showNote:  true,
  },
  APPROVED: {
    icon:      <CheckCircle size={28} strokeWidth={1.5} />,
    iconClass: 'cs-status-icon-approved',
    title:     '¡Solicitud Aprobada! ✅',
    desc:      'Tu empresa fue verificada. Revisa tu correo para obtener tus credenciales de acceso e inicia sesión como proveedor.',
    showNote:  false,
  },
  REJECTED: {
    icon:      <XCircle size={28} strokeWidth={1.5} />,
    iconClass: 'cs-status-icon-rejected',
    title:     'Solicitud Rechazada',
    desc:      'Lamentablemente tu solicitud no cumplió los requisitos necesarios.',
    showNote:  true,
  },
};

// ── Componente principal ──────────────────────────────────────────────────────
const CheckStatusPage = () => {
  const [searchParams] = useSearchParams();

  // Pre-rellenar desde query params (enlace desde pantalla de éxito)
  const [appId, setAppId]   = useState(searchParams.get('id')    || '');
  const [email, setEmail]   = useState(searchParams.get('email') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [touched, setTouched] = useState({});

  // Auto-consultar si los params vienen pre-rellenados en la URL
  useEffect(() => {
    if (searchParams.get('id') && searchParams.get('email')) {
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const e = {};
    if (!appId.trim())                           e.appId = 'El ID de seguimiento es obligatorio.';
    if (!email.trim())                           e.email = 'El correo electrónico es obligatorio.';
    else if (!/\S+@\S+\.\S+/.test(email.trim())) e.email = 'Formato de correo inválido.';
    return e;
  };

  const handleSearch = async () => {
    const errs = validate();
    setTouched({ appId: true, email: true });
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await supplierApplicationApi.getStatus(appId.trim() + `?email=${encodeURIComponent(email.trim())}`);
      setResult(data.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('Solicitud no encontrada. Verifica que el ID y el correo sean correctos.');
      } else if (status === 429) {
        setError('Demasiadas consultas. Espera unos minutos e intenta de nuevo.');
      } else {
        setError('Error al conectar con el servidor. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldErrs = (touched.appId || touched.email) ? validate() : {};
  const cfg       = result ? STATUS_MAP[result.status] : null;

  return (
    <div className="cs-page">

      {/* Encabezado */}
      <div className="cs-header">
        <div className="cs-logo-wrap">
          <Search size={20} strokeWidth={2} />
        </div>
        <h1 className="cs-title">Consultar Estado de Solicitud</h1>
        <p className="cs-subtitle">
          Ingresa tu ID de seguimiento y correo electrónico para ver el estado de tu registro.
        </p>
      </div>

      {/* Formulario de consulta */}
      <div className="cs-card">
        <div className="cs-form">
          <div className="cs-field">
            <label className="cs-label">
              <Hash size={13} className="cs-label-icon" />
              ID de Seguimiento
            </label>
            <input
              className={`cs-input ${fieldErrs.appId ? 'error' : ''}`}
              placeholder="cm9abc123xyz…"
              value={appId}
              onChange={(e) => { setAppId(e.target.value); setResult(null); setError(''); }}
              onBlur={() => setTouched((t) => ({ ...t, appId: true }))}
              spellCheck={false}
              autoComplete="off"
            />
            {fieldErrs.appId && (
              <span className="cs-field-error">
                <AlertCircle size={12} /> {fieldErrs.appId}
              </span>
            )}
          </div>

          <div className="cs-field">
            <label className="cs-label">
              <Mail size={13} className="cs-label-icon" />
              Correo Electrónico Registrado
            </label>
            <input
              className={`cs-input ${fieldErrs.email ? 'error' : ''}`}
              type="email"
              placeholder="roberto@empresa.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setResult(null); setError(''); }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {fieldErrs.email && (
              <span className="cs-field-error">
                <AlertCircle size={12} /> {fieldErrs.email}
              </span>
            )}
          </div>

          <button
            className="cs-search-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading
              ? <><Loader2 size={16} className="cs-spinner" /> Consultando...</>
              : <><Search size={16} /> Consultar Estado</>}
          </button>
        </div>

        {/* Error global */}
        {error && (
          <div className="cs-error-box">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Resultado */}
      {result && cfg && (
        <div className="cs-result-card">

          {/* Icono + título de estado */}
          <div className={`cs-status-header ${cfg.iconClass}`}>
            <div className="cs-status-icon">{cfg.icon}</div>
            <div>
              <h2 className="cs-status-title">{cfg.title}</h2>
              <p className="cs-status-desc">{cfg.desc}</p>
            </div>
          </div>

          {/* Datos de la solicitud */}
          <div className="cs-result-body">
            <div className="cs-info-row">
              <span className="cs-info-label">Empresa</span>
              <span className="cs-info-value">{result.companyName}</span>
            </div>
            <div className="cs-info-row">
              <span className="cs-info-label">Categoría</span>
              <span className="cs-info-value" style={{ textTransform: 'capitalize' }}>{result.category}</span>
            </div>
            <div className="cs-info-row">
              <span className="cs-info-label">Fecha de solicitud</span>
              <span className="cs-info-value">
                {new Date(result.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="cs-info-row">
              <span className="cs-info-label">Última actualización</span>
              <span className="cs-info-value">
                {new Date(result.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Nota de acción (ACTION_REQUIRED o REJECTED) */}
          {cfg.showNote && result.actionNote && (
            <div className="cs-action-note">
              <p className="cs-action-note-title">
                {result.status === 'ACTION_REQUIRED' ? 'Cambios requeridos:' : 'Motivo del rechazo:'}
              </p>
              <p className="cs-action-note-text">{result.actionNote}</p>
            </div>
          )}

          {/* CTA según estado */}
          <div className="cs-result-footer">
            {result.status === 'APPROVED' && (
              <>
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: '10px', padding: '16px 20px', marginBottom: '16px',
                  fontSize: '14px', color: '#166534',
                }}>
                  📧 Revisa tu correo <strong>{result.contactEmail}</strong> para encontrar tus credenciales de acceso.
                </div>
                <Link to="/login" className="cs-cta-btn cs-cta-success">
                  Iniciar sesión como proveedor
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
            {result.status === 'ACTION_REQUIRED' && result.actionToken && (
              <Link to={`/correccion/${result.actionToken}`} className="cs-cta-btn cs-cta-warn">
                Corregir mi solicitud
                <ChevronRight size={15} />
              </Link>
            )}
            {result.status === 'ACTION_REQUIRED' && !result.actionToken && (
              <p className="cs-cta-info" style={{ color: '#d97706' }}>
                El link de corrección llegará a tu correo. También puedes consultar desde el estado de solicitud cuando esté disponible.
              </p>
            )}
            {['PENDING', 'REVIEWING'].includes(result.status) && (
              <p className="cs-cta-info">
                Te notificaremos por correo cuando haya una actualización. Plazo estimado: 2–5 días hábiles.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer de navegación */}
      <div className="cs-footer-links">
        <Link to="/registro-proveedor" className="cs-footer-link">
          Registrar una empresa
        </Link>
        <span className="cs-footer-sep">·</span>
        <Link to="/login" className="cs-footer-link">
          Iniciar sesión
        </Link>
      </div>

    </div>
  );
};

export default CheckStatusPage;
