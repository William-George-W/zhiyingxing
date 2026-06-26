const router = require('express').Router();
const ctrl = require('../controllers/schoolController');
const authenticate = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.use(authenticate, requireRole(['school', 'admin']));

router.get('/dashboard', ctrl.getDashboard);

module.exports = router;
