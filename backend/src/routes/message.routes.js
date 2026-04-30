const { Router } = require('express');
const ctrl = require('../controllers/message.controller');
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');

const router = Router();

router.get('/',          authenticate, authorize('CLIENT', 'ADMIN'), ctrl.getMessages);
router.post('/',         authenticate, authorize('CLIENT', 'ADMIN'), ctrl.sendMessage);
router.get('/unread',    authenticate, authorize('CLIENT'),           ctrl.getUnreadCount);

module.exports = router;
