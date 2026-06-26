const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const authenticate = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.use(authenticate, requireRole('admin'));

// 用户管理
router.get('/users',                     ctrl.getUsers);
router.post('/users',                    ctrl.createUser);
router.put('/users/:id/status',          ctrl.toggleUserStatus);
router.put('/users/:id/reset-password',  ctrl.resetPassword);
router.delete('/users/:id',              ctrl.deleteUser);

// 企业审核
router.get('/enterprises',             ctrl.getEnterprises);
router.put('/enterprises/:id/verify',  ctrl.verifyEnterprise);

// 统计
router.get('/stats', ctrl.getStats);

module.exports = router;
