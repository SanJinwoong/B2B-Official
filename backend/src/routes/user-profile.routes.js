/**
 * user-profile.routes.js
 *
 * GET   /api/me           — obtener perfil propio
 * PATCH /api/me           — actualizar nombre / teléfono
 * PATCH /api/me/password  — cambiar contraseña
 */
const { Router }      = require('express');
const authenticate     = require('../middlewares/authenticate');
const ctrl             = require('../controllers/user-profile.controller');

const router = Router();

router.use(authenticate);

router.get( '/',         ctrl.getMe);
router.patch('/',        ctrl.updateMe);
router.patch('/password', ctrl.changeMyPassword);

module.exports = router;
