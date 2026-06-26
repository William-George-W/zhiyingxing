const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host:              process.env.DB_HOST     || '127.0.0.1',
  port:              parseInt(process.env.DB_PORT) || 3306,
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASSWORD || '',
  database:          process.env.DB_NAME     || 'zhiyinxing',
  waitForConnections: true,
  connectionLimit:   10,
  charset:           'utf8mb4',
  timezone:          '+08:00',
  connectTimeout:    10000, 
};

console.log(`[Database] 正在尝试连接 MySQL: ${dbConfig.host}:${dbConfig.port}, 用户: ${dbConfig.user}, 数据库: ${dbConfig.database}`);

const pool = mysql.createPool(dbConfig);

// 验证连接并带重试机制
const checkConnection = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('✅ MySQL 数据库连接成功');
      conn.release();
      return;
    } catch (err) {
      console.error(`⚠️ MySQL 连接尝试 (${i + 1}/${retries}) 失败: ${err.message}`);
      if (i === retries - 1) {
        console.error('❌ MySQL 最终连接失败，请检查服务状态！');
        process.exit(1);
      }
      // 等待 3 秒后重试
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

checkConnection();

module.exports = pool;
