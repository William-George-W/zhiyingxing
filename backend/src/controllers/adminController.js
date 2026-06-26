const db = require('../config/db');
const { success, fail } = require('../utils/response');
const bcrypt = require('bcryptjs');

// ─── 用户管理 ────────────────────────────────────────────────
/**
 * GET /api/admin/users?role_code=&keyword=&status=&page=&pageSize=
 */
const getUsers = async (req, res) => {
  const { role_code, keyword, status, page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = '1=1';
  const params = [];
  if (role_code) { where += ' AND r.role_code = ?'; params.push(role_code); }
  if (keyword)   { where += ' AND (u.username LIKE ? OR u.email LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  if (status !== undefined && status !== '') { where += ' AND u.status = ?'; params.push(status); }

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM sys_users u JOIN sys_roles r ON u.role_id = r.id WHERE ${where}`, params
    );
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.phone, u.status, u.avatar, u.created_at,
              r.role_name, r.role_code
       FROM sys_users u JOIN sys_roles r ON u.role_id = r.id
       WHERE ${where}
       ORDER BY u.id ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );
    return res.json({
      code: 0, message: 'success',
      data: { list: rows, pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) } },
    });
  } catch (err) {
    console.error('[getUsers]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/admin/users/:id/status
 */
const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (![0, 1].includes(Number(status))) return fail(res, '无效的状态值');
  if (parseInt(id) === req.user.id) return fail(res, '不能禁用自己');

  try {
    await db.query('UPDATE sys_users SET status = ? WHERE id = ?', [status, id]);
    return success(res, null, status == 1 ? '账户已启用' : '账户已禁用');
  } catch (err) {
    console.error('[toggleUserStatus]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return fail(res, '不能删除自己');

  try {
    await db.query('DELETE FROM sys_users WHERE id = ?', [id]);
    return success(res, null, '用户已删除');
  } catch (err) {
    console.error('[deleteUser]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * POST /api/admin/users  (管理员创建账号)
 */
const createUser = async (req, res) => {
  const { username, password, email, role_code } = req.body;
  if (!username || !password || !role_code) return fail(res, '必填参数缺失');

  try {
    const [[role]] = await db.query('SELECT id FROM sys_roles WHERE role_code = ?', [role_code]);
    if (!role) return fail(res, '角色不存在');

    const [[existing]] = await db.query('SELECT id FROM sys_users WHERE username = ?', [username]);
    if (existing) return fail(res, '用户名已被占用');

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO sys_users (username, password, email, role_id) VALUES (?,?,?,?)',
      [username, hashed, email || null, role.id]
    );

    // 自动创建子档案
    const uid = result.insertId;
    if (role_code === 'student') {
      await db.query('INSERT INTO biz_student_profiles (user_id) VALUES (?)', [uid]);
    } else if (role_code === 'enterprise') {
      await db.query('INSERT INTO biz_enterprises (user_id, company_name) VALUES (?,?)', [uid, username]);
    }

    return success(res, { id: uid }, '用户创建成功', 201);
  } catch (err) {
    console.error('[createUser]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/admin/users/:id/reset-password
 */
const resetPassword = async (req, res) => {
  const { id } = req.params;
  const defaultPwd = '12345678';

  try {
    const hashed = await bcrypt.hash(defaultPwd, 10);
    await db.query('UPDATE sys_users SET password = ? WHERE id = ?', [hashed, id]);

    // 🚀 发送消息通知用户
    await db.query(
      'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
      [
        id,
        '账户密码重置提醒',
        '您的账户密码已被管理员重置为初始密码：12345678。为了您的账户安全，建议您登录后尽快前往“账户设置”修改密码。'
      ]
    );

    return success(res, null, '密码已重置为 12345678，并已下发消息通知');
  } catch (err) {
    console.error('[resetPassword]', err);
    return fail(res, '服务器错误', 500);
  }
};

// ─── 企业审核 ────────────────────────────────────────────────
/**
 * GET /api/admin/enterprises?verify_status=&page=&pageSize=
 */
const getEnterprises = async (req, res) => {
  const { verify_status, keyword, page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = '1=1';
  const params = [];
  if (verify_status) { where += ' AND e.verify_status = ?'; params.push(verify_status); }
  if (keyword)       { where += ' AND e.company_name LIKE ?'; params.push(`%${keyword}%`); }

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM biz_enterprises e WHERE ${where}`, params
    );
    const [rows] = await db.query(
      `SELECT e.*, u.username, u.email
       FROM biz_enterprises e JOIN sys_users u ON e.user_id = u.id
       WHERE ${where}
       ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );
    return res.json({
      code: 0, message: 'success',
      data: { list: rows, pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) } },
    });
  } catch (err) {
    console.error('[getEnterprises]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/admin/enterprises/:id/verify
 */
const verifyEnterprise = async (req, res) => {
  const { id } = req.params;
  const { verify_status, verify_remark } = req.body;
  if (!['approved', 'rejected'].includes(verify_status)) return fail(res, '无效的审核状态');

  try {
    await db.query(
      'UPDATE biz_enterprises SET verify_status=?, verify_remark=? WHERE id=?',
      [verify_status, verify_remark || null, id]
    );

    // 发送消息给企业
    const [[ent]] = await db.query('SELECT user_id, company_name FROM biz_enterprises WHERE id = ?', [id]);
    if (ent) {
      const statusText = verify_status === 'approved' ? '已通过' : '被驳回';
      let content = `您提交的企业资质审核结果：${statusText}。`;
      if (verify_remark) content += ` 备注：${verify_remark}`;

      await db.query(
        'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
        [ent.user_id, '企业资质审核通知', content]
      );
    }

    return success(res, null, verify_status === 'approved' ? '企业审核通过' : '企业审核驳回');
  } catch (err) {
    console.error('[verifyEnterprise]', err);
    return fail(res, '服务器错误', 500);
  }
};

// ─── 系统统计 ────────────────────────────────────────────────
/**
 * GET /api/admin/stats
 */
const getStats = async (req, res) => {
  try {
    const [[userCount]]  = await db.query('SELECT COUNT(*) AS cnt FROM sys_users');
    const [[stuCount]]   = await db.query('SELECT COUNT(*) AS cnt FROM biz_student_profiles');
    const [[entCount]]   = await db.query('SELECT COUNT(*) AS cnt FROM biz_enterprises WHERE verify_status="approved"');
    const [[jobCount]]   = await db.query('SELECT COUNT(*) AS cnt FROM biz_jobs WHERE status="open"');
    const [[appCount]]   = await db.query('SELECT COUNT(*) AS cnt FROM biz_applications');
    const [[signedCount]]= await db.query('SELECT COUNT(*) AS cnt FROM biz_applications WHERE status="signed"');

    return success(res, {
      userCount:   userCount.cnt,
      stuCount:    stuCount.cnt,
      entCount:    entCount.cnt,
      jobCount:    jobCount.cnt,
      appCount:    appCount.cnt,
      signedCount: signedCount.cnt,
    });
  } catch (err) {
    console.error('[getStats]', err);
    return fail(res, '服务器错误', 500);
  }
};

module.exports = {
  getUsers, toggleUserStatus, deleteUser, createUser, resetPassword,
  getEnterprises, verifyEnterprise,
  getStats,
};
