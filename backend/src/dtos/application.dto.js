/**
 * application.dto.js
 *
 * Transforma objetos SupplierApplication antes de enviarlos al cliente.
 *
 * REGLA DE ORO: Ninguna función debe devolver jamás:
 *   - filePath       (ruta física en disco del servidor)
 *   - actionToken    (token de corrección — secreto del flujo)
 *   - submittedFromIp (dato privado del solicitante)
 *
 * En su lugar, los documentos en la vista de admin incluyen
 * una downloadUrl construida a partir del endpoint autenticado.
 */

// ── Helper: construir URL de descarga para un documento ───────────────────────
const buildDownloadUrl = (applicationId, docId) =>
  `/api/admin/applications/${applicationId}/documents/${docId}/download`;

// ── Helper: transformar un documento para la vista pública ────────────────────
// El prospecto solo ve metadatos, no puede descargar documentos.
const formatDocForPublic = (doc) => ({
  id:          doc.id,
  label:       doc.label,
  originalName: doc.originalName,
  mimeType:    doc.mimeType,
  sizeBytes:   doc.sizeBytes,
  uploadedAt:  doc.uploadedAt,
  // filePath → NUNCA
});

// ── Helper: transformar un documento para la vista de admin ──────────────────
// El admin recibe la URL de descarga autenticada en lugar del filePath.
const formatDocForAdmin = (applicationId, doc) => ({
  id:           doc.id,
  label:        doc.label,
  originalName: doc.originalName,
  mimeType:     doc.mimeType,
  sizeBytes:    doc.sizeBytes,
  uploadedAt:   doc.uploadedAt,
  lastAccessedAt: doc.lastAccessedAt ?? null,
  // downloadUrl reemplaza a filePath
  downloadUrl:  buildDownloadUrl(applicationId, doc.id),
  // filePath → NUNCA
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatForPublic — Vista para el prospecto
//
// Expone solo los datos necesarios para que el prospecto pueda hacer
// seguimiento de su solicitud. Oculta todos los datos administrativos.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} application - Objeto completo de SupplierApplication
 * @returns {object} Representación segura para el prospecto
 */
const formatForPublic = (application) => ({
  id:           application.id,
  status:       application.status,
  companyName:  application.companyName,
  contactEmail: application.contactEmail,

  // Solo visible si status === 'ACTION_REQUIRED'
  actionNote:   application.status === 'ACTION_REQUIRED'
    ? application.actionNote
    : null,

  // Datos de la solicitud (solo lectura para el prospecto)
  category:        application.category,
  city:            application.city,
  state:           application.state,
  country:         application.country,
  monthlyCapacity: application.monthlyCapacity,
  capacityUnit:    application.capacityUnit,
  leadTimeDays:    application.leadTimeDays,
  certifications:  application.certifications ?? [],

  // Documentos: solo metadatos, sin URL de descarga
  documents: Array.isArray(application.documents)
    ? application.documents.map(formatDocForPublic)
    : [],

  createdAt: application.createdAt,
  updatedAt: application.updatedAt,

  // ❌ filePath       — NUNCA
  // ❌ actionToken    — NUNCA
  // ❌ submittedFromIp — NUNCA
  // ❌ captchaScore   — NUNCA (dato interno)
  // ❌ reviewerId     — NUNCA (dato administrativo)
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatForAdmin — Vista completa para el administrador
//
// El admin recibe todos los campos operativos.
// Los documentos incluyen downloadUrl (no filePath).
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} application - Objeto completo de SupplierApplication
 * @returns {object} Representación operativa para el administrador
 */
const formatForAdmin = (application) => ({
  id:           application.id,
  status:       application.status,

  // Datos de la empresa
  companyName:  application.companyName,
  rfc:          application.rfc,
  website:      application.website ?? null,
  category:     application.category,

  // Contacto
  contactName:  application.contactName,
  contactEmail: application.contactEmail,
  contactPhone: application.contactPhone,
  country:      application.country,
  state:        application.state,
  city:         application.city,
  address:      application.address ?? null,

  // Capacidad
  monthlyCapacity: application.monthlyCapacity,
  capacityUnit:    application.capacityUnit,
  leadTimeDays:    application.leadTimeDays,
  hasExportExp:    application.hasExportExp,
  description:     application.description ?? null,
  certifications:  application.certifications ?? [],

  // Máquina de estados
  actionNote:   application.actionNote ?? null,

  // Datos de auditoría de revisión
  captchaScore:    application.captchaScore ?? null,
  reviewerId:      application.reviewerId ?? null,
  reviewer:        application.reviewer ?? null,
  reviewStartedAt: application.reviewStartedAt ?? null,
  reviewedAt:      application.reviewedAt ?? null,

  // Usuario aprobado (si status === 'APPROVED')
  approvedUserId: application.approvedUserId ?? null,
  approvedUser:   application.approvedUser ?? null,

  // Documentos: downloadUrl en lugar de filePath
  documents: Array.isArray(application.documents)
    ? application.documents.map((doc) => formatDocForAdmin(application.id, doc))
    : [],

  createdAt: application.createdAt,
  updatedAt: application.updatedAt,

  // ❌ filePath       — NUNCA (acceso solo vía /download)
  // ❌ actionToken    — NUNCA
  // ❌ submittedFromIp — NUNCA
});

// ── Helpers de lista ──────────────────────────────────────────────────────────

/**
 * Aplica formatForAdmin a un array de solicitudes.
 * @param {object[]} applications
 * @returns {object[]}
 */
const formatListForAdmin = (applications) =>
  applications.map(formatForAdmin);

module.exports = { formatForPublic, formatForAdmin, formatListForAdmin };
