const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/studentController');
const authenticate = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('只允许上传 PDF/Word 格式的简历'));
    }
    cb(null, true);
  },
});

// 统一鉴权
router.use(authenticate);

// 档案 - 仅限学生
router.get('/profile',   requireRole('student'), ctrl.getProfile);
router.put('/profile',   requireRole('student'), ctrl.updateProfile);

// 简历 - 仅限学生
router.get('/resumes',                  requireRole('student'), ctrl.getResumes);
router.post('/resumes',       upload.single('file'), requireRole('student'), ctrl.uploadResume);
router.delete('/resumes/:id',           requireRole('student'), ctrl.deleteResume);
router.get('/resumes/:id/diagnosis',   requireRole('student'), ctrl.getResumeDiagnosis);
router.put('/resumes/:id/default',      requireRole('student'), ctrl.setDefaultResume);

// 岗位浏览 - 允许学生和高校管理员
router.get('/jobs',       requireRole(['student', 'school']), ctrl.getJobs);
router.get('/jobs/:id',   requireRole(['student', 'school']), ctrl.getJobDetail);

// 投递与申请 - 仅限学生
router.post('/applications',   requireRole('student'), ctrl.applyJob);
router.get('/applications',    requireRole('student'), ctrl.getMyApplications);
router.get('/contracts',       requireRole('student'), ctrl.getMyContracts);
router.put('/applications/:id/resign', requireRole('student'), ctrl.resignFromJob);

// 区块链核验
const blockchainCtrl = require('../controllers/blockchainController');
router.get('/blockchain/verify/:txHash', blockchainCtrl.verifyTransaction);

module.exports = router;
