/**
 * client-profile.routes.js
 *
 * Rutas para el perfil empresarial del cliente.
 *
 * GET  /api/clients/profile  → obtener perfil propio
 * POST /api/clients/profile  → crear / actualizar perfil (upsert)
 */
const { Router }          = require('express');
const authenticate         = require('../middlewares/authenticate');
const validate             = require('../middlewares/validate');
const clientProfileCtrl    = require('../controllers/client-profile.controller');
const { clientProfileSchema } = require('../schemas/client-profile.schema');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get( '/', clientProfileCtrl.getProfile);
router.post('/', validate(clientProfileSchema), clientProfileCtrl.upsertProfile);

module.exports = router;
