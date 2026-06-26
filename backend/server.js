require('dotenv').config();
const app = require('./src/app');
const fs = require('fs');
const path = require('path');

// 确保 uploads 目录存在
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 职引星后端服务已启动: http://localhost:${PORT}`);
  console.log(`📋 API 文档: http://localhost:${PORT}/api/ping`);
});
