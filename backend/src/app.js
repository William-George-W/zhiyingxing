require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://zhiyinxing.vercel.app',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, '')) : []),
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is explicitly allowed or matches wildcards/patterns for development/previews
    const isAllowed = allowedOrigins.has(origin) || 
                      origin.endsWith('.vercel.app') || 
                      origin.endsWith('.render.com') ||
                      /^http:\/\/localhost(:\d+)?$/.test(origin) || 
                      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    }
    
    // Log blocked origin but do not pass an error to callback to avoid a 500 crash
    console.warn(`[CORS] Rejected origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的简历等）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── 路由 ─────────────────────────────────────────────────────
// 静态资源访问
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth',       require('./routes/auth.routes'));
app.use('/api/student',    require('./routes/student.routes'));
app.use('/api/enterprise', require('./routes/enterprise.routes'));
app.use('/api/admin',      require('./routes/admin.routes'));
app.use('/api/school',     require('./routes/school.routes'));
app.use('/api/messages',   require('./routes/messageRoutes'));
app.use('/api/chat',       require('./routes/chat.routes'));

// ─── Ping ─────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.json({ code: 0, message: 'pong', timestamp: new Date().toISOString() });
});

app.get('/api/debug-cors', (req, res) => {
  res.json({
    code: 0,
    frontendUrlEnv: process.env.FRONTEND_URL || null,
    allowedOrigins: Array.from(allowedOrigins)
  });
});

// ─── 全局错误处理 ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: -1, message: '文件过大，最大支持 10MB', data: null });
  }
  if (err.message && err.message.includes('只允许上传')) {
    return res.status(400).json({ code: -1, message: err.message, data: null });
  }

  res.status(500).json({ code: -1, message: '服务器内部错误', data: null });
});

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ code: 404, message: `接口 ${req.path} 不存在`, data: null });
});

module.exports = app;
