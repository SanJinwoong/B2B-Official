/**
 * useSupplierForm.js
 *
 * Hook central del formulario multi-step de registro de proveedores.
 *
 * ESTRATEGIA DE PERSISTENCIA (separación de estado):
 * ────────────────────────────────────────────────────
 * ✅ sessionStorage  → campos de TEXTO (serializables)
 *                      Se persisten y sobreviven a recarga de página.
 * ✅ estado React    → objetos File (NO serializables)
 *                      Solo viven en memoria. Se pierden al recargar.
 *                      El usuario ve un aviso si detectamos esa situación.
 *
 * LIMPIEZA del sessionStorage:
 *   Solo se ejecuta cuando el backend responde 201 (éxito real).
 *   Nunca en errores, para no perder el trabajo del usuario.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'supplier_form_draft';

// ── Valores iniciales de los campos de texto ───────────────────────────────
const INITIAL_TEXT = {
  // Paso 1
  companyName:    '',
  rfc:            '',
  website:        '',
  // categories reemplaza a category: ahora es array de strings
  categories:     [],    // ej. ['manufactura', 'otro']
  customCategory: '',    // texto libre cuando 'otro' está seleccionado
  contactName:    '',
  contactEmail:   '',
  contactPhone:   '',
  country:        'México',
  state:          '',
  city:           '',
  address:        '',
  // Paso 2
  monthlyCapacity: '',
  capacityUnit:    'piezas',
  leadTimeDays:    '',
  hasExportExp:    false,
  description:     '',
  certifications:  [],
};

// ── Leer borrador del sessionStorage (si existe) ───────────────────────────
const loadDraft = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ── Guardar borrador en sessionStorage ────────────────────────────────────
const saveDraft = (textData) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(textData));
  } catch {
    /* Silencioso — no es crítico si falla el storage */
  }
};

// ── Limpiar borrador (solo en éxito HTTP 201) ─────────────────────────────
export const clearDraft = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

// ═══════════════════════════════════════════════════════════════════════════

const useSupplierForm = () => {
  // ── Estado 1: paso actual ─────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Estado 2: campos de texto (persistidos en sessionStorage) ─────────
  const [textData, setTextData] = useState(() => {
    const draft = loadDraft();
    return draft ? { ...INITIAL_TEXT, ...draft } : { ...INITIAL_TEXT };
  });

  // ── Estado 3: archivos (solo en memoria — NO en sessionStorage) ────────
  const [files, setFiles] = useState([]);

  // ── Estado 4: indicador de archivos perdidos por recarga ──────────────
  // Si hay un borrador guardado (implica que ya habían archivos seleccionados
  // en una sesión anterior) pero files está vacío, avisamos al usuario.
  const [filesLostOnReload, setFilesLostOnReload] = useState(false);

  // ── Estado 5: errores de validación por campo ─────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Estado 6: error global de envío (400 / 429 / network) ─────────────
  const [submitError, setSubmitError] = useState('');

  // ── Estado 7: loading durante el submit ───────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ── Estado 8: ID de la solicitud aprobada (para PendingReview) ────────
  const [createdApplicationId, setCreatedApplicationId] = useState(null);

  // ── Detectar archivos perdidos por recarga ────────────────────────────
  useEffect(() => {
    const hasDraft = !!sessionStorage.getItem(STORAGE_KEY);
    if (hasDraft && files.length === 0) {
      setFilesLostOnReload(true);
    } else {
      setFilesLostOnReload(false);
    }
  }, [files]);

  // ── Persistir campos de texto en sessionStorage en cada cambio ─────────
  useEffect(() => {
    saveDraft(textData);
  }, [textData]);

  // ── Actualizar un campo de texto individual ───────────────────────────
  const updateField = useCallback((field, value) => {
    setTextData((prev) => ({ ...prev, [field]: value }));
    // Limpiar el error del campo al editar
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ── Toggle de categoría (array multiselección) ───────────────────────
  const toggleCategory = useCallback((value) => {
    setTextData((prev) => {
      const current = prev.categories || [];
      const updated = current.includes(value)
        ? current.filter((c) => c !== value)
        : [...current, value];
      return { ...prev, categories: updated };
    });
  }, []);

  // ── Toggle de certificación ───────────────────────────────────────────
  const toggleCertification = useCallback((cert) => {
    setTextData((prev) => {
      const current = prev.certifications;
      const updated = current.includes(cert)
        ? current.filter((c) => c !== cert)
        : [...current, cert];
      return { ...prev, certifications: updated };
    });
  }, []);

  // ── Navegación entre pasos ────────────────────────────────────────────
  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, 3)), []);
  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const goToStep = useCallback((n) => setStep(n), []);

  // ── Construir FormData para el submit ─────────────────────────────────
  /**
   * Construye el FormData que se enviará al backend.
   * - Todos los campos de texto se convierten a string.
   * - Los booleanos se pasan como "true"/"false".
   * - Las certificaciones se envían como JSON string.
   * - Cada File se agrega bajo la clave "documents".
   */
  const buildFormData = useCallback(() => {
    const fd = new FormData();

    // Campos escalares
    const scalarFields = [
      'companyName', 'rfc', 'website',
      'contactName', 'contactEmail', 'contactPhone',
      'country', 'state', 'city', 'address',
      'capacityUnit', 'description',
    ];
    scalarFields.forEach((key) => {
      const val = textData[key];
      if (val !== undefined && val !== null && val !== '') {
        fd.append(key, String(val));
      }
    });

    // Resolver categoría: reemplaza 'otro' por customCategory
    const resolvedCategories = (textData.categories || []).map((v) =>
      v === 'otro' ? (textData.customCategory?.trim() || 'otro') : v
    );
    // El backend espera un único string en 'category'
    fd.append('category', resolvedCategories.join(', ') || 'otro');

    // Números
    fd.append('monthlyCapacity', String(textData.monthlyCapacity));
    fd.append('leadTimeDays',    String(textData.leadTimeDays));

    // Boolean
    fd.append('hasExportExp', String(textData.hasExportExp));

    // Array de certificaciones como JSON
    fd.append('certifications', JSON.stringify(textData.certifications));

    // Archivos
    files.forEach((file) => { fd.append('documents', file, file.name); });

    return fd;
  }, [textData, files]);

  return {
    // Estado de navegación
    step,
    goNext,
    goPrev,
    goToStep,

    // Datos del formulario
    textData,
    updateField,
    toggleCategory,
    toggleCertification,

    // Archivos
    files,
    setFiles,
    filesLostOnReload,

    // Errores
    fieldErrors,
    setFieldErrors,
    submitError,
    setSubmitError,

    // Submit
    submitting,
    setSubmitting,
    buildFormData,

    // Resultado
    createdApplicationId,
    setCreatedApplicationId,
  };
};

export default useSupplierForm;
