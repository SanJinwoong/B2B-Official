/**
 * RegistrationPage.jsx
 *
 * Página orquestadora del formulario multi-step de Registro de Proveedores.
 *
 * Responsabilidades:
 *  - Mostrar el StepIndicator con el paso actual.
 *  - Renderizar el componente del paso correspondiente.
 *  - Manejar la validación básica de campo vacío antes de avanzar.
 *  - En el paso 3, construir el FormData y enviarlo al backend.
 *  - Interpretar errores 400 (Zod), 409 (email dup.) y 429 (rate limit).
 *  - Limpiar sessionStorage SOLO ante una respuesta HTTP 201 exitosa.
 *  - Mostrar <PendingReview> cuando el backend confirma recepción.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import useSupplierForm, { clearDraft } from '../hooks/useSupplierForm';
import DocumentDropzone      from '../components/DocumentDropzone';
import { Step1Company, Step2Capacity, Step3Summary } from '../components/StepForms';
import RegistrationSuccess   from '../components/RegistrationSuccess';
import { supplierApplicationApi } from '../../../api/api';
import { useTheme }          from '../../../context/ThemeContext';
import '../supplier-registration.css';
import '../../../pages/auth-pages.css';

// ── Indicador de pasos ────────────────────────────────────────────────────────
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

// ── Validaciones básicas por paso ──────────────────────────────────────────────
const validateStep1 = (data) => {
  const errs = {};
  if (!data.companyName.trim()) errs.companyName = 'Campo obligatorio.';
  if (!data.rfc.trim())         errs.rfc         = 'Campo obligatorio.';
  // categories ahora es un array
  if (!data.categories?.length) errs.category = 'Selecciona al menos una categoría.';
  if (data.categories?.includes('otro') && !data.customCategory?.trim())
    errs.category = 'Especifica la categoría en el campo "Otros".';
  if (!data.contactName.trim()) errs.contactName = 'Campo obligatorio.';
  if (!data.contactEmail.trim() || !/\S+@\S+\.\S+/.test(data.contactEmail))
    errs.contactEmail = 'Email inválido.';
  if (!data.contactPhone.trim()) errs.contactPhone = 'Campo obligatorio.';
  if (!data.state.trim())        errs.state        = 'Campo obligatorio.';
  if (!data.city.trim())         errs.city         = 'Campo obligatorio.';
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

// ── Extraer mensaje de error de Axios ─────────────────────────────────────────
const extractErrors = (axiosError) => {
  const status = axiosError.response?.status;
  const body   = axiosError.response?.data;

  if (status === 429) {
    return {
      global: 'Demasiadas solicitudes desde esta IP. Espera 15 minutos e intenta de nuevo.',
      fields: {},
    };
  }
  if (status === 409) {
    return {
      global: body?.error?.message || 'Ya existe una solicitud activa con este email o RFC. Revisa tu correo de confirmación.',
      fields: {},
    };
  }
  if (status === 400 && body?.errors?.length > 0) {
    const fields = {};
    body.errors.forEach(({ field, message }) => { fields[field] = message; });
    // Construir mensaje legible con los campos que fallaron
    const fieldNames = body.errors.map(({ field }) => field).join(', ');
    return {
      global: `Revisa los campos: ${fieldNames}. Regresa al paso correspondiente y corrígelos.`,
      fields,
    };
  }
  if (status === 400) {
    return {
      global: body?.message || body?.error?.message || 'Error de validación en el formulario.',
      fields: {},
    };
  }
  return {
    global: body?.error?.message || 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    fields: {},
  };
};

// ══════════════════════════════════════════════════════════════════════════════
const RegistrationPage = () => {
  const form = useSupplierForm();

  // Términos y privacidad (estado local — no necesitan persistencia)
  const [termsAccepted,   setTermsAccepted]   = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // ── Avanzar al siguiente paso ──────────────────────────────────────────
  const handleNext = () => {
    let errs = {};

    if (form.step === 1) errs = validateStep1(form.textData);
    if (form.step === 2) errs = validateStep2(form.textData);

    if (Object.keys(errs).length > 0) {
      form.setFieldErrors(errs);
      return;
    }
    form.setFieldErrors({});
    form.setSubmitError('');
    form.goNext();
  };

  // ── Retroceder ────────────────────────────────────────────────────────
  const handlePrev = () => {
    form.setFieldErrors({});
    form.setSubmitError('');
    form.goPrev();
  };

  // ── Enviar el formulario ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!termsAccepted || !privacyAccepted) {
      form.setSubmitError('Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.');
      return;
    }

    form.setSubmitting(true);
    form.setSubmitError('');

    try {
      // ① Construir FormData con campos de texto + archivos
      const fd = form.buildFormData();

      // ② Enviar al backend
      const { data } = await supplierApplicationApi.create(fd);

      // ③ SOLO en éxito HTTP 201 limpiamos el borrador
      clearDraft();

      // ④ Guardar ID y mostrar vista de éxito
      form.setCreatedApplicationId(data.data?.id || null);

    } catch (err) {
      const { global, fields } = extractErrors(err);
      form.setSubmitError(global);
      if (Object.keys(fields).length > 0) {
        form.setFieldErrors(fields);
        // Si hay errores de campos del paso 1 o 2, regresar al paso correspondiente
        const step1Fields = ['companyName','rfc','category','contactName','contactEmail','contactPhone','state','city'];
        const step2Fields = ['monthlyCapacity','capacityUnit','leadTimeDays'];
        if (step1Fields.some((f) => fields[f])) form.goToStep(1);
        else if (step2Fields.some((f) => fields[f])) form.goToStep(2);
      }
    } finally {
      form.setSubmitting(false);
    }
  };

  // ── Éxito: mostrar pantalla de confirmación con ID ──────────────────────
  if (form.createdApplicationId !== null) {
    return (
      <RegistrationSuccess
        applicationId={form.createdApplicationId}
        companyName={form.textData.companyName}
        contactEmail={form.textData.contactEmail}
        onReset={() => {
          form.setCreatedApplicationId(null);
          form.goToStep(1);
        }}
      />
    );
  }

  // ── Título del card por paso ──────────────────────────────────────────
  const cardTitles = [
    'Paso 1 de 3 — Información de la Empresa',
    'Paso 2 de 3 — Capacidad y Documentos',
    'Paso 3 de 3 — Términos y Confirmación',
  ];

  const { isDark, toggle } = useTheme();

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
        <h1 className="sr-title">Registro de Proveedor B2B</h1>
        <p className="sr-subtitle">Forma parte de nuestra red de proveedores verificados</p>
      </div>

      {/* Indicador de pasos */}
      <StepIndicator current={form.step} />

      {/* Card del formulario */}
      <div className="sr-card">
        <p className="sr-card-title">{cardTitles[form.step - 1]}</p>

        {/* Error global (400/429/network) */}
        {form.submitError && (
          <div className="sr-alert-error">
            <span>⚠</span>
            <div>{form.submitError}</div>
          </div>
        )}

        {/* ── Paso 1 ── */}
        {form.step === 1 && (
          <Step1Company
            data={form.textData}
            onChange={form.updateField}
            onCategoryToggle={form.toggleCategory}
            onCustomCategory={(v) => form.updateField('customCategory', v)}
            errors={form.fieldErrors}
          />
        )}

        {/* ── Paso 2 ── */}
        {form.step === 2 && (
          <Step2Capacity
            data={form.textData}
            onChange={form.updateField}
            toggleCertification={form.toggleCertification}
            files={form.files}
            setFiles={form.setFiles}
            filesLost={form.filesLostOnReload}
            errors={form.fieldErrors}
            DocumentDropzoneComponent={DocumentDropzone}
          />
        )}

        {/* ── Paso 3 ── */}
        {form.step === 3 && (
          <Step3Summary
            data={form.textData}
            files={form.files}
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            onTermsChange={setTermsAccepted}
            onPrivacyChange={setPrivacyAccepted}
          />
        )}

        {/* Navegación */}
        <div className="sr-nav">
          {form.step > 1 ? (
            <button className="sr-btn sr-btn-ghost" onClick={handlePrev}>
              ← Anterior
            </button>
          ) : (
            <div />
          )}

          <div className="sr-nav-right">
            {form.step < 3 && (
              <button className="sr-btn sr-btn-primary" onClick={handleNext}>
                Siguiente →
              </button>
            )}

            {form.step === 3 && (
              <button
                className="sr-btn sr-btn-primary"
                onClick={handleSubmit}
                disabled={form.submitting || !termsAccepted || !privacyAccepted}
              >
                {form.submitting ? (
                  <><div className="sr-spinner" /> Enviando...</>
                ) : (
                  <>🛡 Enviar Solicitud de Registro</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Link de login */}
      <p style={{ marginTop: '1.5rem', fontSize: '0.84rem', color: 'var(--sr-text-subtle)' }}>
        ¿Ya tienes una cuenta?{' '}
        <Link to="/login" style={{ color: 'var(--sr-accent)', textDecoration: 'none' }}>
          Iniciar Sesión
        </Link>
      </p>
    </div>
  );
};

export default RegistrationPage;
