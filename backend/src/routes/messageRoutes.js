const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {
  getMessages,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require('../controllers/messageController');

// 所有消息相关接口都需要登录
router.use(auth);

// 获取消息列表
router.get('/', getMessages);

// 获取未读消息数量
router.get('/unread-count', getUnreadCount);

// 一键标记所有未读为已读
router.put('/read-all', markAllAsRead);

// 标记单条消息为已读
router.put('/:id/read', markAsRead);

module.exports = router;
