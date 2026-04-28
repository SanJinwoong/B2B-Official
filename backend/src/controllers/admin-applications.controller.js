/**
 * admin-applications.controller.js
 *
 * Controlador para el panel de administrador — gestión de solicitudes de proveedores.
 * Todas las rutas de este controller requieren: authenticate + authorize('ADMIN').
 *
 * La validación Zod de actionNote se ejecuta en el controller (no como middleware)
 * por consistencia con el flujo del formulario y para obtener mejores mensajes de error.
 */

const path    = require('path');
const service = require('../services/supplier-application.service');
const { reviewApplicationSchema } = require('../schemas/supplier-application.schema');
const { formatForAdmin, formatListForAdmin } = require('../dtos/application.dto');

// ── Helper: respuesta de error unificada ──────────────────────────────────────
const sendError = (res, err) => {
  const status  = err.statusCode || 500;
  const message = err.message    || 'Error interno del servidor.';
  res.status(status).json({ error: { message } });
};

// ── Helper: validar actionNote con Zod ───────────────────────────────────────
const validateActionNote = (body) => {
  const result = reviewApplicationSchema.safeParse(body);
  if (!result.success) {
    const errors = (result.error.errors || result.error.issues || []).map((e) => ({
      field:   e.path?.join('.') || 'unknown',
      message: e.message,
    }));
    return { ok: false, errors };
  }
  return { ok: true, data: result.data };
};

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/applications
 * Lista todas las solicitudes con filtros opcionales.
 * Query params: ?status=PENDING&page=1&limit=20
 */
const listApplications = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await service.listApplications({
      status: status || undefined,
      page:   page   ? parseInt(page,  10) : 1,
      limit:  limit  ? parseInt(limit, 10) : 20,
    });

    res.status(200).json({
      data:       formatListForAdmin(result.data),
      total:      result.total,
      page:       result.page,
      totalPages: result.totalPages,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/applications/:id
 * Detalle completo de una solicitud.
 */
const getApplicationById = async (req, res) => {
  try {
    const application = await service.getApplicationById(req.params.id);
    res.status(200).json({ data: formatForAdmin(application) });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/applications/:id/claim
 * Admin toma la solicitud para revisión (lock optimista).
 * PENDING → REVIEWING
 */
const claimApplication = async (req, res) => {
  try {
    const application = await service.claimApplication(
      req.params.id,
      req.user.id  // ID del admin autenticado (del JWT)
    );
    res.status(200).json({
      message: 'Solicitud reclamada. Ahora puedes revisarla.',
      data:    formatForAdmin(application),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/applications/:id/approve
 * Aprueba la solicitud y crea el User SUPPLIER.
 * REVIEWING → APPROVED  (solo si el admin tiene el lock)
 */
const approveApplication = async (req, res) => {
  try {
    const { application, newUser } = await service.approveApplication(
      req.params.id,
      req.user.id
    );
    res.status(200).json({
      message: `Proveedor aprobado. Cuenta creada para ${newUser.email}.`,
      data: {
        application: formatForAdmin(application),
        newUser,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/applications/:id/reject
 * Rechaza definitivamente la solicitud.
 * REVIEWING → REJECTED  (solo si el admin tiene el lock)
 * Body: { actionNote: string (mínimo 10 chars) }
 */
const rejectApplication = async (req, res) => {
  // Validar actionNote antes de llamar al service
  const validation = validateActionNote(req.body);
  if (!validation.ok) {
    return res.status(400).json({ message: 'Error de validación.', errors: validation.errors });
  }

  try {
    const application = await service.rejectApplication(
      req.params.id,
      req.user.id,
      validation.data.actionNote
    );
    res.status(200).json({
      message: 'Solicitud rechazada.',
      data:    formatForAdmin(application),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/applications/:id/request-action
 * Solicita corrección parcial al prospecto.
 * REVIEWING → ACTION_REQUIRED  (solo si el admin tiene el lock)
 * Body: { actionNote: string (mínimo 10 chars) }
 * Genera token criptográfico + mock correo visible en terminal.
 */
const requestAction = async (req, res) => {
  const validation = validateActionNote(req.body);
  if (!validation.ok) {
    return res.status(400).json({ message: 'Error de validación.', errors: validation.errors });
  }

  try {
    const application = await service.requestAction(
      req.params.id,
      req.user.id,
      validation.data.actionNote
    );
    res.status(200).json({
      message: 'Solicitud de corrección enviada. El prospecto recibirá instrucciones.',
      data:    formatForAdmin(application),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/applications/:id/documents/:docId/download
 *
 * Descarga directa y autenticada de un documento privado.
 *
 * Flujo:
 *   1. El service verifica propiedad (anti-IDOR) y registra la auditoría.
 *   2. El controller usa res.download() para transmitir el archivo.
 *   3. filePath NUNCA sale en JSON — solo se usa internamente aquí.
 */
const downloadDocument = async (req, res) => {
  try {
    const { filePath, originalName } = await service.getDocumentForDownload(
      req.params.id,      // applicationId
      req.params.docId,   // documentId
      req.user.id         // adminId para auditoría
    );

    // res.download transmite el archivo; el browser lo descarga con el nombre original
    res.download(filePath, originalName, (err) => {
      if (err && !res.headersSent) {
        console.error('[DOWNLOAD] Error al servir archivo:', err.message);
        res.status(500).json({ error: { message: 'Error al descargar el archivo.' } });
      }
    });

  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  listApplications,
  getApplicationById,
  claimApplication,
  approveApplication,
  rejectApplication,
  requestAction,
  downloadDocument,
};
