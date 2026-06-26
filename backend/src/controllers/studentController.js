const db = require('../config/db');
const { success, fail } = require('../utils/response');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { extractText } = require('../utils/fileParser');
const blockchain = require('../utils/blockchain');
const aiService = require('../utils/aiService');

/**
 * 获取用户默认简历的文本内容（带文件存在性检查和自动回退）
 */
async function getDefaultResumeText(userId) {
  try {
    const [resumes] = await db.query(
      'SELECT id, file_path, is_default FROM biz_resumes WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    
    if (resumes.length === 0) return null;
    
    for (const resume of resumes) {
      const fullPath = path.join(process.cwd(), resume.file_path);
      if (fs.existsSync(fullPath)) {
        return await extractText(resume.file_path);
      }
    }
    return null;
  } catch (err) {
    console.warn('[getDefaultResumeText] 获取简历文本失败:', err.message);
    return null;
  }
}

// ─── 个人档案 ────────────────────────────────────────────────
/**
 * GET /api/student/profile
 */
const getProfile = async (req, res) => {
  try {
    const [[profile]] = await db.query(
      `SELECT p.*, u.username, u.avatar,
              COALESCE(u.phone, p.phone) AS phone,
              COALESCE(u.email, p.email) AS email,
              u.email AS account_email
       FROM sys_users u
       LEFT JOIN biz_student_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    // 即使 biz_student_profiles 中没有记录，LEFT JOIN 也会保证返回基础 username
    if (!profile) return fail(res, '用户不存在', 404);
    return success(res, profile);
  } catch (err) {
    console.error('[getProfile]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/student/profile
 */
const updateProfile = async (req, res) => {
  const {
    real_name, student_no, school_name, major, degree,
    graduation_year, gender, birth_date, phone, email,
    city, self_intro,
  } = req.body;

  try {
    await db.query(
      `INSERT INTO biz_student_profiles (
        user_id, real_name, student_no, school_name, major, degree,
        graduation_year, gender, birth_date, phone, email, city, self_intro
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        real_name=VALUES(real_name), student_no=VALUES(student_no),
        school_name=VALUES(school_name), major=VALUES(major), degree=VALUES(degree),
        graduation_year=VALUES(graduation_year), gender=VALUES(gender),
        birth_date=VALUES(birth_date), phone=VALUES(phone), email=VALUES(email),
        city=VALUES(city), self_intro=VALUES(self_intro)`,
      [
        req.user.id, real_name, student_no, school_name, major, degree,
        graduation_year || null, gender ?? null, birth_date || null,
        phone, email, city, self_intro
      ]
    );

    // 🚀 同步更新系统用户表中的核心字段，保持账户一致性
    if (phone || email) {
      await db.query(
        'UPDATE sys_users SET phone = IFNULL(?, phone), email = IFNULL(?, email) WHERE id = ?',
        [phone || null, email || null, req.user.id]
      );
    }

    return success(res, null, '档案更新成功并同步至账户');
  } catch (err) {
    console.error('[updateProfile]', err);
    return fail(res, '服务器错误', 500);
  }
};

// ─── 简历管理 ────────────────────────────────────────────────
/**
 * GET /api/student/resumes
 */
const getResumes = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, file_name, file_path, file_size, is_default, ai_skill_tags, created_at FROM biz_resumes WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    return success(res, rows);
  } catch (err) {
    console.error('[getResumes]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * GET /api/student/resumes/:id/diagnosis?targetJob=
 * 简历智能诊断与岗位推荐
 */
const getResumeDiagnosis = async (req, res) => {
  return fail(res, 'AI 简历诊断功能已下线', 403);
};

/**
 * POST /api/student/resumes  (multer 在路由层处理)
 */
const uploadResume = async (req, res) => {
  if (!req.file) return fail(res, '请上传文件');

  const { filename, size } = req.file;
  // Multer parses multipart form-data in latin1 by default, causing Chinese text garbling
  const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const filePath = `/uploads/${filename}`;

  try {
    // 第一份简历默认设为默认
    const [[countRow]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM biz_resumes WHERE user_id = ?',
      [req.user.id]
    );
    const isDefault = countRow.cnt === 0 ? 1 : 0;

    const [result] = await db.query(
      'INSERT INTO biz_resumes (user_id, file_name, file_path, file_size, is_default) VALUES (?,?,?,?,?)',
      [req.user.id, originalname, filePath, size, isDefault]
    );
    const resumeId = result.insertId;

    // 🚀 在后端控制台异步输出 AI 提取的结构化 JSON
    setTimeout(async () => {
      try {
        const absolutePath = path.join(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
          const text = await extractText(filePath);
          if (text) {
            console.log(`\n================ [后端显示] AI 提取简历 JSON ================`);
            const aiData = await aiService.extractResumeInfo(text);
            console.log(JSON.stringify(aiData, null, 2));
            console.log(`=============================================================\n`);
          }
        }
      } catch (err) {
        console.error('[AI] 提取失败:', err.message);
      }
    }, 0);

    return success(res, { id: resumeId, file_path: filePath }, '简历上传成功', 201);
  } catch (err) {
    console.error('[uploadResume]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * DELETE /api/student/resumes/:id
 */
const deleteResume = async (req, res) => {
  const { id } = req.params;
  try {
    const [[resume]] = await db.query(
      'SELECT * FROM biz_resumes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (!resume) return fail(res, '简历不存在', 404);

    // 🚀 检查该简历是否已有投递记录，如果有则不能删除以保持流程完整
    const [[usage]] = await db.query(
      'SELECT id FROM biz_applications WHERE resume_id = ? LIMIT 1',
      [id]
    );
    if (usage) {
      return fail(res, '该简历已有相关的投递记录，为保证流程完整性，暂不支持直接删除。', 400);
    }

    // 执行数据库删除
    await db.query('DELETE FROM biz_resumes WHERE id = ?', [id]);

    // 删除数据库成功后再删除磁盘文件，避免删错或数据库失败文件却没了
    const filePath = path.join(process.cwd(), resume.file_path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('[deleteResume] 文件物理删除失败:', e.message);
      }
    }

    // 如果删的是默认简历，把最新的一个设为默认
    if (resume.is_default) {
      await db.query(
        'UPDATE biz_resumes SET is_default = 1 WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
    }

    return success(res, null, '删除成功');
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return fail(res, '该简历正被某些申请记录引用，无法物理删除。', 400);
    }
    console.error('[deleteResume]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/student/resumes/:id/default
 */
const setDefaultResume = async (req, res) => {
  const { id } = req.params;
  try {
    const [[resume]] = await db.query(
      'SELECT id FROM biz_resumes WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (!resume) return fail(res, '简历不存在', 404);

    await db.query('UPDATE biz_resumes SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    await db.query('UPDATE biz_resumes SET is_default = 1 WHERE id = ?', [id]);
    return success(res, null, '默认简历已更新');
  } catch (err) {
    console.error('[setDefaultResume]', err);
    return fail(res, '服务器错误', 500);
  }
};

// ─── 岗位浏览 ────────────────────────────────────────────────
/**
 * GET /api/student/jobs?keyword=&city=&job_type=&page=&pageSize=
 */
const getJobs = async (req, res) => {
  const { keyword = '', city = '', job_type = '', page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = 'j.status = "open"';
  const params = [];

  if (keyword) {
    where += ' AND (j.title LIKE ? OR j.description LIKE ? OR e.company_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (city) { where += ' AND j.city = ?'; params.push(city); }
  if (job_type) { where += ' AND j.job_type = ?'; params.push(job_type); }

  try {
    // 基础过滤条件
    const baseQuery = `
      FROM biz_jobs j 
      JOIN biz_enterprises e ON j.enterprise_id = e.id 
      WHERE ${where} AND j.id NOT IN (
        SELECT job_id FROM (
          SELECT job_id, COUNT(*) as signed_count 
          FROM biz_applications 
          WHERE status = 'signed' 
          GROUP BY job_id
        ) as full_jobs 
        JOIN biz_jobs bj ON full_jobs.job_id = bj.id 
        WHERE full_jobs.signed_count >= bj.headcount
      )
    `;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total ${baseQuery}`,
      params
    );
    const [rows] = await db.query(
      `SELECT j.*, e.company_name, e.industry, e.logo, e.city AS company_city, e.scale
       ${baseQuery}
       ORDER BY j.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );


    return res.json({
      code: 0, message: 'success',
      data: { list: rows, pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) } },
    });
  } catch (err) {
    console.error('[getJobs]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * GET /api/student/jobs/:id
 */
const getJobDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const [[job]] = await db.query(
      `SELECT j.*, e.company_name, e.industry, e.scale, e.city AS company_city,
              e.address, e.website, e.description AS company_desc, e.logo,
              e.user_id AS hr_user_id
       FROM biz_jobs j JOIN biz_enterprises e ON j.enterprise_id = e.id
       WHERE j.id = ?`,
      [id]
    );
    if (!job) return fail(res, '岗位不存在', 404);
    // 增加浏览量：仅在岗位处于“招聘中”状态时增加
    if (job.status === 'open') {
      await db.query('UPDATE biz_jobs SET view_count = view_count + 1 WHERE id = ?', [id]);
    }


    return success(res, job);
  } catch (err) {
    console.error('[getJobDetail]', err);
    return fail(res, '服务器错误', 500);
  }
};

// ─── 投递管理 ────────────────────────────────────────────────
/**
 * POST /api/student/applications
 */
const applyJob = async (req, res) => {
  const { job_id, resume_id, cover_letter } = req.body;
  if (!job_id || !resume_id) return fail(res, '岗位ID和简历ID为必填');

  try {
    // 检查是否已投递，并获取最新状态
    const [[existing]] = await db.query(
      `SELECT a.status, j.allow_reapply 
       FROM biz_applications a 
       JOIN biz_jobs j ON a.job_id = j.id 
       WHERE a.student_user_id = ? AND a.job_id = ? 
       ORDER BY a.applied_at DESC LIMIT 1`,
      [req.user.id, job_id]
    );

    if (existing) {
      if (existing.status === 'signed') {
        return fail(res, '您已在该岗位入职，目前正处于合同存续期，无需重新投递。');
      }
      if (existing.status === 'dismissed') {
        return fail(res, '您曾被该企业辞退，根据其招聘规定，暂不支持重新投递该岗位。');
      }
      if (existing.status === 'resigned' || existing.status === 'rejected') {
        if (!existing.allow_reapply) {
          return fail(res, '该岗位目前不接受已离职或已淘汰人员的回流投递。');
        }
        // 如果允许重投，则记录该状态但不拦截，继续向下执行 INSERT
        console.log(`[applyJob] 允许离职人员 ${req.user.id} 重新投递岗位 ${job_id}`);
      } else {
        // 处于 screening, interview, offer 等中间状态
        return fail(res, '您已投递过该岗位，目前正在处理中，请耐心等待反馈。');
      }
    }

    // 验证简历归属
    const [[resume]] = await db.query(
      'SELECT id FROM biz_resumes WHERE id = ? AND user_id = ?',
      [resume_id, req.user.id]
    );
    if (!resume) return fail(res, '简历不存在');

    const [result] = await db.query(
      'INSERT INTO biz_applications (student_user_id, job_id, resume_id, cover_letter) VALUES (?,?,?,?)',
      [req.user.id, job_id, resume_id, cover_letter || null]
    );
    const applicationId = result.insertId;

    // 异步执行上链存证，携带更丰富的信息
    (async () => {
      try {
        // 1. 获取学生信息
        const [[student]] = await db.query(
          'SELECT real_name, school_name, major FROM biz_student_profiles WHERE user_id = ?',
          [req.user.id]
        );
        const [[user]] = await db.query('SELECT email FROM sys_users WHERE id = ?', [req.user.id]);

        // 2. 获取岗位与企业信息
        const [[job]] = await db.query(
          'SELECT j.title, j.city, j.salary_min, j.salary_max, e.company_name FROM biz_jobs j JOIN biz_enterprises e ON j.enterprise_id = e.id WHERE j.id = ?',
          [job_id]
        );

        // 3. 构造扩展元数据 JSON
        const richExtraData = JSON.stringify({
          student: {
            name: student?.real_name || 'Anonymous',
            email: user?.email || '',
            school: student?.school_name || ''
          },
          job: {
            title: job?.title || '',
            company: job?.company_name || '',
            city: job?.city || '',
            salary: `${job?.salary_min || 0}-${job?.salary_max || 0}`
          },
          appliedAt: new Date().toISOString()
        });

        const txHash = await blockchain.sendApplicationEvidence(
          applicationId,
          req.user.id,
          job_id,
          richExtraData
        );

        if (txHash) {
          await db.query(
            'UPDATE biz_applications SET tx_hash = ? WHERE id = ?',
            [txHash, applicationId]
          );
        }

        // 4. 🚀 核心新增：自动执行 AI 人岗匹配打分
        try {
          console.log(`[AI Scoring] 正在为投递记录 ${applicationId} 进行智能打分...`);
          // 获取简历文本内容
          const resumeText = await getDefaultResumeText(req.user.id);
          if (resumeText && job) {
            const matchResult = await aiService.calculateMatchScore(job, resumeText);
            await db.query(
              'UPDATE biz_applications SET match_score = ?, match_reason = ? WHERE id = ?',
              [matchResult.score, matchResult.reason, applicationId]
            );
            console.log(`[AI Scoring] 投递记录 ${applicationId} 打分完成: ${matchResult.score}`);
          }
        } catch (aiErr) {
          console.error('[AI Scoring] AI 打分失败:', aiErr.message);
        }
      } catch (e) {
        console.error('[applyJob] Background task failed:', e.message);
      }
    })();

    // 发送消息给企业HR
    try {
      const [[jobInfo]] = await db.query('SELECT enterprise_id, title FROM biz_jobs WHERE id = ?', [job_id]);
      if (jobInfo) {
        const [[ent]] = await db.query('SELECT user_id FROM biz_enterprises WHERE id = ?', [jobInfo.enterprise_id]);
        // 🚀 获取学生真实姓名
        const [[student]] = await db.query(
          'SELECT IFNULL(real_name, username) as display_name FROM sys_users u LEFT JOIN biz_student_profiles p ON u.id = p.user_id WHERE u.id = ?', 
          [req.user.id]
        );
        if (ent && student) {
          await db.query(
            'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
            [
              ent.user_id,
              '收到新投递',
              `学生【${student.display_name}】刚刚投递了您发布的岗位【${jobInfo.title}】，请及时前往简历收件箱查看。`
            ]
          );
        }
      }
    } catch (msgErr) {
      console.warn('[applyJob] 发送消息失败:', msgErr.message);
    }

    return success(res, { id: result.insertId }, '投递成功', 201);
  } catch (err) {
    console.error('[applyJob]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * GET /api/student/applications
 */
const getMyApplications = async (req, res) => {
  const { status, page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = 'a.student_user_id = ?';
  const params = [req.user.id];
  if (status) { where += ' AND a.status = ?'; params.push(status); }

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM biz_applications a WHERE ${where}`, params
    );
    const [rows] = await db.query(
      `SELECT a.*, j.title AS job_title, j.job_type, j.city,
              j.salary_min, j.salary_max, j.education_req, 
              j.description, j.requirements,
              e.company_name, e.logo,
              r.file_name AS resume_name
       FROM biz_applications a
       JOIN biz_jobs j ON a.job_id = j.id
       JOIN biz_enterprises e ON j.enterprise_id = e.id
       JOIN biz_resumes r ON a.resume_id = r.id
       WHERE ${where}
       ORDER BY a.applied_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );


    return res.json({
      code: 0, message: 'success',
      data: { list: rows, pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) } },
    });
  } catch (err) {
    console.error('[getMyApplications]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/student/applications/:id/resign
 * 学生辞职
 */
const resignFromJob = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return fail(res, '请填写辞职理由');

  try {
    const [[app]] = await db.query(
      'SELECT id, status FROM biz_applications WHERE id = ? AND student_user_id = ?',
      [id, req.user.id]
    );
    if (!app) return fail(res, '记录不存在或无权操作', 404);
    
    // 如果已经是辞职状态，直接返回成功，避免前端 404 或 报错
    if (app.status === 'resigned') {
      return success(res, null, '您已经辞职，无需重复操作');
    }
    
    if (app.status !== 'signed') return fail(res, '只有已签约状态才能申请辞职');

    await db.query(
      'UPDATE biz_applications SET status = "resigned", action_remark = ? WHERE id = ?',
      [reason, id]
    );

    // 发送消息提醒企业 HR
    const [[info]] = await db.query(
      `SELECT e.user_id, j.id as job_id, j.title, j.status as job_status, u.username as student_name
       FROM biz_applications a
       JOIN biz_jobs j ON a.job_id = j.id
       JOIN biz_enterprises e ON j.enterprise_id = e.id
       JOIN sys_users u ON a.student_user_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (info) {
      const { job_id, title, user_id } = info;
      // 🚀 获取真实姓名
      const [[student]] = await db.query(
        'SELECT IFNULL(real_name, username) as display_name FROM sys_users u LEFT JOIN biz_student_profiles p ON u.id = p.user_id WHERE u.id = ?', 
        [req.user.id]
      );
      const student_name = student ? student.display_name : '某位学生';

      // 计算剩余名额提示信息
      const [[{ signed_count }]] = await db.query(
        'SELECT COUNT(*) as signed_count FROM biz_applications WHERE job_id = ? AND status = "signed"',
        [job_id]
      );
      const [[{ headcount }]] = await db.query('SELECT headcount FROM biz_jobs WHERE id = ?', [job_id]);
      
      const vacancyTip = signed_count < headcount ? `【岗位名额已出现空缺 (${signed_count}/${headcount})，建议您及时查看并前往岗位管理进行修改或重新开启。】` : '';

      await db.query(
        'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
        [
          user_id,
          '学生离职及名额变动提醒',
          `学生【${student_name}】已从岗位【${title}】离职。${vacancyTip} 理由：${reason}`
        ]
      );
    }

    return success(res, null, '辞职成功');
  } catch (err) {
    console.error('[resignFromJob]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * GET /api/student/contracts
 * 获取我的签约岗位记录
 */
const getMyContracts = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT c.*, c.file_name, a.status AS app_status, 
              j.id AS job_id, j.title AS job_title, j.city AS job_city, 
              j.salary_min, j.salary_max, j.job_type,
              e.company_name, e.logo AS company_logo
       FROM biz_contracts c
       JOIN biz_applications a ON c.application_id = a.id
       JOIN biz_jobs j ON a.job_id = j.id
       JOIN biz_enterprises e ON j.enterprise_id = e.id
       WHERE c.student_user_id = ?
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return success(res, rows);
  } catch (err) {
    console.error('[getMyContracts]', err);
    return fail(res, '服务器错误', 500);
  }
};

module.exports = {
  getProfile, updateProfile,
  getResumes, uploadResume, deleteResume, setDefaultResume,
  getJobs, getJobDetail,
  applyJob, getMyApplications,
  resignFromJob, getResumeDiagnosis,
  getMyContracts
};
