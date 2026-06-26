const db = require('../config/db');
const { success, fail } = require('../utils/response');
const aiService = require('../utils/aiService');
const { extractText } = require('../utils/fileParser');
const path = require('path');
const fs = require('fs');

const AI_USER_ID = 2;

/**
 * 🚀 核心自愈逻辑：确保数据库中存在 AI 机器人用户记录
 * 防止因外键约束导致的消息发送失败
 */
const ensureAIUserExists = async () => {
  try {
    const [[exists]] = await db.query('SELECT id FROM sys_users WHERE id = ?', [AI_USER_ID]);
    if (!exists) {
      console.log('[AI Assistant] 正在初始化 AI 用户记录...');
      // 1. 获取 admin 角色 ID 作为默认角色
      const [[adminRole]] = await db.query('SELECT id FROM sys_roles WHERE role_code = "admin" LIMIT 1');
      const roleId = adminRole ? adminRole.id : 1;
      
      // 2. 插入 AI 用户 (密码随机或固定，因为不会通过该账号登录)
      await db.query(
        'INSERT IGNORE INTO sys_users (id, username, password, role_id, avatar) VALUES (?, ?, ?, ?, ?)',
        [AI_USER_ID, '星小智(AI助手)', 'VIRTUAL_USER_NO_LOGIN', roleId, 'https://api.dicebear.com/7.x/bottts/svg?seed=ai-assistant']
      );
      console.log('[AI Assistant] AI 用户记录初始化成功');
    }
  } catch (err) {
    console.error('[AI Assistant Init Error]', err);
  }
};

/**
 * 🚀 核心逻辑：获取与用户最为匹配的岗位列表 (按匹配度由高到低)
 */
const getAIPrioritizedJobs = async (userId, resumeText) => {
  try {
    // 1. 获取库中所有开放岗位
    const [jobs] = await db.query(`
      SELECT j.id, j.title, j.city, j.education_req, j.salary_min, j.salary_max, 
             j.description, j.requirements, e.company_name
      FROM biz_jobs j
      JOIN biz_enterprises e ON j.enterprise_id = e.id
      WHERE j.status = 'open'
      ORDER BY j.created_at DESC
      LIMIT 20
    `);

    if (jobs.length === 0) return [];

    // 2. 关键词预筛选 (基于简历中的技能词)
    // 提取简历中可能的关键词
    const keywords = resumeText.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{2,}/g) || [];
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));

    const scoredJobs = jobs.map(job => {
      let kScore = 0;
      const jobText = (job.title + job.description + job.requirements).toLowerCase();
      keywordSet.forEach(k => { if (jobText.includes(k)) kScore++; });
      return { ...job, kScore };
    });

    // 取初筛前 5 名进行深度 AI 匹配
    const candidates = scoredJobs.sort((a, b) => b.kScore - a.kScore).slice(0, 5);

    // 3. 并行调用 AI 获取精准评分
    const finalRecommendations = await Promise.all(candidates.map(async (job) => {
      const matchResult = await aiService.calculateMatchScore(job, resumeText);
      return {
        id: job.id,
        title: job.title,
        company: job.company_name,
        city: job.city,
        salary: `${job.salary_min}-${job.salary_max}`,
        score: matchResult.score,
        reason: matchResult.reason
      };
    }));

    // 4. 按分值降序排列
    return finalRecommendations.sort((a, b) => b.score - a.score);
  } catch (err) {
    console.error('[AI Job Match Error]', err);
    return [];
  }
};

/**
 * 获取联系人列表 (及其最后一条消息)
 */
const getContacts = async (req, res) => {
  const userId = req.user.id;
  try {
    // 确保 AI 用户存在
    await ensureAIUserExists();

    // 逻辑：查询所有与我有关的消息，按对方聚类
    const [rows] = await db.query(`
      SELECT 
        u.id AS contact_id,
        u.username,
        u.avatar,
        bst.real_name AS student_real_name,
        r.role_code,
        COALESCE(bsp.school_name, be.company_name, bst.school_name) AS org_name,
        m.content AS last_msg,
        m.created_at AS last_time,
        (SELECT COUNT(*) FROM biz_chat_messages WHERE receiver_id = ? AND sender_id = u.id AND is_read = 0 AND is_deleted = 0) as unread_count
      FROM (
        SELECT other_id, MAX(last_msg_id) AS last_msg_id
        FROM (
          -- 1. 已确认为正式好友的联系人 (带聊天记录提取)
          SELECT 
            f.user_id_target AS other_id,
            (SELECT MAX(id) FROM biz_chat_messages WHERE ((sender_id = ? AND receiver_id = f.user_id_target) OR (sender_id = f.user_id_target AND receiver_id = ?)) AND is_deleted = 0) as last_msg_id
          FROM biz_friends f
          WHERE f.user_id_source = ?
          
          UNION ALL
          
          -- 2. 高校管理员与学生之间的默认好友关系 (自动化关联)
          SELECT 
            target.user_id AS other_id,
            (SELECT MAX(id) FROM biz_chat_messages WHERE ((sender_id = ? AND receiver_id = target.user_id) OR (sender_id = target.user_id AND receiver_id = ?)) AND is_deleted = 0) as last_msg_id
          FROM (
            -- 如果我是学校管理员，关联本校所有学生
            SELECT bst.user_id 
            FROM biz_student_profiles bst
            JOIN biz_school_profiles bsp ON bst.school_name = bsp.school_name
            WHERE bsp.user_id = ?
            
            UNION
            
            -- 如果我是学生，关联本校所有学校管理员
            SELECT bsp.user_id
            FROM biz_school_profiles bsp
            JOIN biz_student_profiles bst ON bsp.school_name = bst.school_name
            WHERE bst.user_id = ?
          ) AS target
 
          UNION ALL
 
          -- 3. 高校管理员与企业之间的自动关联 (全站互通)
          SELECT 
            u.id AS other_id,
            (SELECT MAX(id) FROM biz_chat_messages WHERE ((sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)) AND is_deleted = 0) as last_msg_id
          FROM sys_users u
          JOIN sys_roles r ON u.role_id = r.id
          WHERE (
            -- 我是学校管理员，关联所有企业
            (r.role_code = 'enterprise' AND (SELECT role_code FROM sys_roles WHERE id = (SELECT role_id FROM sys_users WHERE id = ?)) = 'school')
            OR
            -- 我是企业，关联所有学校管理员
            (r.role_code = 'school' AND (SELECT role_code FROM sys_roles WHERE id = (SELECT role_id FROM sys_users WHERE id = ?)) = 'enterprise')
          )

          UNION ALL

          -- 4. 企业 HR 与其在职员工（已签约学生）之间的自动关联
          SELECT 
            target.other_id,
            (SELECT MAX(id) FROM biz_chat_messages WHERE ((sender_id = ? AND receiver_id = target.other_id) OR (sender_id = target.other_id AND receiver_id = ?)) AND is_deleted = 0) as last_msg_id
          FROM (
            -- 如果我是企业 HR，关联我司所有在职学生
            SELECT a.student_user_id AS other_id
            FROM biz_applications a
            JOIN biz_jobs j ON a.job_id = j.id
            JOIN biz_enterprises e ON j.enterprise_id = e.id
            WHERE e.user_id = ? AND a.status = 'signed'
            
            UNION
            
            -- 如果我是学生，关联我所在公司的 HR
            SELECT e.user_id AS other_id
            FROM biz_applications a
            JOIN biz_jobs j ON a.job_id = j.id
            JOIN biz_enterprises e ON j.enterprise_id = e.id
            WHERE a.student_user_id = ? AND a.status = 'signed'
          ) AS target
        ) AS combined
        GROUP BY other_id
      ) AS chat_map
      LEFT JOIN biz_chat_messages m ON chat_map.last_msg_id = m.id
      JOIN sys_users u ON chat_map.other_id = u.id
      JOIN sys_roles r ON u.role_id = r.id
      LEFT JOIN biz_school_profiles bsp ON u.id = bsp.user_id
      LEFT JOIN biz_enterprises be ON u.id = be.user_id
      LEFT JOIN biz_student_profiles bst ON u.id = bst.user_id
      ORDER BY last_time DESC, u.username ASC
    `, [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]);
 
 
    // 🚀 在最上方注入虚拟 AI 助手 “星小智”
    const aiContact = {
      contact_id: AI_USER_ID,
      username: '星小智(AI助手)',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ai-assistant',
      role_code: 'ai_bot',
      org_name: '职引星大模型算力中心',
      last_msg: '你好，我是你的职业助手星小智。有什么我可以帮你的吗？',
      last_time: new Date(),
      unread_count: 0
    };
 
    // 检查是否已有与 AI 的最后一条真实消息，如果有则更新最后一条消息
    const [aiLastMsg] = await db.query(
      'SELECT content, created_at FROM biz_chat_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at DESC LIMIT 1',
      [userId, AI_USER_ID, AI_USER_ID, userId]
    );
    if (aiLastMsg && aiLastMsg.length > 0) {
      aiContact.last_msg = aiLastMsg[0].content;
      aiContact.last_time = aiLastMsg[0].created_at;
    }
 
    return success(res, [aiContact, ...rows]);
  } catch (err) {
    console.error('[getContacts]', err);
    return fail(res, '获取联系人失败');
  }
};

/**
 * 获取聊天历史记录
 */
const getMessages = async (req, res) => {
  const userId = req.user.id;
  const { contactId } = req.params;

  try {
    // 标记为已读
    await db.query(
      'UPDATE biz_chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
      [contactId, userId]
    );

    // 查询历史记录
    const [messages] = await db.query(`
      SELECT m.*, 
             COALESCE(u_sender.username, '星小智(AI助手)') AS sender_name, 
             COALESCE(u_sender.avatar, 'https://api.dicebear.com/7.x/bottts/svg?seed=ai-assistant') AS sender_avatar,
             COALESCE(u_receiver.username, '星小智(AI助手)') AS receiver_name, 
             COALESCE(u_receiver.avatar, 'https://api.dicebear.com/7.x/bottts/svg?seed=ai-assistant') AS receiver_avatar,
        p.real_name AS student_name, p.major AS student_major, p.school_name AS student_school,
        p.degree AS student_degree, p.graduation_year AS student_year,
        r.file_path AS student_resume, r.id AS resume_id, r.file_name AS resume_name,
        j.title AS job_title, j.salary_min, j.salary_max, j.city AS job_city,
        be.company_name AS job_company, be.logo AS job_company_logo
      FROM biz_chat_messages m
      LEFT JOIN sys_users u_sender ON m.sender_id = u_sender.id
      LEFT JOIN sys_users u_receiver ON m.receiver_id = u_receiver.id
      LEFT JOIN biz_student_profiles p ON m.msg_type = 'recommendation' AND m.related_id = p.user_id
      LEFT JOIN biz_resumes r ON p.user_id = r.user_id AND r.is_default = 1
      LEFT JOIN biz_jobs j ON m.msg_type = 'job_recommendation' AND m.related_id = j.id
      LEFT JOIN biz_enterprises be ON j.enterprise_id = be.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) 
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [userId, contactId, contactId, userId]);

    return success(res, messages);
  } catch (err) {
    console.error('[getMessages]', err);
    return fail(res, '获取聊天记录失败');
  }
};

/**
 * 发送消息 (支持文本和推荐)
 */
const sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, content, msgType = 'text', relatedId = null } = req.body;

  if ((receiverId === undefined || receiverId === null || receiverId === '') || !content) {
    return fail(res, '参数不全');
  }
  
  // 核心：处理字符串类型的 ID (前端发来的可能是 "9999")
  const targetId = parseInt(receiverId);

  try {
    // 确保 AI 用户存在 (如果是发给 AI)
    if (targetId === AI_USER_ID) {
      await ensureAIUserExists();
    }

    const [result] = await db.query(
      'INSERT INTO biz_chat_messages (sender_id, receiver_id, content, msg_type, related_id) VALUES (?, ?, ?, ?, ?)',
      [senderId, targetId, content, msgType, relatedId]
    );

    // 🚀 如果不是发给虚拟 AI，则产生系统通知
    if (targetId !== AI_USER_ID) {
      const senderName = req.user.username || '系统用户';
      const notifyTitle = `(新私信) 来自 ${senderName}`;
      const notifyContent = msgType === 'recommendation' 
        ? `为您推荐了一名优质学生，请前往对话中心查看。` 
        : msgType === 'job_recommendation'
          ? `为您推荐了一个优质岗位：${content}，请前往查看详情。`
          : (content.length > 50 ? content.substring(0, 50) + '...' : content);

      await db.query(
        'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
        [targetId, notifyTitle, notifyContent]
      );
    }

    // 🚀 如果是发送给真实用户，则建立好友关系
    if (targetId !== AI_USER_ID) {
      await db.query(
        'INSERT IGNORE INTO biz_friends (user_id_source, user_id_target) VALUES (?, ?), (?, ?)',
        [senderId, targetId, targetId, senderId]
      );
    }

    // 🚀 如果是发送给 AI (ID为2)，触发自动回复逻辑
    if (targetId === AI_USER_ID) {
      // 1. 尝试获取用户的简历背景
      let resumeContext = '';
      try {
        const [resumes] = await db.query(
          'SELECT file_path FROM biz_resumes WHERE user_id = ? AND is_default = 1 LIMIT 1',
          [senderId]
        );
        if (resumes && resumes.length > 0) {
          const text = await extractText(resumes[0].file_path);
          if (text) {
            resumeContext = `\n\n[用户简历背景信息]:\n${text.substring(0, 3000)}`; 
            console.log(`[AI Assistant] 已提取用户简历背景 (${text.length} 字符)`);
          }
        }
      } catch (err) {
        console.warn('[AI Assistant] 提取简历背景失败:', err.message);
      }

      // 2. 获取用户与 AI 的历史对话 (最近 10 条)
      const [historyRows] = await db.query(
        'SELECT sender_id, content FROM biz_chat_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at DESC LIMIT 10',
        [senderId, AI_USER_ID, AI_USER_ID, senderId]
      );
      
      const history = historyRows.reverse().map(m => ({
        role: m.sender_id === AI_USER_ID ? 'assistant' : 'user',
        content: m.content
      }));

      // 如果有简历，将其作为上下文注入
      if (resumeContext && history.length > 0) {
        history[history.length - 1].content += resumeContext;
      }

      // 1.5 意图识别：如果用户询问岗位/工作相关问题，触发检索
      const jobIntentRegex = /(找工作|推荐岗位|求职|岗位|工作|匹配|适合我)/i;
      const lastUserMsg = content || '';
      if (jobIntentRegex.test(lastUserMsg)) {
        console.log('[AI Assistant] 识别到求职意图，正在检索匹配岗位...');
        const recommendedJobs = await getAIPrioritizedJobs(senderId, resumeContext || '无简历');
        if (recommendedJobs.length > 0) {
          const jobContext = `\n\n[实时岗位库检索结果]:\n` + 
            recommendedJobs.map((j, i) => 
              `${i+1}. ${j.title} @ ${j.company} [${j.city}] | 匹配度: ${j.score}% | 原因: ${j.reason}`
            ).join('\n');
          
          console.log('[AI Assistant] 发送给 AI 的岗位上下文:\n', jobContext);
          
          // 注入到对话历史中，供 AI 参考后回复
          history[history.length - 1].content += jobContext;
        } else {
          console.log('[AI Assistant] 岗位库中未找到匹配岗位');
        }
      }

      // 3. 异步执行 AI 生成
      (async () => {
        try {
          const aiReply = await aiService.getChatResponse(history);
          await db.query(
            'INSERT INTO biz_chat_messages (sender_id, receiver_id, content, msg_type) VALUES (?, ?, ?, "text")',
            [AI_USER_ID, senderId, aiReply]
          );
        } catch (e) {
          console.error('[AI Reply Error]', e);
        }
      })();
    }

    return success(res, { id: result.insertId }, '发送成功');
  } catch (err) {
    console.error('[sendMessage]', err);
    return fail(res, '消息发送失败');
  }
};


/**
 * 添加好友 (非对称权限校验 - 保留为底层逻辑)
 */
const addFriend = async (req, res) => {
  const sourceId = req.user.id;
  const { targetId } = req.body;
  if ((targetId === undefined || targetId === null || targetId === '') || sourceId == targetId) {
    return fail(res, '参数无效');
  }

  try {
    await db.query(
      'INSERT IGNORE INTO biz_friends (user_id_source, user_id_target) VALUES (?, ?), (?, ?)',
      [sourceId, targetId, targetId, sourceId]
    );
    return success(res, null, '好友添加成功');
  } catch (err) {
    console.error('[addFriend]', err);
    return fail(res, '添加好友失败');
  }
};

/**
 * 发起好友申请
 */
const sendFriendRequest = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, message: requestMsg } = req.body;

  if (receiverId === undefined || receiverId === null || receiverId === '') {
    return fail(res, '接收人ID不能为空');
  }
  if (senderId == receiverId) return fail(res, '不能对自己发起申请');

  try {
    // 检查是否已经是好友
    const [[isFriend]] = await db.query(
      'SELECT id FROM biz_friends WHERE user_id_source = ? AND user_id_target = ?',
      [senderId, receiverId]
    );
    if (isFriend) return fail(res, '你们已经是好友了');

    // 检查是否有待处理申请
    const [[existing]] = await db.query(
      'SELECT id FROM biz_friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [senderId, receiverId]
    );
    if (existing) return fail(res, '申请已发送，请耐心等待');

    await db.query(
      'INSERT INTO biz_friend_requests (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [senderId, receiverId, requestMsg || '你好，想加你为好友。']
    );

    // 发送系统通知
    const [[sender]] = await db.query('SELECT username FROM sys_users WHERE id = ?', [senderId]);
    await db.query(
      'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
      [receiverId, '新好友申请', `用户【${sender.username}】申请加您为好友，请前往消息中心处理。`]
    );

    return success(res, null, '申请已发送');
  } catch (err) {
    console.error('[sendFriendRequest]', err);
    return fail(res, '发起申请失败');
  }
};

/**
 * 获取我的好友申请列表
 */
const getFriendRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(`
      SELECT fr.*, u.username AS sender_name, u.avatar AS sender_avatar, r.role_name AS sender_role
      FROM biz_friend_requests fr
      JOIN sys_users u ON fr.sender_id = u.id
      JOIN sys_roles r ON u.role_id = r.id
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `, [userId]);
    return success(res, rows);
  } catch (err) {
    console.error('[getFriendRequests]', err);
    return fail(res, '获取申请列表失败');
  }
};

/**
 * 处理好友申请 (同意/拒绝)
 */
const handleFriendRequest = async (req, res) => {
  const userId = req.user.id;
  const { requestId, action } = req.body; // action: 'accept' | 'reject'

  if (!requestId || !['accept', 'reject'].includes(action)) {
    return fail(res, '参数非法');
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [[request]] = await connection.query(
      'SELECT * FROM biz_friend_requests WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, userId]
    );
    if (!request) {
      connection.release();
      return fail(res, '申请不存在或已处理');
    }

    if (action === 'accept') {
      await connection.query(
        'UPDATE biz_friend_requests SET status = "accepted" WHERE id = ?',
        [requestId]
      );
      await connection.query(
        'INSERT IGNORE INTO biz_friends (user_id_source, user_id_target) VALUES (?, ?), (?, ?)',
        [request.sender_id, userId, userId, request.sender_id]
      );
      
      const [[receiver]] = await connection.query('SELECT username FROM sys_users WHERE id = ?', [userId]);
      await connection.query(
        'INSERT INTO sys_messages (user_id, title, content) VALUES (?, ?, ?)',
        [request.sender_id, '好友申请已通过', `用户【${receiver.username}】已同意您的好友申请，现在可以开始聊天了。`]
      );
    } else {
      await connection.query(
        'UPDATE biz_friend_requests SET status = "rejected" WHERE id = ?',
        [requestId]
      );
    }

    await connection.commit();
    connection.release();
    return success(res, null, action === 'accept' ? '已同意' : '已拒绝');
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('[handleFriendRequest]', err);
    return fail(res, '处理失败');
  }
};

/**
 * 按用户名进行精确搜索 (添加好友时使用)
 */
const searchUserByUsername = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user.id;

  if (!username) return fail(res, '请输入用户名');

  try {
    const [[user]] = await db.query(`
      SELECT u.id AS contact_id, u.username, u.avatar, r.role_code, r.role_name,
             COALESCE(bsp.school_name, be.company_name, bst.school_name) AS org_name
      FROM sys_users u
      JOIN sys_roles r ON u.role_id = r.id
      LEFT JOIN biz_school_profiles bsp ON u.id = bsp.user_id
      LEFT JOIN biz_enterprises be ON u.id = be.user_id
      LEFT JOIN biz_student_profiles bst ON u.id = bst.user_id
      WHERE u.username = ? AND u.id != ?
    `, [username.trim(), currentUserId]);

    if (!user) return fail(res, '未找到该用户');
    return success(res, user);
  } catch (err) {
    console.error('[searchUserByUsername]', err);
    return fail(res, '搜索失败');
  }
};

/**
 * 获取本校可推荐的学生列表 (仅高校管理员可用)
 */
const getRecommendableStudents = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id AS user_id, u.username, u.avatar,
        p.real_name, p.major, p.degree, p.school_name,
        r.id AS resume_id, r.file_path AS student_resume, r.file_name AS resume_name,
        p.graduation_year AS student_year
      FROM sys_users u
      JOIN biz_student_profiles p ON u.id = p.user_id
      JOIN biz_school_profiles bsp ON p.school_name = bsp.school_name
      LEFT JOIN biz_resumes r ON u.id = r.user_id AND r.is_default = 1
      WHERE bsp.user_id = ? AND u.role_id = (SELECT id FROM sys_roles WHERE role_code = 'student')
    `, [userId]);

    return success(res, rows);
  } catch (err) {
    console.error('[getRecommendableStudents]', err);
    return fail(res, '获取学生列表失败');
  }
};

/**
 * 获取可以发起的联系人列表 (保留作为发现候选)
 */
const getDiscoverableContacts = async (req, res) => {
  const userId = req.user.id;
  try {
    let query = '';
    let params = [userId];

    if (req.user.role_code === 'student') {
      query = `
        SELECT 
          u.id AS contact_id, u.username, u.avatar, r.role_code, r.role_name,
          bst.real_name AS student_real_name,
          COALESCE(bsp.school_name, bst.school_name) AS org_name
        FROM sys_users u
        JOIN sys_roles r ON u.role_id = r.id
        LEFT JOIN biz_school_profiles bsp ON u.id = bsp.user_id
        LEFT JOIN biz_student_profiles bst ON u.id = bst.user_id
        WHERE u.id != ? 
          AND (
            (r.role_code = 'school' AND bsp.school_name = (SELECT school_name FROM biz_student_profiles WHERE user_id = ? LIMIT 1))
            OR
            (r.role_code = 'student')
          )
      `;
      params.push(userId);
    } else {
      query = `
        SELECT 
          u.id AS contact_id, u.username, u.avatar, r.role_code, r.role_name,
          bst.real_name AS student_real_name,
          COALESCE(bsp.school_name, be.company_name, bst.real_name) AS org_name
        FROM sys_users u
        JOIN sys_roles r ON u.role_id = r.id
        LEFT JOIN biz_school_profiles bsp ON u.id = bsp.user_id
        LEFT JOIN biz_enterprises be ON u.id = be.user_id
        LEFT JOIN biz_student_profiles bst ON u.id = bst.user_id
        WHERE u.id != ? 
          AND r.role_code IN (${req.user.role_code === 'admin' ? "'enterprise', 'school', 'admin', 'student'" : "'enterprise', 'school', 'student'"})
      `;
    }

    const [users] = await db.query(query + ' ORDER BY r.role_code ASC, u.username ASC', params);
    return success(res, users);
  } catch (err) {
    console.error('[getDiscoverableContacts]', err);
    return fail(res, '获取可发现联系人失败');
  }
};

/**
 * 消息回档 (Restore) - 清除已删除标志
 */
const restoreChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return fail(res, '用户ID不能为空');

  try {
    await db.query(
      'UPDATE biz_chat_messages SET is_deleted = 0 WHERE sender_id = ? OR receiver_id = ?',
      [userId, userId]
    );
    return success(res, null, '消息回档补全成功');
  } catch (err) {
    console.error('[restoreChat]', err);
    return fail(res, '回档失败');
  }
};

/**
 * 删除会话 (软删除整个对话记录)
 */
const deleteSession = async (req, res) => {
  const userId = req.user.id;
  const { contactId } = req.body;

  if (contactId === undefined || contactId === null || contactId === '') {
    return fail(res, '联系人ID不能为空');
  }

  try {
    await db.query(`
      UPDATE biz_chat_messages 
      SET is_deleted = 1 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
    `, [userId, contactId, contactId, userId]);

    return success(res, null, '会话已清除');
  } catch (err) {
    console.error('[deleteSession]', err);
    return fail(res, '删除失败');
  }
};

/**
 * 下载简历 (带原始文件名)
 */
const downloadResume = async (req, res) => {
  const { id } = req.params;
  try {
    const [[resume]] = await db.query('SELECT file_path, file_name FROM biz_resumes WHERE id = ?', [id]);
    if (!resume) return res.status(404).json({ code: -1, message: '简历文件不存在' });

    const path = require('path');
    const fs = require('fs');
    const absolutePath = path.join(process.cwd(), resume.file_path);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ code: -1, message: '物理文件已丢失' });
    }

    if (req.query.action === 'preview') {
      res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(resume.file_name) + '"');
      return res.sendFile(absolutePath);
    }

    return res.download(absolutePath, resume.file_name);
  } catch (err) {
    console.error('[downloadResume]', err);
    return res.status(500).json({ code: -1, message: '下载失败' });
  }
};

module.exports = {
  getContacts,
  getMessages,
  sendMessage,
  sendFriendRequest,
  getFriendRequests,
  handleFriendRequest,
  getDiscoverableContacts,
  restoreChat,
  deleteSession,
  downloadResume,
  searchUserByUsername,
  getRecommendableStudents
};
