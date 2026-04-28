/**
 * CorrectionPage.jsx
 *
 * Formulario de corrección de solicitud de proveedor.
 * Ruta: /correccion/:token
 *
 * Usa EXACTAMENTE los mismos componentes de pasos (Step1Company, Step2Capacity,
 * Step3Summary) y la misma estructura visual que RegistrationPage.jsx.
 *
 * Flujo:
 *  1. Carga los datos actuales de la solicitud via GET /action/:token
 *  2. Pre-rellena el formulario con esos datos
 *  3. Muestra el banner con la nota del admin
 *  4. El proveedor edita y navega por los 3 pasos igual que al registrarse
 *  5. En paso 3 envía via PATCH /action/:token
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link }     from 'react-router-dom';
import { Sun, Moon, Loader2, AlertTriangle, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { Step1Company, Step2Capacity, Step3Summary } from '../components/StepForms';
import DocumentDropzone from '../components/DocumentDropzone';
import { supplierApplicationApi } from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';
import '../supplier-registration.css';
import '../../../pages/auth-pages.css';

// ── Pasos (igual que RegistrationPage) ───────────────────────────────────────
const STEPS = [
  { label: 'Información de la Empresa' },
  { label: 'Capacidad y Documentos' },
  { label: 'Términos y Confirmación' },
];

const StepIndicator = ({ current }) => (
  <div className="sr-steps">
    {STEPS.map((s, i) => {
      const n = i + 1;
      const state = n < current ? 'completed' : n === current ? 'active' : '';
      return (
        <div key={n} className={`sr-step ${state}`}>
          <div className="sr-step-circle">
            {n < current ? '✓' : n}
          </div>
          <span className="sr-step-label">{s.label}</span>
        </div>
      );
    })}
  </div>
);

// ── Validaciones (idénticas a RegistrationPage) ───────────────────────────────
const validateStep1 = (data) => {
  const errs = {};
  if (!data.companyName.trim())   errs.companyName  = 'Campo obligatorio.';
  if (!data.rfc.trim())           errs.rfc          = 'Campo obligatorio.';
  if (!data.categories?.length)  errs.category     = 'Selecciona al menos una categoría.';
  if (data.categories?.includes('otro') && !data.customCategory?.trim())
    errs.category = 'Especifica la categoría en el campo "Otros".';
  if (!data.contactName.trim())   errs.contactName  = 'Campo obligatorio.';
  if (!data.contactEmail.trim() || !/\S+@\S+\.\S+/.test(data.contactEmail))
    errs.contactEmail = 'Email inválido.';
  if (!data.contactPhone.trim())  errs.contactPhone = 'Campo obligatorio.';
  if (!data.state.trim())         errs.state        = 'Campo obligatorio.';
  if (!data.city.trim())          errs.city         = 'Campo obligatorio.';
  return errs;
};

const validateStep2 = (data) => {
  const errs = {};
  if (!data.monthlyCapacity || Number(data.monthlyCapacity) <= 0)
    errs.monthlyCapacity = 'Debe ser mayor a 0.';
  if (!data.leadTimeDays || Number(data.leadTimeDays) <= 0)
    errs.leadTimeDays = 'Debe ser al menos 1 día.';
  return errs;
};

// ── Helper: parsear 'category' string del backend → arrays del form ───────────
// El backend guarda category como "manufactura, construccion, alimentaria"
// El form usa { categories: ['manufactura','construccion','alimentaria'] }
const parseCategoryFromBackend = (categoryStr = '') => {
  if (!categoryStr) return { categories: [], customCategory: '' };

  const KNOWN_VALUES = [
    'manufactura', 'logistica', 'alimentaria', 'textil',
    'tecnologia', 'quimica', 'construccion', 'automotriz', 'salud',
  ];

  const parts = categoryStr.split(',').map((s) => s.trim().toLowerCase());
  const categories = [];
  let customCategory = '';

  parts.forEach((part) => {
    if (KNOWN_VALUES.includes(part)) {
      categories.push(part);
    } else {
      // Valor desconocido → va como "otro" con texto personalizado
      categories.push('otro');
      customCategory = part;
    }
  });

  return { categories: [...new Set(categories)], customCategory };
};

// ── Componente principal ──────────────────────────────────────────────────────
const CorrectionPage = () => {
  const { token } = useParams();
  const { isDark, toggle } = useTheme();

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [appMeta,   setAppMeta]   = useState(null);

  // Documentos existentes en la solicitud original
  const [existingDocs,  setExistingDocs]  = useState([]); // { id, originalName, mimeType, sizeBytes }
  const [removedDocIds, setRemovedDocIds] = useState([]); // IDs marcados para eliminar

  // ── Estado del formulario (mismo que RegistrationPage) ───────────────────
  const INITIAL_TEXT = {
    companyName: '', rfc: '', website: '',
    categories: [], customCategory: '',
    contactName: '', contactEmail: '', contactPhone: '',
    country: 'México', state: '', city: '', address: '',
    monthlyCapacity: '', capacityUnit: 'piezas',
    leadTimeDays: '', hasExportExp: false,
    description: '', certifications: [],
  };

  const [step,         setStep]         = useState(1);
  const [textData,     setTextData]     = useState(INITIAL_TEXT);
  const [files,        setFiles]        = useState([]);
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [submitError,  setSubmitError]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [success,      setSuccess]      = useState(false);

  const [termsAccepted,   setTermsAccepted]   = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // ── Cargar datos actuales de la solicitud ─────────────────────────────────
  useEffect(() => {
    if (!token) { setLoadError('Token inválido.'); setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supplierApplicationApi.getByToken(token);
        const app = data.data;

        // Guardar meta para la pantalla de éxito
        setAppMeta({
          id:           app.id,
          contactEmail: app.contactEmail,
          actionNote:   app.actionNote,
        });

        // Guardar documentos existentes para mostrarlos en el paso 2
        setExistingDocs(app.documents || []);

        // Parsear category string → arrays del hook
        const { categories, customCategory } = parseCategoryFromBackend(app.category);

        // Pre-rellenar el formulario
        setTextData({
          companyName:     app.companyName     || '',
          rfc:             app.rfc             || '',
          website:         app.website         || '',
          categories,
          customCategory,
          contactName:     app.contactName     || '',
          contactEmail:    app.contactEmail    || '',
          contactPhone:    app.contactPhone    || '',
          country:         app.country         || 'México',
          state:           app.state           || '',
          city:            app.city            || '',
          address:         app.address         || '',
          monthlyCapacity: String(app.monthlyCapacity || ''),
          capacityUnit:    app.capacityUnit    || 'piezas',
          leadTimeDays:    String(app.leadTimeDays    || ''),
          hasExportExp:    app.hasExportExp    ?? false,
          description:     app.description     || '',
          certifications:  Array.isArray(app.certifications)
            ? app.certifications
            : [],
        });
      } catch (err) {
        const status = err.response?.status;
        if (status === 400) setLoadError('Este enlace de corrección no es válido o ya fue utilizado.');
        else if (status === 410) setLoadError('Este enlace de corrección ha expirado (72 h). Contacta al administrador.');
        else if (status === 409) setLoadError('Esta solicitud ya no requiere corrección.');
        else setLoadError('Error al cargar los datos de la solicitud.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Callbacks del formulario (mismo patrón que RegistrationPage) ──────────
  const updateField = useCallback((field, value) => {
    setTextData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev }; delete next[field]; return next;
    });
  }, []);

  const toggleCategory = useCallback((value) => {
    setTextData((prev) => {
      const current = prev.categories || [];
      const updated = current.includes(value)
        ? current.filter((c) => c !== value)
        : [...current, value];
      return { ...prev, categories: updated };
    });
  }, []);

  const toggleCertification = useCallback((cert) => {
    setTextData((prev) => {
      const current = prev.certifications;
      const updated = current.includes(cert)
        ? current.filter((c) => c !== cert)
        : [...current, cert];
      return { ...prev, certifications: updated };
    });
  }, []);

  // ── Navegación ────────────────────────────────────────────────────────────
  const handleNext = () => {
    let errs = {};
    if (step === 1) errs = validateStep1(textData);
    if (step === 2) errs = validateStep2(textData);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSubmitError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const handlePrev = () => {
    setFieldErrors({});
    setSubmitError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Enviar corrección ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!termsAccepted || !privacyAccepted) {
      setSubmitError('Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const fd = new FormData();

      // Campos escalares
      const scalars = [
        'companyName', 'rfc', 'website',
        'contactName', 'contactEmail', 'contactPhone',
        'country', 'state', 'city', 'address',
        'capacityUnit', 'description',
      ];
      scalars.forEach((k) => {
        const v = textData[k];
        if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
      });

      // Categoría: resolver 'otro' → texto personalizado
      const resolvedCategories = (textData.categories || []).map((v) =>
        v === 'otro' ? (textData.customCategory?.trim() || 'otro') : v
      );
      fd.append('category', resolvedCategories.join(', ') || 'otro');

      fd.append('monthlyCapacity', String(textData.monthlyCapacity));
      fd.append('leadTimeDays',    String(textData.leadTimeDays));
      fd.append('hasExportExp',    String(textData.hasExportExp));
      fd.append('certifications',  JSON.stringify(textData.certifications));

      // IDs de documentos a eliminar
      removedDocIds.forEach((id) => fd.append('removeDocIds', id));

      files.forEach((file) => fd.append('documents', file, file.name));

      await supplierApplicationApi.applyCorrection(token, fd);
      setSuccess(true);
    } catch (err) {
      const body = err.response?.data;
      const status = err.response?.status;
      if (status === 400 && body?.errors) {
        const fields = {};
        body.errors.forEach(({ field, message }) => { fields[field] = message; });
        setFieldErrors(fields);
        setSubmitError(body.message || 'Corrige los campos marcados en rojo.');
        const step1Fields = ['companyName','rfc','category','contactName','contactEmail','contactPhone','state','city'];
        const step2Fields = ['monthlyCapacity','capacityUnit','leadTimeDays'];
        if (step1Fields.some((f) => fields[f]))      setStep(1);
        else if (step2Fields.some((f) => fields[f])) setStep(2);
      } else {
        setSubmitError(body?.error?.message || body?.message || 'Error al enviar. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cardTitles = [
    'Paso 1 de 3 — Información de la Empresa',
    'Paso 2 de 3 — Capacidad y Documentos',
    'Paso 3 de 3 — Términos y Confirmación',
  ];

  // ── Pantalla: cargando ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="sr-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--sr-text-subtle)' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--sr-accent)' }} />
          <p style={{ marginTop: '12px' }}>Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  // ── Pantalla: error de carga (token inválido / expirado) ──────────────────
  if (loadError) {
    return (
      <div className="sr-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sr-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--sr-text)', marginBottom: '12px' }}>Enlace no válido</h2>
          <p style={{ color: 'var(--sr-text-subtle)', marginBottom: '24px' }}>{loadError}</p>
          <Link to="/estado-solicitud" style={{ color: 'var(--sr-accent)', textDecoration: 'none', fontWeight: 600 }}>
            ← Consultar estado de solicitud
          </Link>
        </div>
      </div>
    );
  }

  // ── Pantalla: éxito ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="sr-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sr-card" style={{ maxWidth: '520px', textAlign: 'center' }}>
          <CheckCircle size={56} style={{ color: '#16a34a', marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--sr-text)', marginBottom: '8px' }}>¡Corrección enviada!</h2>
          <p style={{ color: 'var(--sr-text-subtle)', marginBottom: '8px' }}>
            Tu solicitud fue actualizada y volvió a la cola de revisión.
          </p>
          <p style={{ color: 'var(--sr-text-subtle)', fontSize: '13px', marginBottom: '28px' }}>
            El equipo revisará tus cambios en los próximos días hábiles y te notificará por correo.
          </p>
          <Link
            to={`/estado-solicitud?id=${appMeta?.id}&email=${encodeURIComponent(appMeta?.contactEmail || '')}`}
            style={{
              display: 'inline-block', padding: '12px 24px',
              background: 'var(--sr-accent)', color: '#fff',
              borderRadius: '8px', textDecoration: 'none', fontWeight: 600,
            }}
          >
            Ver estado de mi solicitud →
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulario multi-step (idéntico a RegistrationPage) ──────────────────
  return (
    <div className="sr-page">

      {/* Toggle dark mode */}
      <button className="ap-theme-btn" onClick={toggle} title="Cambiar tema">
        {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
      </button>

      {/* Cabecera */}
      <div className="sr-header">
        <div className="sr-logo">
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>
        <h1 className="sr-title">Corregir Solicitud de Registro</h1>
        <p className="sr-subtitle">Actualiza los datos solicitados y vuelve a enviar tu solicitud.</p>
      </div>

      {/* Banner de corrección del admin — siempre visible */}
      {appMeta?.actionNote && (
        <div style={{
          maxWidth: '720px', margin: '0 auto 20px',
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: '10px', padding: '14px 20px',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#92400e', fontSize: '13px' }}>
              Cambios requeridos por el equipo revisor:
            </p>
            <p style={{ margin: 0, color: '#78350f', fontSize: '13px' }}>
              {appMeta.actionNote}
            </p>
          </div>
        </div>
      )}

      {/* Indicador de pasos */}
      <StepIndicator current={step} />

      {/* Card del formulario */}
      <div className="sr-card">
        <p className="sr-card-title">{cardTitles[step - 1]}</p>

        {submitError && (
          <div className="sr-alert-error">
            <span>⚠</span>
            <div>{submitError}</div>
          </div>
        )}

        {/* Paso 1 */}
        {step === 1 && (
          <Step1Company
            data={textData}
            onChange={updateField}
            onCategoryToggle={toggleCategory}
            onCustomCategory={(v) => updateField('customCategory', v)}
            errors={fieldErrors}
          />
        )}

        {/* Paso 2 — incluye documentos existentes con botón de eliminar */}
        {step === 2 && (
          <>
            {/* Lista de documentos ya adjuntados */}
            {existingDocs.filter((d) => !removedDocIds.includes(d.id)).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{
                  fontSize: '13px', fontWeight: 700, color: 'var(--sr-text)',
                  marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <FileText size={14} /> Documentos adjuntos anteriormente
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {existingDocs
                    .filter((d) => !removedDocIds.includes(d.id))
                    .map((doc) => (
                      <div key={doc.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--sr-input-bg)',
                        border: '1px solid var(--sr-border)',
                        borderRadius: '8px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={16} style={{ color: 'var(--sr-accent)', flexShrink: 0 }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--sr-text)' }}>
                              {doc.originalName}
                            </p>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--sr-text-subtle)' }}>
                              {doc.mimeType} · {(doc.sizeBytes / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          title="Quitar documento"
                          onClick={() => setRemovedDocIds((prev) => [...prev, doc.id])}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '4px 8px', borderRadius: '6px',
                            color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '12px', fontWeight: 600,
                          }}
                        >
                          <Trash2 size={14} /> Quitar
                        </button>
                      </div>
                    ))}
                </div>

                {/* Documentos marcados para eliminar */}
                {removedDocIds.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginBottom: '6px' }}>
                      Se eliminarán al enviar:
                    </p>
                    {existingDocs
                      .filter((d) => removedDocIds.includes(d.id))
                      .map((doc) => (
                        <div key={doc.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 14px',
                          background: '#fef2f2', border: '1px dashed #fca5a5',
                          borderRadius: '8px', marginBottom: '6px', opacity: 0.7,
                        }}>
                          <span style={{ fontSize: '13px', color: '#991b1b', textDecoration: 'line-through' }}>
                            {doc.originalName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRemovedDocIds((prev) => prev.filter((id) => id !== doc.id))}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '12px', color: '#2563eb', fontWeight: 600,
                            }}
                          >
                            Restaurar
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <Step2Capacity
              data={textData}
              onChange={updateField}
              toggleCertification={toggleCertification}
              files={files}
              setFiles={setFiles}
              filesLost={false}
              errors={fieldErrors}
              DocumentDropzoneComponent={DocumentDropzone}
            />
          </>
        )}

        {/* Paso 3 */}
        {step === 3 && (
          <Step3Summary
            data={textData}
            files={files}
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            onTermsChange={setTermsAccepted}
            onPrivacyChange={setPrivacyAccepted}
          />
        )}

        {/* Navegación */}
        <div className="sr-nav">
          {step > 1 ? (
            <button className="sr-btn sr-btn-ghost" onClick={handlePrev}>
              ← Anterior
            </button>
          ) : (
            <Link to="/estado-solicitud" className="sr-btn sr-btn-ghost" style={{ textDecoration: 'none' }}>
              ← Consultar estado
            </Link>
          )}

          <div className="sr-nav-right">
            {step < 3 && (
              <button className="sr-btn sr-btn-primary" onClick={handleNext}>
                Siguiente →
              </button>
            )}
            {step === 3 && (
              <button
                className="sr-btn sr-btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !termsAccepted || !privacyAccepted}
              >
                {submitting
                  ? <><div className="sr-spinner" /> Enviando...</>
                  : <>🛡 Enviar corrección</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.84rem', color: 'var(--sr-text-subtle)' }}>
        Este enlace es de un solo uso y expira 72 h desde que fue generado.
      </p>
    </div>
  );
};

export default CorrectionPage;
