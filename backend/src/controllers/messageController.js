const db = require('../config/db');
const { success, fail } = require('../utils/response');

/**
 * GET /api/messages
 * 获取当前用户的消息列表
 */
const getMessages = async (req, res) => {
  const { is_read, page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  
  try {
    let where = 'user_id = ?';
    const params = [req.user.id];
    
    if (is_read !== undefined) {
      where += ' AND is_read = ?';
      params.push(parseInt(is_read));
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM sys_messages WHERE ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT * FROM sys_messages WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    return res.json({
      code: 0,
      message: 'success',
      data: {
        list: rows,
        pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) },
      },
    });
  } catch (err) {
    console.error('[getMessages]', err);
    return fail(res, '获取消息失败', 500);
  }
};

/**
 * GET /api/messages/unread-count
 * 获取当前用户的未读消息数量
 */
const getUnreadCount = async (req, res) => {
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM sys_messages WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    return success(res, { count });
  } catch (err) {
    console.error('[getUnreadCount]', err);
    return fail(res, '获取未读数量失败', 500);
  }
};

/**
 * PUT /api/messages/:id/read
 * 标记指定消息为已读
 */
const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE sys_messages SET is_read = 1 WHERE id = ? AND user_id = ?', [
      id,
      req.user.id,
    ]);
    return success(res, null, '已标记为已读');
  } catch (err) {
    console.error('[markAsRead]', err);
    return fail(res, '标记失败', 500);
  }
};

/**
 * PUT /api/messages/read-all
 * 标记所有消息为已读
 */
const markAllAsRead = async (req, res) => {
  try {
    await db.query('UPDATE sys_messages SET is_read = 1 WHERE user_id = ? AND is_read = 0', [
      req.user.id,
    ]);
    return success(res, null, '全部标记为已读成功');
  } catch (err) {
    console.error('[markAllAsRead]', err);
    return fail(res, '标记失败', 500);
  }
};

module.exports = {
  getMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
