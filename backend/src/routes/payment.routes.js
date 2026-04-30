const { Router } = require('express');
const ctrl = require('../controllers/payment.controller');
const authenticate = require('../middlewares/authenticate');
const authorize    = require('../middlewares/authorize');

const router = Router();

router.get('/',          authenticate, authorize('CLIENT'), ctrl.getMyPayments);
router.get('/summary',   authenticate, authorize('CLIENT'), ctrl.getSummary);
router.patch('/:id/pay', authenticate, authorize('CLIENT'), ctrl.markAsPaid);

module.exports = router;
