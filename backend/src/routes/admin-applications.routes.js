/**
 * admin-applications.routes.js
 *
 * Rutas protegidas del panel de administrador para la gestión
 * de solicitudes de registro de proveedores.
 *
 * Todos los endpoints requieren:
 *   - authenticate  → JWT válido
 *   - authorize('ADMIN') → rol ADMIN en el payload
 *
 * ⚠️  El orden de middlewares authenticate → authorize es obligatorio.
 *     authorize depende de req.user que inyecta authenticate.
 */

const { Router }   = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const controller   = require('../controllers/admin-applications.controller');

const router = Router();

// Aplicar authenticate + authorize a TODAS las rutas de este router
router.use(authenticate, authorize('ADMIN'));

// ── GET /api/admin/applications ────────────────────────────────────────────────
// Lista solicitudes con filtros opcionales: ?status=PENDING&page=1&limit=20
router.get('/', controller.listApplications);

// ── GET /api/admin/applications/:id ───────────────────────────────────────────
// Detalle completo de una solicitud (sin filePath, con downloadUrl en documentos)
router.get('/:id', controller.getApplicationById);

// ── PATCH /api/admin/applications/:id/claim ──────────────────────────────────
// Tomar la solicitud para revisión → PENDING a REVIEWING (lock optimista)
router.patch('/:id/claim', controller.claimApplication);

// ── PATCH /api/admin/applications/:id/approve ────────────────────────────────
// Aprobar → REVIEWING a APPROVED, crea User SUPPLIER + mock correo con password
router.patch('/:id/approve', controller.approveApplication);

// ── PATCH /api/admin/applications/:id/reject ─────────────────────────────────
// Rechazar definitivamente → REVIEWING a REJECTED
// Body: { actionNote: string (mín. 10 chars) }
router.patch('/:id/reject', controller.rejectApplication);

// ── PATCH /api/admin/applications/:id/request-action ─────────────────────────
// Solicitar corrección parcial → REVIEWING a ACTION_REQUIRED
// Genera token criptográfico + mock correo visible en terminal
// Body: { actionNote: string (mín. 10 chars) }
router.patch('/:id/request-action', controller.requestAction);

// ── GET /api/admin/applications/:id/documents/:docId/download ─────────────────
// Descarga directa y autenticada de un documento privado vía res.download()
// filePath NUNCA se expone en ninguna respuesta JSON
router.get('/:id/documents/:docId/download', controller.downloadDocument);

module.exports = router;
