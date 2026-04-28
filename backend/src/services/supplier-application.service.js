/**
 * supplier-application.service.js
 *
 * Lógica de negocio para el flujo de registro de proveedores B2B.
 * Implementa la máquina de estados de SupplierApplication.
 *
 * Máquina de estados válida:
 *   PENDING → REVIEWING → APPROVED
 *                       → REJECTED
 *                       → ACTION_REQUIRED → PENDING (corrección)
 *
 * Regla de oro: APPROVED / REJECTED / ACTION_REQUIRED solo pueden
 * ocurrir si status === 'REVIEWING' Y reviewerId === adminId.
 */

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const prisma  = require('../config/prisma');
const mailer  = require('./mailer.service');

const ACTION_TOKEN_TTL_HOURS = parseInt(process.env.ACTION_TOKEN_TTL_HOURS || '72', 10);

// ── Helper: error de negocio tipado ───────────────────────────────────────────
const bizError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ── Helper: verificar que el admin tiene el lock ───────────────────────────────
const assertAdminHasLock = (application, adminId) => {
  if (application.status !== 'REVIEWING') {
    throw bizError(
      `La solicitud no está en estado REVIEWING (estado actual: ${application.status}). ` +
      'Primero debes reclamarla con /claim.',
      409
    );
  }
  if (application.reviewerId !== adminId) {
    throw bizError(
      'Otro administrador ya tiene el lock de esta solicitud. No puedes modificarla.',
      403
    );
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RUTAS PÚBLICAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva solicitud de registro de proveedor.
 * Persiste los documentos subidos por multer como ApplicationDocument.
 *
 * @param {object} data       - Campos validados por createApplicationSchema
 * @param {Express.File[]} files - Archivos subidos por multer
 * @param {string} ip         - IP del solicitante (req.ip)
 * @param {number} captchaScore - Score inyectado por verifyCaptcha middleware
 * @returns {Promise<SupplierApplication>} Solicitud creada (sin filePath)
 */
const createApplication = async (data, files, ip, captchaScore) => {
  // Verificar email duplicado en solicitudes activas (no rechazadas)
  const existing = await prisma.supplierApplication.findFirst({
    where: {
      contactEmail: data.contactEmail,
      status: { notIn: ['REJECTED'] },
    },
  });

  if (existing) {
    throw bizError(
      `Ya existe una solicitud activa con el email "${data.contactEmail}" ` +
      `(estado: ${existing.status}). Usa el link de tu correo de confirmación para hacer seguimiento.`,
      409
    );
  }

  // Normalizar website vacío → null
  const website = data.website?.trim() || null;

  const application = await prisma.supplierApplication.create({
    data: {
      companyName:     data.companyName,
      rfc:             data.rfc,
      website,
      category:        data.category,
      contactName:     data.contactName,
      contactEmail:    data.contactEmail,
      contactPhone:    data.contactPhone,
      country:         data.country,
      state:           data.state,
      city:            data.city,
      address:         data.address ?? null,
      monthlyCapacity: data.monthlyCapacity,
      capacityUnit:    data.capacityUnit,
      leadTimeDays:    data.leadTimeDays,
      hasExportExp:    data.hasExportExp ?? false,
      description:     data.description ?? null,
      certifications:  JSON.stringify(data.certifications ?? []),
      captchaScore,
      submittedFromIp: ip,
      // Documentos: uno por archivo subido
      documents: {
        create: (files || []).map((file) => ({
          label:        file.fieldname, // ej: "rfc", "actaConstitutiva"
          filePath:     file.path,
          originalName: file.originalname,
          mimeType:     file.mimetype,
          sizeBytes:    file.size,
        })),
      },
    },
    include: { documents: true },
  });

  // Mock correo de confirmación
  mailer.sendSubmissionConfirmation(application.contactEmail, application.id);

  return application;
};

/**
 * Retorna el estado público de una solicitud por su ID.
 * Solo expone campos seguros (sin filePath, sin actionToken).
 *
 * @param {string} id - ID de la solicitud (cuid)
 * @returns {Promise<object>}
 */
const getApplicationStatus = async (id) => {
  const app = await prisma.supplierApplication.findUnique({
    where: { id },
    select: {
      id:           true,
      status:       true,
      companyName:  true,
      contactEmail: true,
      actionNote:   true,  // Visible al prospecto si status = ACTION_REQUIRED
      createdAt:    true,
      updatedAt:    true,
    },
  });

  if (!app) throw bizError('Solicitud no encontrada.', 404);
  return app;
};

/**
 * Permite al prospecto corregir su solicitud usando el token recibido por correo.
 * Reglas:
 *   - Token debe existir y no haber expirado
 *   - Token se invalida tras un solo uso exitoso
 *   - El status regresa a PENDING para volver a la cola
 *
 * @param {string} token      - actionToken recibido por correo (URL)
 * @param {object} data       - Campos corregidos (updateActionSchema)
 * @param {Express.File[]} files - Nuevos documentos (opcionales)
 * @returns {Promise<object>}
 */
const applyActionCorrection = async (token, data, files) => {
  const app = await prisma.supplierApplication.findUnique({
    where: { actionToken: token },
    include: { documents: true },
  });

  if (!app) {
    throw bizError('El enlace de corrección no es válido o ya fue utilizado.', 400);
  }

  if (app.actionTokenExpiresAt < new Date()) {
    throw bizError(
      'El enlace de corrección ha expirado (TTL: 72 h). Contacta al administrador.',
      410
    );
  }

  // Solo se puede corregir si el estado actual es ACTION_REQUIRED
  if (app.status !== 'ACTION_REQUIRED') {
    throw bizError(
      `Esta solicitud ya no requiere corrección (estado actual: ${app.status}).`,
      409
    );
  }

  // Preparar datos a actualizar (solo los campos que vienen en el body)
  const updateData = {};
  const textFields = [
    'companyName', 'rfc', 'website', 'category',
    'contactName', 'contactEmail', 'contactPhone',
    'country', 'state', 'city', 'address',
    'monthlyCapacity', 'capacityUnit', 'leadTimeDays',
    'hasExportExp', 'description', 'certifications',
  ];
  textFields.forEach((field) => {
    if (data[field] !== undefined) {
      updateData[field] = field === 'certifications'
        ? JSON.stringify(data[field])
        : data[field];
    }
  });

  // IDs de docs a eliminar (validados: deben pertenecer a esta solicitud)
  const removeDocIds = (data.removeDocIds || []).filter((id) =>
    app.documents.some((doc) => doc.id === id)
  );

  // Rutas en disco de los docs a eliminar (para borrarlos tras la transacción)
  const pathsToDelete = app.documents
    .filter((doc) => removeDocIds.includes(doc.id))
    .map((doc) => doc.filePath);

  // Nuevos documentos adjuntados en esta corrección
  const newDocs = (files || []).map((file) => ({
    applicationId: app.id,
    label:        file.fieldname,
    filePath:     file.path,
    originalName: file.originalname,
    mimeType:     file.mimetype,
    sizeBytes:    file.size,
  }));

  // Guardar email del revisor antes de limpiar el lock (para notificarlo)
  const reviewerEmail = app.reviewerId
    ? await prisma.user
        .findUnique({ where: { id: app.reviewerId }, select: { email: true } })
        .then((u) => u?.email ?? null)
    : null;

  // ── Transacción: eliminar docs, insertar nuevos, resetear estado ──────────
  const updated = await prisma.$transaction(async (tx) => {
    // Eliminar documentos marcados por el proveedor
    if (removeDocIds.length > 0) {
      await tx.applicationDocument.deleteMany({
        where: { id: { in: removeDocIds } },
      });
    }

    // Insertar nuevos documentos
    if (newDocs.length > 0) {
      await tx.applicationDocument.createMany({ data: newDocs });
    }

    return tx.supplierApplication.update({
      where: { id: app.id },
      data: {
        ...updateData,
        status:              'PENDING',
        actionToken:          null,
        actionTokenExpiresAt: null,
        actionNote:           null,
        reviewerId:           null,
        reviewStartedAt:      null,
        reviewedAt:           null,
      },
      include: { documents: true },
    });
  });

  // Borrar archivos físicos de los docs eliminados (fuera de la transacción)
  if (pathsToDelete.length > 0) {
    const fs = require('fs');
    await Promise.allSettled(
      pathsToDelete.map((p) =>
        fs.promises.unlink(p).catch((e) =>
          console.error(`[GC] No se pudo borrar archivo: ${p}`, e.message)
        )
      )
    );
  }

  // Notificar al admin revisor por email
  if (reviewerEmail) {
    mailer.sendCorrectionSubmitted(reviewerEmail, app.id, app.companyName);
  }

  return updated;
};


/**
 * Obtiene los datos actuales de una solicitud usando el actionToken.
 * Permite al prospecto pre-rellenar el formulario de corrección.
 * Solo funciona si el token es válido y no ha expirado.
 *
 * @param {string} token - actionToken recibido por correo / URL
 * @returns {Promise<object>} Datos de la solicitud (sin datos sensibles)
 */
const getApplicationByToken = async (token) => {
  const app = await prisma.supplierApplication.findUnique({
    where: { actionToken: token },
    include: { documents: true },
  });

  if (!app) {
    throw bizError('El enlace de corrección no es válido o ya fue utilizado.', 400);
  }

  if (app.actionTokenExpiresAt < new Date()) {
    throw bizError(
      'El enlace de corrección ha expirado (TTL: 72 h). Contacta al administrador.',
      410
    );
  }

  if (app.status !== 'ACTION_REQUIRED') {
    throw bizError(
      `Esta solicitud ya no requiere corrección (estado actual: ${app.status}).`,
      409
    );
  }

  return app;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RUTAS ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista todas las solicitudes con filtros opcionales.
 *
 * @param {object} filters - { status?, page?, limit? }
 * @returns {Promise<{ data, total, page, totalPages }>}
 */
const listApplications = async ({ status, page = 1, limit = 20 } = {}) => {
  const where = status ? { status } : {};
  const skip  = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.supplierApplication.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
        documents: {
          select: {
            id: true, label: true, originalName: true,
            mimeType: true, sizeBytes: true, uploadedAt: true,
            // filePath excluido — solo accesible vía /download
          },
        },
      },
    }),
    prisma.supplierApplication.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Retorna el detalle completo de una solicitud para el admin.
 * filePath NUNCA se incluye — el DTO lo eliminará adicionalmente.
 *
 * @param {string} id - ID de la solicitud
 * @returns {Promise<SupplierApplication>}
 */
const getApplicationById = async (id) => {
  const app = await prisma.supplierApplication.findUnique({
    where: { id },
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
      approvedUser: { select: { id: true, email: true, name: true } },
      documents: {
        select: {
          id: true, label: true, originalName: true,
          mimeType: true, sizeBytes: true,
          uploadedAt: true, lastAccessedAt: true,
        },
      },
    },
  });

  if (!app) throw bizError('Solicitud no encontrada.', 404);
  return app;
};

/**
 * Admin toma la solicitud para revisión (lock optimista).
 * Transición válida: PENDING → REVIEWING
 * Si ya está en REVIEWING por OTRO admin → 409.
 * Si ya la tiene EL MISMO admin → idempotente (devuelve la solicitud).
 *
 * @param {string} id      - ID de la solicitud
 * @param {number} adminId - ID del admin autenticado
 * @returns {Promise<SupplierApplication>}
 */
const claimApplication = async (id, adminId) => {
  const app = await getApplicationById(id);

  // Idempotente: el mismo admin ya tiene el lock
  if (app.status === 'REVIEWING' && app.reviewerId === adminId) {
    return app;
  }

  if (app.status === 'REVIEWING' && app.reviewerId !== adminId) {
    throw bizError(
      'Esta solicitud ya está siendo revisada por otro administrador.',
      409
    );
  }

  if (app.status !== 'PENDING') {
    throw bizError(
      `Solo se pueden reclamar solicitudes en estado PENDING (actual: ${app.status}).`,
      409
    );
  }

  return prisma.supplierApplication.update({
    where: { id },
    data: {
      status:         'REVIEWING',
      reviewerId:      adminId,
      reviewStartedAt: new Date(),
    },
    include: { documents: { select: { id: true, label: true, originalName: true, mimeType: true, sizeBytes: true } } },
  });
};

/**
 * Admin aprueba la solicitud.
 * Transición válida: REVIEWING → APPROVED  (solo si reviewerId === adminId)
 * Crea el User SUPPLIER en la misma transacción.
 *
 * @param {string} id      - ID de la solicitud
 * @param {number} adminId - ID del admin autenticado
 * @returns {Promise<{ application, newUser }>}
 */
const approveApplication = async (id, adminId) => {
  const app = await getApplicationById(id);
  assertAdminHasLock(app, adminId);

  // Verificar que no exista ya un usuario con ese email
  const existingUser = await prisma.user.findUnique({
    where: { email: app.contactEmail },
  });
  if (existingUser) {
    throw bizError(
      `Ya existe un usuario con el email "${app.contactEmail}". ` +
      'La cuenta puede haber sido creada manualmente.',
      409
    );
  }

  // Generar credenciales temporales
  const tempPassword  = crypto.randomBytes(10).toString('base64url'); // ~14 chars
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // Transacción atómica: crear usuario + actualizar solicitud
  const [newUser, updatedApp] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email:             app.contactEmail,
        name:              app.contactName,
        password:          hashedPassword,
        role:              'SUPPLIER',
        isActive:          true,
        mustChangePassword: true,   // Fuerza cambio de contraseña en primer login
      },
    }),
    prisma.supplierApplication.update({
      where: { id },
      data: {
        status:        'APPROVED',
        reviewedAt:    new Date(),
        // approvedUserId se enlaza después (necesitamos el ID del usuario creado)
      },
    }),
  ]);

  // Enlazar usuario aprobado (fuera de la transacción porque necesitábamos newUser.id)
  await prisma.supplierApplication.update({
    where: { id },
    data: { approvedUserId: newUser.id },
  });

  // Mock correo con credenciales
  mailer.sendApproval(newUser.email, tempPassword);

  return { application: updatedApp, newUser: { id: newUser.id, email: newUser.email } };
};

/**
 * Admin rechaza definitivamente la solicitud.
 * Transición válida: REVIEWING → REJECTED  (solo si reviewerId === adminId)
 *
 * @param {string} id         - ID de la solicitud
 * @param {number} adminId    - ID del admin autenticado
 * @param {string} actionNote - Motivo obligatorio del rechazo
 * @returns {Promise<SupplierApplication>}
 */
const rejectApplication = async (id, adminId, actionNote) => {
  const app = await getApplicationById(id);
  assertAdminHasLock(app, adminId);

  const updated = await prisma.supplierApplication.update({
    where: { id },
    data: {
      status:     'REJECTED',
      actionNote,
      reviewedAt:  new Date(),
    },
  });

  mailer.sendRejection(app.contactEmail, actionNote);
  return updated;
};

/**
 * Admin solicita corrección parcial.
 * Transición válida: REVIEWING → ACTION_REQUIRED  (solo si reviewerId === adminId)
 * Genera un token criptográfico único con TTL de 72 horas.
 *
 * @param {string} id         - ID de la solicitud
 * @param {number} adminId    - ID del admin autenticado
 * @param {string} actionNote - Descripción exacta de lo que debe corregirse
 * @returns {Promise<SupplierApplication>}
 */
const requestAction = async (id, adminId, actionNote) => {
  const app = await getApplicationById(id);
  assertAdminHasLock(app, adminId);

  // Token criptográfico de 32 bytes = 64 chars hex
  const actionToken          = crypto.randomBytes(32).toString('hex');
  const actionTokenExpiresAt = new Date(
    Date.now() + ACTION_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  const updated = await prisma.supplierApplication.update({
    where: { id },
    data: {
      status: 'ACTION_REQUIRED',
      actionNote,
      actionToken,
      actionTokenExpiresAt,
      reviewedAt: new Date(),
    },
  });

  // Mock correo con token y URL de corrección visibles en terminal
  mailer.sendActionRequired(
    app.contactEmail,
    app.id,
    actionNote,
    actionToken
  );

  return updated;
};

/**
 * Registra que el admin descargó un documento (auditoría).
 * Retorna el filePath para que el controller lo pase a res.download().
 * El filePath NUNCA sale en JSON — solo el controller lo usa internamente.
 *
 * @param {string} applicationId - ID de la solicitud
 * @param {string} docId         - ID del documento
 * @param {number} adminId       - ID del admin (para auditoría)
 * @returns {Promise<{ filePath: string, originalName: string }>}
 */
const getDocumentForDownload = async (applicationId, docId, adminId) => {
  const doc = await prisma.applicationDocument.findUnique({
    where: { id: docId },
  });

  if (!doc) throw bizError('Documento no encontrado.', 404);

  // Anti-IDOR: verificar que el documento pertenece a la solicitud indicada
  if (doc.applicationId !== applicationId) {
    throw bizError('El documento no pertenece a esta solicitud.', 403);
  }

  // Auditoría de acceso
  await prisma.applicationDocument.update({
    where: { id: docId },
    data: {
      lastAccessedAt: new Date(),
      lastAccessedBy: adminId,
    },
  });

  return { filePath: doc.filePath, originalName: doc.originalName };
};

module.exports = {
  // Públicos
  createApplication,
  getApplicationStatus,
  applyActionCorrection,
  getApplicationByToken,
  // Admin
  listApplications,
  getApplicationById,
  claimApplication,
  approveApplication,
  rejectApplication,
  requestAction,
  getDocumentForDownload,
};
