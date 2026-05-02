const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const auth = require('../middlewares/authenticate');

// Todas las rutas requieren autenticación
router.use(auth);

router.get('/', ctrl.getUnread);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);

router.get('/settings', ctrl.getSettings);
router.patch('/settings', ctrl.updateSettings);

module.exports = router;
