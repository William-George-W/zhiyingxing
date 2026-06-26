const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

const authenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers['authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return fail(res, '未登录，请先登录', 401, 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role_id, role_code }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, '登录已过期，请重新登录', 401, 401);
    }
    return fail(res, '无效的Token', 401, 401);
  }
};

module.exports = authenticate;
