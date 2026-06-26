const router = require('express').Router();
const ctrl = require('../controllers/enterpriseController');
const authenticate = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const multer = require('multer');
const path = require('path');

// multer 配置 - 合同上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads/contracts'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `contract_${req.params.applicationId}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('只允许上传 PDF/Word 格式的合同'));
    }
    cb(null, true);
  },
});

router.use(authenticate, requireRole('enterprise'));

// 企业信息
router.get('/profile',    ctrl.getEnterpriseProfile);
router.put('/profile',    ctrl.updateEnterpriseProfile);

// 岗位管理
router.get('/jobs',       ctrl.getMyJobs);
router.post('/jobs',      ctrl.createJob);
router.put('/jobs/:id',   ctrl.updateJob);
router.delete('/jobs/:id', ctrl.deleteJob);

// 投递管理
router.get('/applications',                       ctrl.getApplications);
router.put('/applications/:id/status',           ctrl.updateApplicationStatus);
router.put('/applications/:id/dismiss',          ctrl.dismissStudent);

// 合同上传
router.post('/contracts/:applicationId/upload', upload.single('file'), ctrl.uploadContract);

module.exports = router;
