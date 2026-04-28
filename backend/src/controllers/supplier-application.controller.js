/**
 * supplier-application.controller.js
 *
 * Controlador para las rutas públicas del formulario de registro de proveedores.
 *
 * GARBAGE COLLECTION DE ARCHIVOS HUÉRFANOS
 * ──────────────────────────────────────────
 * Multer guarda los archivos en disco ANTES de que llegue al try/catch.
 * Si la validación Zod o el service lanzan un error, el bloque catch
 * itera sobre req.files y borra cada archivo con fs.promises.unlink().
 * Esto evita acumulación de archivos basura en storage/uploads/private/.
 */

const fs      = require('fs');
const service = require('../services/supplier-application.service');
const { createApplicationSchema, updateActionSchema } = require('../schemas/supplier-application.schema');
const { formatForPublic } = require('../dtos/application.dto');

// ── Helper: eliminar archivos huérfanos del disco ─────────────────────────────
const purgeUploadedFiles = async (files = []) => {
  if (!files.length) return;
  await Promise.allSettled(
    files.map((f) =>
      fs.promises.unlink(f.path).catch((err) =>
        console.error(`[GC] No se pudo eliminar archivo huérfano: ${f.path}`, err.message)
      )
    )
  );
};

// ── Helper: respuesta de error unificada ──────────────────────────────────────
const sendError = (res, err) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor.';
  res.status(status).json({ error: { message } });
};

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/supplier-applications
 *
 * Crea una nueva solicitud de registro de proveedor.
 *
 * Orden de ejecución en la ruta:
 *   rateLimiter → verifyCaptcha → upload.array('documents', 5) → este controller
 *
 * IMPORTANTE: La validación Zod se ejecuta aquí (no como middleware previo)
 * para poder hacer GC de archivos si la validación falla.
 */
const createApplication = async (req, res) => {
  const uploadedFiles = req.files || [];

  try {
    // Validar campos de texto (ya parseados por Multer en req.body)
    const result = createApplicationSchema.safeParse(req.body);

    if (!result.success) {
      await purgeUploadedFiles(uploadedFiles); // GC inmediato
      const errors = (result.error.errors || result.error.issues || []).map((e) => ({
        field:   e.path?.join('.') || 'unknown',
        message: e.message,
      }));
      return res.status(400).json({ message: 'Error de validación.', errors });
    }

    const application = await service.createApplication(
      result.data,
      uploadedFiles,
      req.ip,
      req.captchaScore   // inyectado por verifyCaptcha middleware
    );

    res.status(201).json({
      message: 'Solicitud de registro enviada exitosamente.',
      data:    formatForPublic(application),
    });

  } catch (err) {
    // Si el service falla (ej. email duplicado), purgar archivos ya subidos
    await purgeUploadedFiles(uploadedFiles);
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/supplier-applications/status/:id?email=...
 *
 * Permite al prospecto consultar el estado de su solicitud.
 * Sin autenticación — el ID (cuid) actúa como identificador opaco.
 *
 * SEGURIDAD: Si el query param `email` está presente, se valida que coincida
 * exactamente (case-insensitive) con el email de la solicitud.
 * Si no coincide → HTTP 404 genérico para evitar fuga de información.
 */
const getApplicationStatus = async (req, res) => {
  try {
    const application = await service.getApplicationStatus(req.params.id);

    // Verificación de email (cuando el cliente la provee)
    if (req.query.email) {
      const provided = req.query.email.trim().toLowerCase();
      const stored   = (application.contactEmail || '').toLowerCase();

      if (provided !== stored) {
        // 404 genérico — no revelar que el ID sí existe
        return res.status(404).json({ error: { message: 'Solicitud no encontrada.' } });
      }
    }

    res.status(200).json({ data: formatForPublic(application) });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/supplier-applications/action/:token
 *
 * El prospecto corrige su solicitud usando el token recibido por correo.
 * Aplica GC si Multer subió archivos pero la validación o el service fallan.
 */
const applyActionCorrection = async (req, res) => {
  const uploadedFiles = req.files || [];

  try {
    // Validar campos corregidos (todos opcionales, al menos uno requerido)
    const result = updateActionSchema.safeParse(req.body);

    if (!result.success) {
      await purgeUploadedFiles(uploadedFiles); // GC inmediato
      const errors = (result.error.errors || result.error.issues || []).map((e) => ({
        field:   e.path?.join('.') || 'unknown',
        message: e.message,
      }));
      return res.status(400).json({ message: 'Error de validación.', errors });
    }

    const application = await service.applyActionCorrection(
      req.params.token,
      result.data,
      uploadedFiles
    );

    res.status(200).json({
      message: 'Corrección enviada. Tu solicitud volvió a la cola de revisión.',
      data:    formatForPublic(application),
    });

  } catch (err) {
    await purgeUploadedFiles(uploadedFiles);
    sendError(res, err);
  }
};

/**
 * GET /api/supplier-applications/action/:token
 *
 * Obtiene los datos de la solicitud para pre-rellenar el formulario de corrección.
 * Solo responde si el token es válido, no expirado y el estado es ACTION_REQUIRED.
 */
const getApplicationByToken = async (req, res) => {
  try {
    const application = await service.getApplicationByToken(req.params.token);
    res.status(200).json({ data: formatForPublic(application) });
  } catch (err) {
    sendError(res, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = { createApplication, getApplicationStatus, applyActionCorrection, getApplicationByToken };
