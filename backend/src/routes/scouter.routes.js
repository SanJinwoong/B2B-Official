const { Router } = require('express');
const ctrl        = require('../controllers/scouter.controller');
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');

const router = Router();

// ── Público: el formulario de registro llama a este endpoint ─────────────────
router.get('/', ctrl.listActive);

// ── Admin: CRUD de scouters ───────────────────────────────────────────────────
router.use(authenticate, authorize('ADMIN'));

router.get  ('/all',   ctrl.listAll);
router.post ('/',      ctrl.create);
router.patch('/:id',   ctrl.update);
router.delete('/:id',  ctrl.remove);

module.exports = router;
