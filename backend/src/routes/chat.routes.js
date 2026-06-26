const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const authenticate = require('../middlewares/auth');

router.use(authenticate);

// 获取联系人列表
router.get('/contacts', ctrl.getContacts);

// 获取聊天记录 (已对 contactId 做已读处理)
router.get('/messages/:contactId', ctrl.getMessages);

// 发送消息
router.post('/send', ctrl.sendMessage);

// 发起好友申请
router.post('/friend-request', ctrl.sendFriendRequest);

// 获取我的收到的申请列表
router.get('/friend-requests', ctrl.getFriendRequests);

// 处理好友申请 (同意/拒绝)
router.post('/handle-friend-request', ctrl.handleFriendRequest);

// 获取可发起对话的高校或企业
router.get('/discoverable', ctrl.getDiscoverableContacts);

// 按用户名搜索用户
router.get('/search/:username', ctrl.searchUserByUsername);

// 获取所在学校的可推荐学生
router.get('/recommendable-students', ctrl.getRecommendableStudents);

// 管理员专供：消息回档
router.post('/admin/restore', ctrl.restoreChat);

// 清除会话 (软删除)
router.post('/delete-session', ctrl.deleteSession);

// 下载简历附件 (带原始名)
router.get('/download-resume/:id', ctrl.downloadResume);

module.exports = router;
