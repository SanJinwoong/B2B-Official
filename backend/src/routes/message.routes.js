const { Router } = require('express');
const ctrl = require('../controllers/message.controller');
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');

const router = Router();

router.get('/',          authenticate, authorize('CLIENT', 'SUPPLIER', 'ADMIN'), ctrl.getMessages);
router.post('/',         authenticate, authorize('CLIENT', 'SUPPLIER', 'ADMIN'), ctrl.sendMessage);
router.get('/unread',    authenticate, authorize('CLIENT', 'SUPPLIER'),           ctrl.getUnreadCount);
router.get('/admin/chats', authenticate, authorize('ADMIN'),                      ctrl.getAdminSupportChats);

module.exports = router;
