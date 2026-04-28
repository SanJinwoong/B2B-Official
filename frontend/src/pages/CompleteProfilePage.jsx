/**
 * CompleteProfilePage.jsx — Fase 2
 *
 * Ruta: /completar-perfil
 *
 * Formulario del perfil empresarial del cliente.
 * Disponible:
 *   - Desde el banner en ProductsPage
 *   - Directamente por URL
 *
 * Al guardar:
 *   - profileCompleted → true en la BD
 *   - updateUser() actualiza el contexto local
 *   - Redirige a /products
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link }    from 'react-router-dom';
import {
  Building2, FileText, MapPin, Globe, ChevronRight,
  Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { clientProfileApi } from '../api/api';
import { useAuth }           from '../context/AuthContext';
import './auth-pages.css';

const BUSINESS_TYPES = [
  'E-commerce',
  'Retail físico',
  'Mayorista/Distribuidor',
  'Fabricante',
  'Importador',
  'Otro',
];

// ── Componente de campo con ícono ─────────────────────────────────────────────
const Field = ({ id, label, hint, error, required, children }) => (
  <div className="ap-field">
    <label htmlFor={id} className="ap-label">
      {label}
      {!required && (
        <span style={{ fontWeight: 400, color: 'var(--ap-text-subtle, #94a3b8)', fontSize: '11px', marginLeft: '6px' }}>
          (opcional)
        </span>
      )}
    </label>
    {hint && <p style={{ fontSize: '11.5px', color: 'var(--ap-text-subtle)', margin: '-2px 0 6px' }}>{hint}</p>}
    {children}
    {error && <span className="ap-field-error">{error}</span>}
  </div>
);

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    companyName:       '',
    taxId:             '',
    businessType:      '',
    commercialAddress: '',
    shippingAddress:   '',
    website:           '',
  });
  const [sameAddress, setSameAddress] = useState(true);
  const [errors,      setErrors]      = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [success,     setSuccess]     = useState(false);

  // Cargar perfil existente (si ya lo llenó antes)
  useEffect(() => {
    clientProfileApi.get()
      .then(({ data }) => {
        const p = data.data;
        if (p) {
          setForm({
            companyName:       p.companyName       || '',
            taxId:             p.taxId             || '',
            businessType:      p.businessType      || '',
            commercialAddress: p.commercialAddress || '',
            shippingAddress:   p.shippingAddress   || '',
            website:           p.website           || '',
          });
          setSameAddress(!p.shippingAddress);
        }
      })
      .catch(() => {}) // perfil no existe aún → ok
      .finally(() => setInitializing(false));
  }, []);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const validate = () => {
    const errs = {};
    if (!form.companyName.trim())       errs.companyName       = 'La razón social es obligatoria.';
    if (!form.taxId.trim())             errs.taxId             = 'El RFC / ID fiscal es obligatorio.';
    if (!form.businessType)             errs.businessType      = 'Selecciona un tipo de negocio.';
    if (!form.commercialAddress.trim()) errs.commercialAddress = 'La dirección comercial es obligatoria.';
    if (form.website && !/^https?:\/\/.+/.test(form.website.trim())) {
      errs.website = 'Ingresa una URL válida (https://empresa.com).';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        shippingAddress: sameAddress ? null : (form.shippingAddress.trim() || null),
        website:         form.website.trim() || null,
      };
      await clientProfileApi.upsert(payload);
      updateUser({ profileCompleted: true });
      setSuccess(true);
      setTimeout(() => navigate('/products', { replace: true }), 1800);
    } catch (err) {
      const body = err.response?.data;
      if (body?.errors) {
        const map = {};
        body.errors.forEach(({ field, message }) => { map[field] = message; });
        setErrors(map);
        setGlobalError(body.message || 'Corrige los campos marcados.');
      } else {
        setGlobalError(body?.error?.message || body?.message || 'Error al guardar. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de carga inicial ─────────────────────────────────────────────
  if (initializing) {
    return (
      <div className="ap-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--ap-accent, #2563eb)' }} />
      </div>
    );
  }

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="ap-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ap-card" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <CheckCircle2 size={52} style={{ color: '#22c55e', marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--ap-text)', marginBottom: '8px' }}>¡Perfil completado!</h2>
          <p style={{ color: 'var(--ap-text-subtle)', fontSize: '14px' }}>
            Ya puedes crear solicitudes de cotización. Regresando al catálogo…
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <div className="ap-page" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      <div className="ap-card" style={{ maxWidth: '560px' }}>

        {/* Indicador de pasos */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          margin: '0 0 24px', padding: '10px 14px',
          background: 'var(--ap-input-bg, #f8fafc)',
          border: '1px solid var(--ap-border, #e2e8f0)',
          borderRadius: '8px', fontSize: '12px',
        }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: '#22c55e', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '11px', flexShrink: 0,
          }}>✓</div>
          <span style={{ color: 'var(--ap-text-subtle)', textDecoration: 'line-through', fontSize: '12px' }}>Datos de acceso</span>
          <div style={{ flex: 1, height: '1px', background: '#22c55e', margin: '0 4px' }} />
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--ap-accent, #2563eb)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '11px', flexShrink: 0,
          }}>2</div>
          <span style={{ color: 'var(--ap-text)', fontWeight: 600 }}>Perfil empresarial</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px', boxShadow: '0 4px 14px #2563eb30',
          }}>
            <Building2 size={22} color="#fff" />
          </div>
          <h1 className="ap-title" style={{ fontSize: '1.4rem' }}>Perfil de tu Empresa</h1>
          <p className="ap-subtitle" style={{ fontSize: '13px' }}>
            Necesitamos esta información para emitir facturas proforma y gestionar tus pedidos correctamente.
            <strong> Es obligatorio para hacer cotizaciones.</strong>
          </p>
        </div>

        {/* Error global */}
        {globalError && (
          <div className="ap-alert" style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Sección: Datos fiscales ── */}
          <div style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--ap-accent, #2563eb)',
            marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <FileText size={13} /> Datos Fiscales
          </div>

          <Field id="cp-company" label="Razón Social / Nombre de la Empresa" error={errors.companyName} required>
            <input
              id="cp-company" name="companyName" type="text"
              className={`ap-input ${errors.companyName ? 'error' : ''}`}
              value={form.companyName} onChange={handle}
              placeholder="Mi Empresa S.A. de C.V."
            />
          </Field>

          <Field id="cp-taxid" label="RFC / Identificación Fiscal"
            hint="RFC en México · EIN en USA · NIF en España"
            error={errors.taxId} required>
            <input
              id="cp-taxid" name="taxId" type="text"
              className={`ap-input ${errors.taxId ? 'error' : ''}`}
              value={form.taxId} onChange={handle}
              placeholder="XAXX010101000"
              style={{ textTransform: 'uppercase' }}
            />
          </Field>

          <Field id="cp-biztype" label="Tipo de Negocio" error={errors.businessType} required>
            <select
              id="cp-biztype" name="businessType"
              className={`ap-input ${errors.businessType ? 'error' : ''}`}
              value={form.businessType} onChange={handle}
            >
              <option value="">Selecciona una opción…</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          {/* ── Sección: Direcciones ── */}
          <div style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--ap-accent, #2563eb)',
            margin: '20px 0 12px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <MapPin size={13} /> Direcciones
          </div>

          <Field id="cp-addr" label="Dirección Comercial / Fiscal" error={errors.commercialAddress} required>
            <textarea
              id="cp-addr" name="commercialAddress"
              className={`ap-input ${errors.commercialAddress ? 'error' : ''}`}
              value={form.commercialAddress} onChange={handle}
              placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
              rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          {/* Checkbox misma dirección */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', marginBottom: '12px', userSelect: 'none',
            fontSize: '13px', color: 'var(--ap-text)',
          }}>
            <input
              type="checkbox"
              checked={sameAddress}
              onChange={(e) => setSameAddress(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--ap-accent, #2563eb)', cursor: 'pointer' }}
            />
            La dirección de envío / bodega es la misma que la comercial
          </label>

          {!sameAddress && (
            <Field id="cp-ship" label="Dirección de Envío / Bodega" error={errors.shippingAddress}>
              <textarea
                id="cp-ship" name="shippingAddress"
                className={`ap-input ${errors.shippingAddress ? 'error' : ''}`}
                value={form.shippingAddress} onChange={handle}
                placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
                rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </Field>
          )}

          {/* ── Sección: Presencia online ── */}
          <div style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--ap-accent, #2563eb)',
            margin: '20px 0 12px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Globe size={13} /> Presencia Online
          </div>

          <Field id="cp-web" label="Sitio Web de la Empresa" error={errors.website}>
            <div className="ap-input-wrap">
              <Globe size={15} className="ap-input-icon" />
              <input
                id="cp-web" name="website" type="url"
                className={`ap-input has-icon ${errors.website ? 'error' : ''}`}
                value={form.website} onChange={handle}
                placeholder="https://miempresa.com"
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--ap-text-subtle)', marginTop: '4px' }}>
              Le da confianza al equipo y agiliza la aprobación de tus cotizaciones.
            </p>
          </Field>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
            <button
              type="submit"
              className="ap-btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                : <><CheckCircle2 size={15} /> Completar perfil <ChevronRight size={14} /></>
              }
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--ap-text-subtle)' }}>
            <Link to="/products" style={{ color: 'var(--ap-accent)', textDecoration: 'none' }}>
              Completar más tarde →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
