const db = require('../config/db');
const { success, fail } = require('../utils/response');

/**
 * GET /api/school/dashboard
 * 高校就业大屏数据 (包含数据隔离逻辑)
 */
const getDashboard = async (req, res) => {
  try {
    let studentFilter = ' 1=1 ';
    let filterParams = [];

    // 【数据隔离逻辑】如果当前是高校管理员，只能查询本校学生
    if (req.user.role_code === 'school') {
      const [[profile]] = await db.query('SELECT school_name FROM biz_school_profiles WHERE user_id = ?', [req.user.id]);
      if (!profile) return fail(res, '该账号未绑定学校，无法获取统计数据', 404);
      
      studentFilter = ' p.school_name = ? ';
      filterParams.push(profile.school_name);
    }

    // 1. 各专业就业率（已签约/总投递） - 带过滤
    const [majorStats] = await db.query(`
      SELECT p.major,
        COUNT(a.id) AS total_apply,
        SUM(CASE WHEN a.status = 'signed' THEN 1 ELSE 0 END) AS signed_count
      FROM biz_applications a
      JOIN biz_student_profiles p ON a.student_user_id = p.user_id
      WHERE p.major IS NOT NULL AND ${studentFilter}
      GROUP BY p.major
      ORDER BY total_apply DESC
      LIMIT 10
    `, filterParams);

    // 2. 近7天投递趋势 - 带过滤
    const [applyTrend] = await db.query(`
      SELECT DATE(a.applied_at) AS date, COUNT(*) AS cnt
      FROM biz_applications a
      JOIN biz_student_profiles p ON a.student_user_id = p.user_id
      WHERE a.applied_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND ${studentFilter}
      GROUP BY DATE(a.applied_at)
      ORDER BY date
    `, filterParams);

    // 3. 学历分布 - 带过滤
    const [degreeDist] = await db.query(`
      SELECT p.degree, COUNT(*) AS cnt
      FROM biz_student_profiles p
      WHERE p.degree IS NOT NULL AND ${studentFilter}
      GROUP BY p.degree
    `, filterParams);

    // 4. 汇总数字计算 - 带过滤（除岗位、企业外）
    const [[{ total_students }]] = await db.query(
      `SELECT COUNT(*) AS total_students FROM biz_student_profiles p WHERE ${studentFilter}`,
      filterParams
    );
    
    const [[{ total_signed }]] = await db.query(
      `SELECT COUNT(*) AS total_signed 
       FROM biz_applications a 
       JOIN biz_student_profiles p ON a.student_user_id = p.user_id 
       WHERE a.status="signed" AND ${studentFilter}`,
      filterParams
    );

    // ── 以下大盘公域数据（全平台开放可见） ──

    const [[{ total_jobs }]] = await db.query('SELECT COUNT(*) AS total_jobs FROM biz_jobs WHERE status="open"');
    const [[{ total_enterprises }]] = await db.query('SELECT COUNT(*) AS total_enterprises FROM biz_enterprises WHERE verify_status="approved"');

    // 岗位薪资分布（公域）
    const [salaryDist] = await db.query(`
      SELECT
        CASE
          WHEN salary_max <= 5000  THEN '5K以下'
          WHEN salary_max <= 8000  THEN '5K-8K'
          WHEN salary_max <= 12000 THEN '8K-12K'
          WHEN salary_max <= 20000 THEN '12K-20K'
          ELSE '20K以上'
        END AS range_label,
        COUNT(*) AS job_count
      FROM biz_jobs
      WHERE status = 'open' AND salary_max IS NOT NULL
      GROUP BY range_label
    `);

    // 8. 岗位类型分布及平均薪资（人才缺口计算）
    const [jobTypeDist] = await db.query(`
      SELECT 
        job_type, 
        COUNT(*) AS cnt,
        AVG(salary_max) / 1000 AS avg_salary
      FROM biz_jobs 
      WHERE status = 'open'
      GROUP BY job_type
    `);

    return success(res, {
      summary: { total_students, total_jobs, total_signed, total_enterprises },
      majorStats,
      salaryDist,
      jobTypeDist,
      applyTrend,
      degreeDist,
    });
  } catch (err) {
    console.error('[getDashboard]', err);
    return fail(res, '服务器错误', 500);
  }
};

module.exports = { getDashboard };
