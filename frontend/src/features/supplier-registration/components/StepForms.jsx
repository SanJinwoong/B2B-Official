/**
 * StepForms.jsx — v2
 *
 * Cambios respecto a v1:
 *  - Categorías: multiselección con pills (incluyendo "Otros").
 *    Si "Otros" está seleccionado, aparece un input de texto condicional
 *    para especificar la categoría exacta.
 *  - Todos los iconos son de lucide-react (sin emojis).
 *  - Estilos refactorizados con nueva paleta azul / light-dark.
 *  - Campo "categoría" en el hook ahora es un ARRAY de strings.
 *
 * IMPORTANTE: El backend recibe 'category' como un string.
 * El hook buildFormData() debe hacer join() del array antes de enviarlo.
 * Si "Otros" está seleccionado, sustituimos ese elemento por el texto custom.
 */

import {
  Building2, Globe, Phone, Mail, MapPin, User,
  Package, Clock, TrendingUp, FileText, ChevronDown, X, Check,
} from 'lucide-react';

// ── Catálogo de categorías ───────────────────────────────────────────────────
export const CATEGORY_OPTIONS = [
  { value: 'manufactura',  label: 'Manufactura'  },
  { value: 'logistica',    label: 'Logística'    },
  { value: 'alimentaria',  label: 'Alimentaria'  },
  { value: 'textil',       label: 'Textil'       },
  { value: 'tecnologia',   label: 'Tecnología'   },
  { value: 'quimica',      label: 'Química'      },
  { value: 'construccion', label: 'Construcción' },
  { value: 'automotriz',   label: 'Automotriz'   },
  { value: 'salud',        label: 'Salud'        },
  { value: 'otro',         label: 'Otros'        },
];

export const CERTIFICATIONS = [
  'ISO 9001:2015', 'ISO 14001', 'ISO 45001', 'NMX-EE-144',
  'FSC Chain of Custody', 'FSSC 22000', 'GMP', 'HACCP',
  'CTPAT', 'OEA (Operador Económico Autorizado)', 'SMETA',
];

const COUNTRIES = [
  'México', 'Estados Unidos', 'Colombia', 'Argentina', 'Chile', 'Brasil', 'Otro',
];
const CAPACITY_UNITS = ['piezas', 'kg', 'toneladas', 'litros', 'm²', 'unidades'];

// ── Field wrapper con ícono opcional ────────────────────────────────────────
export const Field = ({ label, required, error, hint, children }) => (
  <div className="sr2-field">
    <label className="sr2-label">
      {label}
      {required && <span className="sr2-required">*</span>}
    </label>
    {hint && <p className="sr2-hint">{hint}</p>}
    {children}
    {error && (
      <span className="sr2-field-error">
        <X size={12} strokeWidth={2.5} /> {error}
      </span>
    )}
  </div>
);

// ── Input con ícono izquierdo ───────────────────────────────────────────────
const IconInput = ({ icon: Icon, error, ...props }) => (
  <div className="sr2-icon-input">
    {Icon && <Icon size={15} className="sr2-icon-input-icon" />}
    <input className={`sr2-input ${Icon ? 'has-icon' : ''} ${error ? 'error' : ''}`} {...props} />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  SELECTOR DE CATEGORÍAS (multiselección + "Otros" condicional)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @param {string[]} selected    - Array de values seleccionados (ej. ['manufactura','otro'])
 * @param {string}   customOther - Texto libre cuando "otro" está seleccionado
 * @param {Function} onToggle    - (value: string) => void  — toggle un valor del array
 * @param {Function} onCustom    - (text: string) => void   — actualiza el texto de "Otros"
 * @param {string}   error       - Mensaje de error
 */
export const CategorySelector = ({ selected = [], customOther, onToggle, onCustom, error }) => {
  const hasOther = selected.includes('otro');

  return (
    <div className="sr2-field">
      <label className="sr2-label">
        Categoría(s) Principal(es) de Productos
        <span className="sr2-required">*</span>
      </label>
      <p className="sr2-hint">Puedes seleccionar más de una categoría.</p>

      {/* Grid de pills */}
      <div className="sr2-cat-grid">
        {CATEGORY_OPTIONS.map(({ value, label }) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              className={`sr2-cat-pill ${active ? 'active' : ''}`}
              onClick={() => onToggle(value)}
            >
              {active && <Check size={12} strokeWidth={3} />}
              {label}
            </button>
          );
        })}
      </div>

      {/* Input condicional para "Otros" */}
      {hasOther && (
        <div className="sr2-other-input-wrap">
          <label className="sr2-label" style={{ marginTop: '0.75rem', marginBottom: '0.3rem' }}>
            Especifica tu categoría
            <span className="sr2-required">*</span>
          </label>
          <IconInput
            icon={ChevronDown}
            placeholder="Ej. Reciclaje industrial, Agroquímica, Robótica..."
            value={customOther || ''}
            onChange={(e) => onCustom(e.target.value)}
            error={error && hasOther && !customOther?.trim()}
          />
        </div>
      )}

      {error && (
        <span className="sr2-field-error">
          <X size={12} strokeWidth={2.5} /> {error}
        </span>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  PASO 1: Información de la Empresa
// ══════════════════════════════════════════════════════════════════════════════

export const Step1Company = ({ data, onChange, onCategoryToggle, onCustomCategory, errors }) => (
  <div className="sr2-fields">

    {/* Nombre y RFC */}
    <Field label="Razón Social / Nombre de la Empresa" required error={errors?.companyName}>
      <IconInput
        icon={Building2}
        placeholder="PackMex Industrial S.A. de C.V."
        value={data.companyName}
        onChange={(e) => onChange('companyName', e.target.value)}
        error={errors?.companyName}
      />
    </Field>

    <div className="sr2-row">
      <Field label="RFC" required error={errors?.rfc}>
        <IconInput
          icon={FileText}
          placeholder="PMI198823XYZ"
          value={data.rfc}
          onChange={(e) => onChange('rfc', e.target.value.toUpperCase())}
          error={errors?.rfc}
        />
      </Field>
      <Field label="Sitio Web" error={errors?.website}>
        <IconInput
          icon={Globe}
          placeholder="https://tuempresa.com"
          value={data.website}
          onChange={(e) => onChange('website', e.target.value)}
          error={errors?.website}
        />
      </Field>
    </div>

    {/* Selector de categorías multiselección */}
    <CategorySelector
      selected={data.categories || []}
      customOther={data.customCategory}
      onToggle={onCategoryToggle}
      onCustom={(v) => onChange('customCategory', v)}
      error={errors?.category}
    />

    {/* Sección contacto */}
    <div className="sr2-section-divider">
      <span>Contacto Principal</span>
    </div>

    <div className="sr2-row">
      <Field label="Nombre del Contacto" required error={errors?.contactName}>
        <IconInput
          icon={User}
          placeholder="Roberto Sánchez"
          value={data.contactName}
          onChange={(e) => onChange('contactName', e.target.value)}
          error={errors?.contactName}
        />
      </Field>
      <Field label="Email Corporativo" required error={errors?.contactEmail}>
        <IconInput
          icon={Mail}
          type="email"
          placeholder="roberto@empresa.com"
          value={data.contactEmail}
          onChange={(e) => onChange('contactEmail', e.target.value)}
          error={errors?.contactEmail}
        />
      </Field>
    </div>

    <div className="sr2-row">
      <Field label="Teléfono" required error={errors?.contactPhone}>
        <IconInput
          icon={Phone}
          placeholder="+52 33 1234 5678"
          value={data.contactPhone}
          onChange={(e) => onChange('contactPhone', e.target.value)}
          error={errors?.contactPhone}
        />
      </Field>
      <Field label="País" required>
        <select
          className="sr2-select"
          value={data.country}
          onChange={(e) => onChange('country', e.target.value)}
        >
          {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
    </div>

    <div className="sr2-row">
      <Field label="Estado / Provincia" required error={errors?.state}>
        <IconInput
          icon={MapPin}
          placeholder="Jalisco"
          value={data.state}
          onChange={(e) => onChange('state', e.target.value)}
          error={errors?.state}
        />
      </Field>
      <Field label="Ciudad" required error={errors?.city}>
        <IconInput
          placeholder="Guadalajara"
          value={data.city}
          onChange={(e) => onChange('city', e.target.value)}
          error={errors?.city}
        />
      </Field>
    </div>

    <Field label="Dirección de Planta / Almacén">
      <input
        className="sr2-input"
        placeholder="Blvd. Industriales 2500, Parque Industrial Vallarta"
        value={data.address || ''}
        onChange={(e) => onChange('address', e.target.value)}
      />
    </Field>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  PASO 2: Capacidad y Documentos
// ══════════════════════════════════════════════════════════════════════════════

export const Step2Capacity = ({
  data, onChange, toggleCertification,
  files, setFiles, filesLost,
  errors, DocumentDropzoneComponent,
}) => (
  <div className="sr2-fields">

    <div className="sr2-section-divider">
      <span>Capacidad de Producción</span>
    </div>

    <div className="sr2-row">
      <Field label="Capacidad Mensual" required error={errors?.monthlyCapacity}>
        <div className="sr2-unit-row">
          <IconInput
            icon={Package}
            type="number"
            min="1"
            placeholder="500 000"
            value={data.monthlyCapacity}
            onChange={(e) => onChange('monthlyCapacity', e.target.value)}
            error={errors?.monthlyCapacity}
          />
          <select
            className="sr2-select sr2-select-unit"
            value={data.capacityUnit}
            onChange={(e) => onChange('capacityUnit', e.target.value)}
          >
            {CAPACITY_UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
      </Field>

      <Field label="Lead Time Promedio (días)" required error={errors?.leadTimeDays}>
        <IconInput
          icon={Clock}
          type="number"
          min="1"
          max="365"
          placeholder="15"
          value={data.leadTimeDays}
          onChange={(e) => onChange('leadTimeDays', e.target.value)}
          error={errors?.leadTimeDays}
        />
      </Field>
    </div>

    {/* Checkbox exportación */}
    <label className="sr2-checkbox-row">
      <div className={`sr2-checkbox ${data.hasExportExp ? 'checked' : ''}`}
        onClick={() => onChange('hasExportExp', !data.hasExportExp)}
        role="checkbox"
        aria-checked={data.hasExportExp}
        tabIndex={0}
        onKeyDown={(e) => e.key === ' ' && onChange('hasExportExp', !data.hasExportExp)}
      >
        {data.hasExportExp && <Check size={12} strokeWidth={3} color="#fff" />}
      </div>
      <div>
        <p className="sr2-checkbox-label">Experiencia en exportación internacional</p>
        <p className="sr2-checkbox-desc">Hemos realizado exportaciones fuera del país de origen.</p>
      </div>
    </label>

    <Field
      label="Descripción de la Empresa y Servicios"
      hint="Máx. 2000 caracteres. Describe tu especialización y ventajas competitivas."
    >
      <textarea
        className="sr2-textarea"
        placeholder="Somos una empresa con 15 años de experiencia en manufactura de alta precisión, certificados en..."
        value={data.description || ''}
        onChange={(e) => onChange('description', e.target.value)}
        maxLength={2000}
      />
    </Field>

    {/* Certificaciones */}
    <div className="sr2-section-divider">
      <span>Certificaciones</span>
    </div>
    <div className="sr2-cert-grid">
      {CERTIFICATIONS.map((cert) => {
        const active = data.certifications?.includes(cert);
        return (
          <button
            key={cert}
            type="button"
            className={`sr2-cert-pill ${active ? 'active' : ''}`}
            onClick={() => toggleCertification(cert)}
          >
            {active && <Check size={11} strokeWidth={3} />}
            {cert}
          </button>
        );
      })}
    </div>

    {/* Dropzone */}
    <div className="sr2-section-divider">
      <span>Documentos Requeridos</span>
    </div>
    <p className="sr2-hint" style={{ marginBottom: '0.5rem' }}>
      Acta Constitutiva, Constancia de Situación Fiscal, certificaciones y cualquier documento relevante.
      Solo PDF, JPG y PNG. Máx. 10 MB por archivo.
    </p>
    <DocumentDropzoneComponent
      files={files}
      onFilesChange={setFiles}
      filesLost={filesLost}
    />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  PASO 3: Resumen y Confirmación
// ══════════════════════════════════════════════════════════════════════════════

export const Step3Summary = ({
  data, files, termsAccepted, privacyAccepted, onTermsChange, onPrivacyChange,
}) => {
  // Construir label de categorías para la vista de resumen
  const categoryLabel = (() => {
    if (!data.categories?.length) return '—';
    return data.categories.map((v) => {
      if (v === 'otro') return data.customCategory?.trim() || 'Otros';
      return CATEGORY_OPTIONS.find((c) => c.value === v)?.label || v;
    }).join(', ');
  })();

  return (
    <div>
      {/* Grid de resumen */}
      <div className="sr2-summary-card">
        <div className="sr2-summary-section">
          <p className="sr2-summary-section-title">Empresa</p>
          <div className="sr2-summary-grid">
            <SummaryItem label="Razón Social"    value={data.companyName} />
            <SummaryItem label="RFC"             value={data.rfc} />
            <SummaryItem label="Categoría(s)"    value={categoryLabel} span />
            <SummaryItem label="Contacto"        value={data.contactName} />
            <SummaryItem label="Email"           value={data.contactEmail} />
            <SummaryItem label="Teléfono"        value={data.contactPhone} />
            <SummaryItem label="Ciudad"          value={data.city ? `${data.city}, ${data.state}` : null} />
            <SummaryItem label="País"            value={data.country} />
          </div>
        </div>

        <div className="sr2-summary-section">
          <p className="sr2-summary-section-title">Capacidad</p>
          <div className="sr2-summary-grid">
            <SummaryItem
              label="Capacidad Mensual"
              value={data.monthlyCapacity ? `${Number(data.monthlyCapacity).toLocaleString()} ${data.capacityUnit}` : null}
            />
            <SummaryItem
              label="Lead Time"
              value={data.leadTimeDays ? `${data.leadTimeDays} días` : null}
            />
            <SummaryItem
              label="Exportación"
              value={data.hasExportExp ? 'Con experiencia internacional' : 'Sin experiencia internacional'}
            />
            <SummaryItem
              label="Certificaciones"
              value={data.certifications?.length ? data.certifications.join(', ') : 'Ninguna'}
              span
            />
          </div>
        </div>

        <div className="sr2-summary-section" style={{ borderBottom: 'none' }}>
          <p className="sr2-summary-section-title">Documentos adjuntos</p>
          {files.length === 0 ? (
            <p className="sr2-hint">No se han adjuntado documentos.</p>
          ) : (
            <div className="sr2-summary-files">
              {files.map((f) => (
                <div key={f.name} className="sr2-summary-file">
                  <FileText size={14} className="sr2-summary-file-icon" />
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Aviso de tiempo de revisión */}
      <div className="sr2-notice">
        <TrendingUp size={15} className="sr2-notice-icon" />
        <span>
          Nuestro equipo revisará tu perfil y documentación en un plazo de{' '}
          <strong>2-5 días hábiles</strong>. Recibirás un correo con el resultado de tu evaluación.
        </span>
      </div>

      {/* Términos */}
      <div className="sr2-terms-group">
        <TermRow checked={termsAccepted} onChange={onTermsChange}>
          Acepto los{' '}
          <a href="#terms" className="sr2-link">Términos y Condiciones</a>{' '}
          del portal de proveedores, incluyendo las políticas de calidad y tiempos de entrega.
        </TermRow>
        <TermRow checked={privacyAccepted} onChange={onPrivacyChange}>
          Acepto el{' '}
          <a href="#privacy" className="sr2-link">Aviso de Privacidad</a>{' '}
          y autorizo el tratamiento de mis datos para fines de la plataforma B2B.
        </TermRow>
      </div>
    </div>
  );
};

// ── Sub-componentes del Paso 3 ────────────────────────────────────────────────

const SummaryItem = ({ label, value, span }) => (
  <div className={`sr2-summary-item ${span ? 'span-2' : ''}`}>
    <span className="sr2-summary-label">{label}</span>
    <span className={`sr2-summary-value ${!value ? 'empty' : ''}`}>{value || '—'}</span>
  </div>
);

const TermRow = ({ checked, onChange, children }) => (
  <label className="sr2-term-row">
    <div
      className={`sr2-checkbox ${checked ? 'checked' : ''}`}
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => e.key === ' ' && onChange(!checked)}
    >
      {checked && <Check size={12} strokeWidth={3} color="#fff" />}
    </div>
    <span>{children}</span>
  </label>
);
