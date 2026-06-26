const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { success, fail } = require('../utils/response');
const { sendVerifyCode } = require('../utils/mailUtils');

/**
 * POST /api/auth/register
 * 注册（学生 / 企业HR）
 */
const register = async (req, res) => {
  const { username: rawUsername, password: rawPassword, email, phone, role_code } = req.body;
  const username = (rawUsername || '').trim();
  const password = (rawPassword || '').trim();

  if (!username || !password || !role_code) {
    return fail(res, '用户名、密码和角色为必填项');
  }
  // 只允许注册学生和企业
  if (!['student', 'enterprise'].includes(role_code)) {
    return fail(res, '非法的注册角色');
  }

  try {
    // 查角色ID
    const [[role]] = await db.query('SELECT id FROM sys_roles WHERE role_code = ?', [role_code]);
    if (!role) return fail(res, '角色不存在');

    // 检查用户名是否重复
    const [[existing]] = await db.query('SELECT id FROM sys_users WHERE username = ?', [username]);
    if (existing) return fail(res, '用户名已被占用');

    // 检查邮箱是否重复（仅在填写邮箱时校验）
    if (email && email.trim()) {
      const [[emailExists]] = await db.query('SELECT id FROM sys_users WHERE email = ?', [email.trim()]);
      if (emailExists) return fail(res, '该邮箱已被其他账号使用');
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO sys_users (username, password, email, phone, role_id) VALUES (?, ?, ?, ?, ?)',
      [username, hashed, email || null, phone || null, role.id]
    );
    const newUserId = result.insertId;

    // 自动创建对应档案
    if (role_code === 'student') {
      await db.query('INSERT INTO biz_student_profiles (user_id) VALUES (?)', [newUserId]);
    } else if (role_code === 'enterprise') {
      await db.query(
        'INSERT INTO biz_enterprises (user_id, company_name) VALUES (?, ?)',
        [newUserId, username + '的企业']
      );

      // 🚀 发送消息给管理员提醒审核
      try {
        const [admins] = await db.query(
          'SELECT u.id FROM sys_users u JOIN sys_roles r ON u.role_id = r.id WHERE r.role_code = "admin"'
        );
        for (const admin of admins) {
          await db.query(
            'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
            [admin.id, '新企业注册待审核', `有新的企业“${username}”注册，请及时登录后台进行资质审核。`]
          );
        }
      } catch (msgErr) {
        console.warn('[register] 发送管理员通知失败:', msgErr.message);
      }
    }

    return success(res, { id: newUserId }, '注册成功', 201);
  } catch (err) {
    console.error('[register]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { username: rawUsername, password: rawPassword } = req.body;
  const username = (rawUsername || '').trim();
  const password = (rawPassword || '').trim();
  if (!username || !password) {
    return fail(res, '用户名和密码不能为空');
  }

  try {
    const [[user]] = await db.query(
      `SELECT u.id, u.username, u.password, u.email, u.phone, u.status, u.avatar,
              u.role_id, r.role_code, r.role_name,
              COALESCE(bsp.school_name, be.company_name, bst.school_name) AS org_name
       FROM sys_users u
       JOIN sys_roles r ON u.role_id = r.id
       LEFT JOIN biz_school_profiles bsp ON u.id = bsp.user_id
       LEFT JOIN biz_enterprises be ON u.id = be.user_id
       LEFT JOIN biz_student_profiles bst ON u.id = bst.user_id
       WHERE u.username = ? OR u.email = ?`,
      [username, username]
    );

    if (!user) return fail(res, '用户名或密码错误', 401);
    if (user.status === 0) return fail(res, '账户已被禁用，请联系管理员', 403);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return fail(res, '用户名或密码错误', 401);

    const payload = {
      id:        user.id,
      username:  user.username,
      role_id:   user.role_id,
      role_code: user.role_code,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const { password: _pwd, ...userInfo } = user;
    return success(res, { token, user: userInfo }, '登录成功');
  } catch (err) {
    console.error('[login]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT u.id, u.username, u.email, u.phone, u.avatar, u.status,
              u.role_id, r.role_code, r.role_name, u.created_at,
              COALESCE(bsp.school_name, be.company_name, bst.school_name) AS org_name
       FROM sys_users u
       JOIN sys_roles r ON u.role_id = r.id
       LEFT JOIN biz_school_profiles bsp ON u.id = bsp.user_id
       LEFT JOIN biz_enterprises be ON u.id = be.user_id
       LEFT JOIN biz_student_profiles bst ON u.id = bst.user_id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!user) return fail(res, '用户不存在', 404);
    return success(res, user);
  } catch (err) {
    console.error('[getMe]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return fail(res, '参数缺失');

  try {
    const [[user]] = await db.query('SELECT password FROM sys_users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return fail(res, '旧密码错误');

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE sys_users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    return success(res, null, '密码修改成功');
  } catch (err) {
    console.error('[changePassword]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/auth/profile
 * 更新个人核心资料（邮箱、手机号、头像）
 */
const updateProfile = async (req, res) => {
  const { email, phone, avatar } = req.body;
  try {
    // 检查邮箱冲突 - 更加健壮的检查逻辑
    const cleanEmail = (email || '').trim();
    if (cleanEmail) {
      const [[emailExists]] = await db.query(
        'SELECT id FROM sys_users WHERE email = ? AND id != ?', 
        [cleanEmail, req.user.id]
      );
      if (emailExists) return fail(res, '该邮箱已被其他账号占用');
    }

    const cleanPhone = (phone || '').trim();
    await db.query(
      'UPDATE sys_users SET email = ?, phone = ?, avatar = ?, updated_at = NOW() WHERE id = ?',
      [cleanEmail || null, cleanPhone || null, avatar || null, req.user.id]
    );

    // 🚀 如果是学生，同步更新学生档案表
    if (req.user.role_code === 'student') {
      await db.query(
        'UPDATE biz_student_profiles SET email = ?, phone = ? WHERE user_id = ?',
        [cleanEmail || null, cleanPhone || null, req.user.id]
      );
    }

    console.log(`[updateProfile] 用户 ID ${req.user.id} 资料更新成功`);
    return success(res, null, '个人资料已更新');
  } catch (err) {
    console.error('[updateProfile] 详细报错:', err);
    return fail(res, `更新失败: ${err.message}`, 500);
  }
};

/**
 * POST /api/auth/upload-avatar
 */
const uploadAvatar = async (req, res) => {
  if (!req.file) return fail(res, '请选择要上传的图片');
  try {
    // 构建相对路径 (供前端通过静态资源服务访问)
    const filePath = `/uploads/${req.file.filename}`;
    return success(res, { url: filePath }, '上传成功');
  } catch (err) {
    console.error('[uploadAvatar]', err);
    return fail(res, '上传失败', 500);
  }
};

/**
 * 发送邮箱验证码
 */
const sendEmailCode = async (req, res) => {
  const { email } = req.body;
  if (!email) return fail(res, '请输入邮箱');

  try {
    // 1. 检查用户是否存在
    const [[user]] = await db.query('SELECT id FROM sys_users WHERE email = ?', [email]);
    if (!user) return fail(res, '该邮箱未在系统中注册');

    // 2. 生成 6 位随机数
    const code = Math.random().toString().slice(-6);
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟后过期

    // 3. 更新到数据库
    await db.query(
      'UPDATE sys_users SET verify_code = ?, verify_expires = ? WHERE id = ?',
      [code, expires, user.id]
    );

    // 4. 调用真实邮件服务
    await sendVerifyCode(email, code);

    return success(res, null, '验证码已发送至您的邮箱，请查看');
  } catch (err) {
    console.error('[sendEmailCode]', err);
    return fail(res, '发送失败，请稍后重试');
  }
};

/**
 * 验证码登录
 */
const loginWithCode = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return fail(res, '邮箱和验证码不能为空');

  try {
    const [[user]] = await db.query(
      `SELECT u.id, u.username, u.email, u.verify_code, u.verify_expires, u.status, u.avatar,
              u.role_id, r.role_code, r.role_name,
              COALESCE(bsp.school_name, be.company_name, bst.school_name) AS org_name
       FROM sys_users u
       JOIN sys_roles r ON u.role_id = r.id
       LEFT JOIN biz_school_profiles bsp ON u.id = bsp.user_id
       LEFT JOIN biz_enterprises be ON u.id = be.user_id
       LEFT JOIN biz_student_profiles bst ON u.id = bst.user_id
       WHERE u.email = ?`,
      [email]
    );

    if (!user) return fail(res, '用户不存在');
    if (user.status === 0) return fail(res, '账户已被禁用');

    // 校验验证码
    if (!user.verify_code || user.verify_code !== code) {
      return fail(res, '验证码错误');
    }

    // 校验过期
    if (new Date() > new Date(user.verify_expires)) {
      return fail(res, '验证码已过期，请重新获取');
    }

    // 清理验证码 (阅后即焚)
    await db.query('UPDATE sys_users SET verify_code = NULL, verify_expires = NULL WHERE id = ?', [user.id]);

    const payload = {
      id:        user.id,
      username:  user.username,
      role_id:   user.role_id,
      role_code: user.role_code,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return success(res, { token, user }, '登录成功');
  } catch (err) {
    console.error('[loginWithCode]', err);
    return fail(res, '登录失败');
  }
};

module.exports = { 
  register, login, getMe, changePassword, updateProfile, uploadAvatar,
  sendEmailCode, loginWithCode 
};
