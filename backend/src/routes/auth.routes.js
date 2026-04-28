const { Router }     = require('express');
const authController = require('../controllers/auth.controller');
const validate       = require('../middlewares/validate');
const authenticate   = require('../middlewares/authenticate');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

const router = Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// PATCH /api/auth/change-password  — Requiere autenticación
router.patch('/change-password', authenticate, authController.changePassword);

module.exports = router;
