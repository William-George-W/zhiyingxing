const { fail } = require('../utils/response');

/**
 * RBAC 权限守卫
 * 用法: requireRole('admin') 或 requireRole(['admin', 'school'])
 */
const requireRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, '未登录', 401, 401);
    }
    if (!allowed.includes(req.user.role_code)) {
      return fail(res, '权限不足', 403, 403);
    }
    next();
  };
};

module.exports = { requireRole };
