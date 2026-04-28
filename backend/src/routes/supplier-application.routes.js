/**
 * supplier-application.routes.js
 *
 * Rutas públicas del formulario de registro de proveedores.
 *
 * ORDEN CRÍTICO de middlewares en POST /:
 *   1. applicationRateLimiter  — bloquea IPs abusivas ANTES de procesar nada
 *   2. verifyCaptcha           — inyecta req.captchaScore (mock: 0.9)
 *   3. upload.array(...)       — Multer parsea multipart y guarda archivos en disco
 *   4. controller              — valida Zod (con GC de archivos si falla) y llama al service
 *
 * ⚠️  La validación Zod NO va como middleware previo a Multer porque
 *     req.body está vacío hasta que Multer parsea el multipart.
 *     Si se pusiera antes, todos los campos fallarían como "obligatorio".
 */

const { Router } = require('express');
const { applicationRateLimiter } = require('../middlewares/rateLimiter');
const verifyCaptcha               = require('../middlewares/verifyCaptcha');
const { upload }                  = require('../services/upload.service');
const controller                  = require('../controllers/supplier-application.controller');

const router = Router();

// ── POST /api/supplier-applications ───────────────────────────────────────────
// Crear solicitud de registro (paso 1+2+3 del formulario multi-step).
// Los archivos llegan en el campo "documents" (máx 5, 10 MB cada uno).
router.post(
  '/',
  applicationRateLimiter,
  verifyCaptcha,
  upload.array('documents', 5),
  controller.createApplication
);

// ── GET /api/supplier-applications/status/:id ─────────────────────────────────
// El prospecto consulta el estado de su solicitud usando el ID recibido en el correo.
// Sin autenticación — el cuid actúa como identificador opaco.
router.get('/status/:id', controller.getApplicationStatus);

// ── PATCH /api/supplier-applications/action/:token ───────────────────────────
// El prospecto corrige su solicitud usando el token del correo de "action_required".
// Multer parsea nuevos archivos opcionales. GC en el controller si falla.
router.patch(
  '/action/:token',
  upload.array('documents', 5),
  controller.applyActionCorrection
);

module.exports = router;
