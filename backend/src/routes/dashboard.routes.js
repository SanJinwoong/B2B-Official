const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');
const { getClientDashboard } = require('../controllers/dashboard.controller');

const router = Router();

// GET /api/dashboard  — resumen completo del cliente
router.get('/', authenticate, authorize('CLIENT', 'ADMIN'), getClientDashboard);

module.exports = router;
