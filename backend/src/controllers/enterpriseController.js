const db = require('../config/db');
const { success, fail } = require('../utils/response');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { extractText } = require('../utils/fileParser');
const aiService = require('../utils/aiService');

// ─── 企业信息 ────────────────────────────────────────────────
/**
 * GET /api/enterprise/profile
 */
const getEnterpriseProfile = async (req, res) => {
  try {
    const [[enterprise]] = await db.query(
      `SELECT e.*, u.username, u.email AS account_email
       FROM sys_users u
       LEFT JOIN biz_enterprises e ON e.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!enterprise) return fail(res, '用户不存在', 404);
    return success(res, enterprise);
  } catch (err) {
    console.error('[getEnterpriseProfile]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/enterprise/profile
 */
const updateEnterpriseProfile = async (req, res) => {
  const { company_name, industry, scale, city, address, website, description } = req.body;
  if (!company_name) return fail(res, '企业名称为必填');

  try {
    await db.query(
      `INSERT INTO biz_enterprises (
        user_id, company_name, industry, scale, city, address, website, description, verify_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE
        company_name=VALUES(company_name), industry=VALUES(industry),
        scale=VALUES(scale), city=VALUES(city), address=VALUES(address),
        website=VALUES(website), description=VALUES(description),
        verify_status='pending'`,
      [req.user.id, company_name, industry, scale, city, address, website, description]
    );

    // 🚀 发送消息给管理员提醒审核
    try {
      const [admins] = await db.query(
        'SELECT u.id FROM sys_users u JOIN sys_roles r ON u.role_id = r.id WHERE r.role_code = "admin"'
      );
      for (const admin of admins) {
        await db.query(
          'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
          [
            admin.id, 
            '企业资料更新待审核', 
            `企业【${company_name}】已更新企业资料并重新提交审核，请及时登录后台进行资质认定。`
          ]
        );
      }
    } catch (msgErr) {
      console.warn('[updateEnterpriseProfile] 发送管理员通知失败:', msgErr.message);
    }

    return success(res, null, '企业信息已保存，等待管理员审核');
  } catch (err) {
    console.error('[updateEnterpriseProfile]', err);
    return fail(res, '服务器错误', 500);
  }
};

// ─── 岗位管理 ────────────────────────────────────────────────
/**
 * GET /api/enterprise/jobs?status=&page=&pageSize=
 */
const getMyJobs = async (req, res) => {
  const { status, page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  try {
    // 先拿企业ID
    const [[ent]] = await db.query('SELECT id FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    if (!ent) return fail(res, '请先完善企业信息', 400);

    let where = 'enterprise_id = ?';
    const params = [ent.id];
    if (status) { where += ' AND status = ?'; params.push(status); }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM biz_jobs WHERE ${where}`, params
    );
    const [rows] = await db.query(
      `SELECT j.*,
        (SELECT COUNT(*) FROM biz_applications a WHERE a.job_id = j.id) AS apply_count,
        (SELECT COUNT(*) FROM biz_applications a WHERE a.job_id = j.id AND a.status = 'signed') AS signed_count
       FROM biz_jobs j WHERE ${where}
       ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );
    return res.json({
      code: 0, message: 'success',
      data: { list: rows, pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) } },
    });
  } catch (err) {
    console.error('[getMyJobs]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * POST /api/enterprise/jobs
 */
const createJob = async (req, res) => {
  const { title, description, requirements, salary_min, salary_max, 
          city, job_type, education_req, major_req, headcount, deadline, status, allow_reapply } = req.body;
  if (!title) return fail(res, '岗位名称为必填');

  try {
    const [[ent]] = await db.query('SELECT id, verify_status FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    if (!ent) return fail(res, '请先完善企业信息');
    if (ent.verify_status !== 'approved') return fail(res, '企业尚未通过审核，暂不能发布岗位');

    const [result] = await db.query(
      `INSERT INTO biz_jobs 
        (enterprise_id, title, description, requirements, salary_min, salary_max,
         city, job_type, education_req, major_req, headcount, deadline, allow_reapply, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [ent.id, title, description, requirements, salary_min || null,
       salary_max || null, city, job_type || '全职', education_req || '不限',
       major_req, headcount || 1, deadline || null, allow_reapply === undefined ? 1 : allow_reapply, status || 'open']
    );
    return success(res, { id: result.insertId }, '岗位发布成功', 201);
  } catch (err) {
    console.error('[createJob]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/enterprise/jobs/:id
 */
const updateJob = async (req, res) => {
  const { id } = req.params;
  const { title, description, requirements, salary_min, salary_max,
          city, job_type, education_req, major_req, headcount, status, deadline, allow_reapply } = req.body;

  try {
    const [[ent]] = await db.query('SELECT id FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    const [[job]] = await db.query('SELECT id FROM biz_jobs WHERE id = ? AND enterprise_id = ?', [id, ent.id]);
    if (!job) return fail(res, '岗位不存在或无权操作', 404);

    let sql = `UPDATE biz_jobs SET title=?, description=?, requirements=?, salary_min=?,
        salary_max=?, city=?, job_type=?, education_req=?, major_req=?,
        headcount=?, status=?, deadline=?, allow_reapply=?
       WHERE id=?`;
    const params = [title, description, requirements, salary_min,
        salary_max, city, job_type, education_req, major_req,
        headcount, status || 'open', deadline || null, allow_reapply === undefined ? 1 : allow_reapply, id];
    
    await db.query(sql, params);
    return success(res, null, '岗位更新成功');
  } catch (err) {
    console.error('[updateJob]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * DELETE /api/enterprise/jobs/:id
 */
const deleteJob = async (req, res) => {
  const { id } = req.params;
  try {
    const [[ent]] = await db.query('SELECT id FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    const [[job]] = await db.query('SELECT id FROM biz_jobs WHERE id = ? AND enterprise_id = ?', [id, ent.id]);
    if (!job) return fail(res, '岗位不存在或无权操作', 404);

    await db.query('UPDATE biz_jobs SET status = "closed" WHERE id = ?', [id]);
    return success(res, null, '岗位已关闭');
  } catch (err) {
    console.error('[deleteJob]', err);
    return fail(res, '服务器错误', 500);
  }
};

// ─── 简历管理 / 流程推进 ─────────────────────────────────────
/**
 * GET /api/enterprise/applications?job_id=&status=&page=&pageSize=
 */
const getApplications = async (req, res) => {
  const { job_id, status, page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  try {
    const [[ent]] = await db.query('SELECT id FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    if (!ent) return fail(res, '企业信息不存在', 404);

    let where = 'j.enterprise_id = ?';
    const params = [ent.id];
    if (job_id) { where += ' AND a.job_id = ?'; params.push(job_id); }
    if (status) {
      if (status === 'offboarded') {
        where += ' AND a.status IN ("resigned", "dismissed")';
      } else {
        where += ' AND a.status = ?';
        params.push(status);
      }
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM biz_applications a
       JOIN biz_jobs j ON a.job_id = j.id WHERE ${where}`, params
    );
    const [rows] = await db.query(
      `SELECT a.*, j.title AS job_title, j.city, j.description AS job_desc,
              j.requirements, j.education_req, j.salary_min, j.salary_max,
              p.real_name, p.school_name, p.major, p.degree, p.graduation_year,
              r.file_name AS resume_name, r.file_path AS resume_path, r.ai_skill_tags,
              u.username, u.email AS student_email,
              a.match_score, a.match_reason,
              (SELECT COUNT(*) FROM biz_applications b WHERE b.student_user_id = a.student_user_id AND b.status = 'signed') > 0 AS is_in_service
       FROM biz_applications a
       JOIN biz_jobs j ON a.job_id = j.id
       JOIN biz_student_profiles p ON a.student_user_id = p.user_id
       JOIN biz_resumes r ON a.resume_id = r.id
       JOIN sys_users u ON a.student_user_id = u.id
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
    console.error('[getApplications]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/enterprise/applications/:id/status
 * 推进状态机
 */
const updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, enterprise_remark, interview_time } = req.body;

  const validStatuses = ['screening', 'passed', 'interviewing', 'offered', 'signed', 'rejected'];
  if (!validStatuses.includes(status)) return fail(res, '无效的状态值');

  try {
    const [[ent]] = await db.query('SELECT id, company_name FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    const [[app]] = await db.query(
      `SELECT a.id, a.student_user_id, j.title FROM biz_applications a
       JOIN biz_jobs j ON a.job_id = j.id
       WHERE a.id = ? AND j.enterprise_id = ?`,
      [id, ent.id]
    );
    if (!app) return fail(res, '投递记录不存在或无权操作', 404);

    const [[otherSigned]] = await db.query(
      'SELECT id FROM biz_applications WHERE student_user_id = ? AND status = "signed" AND id != ? LIMIT 1',
      [app.student_user_id, id]
    );

    if (['passed', 'offered', 'signed'].includes(status) && otherSigned) {
      return fail(res, '该学生已经在职，且无法进行后续签约操作。');
    }

    // 如果是设置为“已签约”，增加校验
    if (status === 'signed') {
      // 1. 检查岗位是否已满
      const [[job]] = await db.query(
        'SELECT id, headcount, (SELECT COUNT(*) FROM biz_applications WHERE job_id = ? AND status = "signed") as signed_count FROM biz_jobs WHERE id = (SELECT job_id FROM biz_applications WHERE id = ?)',
        [app.id, id]
      );
      if (job && job.signed_count >= job.headcount) {
        return fail(res, '该岗位招聘名额已满');
      }

      // 2. 检查学生是否已在其他岗位签约
      const [[studentSigned]] = await db.query(
        'SELECT id FROM biz_applications WHERE student_user_id = ? AND status = "signed"',
        [app.student_user_id]
      );
      if (studentSigned) {
        return fail(res, '该学生已在其他岗位签约，不可重复签约');
      }

      // 3. 签约后再次检查是否已满，若满则更新岗位状态为 filled
      if (job && (job.signed_count + 1) >= job.headcount) {
        await db.query('UPDATE biz_jobs SET status = "filled" WHERE id = ?', [job.id]);
        // 发送招满通知
        await db.query(
          'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
          [
            req.user.id,
            '岗位已招满',
            `恭喜！您发布的岗位【${app.title}】招聘名额已满，岗位状态已自动变更为“已招满”。`
          ]
        );
      }
    }

    await db.query(
      'UPDATE biz_applications SET status=?, enterprise_remark=?, interview_time=? WHERE id=?',
      [status, enterprise_remark || null, interview_time ? new Date(interview_time) : null, id]
    );

    // 如果状态更新为“已签约”，同步更新合同表中的签名标记，确保两端一致
    if (status === 'signed') {
      await db.query(
        'UPDATE biz_contracts SET student_signed = 1, enterprise_signed = 1 WHERE application_id = ?',
        [id]
      );
    }

    // 录用后自动创建三方协议记录
    if (status === 'offered') {
      const [[existing]] = await db.query(
        'SELECT id FROM biz_contracts WHERE application_id = ?', [id]
      );
      if (!existing) {
        await db.query(
          'INSERT INTO biz_contracts (application_id, student_user_id, enterprise_id) VALUES (?,?,?)',
          [id, app.student_user_id, ent.id]
        );
      }
    }

    // 发送站内信通知学生
    const statusMap = {
      'screening': '简历筛选中',
      'passed': '简历已通过',
      'interviewing': '邀请面试',
      'offered': '已发放Offer',
      'signed': '已签约',
      'rejected': '已拒绝'
    };
    await db.query(
      'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
      [
        app.student_user_id,
        `投递状态更新: ${statusMap[status] || status}`,
        `您投递的企业【${ent.company_name}】的职位【${app.title}】状态已更新为：${statusMap[status] || status}。请及时关注！`
      ]
    );

    return success(res, null, '状态更新成功');
  } catch (err) {
    console.error('[updateApplicationStatus]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * PUT /api/enterprise/applications/:id/dismiss
 * 企业辞退学生
 */
const dismissStudent = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return fail(res, '请填写辞退理由');

  try {
    const [[ent]] = await db.query('SELECT id, company_name FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    const [[app]] = await db.query(
      `SELECT a.id, a.student_user_id, j.title FROM biz_applications a
       JOIN biz_jobs j ON a.job_id = j.id
       WHERE a.id = ? AND j.enterprise_id = ?`,
      [id, ent.id]
    );
    if (!app) return fail(res, '投递记录不存在或无权操作', 404);
    
    // 只有已签约状态才能辞退
    const [[currentApp]] = await db.query('SELECT status FROM biz_applications WHERE id = ?', [id]);
    if (currentApp.status !== 'signed') return fail(res, '只有已签约状态才能执行辞退操作');

    await db.query(
      'UPDATE biz_applications SET status = "dismissed", action_remark = ? WHERE id = ?',
      [reason, id]
    );
    
    // 发送消息提醒 HR
    await db.query(
      'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
      [
        req.user.id,
        '名额已空出 (辞退)',
        `您已辞退岗位【${app.title}】下的学生。该岗位的招聘名额已空出，您可以根据需要前往“岗位管理”手动将其恢复为“招聘中”状态。`
      ]
    );

    // 发送通知给学生
    await db.query(
      'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
      [
        app.student_user_id,
        '解除签约通知',
        `企业【${ent.company_name}】已解除了与您在岗位【${app.title}】的签约关系。理由：${reason}`
      ]
    );

    return success(res, null, '辞退操作成功');
  } catch (err) {
    console.error('[dismissStudent]', err);
    return fail(res, '服务器错误', 500);
  }
};

/**
 * POST /api/enterprise/contracts/:applicationId/upload
 */
const uploadContract = async (req, res) => {
  const { applicationId } = req.params;
  if (!req.file) return fail(res, '请选择要上传的合同文件');

  const filePath = `/uploads/contracts/${req.file.filename}`;

  try {
    const [[ent]] = await db.query('SELECT id, company_name FROM biz_enterprises WHERE user_id = ?', [req.user.id]);
    if (!ent) return fail(res, '企业信息不存在');

    // 1. 校验投递记录权限
    const [[app]] = await db.query(
      `SELECT a.id, a.student_user_id, j.title FROM biz_applications a
       JOIN biz_jobs j ON a.job_id = j.id
       WHERE a.id = ? AND j.enterprise_id = ?`,
      [applicationId, ent.id]
    );
    if (!app) return fail(res, '记录不存在或无权操作', 404);

    // 2. 更新或创建合同记录中的文件路径
    // 注意：biz_contracts 通常在 offered 状态时已自动创建（参考 updateApplicationStatus）
    const [[existContract]] = await db.query(
      'SELECT id FROM biz_contracts WHERE application_id = ?', [applicationId]
    );

    // 🚀 核心修复：将 Multer 默认的 Latin1 编码转换为 UTF-8，解决中文乱码问题
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    if (existContract) {
      await db.query(
        'UPDATE biz_contracts SET file_path = ?, file_name = ? WHERE application_id = ?',
        [filePath, originalName, applicationId]
      );
    } else {
      // 如果还没创建（虽然 offered 时会自动创建，但为了稳健性做个兜底）
      await db.query(
        'INSERT INTO biz_contracts (application_id, student_user_id, enterprise_id, file_path, file_name) VALUES (?,?,?,?,?)',
        [applicationId, app.student_user_id, ent.id, filePath, originalName]
      );
    }

    // 3. 通知学生
    await db.query(
      'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
      [
        app.student_user_id,
        '新合同待查看',
        `企业【${ent.company_name}】已为您上传了岗位【${app.title}】的正式录用合同，请前往“我的岗位”页面查看并下载。`
      ]
    );

    return success(res, { file_path: filePath }, '合同上传成功');
  } catch (err) {
    console.error('[uploadContract]', err);
    return fail(res, '服务器错误', 500);
  }
};

module.exports = {
  getEnterpriseProfile, updateEnterpriseProfile,
  getMyJobs, createJob, updateJob, deleteJob,
  getApplications, updateApplicationStatus,
  dismissStudent, uploadContract
};
