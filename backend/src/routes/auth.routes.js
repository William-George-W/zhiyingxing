const router = require('express').Router();
const ctrl = require('../controllers/authController');
const authenticate = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// 💡 头像上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 限制 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  },
});

router.post('/register',         ctrl.register);
router.post('/login',            ctrl.login);
router.post('/send-code',        ctrl.sendEmailCode);
router.post('/login-code',       ctrl.loginWithCode);
router.get('/me',    authenticate, ctrl.getMe);
router.put('/change-password', authenticate, ctrl.changePassword);
router.put('/profile',         authenticate, ctrl.updateProfile);
router.post('/upload-avatar',  authenticate, upload.single('file'), ctrl.uploadAvatar);

module.exports = router;
