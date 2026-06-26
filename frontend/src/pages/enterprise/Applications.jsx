import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Select, Space, Button, Tag,
  Descriptions, Modal, Form, Input, DatePicker, message, Tabs,
  Avatar, Row, Col, Progress, Tooltip, Divider, Pagination, Badge, Empty, Spin
} from 'antd';
import { 
  EyeOutlined, CheckOutlined, CloseOutlined, CalendarOutlined, 
  FileDoneOutlined, UploadOutlined, CheckCircleFilled, DownloadOutlined
} from '@ant-design/icons';
import { enterpriseApi } from '../../api/services';
import mammoth from 'mammoth';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

const statusConfig = {
  applied:      { color: 'blue',      text: '待处理',   next: ['screening', 'rejected'] },
  screening:    { color: 'processing',text: '筛选中',   next: ['passed', 'rejected'] },
  passed:       { color: 'cyan',      text: '初筛通过', next: ['interviewing', 'rejected'] },
  interviewing: { color: 'purple',    text: '面试中',   next: ['offered', 'rejected'] },
  offered:      { color: 'gold',      text: '发放录用', next: ['signed', 'rejected'] },
  signed:       { color: 'success',   text: '已签约',   next: [] },
  rejected:     { color: 'error',     text: '已淘汰',   next: [] },
  dismissed:    { color: 'orange',    text: '已辞退',   next: [] },
  resigned:     { color: 'volcano',   text: '已辞职',   next: [] },
};

const statusNextLabel = {
  screening:    '进入筛选',
  passed:       '通过初筛',
  interviewing: '安排面试',
  offered:      '发放录用',
  signed:       '确认签约',
  rejected:     '淘汰候选人',
};

const customStyles = `
  /* 胶囊导航 (Tab) */
  .custom-settings-tabs .ant-tabs-nav { margin-bottom: 24px !important; }
  .custom-settings-tabs .ant-tabs-nav::before { display: none; }
  .custom-settings-tabs .ant-tabs-nav-list {
    background: #f1f5f9; padding: 6px; border-radius: 14px; display: inline-flex;
  }
  .custom-settings-tabs .ant-tabs-tab {
    padding: 10px 24px !important; margin: 0 !important; border-radius: 10px;
    transition: all 0.3s ease; color: #64748b;
  }
  .custom-settings-tabs .ant-tabs-ink-bar { display: none !important; }
  .custom-settings-tabs .ant-tabs-tab-active { 
    background: #ffffff; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.06); 
  }
  .custom-settings-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { 
    color: #0f172a !important; 
    font-weight: 700; 
  }

  /* 导航角标 */
  .tab-badge .ant-badge-count {
    background: #3b82f6;
    box-shadow: 0 0 0 1px #fff;
  }

  /* 邮件流收件箱卡片 (Inbox Row Card) */
  .inbox-row-card {
    background: #ffffff;
    border-radius: 16px;
    position: relative;
    padding: 20px 24px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  
  /* 左侧高亮未读线 */
  .inbox-row-card.unread {
    border-left: 4px solid #3b82f6;
  }
  /* 静默 / 褪色处理已归档的简历 */
  .inbox-row-card.silent {
    background: #f8fafc;
    border-color: #f1f5f9;
  }
  
  .inbox-row-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 32px -8px rgba(0,0,0,0.06);
    border-color: #cbd5e1;
  }

  /* 平滑滑出交互式控制区 (Slide-in Quick Actions) */
  .slide-actions-wrapper {
    position: absolute;
    right: -200px;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 15%, #ffffff 100%);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-left: 48px;
    padding-right: 24px;
    gap: 8px;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;
  }
  .inbox-row-card:hover .slide-actions-wrapper {
    right: 0;
    opacity: 1;
  }
  .inbox-row-card.silent:hover .slide-actions-wrapper {
    background: linear-gradient(90deg, rgba(248,250,252,0) 0%, #f8fafc 15%, #f8fafc 100%);
  }
  
  /* 精美操作圆点按钮 */
  .slide-btn {
    width: 40px !important;
    height: 40px !important;
    border-radius: 50% !important;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none !important;
    background: #f1f5f9 !important;
    color: #64748b !important;
    transition: all 0.2s !important;
    font-size: 16px !important;
    box-shadow: none !important;
  }
  .slide-btn:hover {
    transform: scale(1.1);
  }
  /* 对应的动态高阶 Hover */
  .btn-check:hover { background: #10b981 !important; color: #fff !important; box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important; }
  .btn-calendar:hover { background: #3b82f6 !important; color: #fff !important; box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important; }
  .btn-close:hover { background: #ef4444 !important; color: #fff !important; box-shadow: 0 4px 12px rgba(239,68,68,0.3) !important; }
  .btn-view:hover { background: #ffffff !important; color: #0f172a !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
  .status-tag-resigned { background: #f1f5f9 !important; color: #94a3b8 !important; border: 1px solid #e2e8f0 !important; }

  /* AI 智能抽离技能胶囊 (Tech Pills) */
  .tech-pill {
    background: #f1f5f9;
    border: none;
    color: #475569;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 500;
  }

  /* --- Refactored Candidate Detail Modal Styles --- */
  .candidate-detail-modal .ant-modal-content {
    padding: 0;
    overflow: hidden;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  /* Glassmorphism Mask */
  .glass-mask {
    backdrop-filter: blur(8px) saturate(180%);
    -webkit-backdrop-filter: blur(8px) saturate(180%);
    background-color: rgba(15, 23, 42, 0.4) !important;
  }

  /* Bento Grid Layout */
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding: 24px;
    background: #f8fafc;
  }

  .bento-item {
    background: #ffffff;
    border-radius: 20px;
    padding: 20px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    transition: all 0.3s ease;
  }
  .bento-item:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  }

  /* Profile Card (Large) */
  .bento-item-profile {
    grid-column: span 2;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  /* Status Card (Wide) */
  .bento-item-full {
    grid-column: span 3;
  }

  /* Web3 Certificate Card */
  .bento-item-web3 {
    grid-column: span 3;
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid rgba(59, 130, 246, 0.3);
    position: relative;
    overflow: hidden;
  }
  .bento-item-web3::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  /* Custom Stepper */
  .custom-stepper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    padding: 10px 0;
  }
  .stepper-progress-bg {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background: #e2e8f0;
    transform: translateY(-50%);
    z-index: 1;
  }
  .stepper-node {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #cbd5e1;
    border: 2px solid #fff;
    z-index: 2;
    position: relative;
    transition: all 0.3s ease;
  }
  .stepper-node.active {
    background: #3b82f6;
    transform: scale(1.3);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  .stepper-node.done {
    background: #10b981;
  }

  /* Pulse Animation */
  @keyframes pulse-blue {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
  .pulse-active {
    animation: pulse-blue 2s infinite;
  }

  /* Info Label & Value */
  .info-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .info-label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .info-value {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  /* Salary specific styling */
  .salary-value {
    color: #475569 !important; /* Elegant slate grey */
    font-family: 'JetBrains Mono', 'Courier New', monospace;
  }

  /* 🚀 核心新增：岗位标签样式 */
  .job-tag-container {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 12px 4px;
    margin-bottom: 20px;
    scrollbar-width: none; /* Firefox */
  }
  .job-tag-container::-webkit-scrollbar { display: none; } /* Chrome/Safari */

  .job-pill {
    padding: 8px 20px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: #64748b;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .job-pill:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
  .job-pill.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  /* 🚀 核心新增：AI 评分勋章 */
  .ai-score-badge {
    padding: 4px 12px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 4px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  .ai-score-high { color: #10b981; border-color: #10b981; background: #ecfdf5; }
  .ai-score-mid { color: #f59e0b; border-color: #f59e0b; background: #fffbeb; }
  .ai-score-low { color: #ef4444; border-color: #ef4444; background: #fef2f2; }

  /* 🚀 核心新增：最优候选人高亮特效 (Golden Glow) */
  .best-match-highlight {
    border: 2px solid #fbbf24 !important;
    background: linear-gradient(to right, #ffffff, #fffbeb) !important;
    box-shadow: 0 10px 25px -5px rgba(251, 191, 36, 0.2) !important;
  }
  .best-match-badge {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-left: 8px;
  }

`;

export default function EnterpriseApplications() {
  const [apps, setApps] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [drawerApp, setDrawerApp] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { app, nextStatus }
  const [actionForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploadModal, setUploadModal] = useState({ app: null, open: false });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [parsing, setParsing] = useState(false);

  // 1. 获取岗位列表
  const fetchJobs = async () => {
    try {
      const res = await enterpriseApi.getJobs({ pageSize: 100 }); // 获取所有岗位
      setJobs(res.data.list);
    } catch (err) {
      console.error('获取岗位列表失败', err);
    }
  };

  const fetchApps = async (status = filterStatus, pg = 1, jobId = selectedJobId) => {
    setLoading(true);
    try {
      const res = await enterpriseApi.getApplications({ 
        status, 
        page: pg, 
        pageSize: 10,
        job_id: jobId 
      });
      setApps(res.data.list);
      setTotal(res.data.pagination.total);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchJobs();
    fetchApps(); 
  }, []);

  const handlePreviewAction = async (app) => {
    if (!app?.resume_id) return;
    const token = useAuthStore.getState().token;
    const url = `http://localhost:3001/api/chat/download-resume/${app.resume_id}?token=${token}&action=preview`;
    setPreviewUrl(url);
    setPreviewTitle(app.resume_name || '简历预览');
    setPreviewVisible(true);
    setPreviewHtml('');

    if (app.resume_name?.toLowerCase().endsWith('.docx')) {
      setParsing(true);
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value);
      } catch (e) {
        console.error('Word 解析失败:', e);
        message.error('内容解析失败，请直接下载');
      } finally {
        setParsing(false);
      }
    }
  };

  // 辅助函数：找到最高分
  const maxScore = Math.max(...apps.map(a => (a.match_score || 0)));

  const openAction = (app, nextStatus) => {
    // 🚀 核心拦截逻辑：如果在职，且操作不是“淘汰”，则拦截并提示
    if (app.is_in_service && nextStatus !== 'rejected') {
      message.warning({
          content: (
              <span>
                  <Text strong>操作受阻：</Text>
                  该学生（{app.real_name || app.username}）当前已在职。
                  请先在“员工管理”中确认其履职情况，或通过对话中心与其沟通。
              </span>
          ),
          duration: 4,
          style: { marginTop: '10vh' }
      });
      return;
    }
    setActionModal({ app, nextStatus });
    actionForm.resetFields();
  };

  const handleAction = async (values) => {
    setSaving(true);
    try {
      await enterpriseApi.updateAppStatus(actionModal.app.id, {
        status: actionModal.nextStatus,
        enterprise_remark: values.remark,
        interview_time: values.interview_time?.toISOString(),
      });
      message.success('✅ 候选人状态已更新');
      setActionModal(null);
      setDrawerApp(null);
      fetchApps(filterStatus, page);
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = (app) => {
    Modal.confirm({
      title: '确认让该人才流失吗？',
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>请记录档案理由：</div>
          <Input.TextArea id="dismiss-reason" rows={4} placeholder="在此填写原因..." />
        </div>
      ),
      onOk: async () => {
        const reason = document.getElementById('dismiss-reason').value;
        if (!reason) {
          message.error('流失理由不可为空');
          return Promise.reject();
        }
        try {
          await enterpriseApi.dismissApp(app.id, { reason });
          message.success('已登记流失/辞退库');
          setDrawerApp(null);
          fetchApps(filterStatus, page);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const tabItems = [
    { key: '', label: '全部投递' },
    ...Object.entries(statusConfig)
      .filter(([k]) => k !== 'resigned' && k !== 'dismissed')
      .map(([k, v]) => ({
        key: k, 
        label: (
          <Space>
            {v.text}
            {filterStatus === k && total > 0 && <Badge count={total} className="tab-badge" />}
          </Space>
        ),
      })),
    { 
      key: 'offboarded', 
      label: (
        <Space>
          已离职
          {filterStatus === 'offboarded' && total > 0 && <Badge count={total} className="tab-badge" />}
        </Space>
      )
    },
  ];

  // 邮件流行渲染器 (Row Inbox Flow)
  const renderRowCards = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>加载数据中...</div>;
    if (apps.length === 0) return <Empty description="暂无匹配的候选人投递记录" style={{ margin: '60px 0' }}/>;

    return apps.map(r => {
      const isUnread = r.status === 'applied';
      const isSilent = ['rejected', 'dismissed', 'resigned', 'signed'].includes(r.status);
      const isBestMatch = r.match_score > 0 && r.match_score === maxScore && apps.length > 1;

      // 动态评分颜色
      const scoreClass = r.match_score >= 80 ? 'ai-score-high' : r.match_score >= 60 ? 'ai-score-mid' : 'ai-score-low';
      
      return (
        <div 
          className={`inbox-row-card ${isUnread ? 'unread' : ''} ${isSilent ? 'silent' : ''} ${isBestMatch ? 'best-match-highlight' : ''}`} 
          key={r.id}
          onClick={() => setDrawerApp(r)}
          style={{ cursor: 'pointer' }}
        >
          {/* 左侧头像 */}
          <div style={{ flex: '0 0 auto', marginRight: 20 }}>
            <Avatar size={48} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', fontSize: 20 }}>
                {r.real_name?.[0] || r.username?.[0]}
            </Avatar>
          </div>
          
          {/* 第一组列：候选人基本信息与状态 */}
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
             <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Text strong style={{ fontSize: 16, color: '#0f172a' }}>{r.real_name || r.username}</Text>
                {isBestMatch && <span className="best-match-badge">最优匹配</span>}
                {r.is_in_service ? (
                  <Tag color="cyan" style={{ border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, padding: '0 4px', height: 18, lineHeight: '18px' }}>
                    在职
                  </Tag>
                ) : (
                  <Tag color="default" style={{ border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '0 4px', height: 18, lineHeight: '18px' }}>
                    待业
                  </Tag>
                )}
                <Tag color={statusConfig[r.status]?.color} style={{ borderRadius: 12, border: 'none', fontWeight: 600 }}>{statusConfig[r.status]?.text}</Tag>
             </div>
             <div style={{ color: '#64748b', fontSize: 13 }}>
                {/* 如果有缺失项则填补未知 */}
                {r.school_name || '未知院校'} · {r.degree || '无学历记录'} · {r.major || '未填专业'}
             </div>
          </div>
          
          {/* 第二组列：意向与时间轨迹 */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 4 }}>
             <Text strong style={{ color: '#334155', fontSize: 14 }}>{r.job_title}</Text>
             <Text style={{ color: '#94a3b8', fontSize: 12 }}>{dayjs(r.applied_at).format('YYYY-MM-DD HH:mm')} 投递</Text>
          </div>

          <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 16 }}>
             {r.match_score > 0 ? (
               <Tooltip title={r.match_reason || 'AI 智能评分（基于简历与岗位契合度）'}>
                 <div className={`ai-score-badge ${scoreClass}`}>
                   <CheckCircleFilled />
                   AI 匹配度 {r.match_score}%
                 </div>
               </Tooltip>
             ) : (
               <div className="ai-score-badge" style={{ opacity: 0.5, fontSize: 12 }}>
                 AI 正在评估中...
               </div>
             )}
          </div>

          {/* 隐藏控制域：右侧操作栏 */}
          <div className="slide-actions-wrapper">
             <Tooltip title="查看候选人详情">
               <Button className="slide-btn btn-view" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); setDrawerApp(r); }} />
             </Tooltip>

             {/* 🚀 核心新增：快捷下载简历 */}
             {r.resume_id && (
               <Tooltip title="快捷下载/预览简历">
                 <Button 
                  className="slide-btn btn-view" 
                  icon={<UploadOutlined />} 
                   onClick={(e) => { e.stopPropagation(); window.open(`http://localhost:3001/api/chat/download-resume/${r.resume_id}?token=${useAuthStore.getState().token}`, '_blank'); }} 
                  style={{ color: '#3b82f6 !important' }}
                 />
               </Tooltip>
             )}
             
             {statusConfig[r.status]?.next?.map(ns => {
                 let ActionIcon = null;
                 let btnClass = "";
                 let tooltipText = statusNextLabel[ns];
                 
                 if (ns === 'rejected') { 
                   ActionIcon = CloseOutlined; btnClass = "btn-close"; 
                 } else if (ns === 'interviewing') { 
                   ActionIcon = CalendarOutlined; btnClass = "btn-calendar"; 
                 } else if (ns === 'signed') {
                   ActionIcon = FileDoneOutlined; btnClass = "btn-check";
                 } else { 
                   ActionIcon = CheckOutlined; btnClass = "btn-check"; 
                 }
                 
                 return (
                   <Tooltip key={ns} title={`快捷执行: ${tooltipText}`}>
                     <Button className={`slide-btn ${btnClass}`} icon={<ActionIcon />} onClick={(e) => { e.stopPropagation(); openAction(r, ns); }} />
                   </Tooltip>
                 );
             })}

             {/* 新增：上传合同选项（限录用或签约状态） */}
             {['offered', 'signed'].includes(r.status) && (
               <Tooltip title="上传正式录用合同 (PDF/Word)">
                 <Button 
                   className="slide-btn btn-calendar" 
                   icon={<UploadOutlined />} 
                   style={{ background: '#f59e0b !important', color: '#fff !important' }}
                   onClick={(e) => { e.stopPropagation(); setUploadModal({ app: r, open: true }); }} 
                 />
               </Tooltip>
             )}
          </div>
        </div>
      );
    });
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <style>{customStyles}</style>

      {/* 极简风顶部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>📥 简历收件箱</Title>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>在此集中处理您的候选人投递与面试流转</Text>
        </div>
        {selectedJobId && (
          <Button 
            type="link" 
            onClick={() => { setSelectedJobId(null); fetchApps(filterStatus, 1, null); }}
            style={{ color: '#64748b' }}
          >
            清除岗位筛选
          </Button>
        )}
      </div>

      {/* 🚀 核心新增：岗位标签选择器 */}
      <div className="job-tag-container">
        <div 
          className={`job-pill ${selectedJobId === null ? 'active' : ''}`}
          onClick={() => { setSelectedJobId(null); fetchApps(filterStatus, 1, null); }}
        >
          全部岗位
        </div>
        {jobs.map(job => (
          <div 
            key={job.id} 
            className={`job-pill ${selectedJobId === job.id ? 'active' : ''}`}
            onClick={() => { setSelectedJobId(job.id); fetchApps(filterStatus, 1, job.id); }}
          >
            {job.title}
            {job.apply_count > 0 && <Badge count={job.apply_count} size="small" style={{ backgroundColor: selectedJobId === job.id ? '#fff' : '#3b82f6', color: selectedJobId === job.id ? '#3b82f6' : '#fff' }} />}
          </div>
        ))}
      </div>

      <Tabs
        className="custom-settings-tabs"
        activeKey={filterStatus}
        onChange={(k) => {
          setFilterStatus(k); 
          fetchApps(k, 1);
        }}
        items={tabItems}
      />

      <div style={{ minHeight: 400 }}>
        {renderRowCards()}
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Pagination
            current={page}
            pageSize={10}
            total={total}
            onChange={(p) => fetchApps(filterStatus, p)}
            showTotal={t => `共收到 ${t} 份初筛投递`}
          />
        </div>
      )}

      {/* 候选人详情 Modal - 沉浸式 Bento Grid 重构 */}
      <Modal
        open={!!drawerApp}
        onCancel={() => setDrawerApp(null)}
        width={1000}
        footer={null}
        centered
        className="candidate-detail-modal"
        maskClassName="glass-mask"
        destroyOnClose
      >
        {drawerApp && (
          <div style={{ padding: 0 }}>
            {/* Header Area */}
            <div style={{ padding: '32px 32px 12px 32px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
               <Row justify="space-between" align="middle">
                 <Col>
                    <Space size={16}>
                      <Avatar size={64} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', fontSize: 24, fontWeight: 800 }}>
                        {drawerApp.real_name?.[0] || drawerApp.username?.[0]}
                      </Avatar>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Title level={3} style={{ margin: 0, fontWeight: 800 }}>{drawerApp.real_name || drawerApp.username}</Title>
                          <Tag color={statusConfig[drawerApp.status]?.color} style={{ borderRadius: 8, border: 'none', fontWeight: 600, padding: '2px 10px' }}>
                            {statusConfig[drawerApp.status]?.text}
                          </Tag>
                        </div>
                        <Text type="secondary" style={{ fontSize: 14 }}>{drawerApp.job_title} · 投递于 {dayjs(drawerApp.applied_at).format('YYYY/MM/DD')}</Text>
                      </div>
                    </Space>
                 </Col>
                 <Col>
                    {/* Header Actions Column Removed as per request */}
                 </Col>
               </Row>
            </div>

            {/* Bento Grid Body */}
            <div className="bento-grid">
               {/* Basic Info Cards */}
               <div className="bento-item">
                  <div className="info-group">
                    <div className="info-label">毕业院校</div>
                    <div className="info-value">{drawerApp.school_name || "未填写"}</div>
                  </div>
               </div>
               <div className="bento-item">
                  <div className="info-group">
                    <div className="info-label">专业学历</div>
                    <div className="info-value">{drawerApp.major || "-"} · {drawerApp.degree || "本科"}</div>
                  </div>
               </div>
               <div className="bento-item">
                  <div className="info-group">
                    <div className="info-label">期望薪资</div>
                    <div className="info-value salary-value">
                      {drawerApp.salary_min && drawerApp.salary_max 
                          ? `${drawerApp.salary_min/1000}K - ${drawerApp.salary_max/1000}K` 
                          : '面议'}
                    </div>
                  </div>
               </div>

               {/* 🚀 核心新增：简历下载卡片 */}
               <div className="bento-item" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <div className="info-group" style={{ height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      <div className="info-label" style={{ color: '#3b82f6' }}>附件简历</div>
                      <div className="info-value" style={{ fontSize: 13, marginTop: 4 }}>{drawerApp.resume_name || "未上传简历"}</div>
                    </div>
                    {drawerApp.resume_id && (
                      <Row gutter={8} style={{ marginTop: 12 }}>
                        <Col span={12}>
                          <Button 
                            block
                            type="primary" 
                            size="small" 
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewAction(drawerApp)}
                            style={{ background: '#3b82f6', borderRadius: 8 }}
                          >
                            预览
                          </Button>
                        </Col>
                        <Col span={12}>
                          <Button 
                            block
                            size="small" 
                            icon={<DownloadOutlined />}
                            onClick={() => window.open(`http://localhost:3001/api/chat/download-resume/${drawerApp.resume_id}?token=${useAuthStore.getState().token}`, '_blank')}
                            style={{ borderRadius: 8, color: '#3b82f6', borderColor: '#3b82f6' }}
                          >
                            下载
                          </Button>
                        </Col>
                      </Row>
                    )}
                  </div>
               </div>

               {/* 🚀 核心新增：AI 智能评价卡片 */}
               {drawerApp.match_score > 0 && (
                 <div className="bento-item bento-item-full" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div className="info-label" style={{ color: '#059669' }}>AI 智能评估报告</div>
                      <Tag color="success" style={{ borderRadius: 6 }}>匹配度 {drawerApp.match_score}%</Tag>
                    </div>
                    <Paragraph style={{ color: '#065f46', fontSize: 13, margin: 0, fontStyle: 'italic' }}>
                      “ {drawerApp.match_reason} ”
                    </Paragraph>
                 </div>
               )}

               {/* Status Stepper Card */}
               <div className="bento-item bento-item-full">
                  <div className="info-label" style={{ marginBottom: 20 }}>招聘流转进度</div>
                  <div className="custom-stepper">
                    <div className="stepper-progress-bg" />
                    {['applied', 'screening', 'passed', 'interviewing', 'offered', 'signed'].map((s, idx) => {
                      const stages = ['applied', 'screening', 'passed', 'interviewing', 'offered', 'signed'];
                      const currentIdx = stages.indexOf(drawerApp.status);
                      const isDone = currentIdx > idx;
                      const isActive = drawerApp.status === s;
                      
                      return (
                        <div key={idx} style={{ textAlign: 'center', zIndex: 10, position: 'relative', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                            <div className={`stepper-node ${isDone ? 'done' : ''} ${isActive ? 'active pulse-active' : ''}`} />
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: isActive ? '#3b82f6' : isDone ? '#10b981' : '#94a3b8',
                            fontWeight: isActive || isDone ? 700 : 400
                          }}>
                            {statusConfig[s].text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </div>

               {/* Blockchain Evidence (Conditional Bento Card) */}
               {drawerApp.tx_hash ? (
                 <div className="bento-item bento-item-web3">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '1px' }}>Network Evidence</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#60a5fa' }}>区块链存证已固化</div>
                      </div>
                      <Badge status="processing" color="#10b981" text={<span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>VERIFIED</span>} />
                   </div>
                   <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', marginBottom: 16 }}>
                      <div className="info-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>Transaction Hash</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all', color: '#94a3b8' }}>{drawerApp.tx_hash}</div>
                   </div>
                   <Button 
                    ghost 
                    size="small" 
                    icon={<FileDoneOutlined />}
                    onClick={() => {
                      Modal.success({
                        title: 'ZhiYinXing - 全局信任核验报告',
                        width: 600,
                        content: (
                          <div style={{ marginTop: 20 }}>
                              <Descriptions column={1} bordered size="small">
                                  <Descriptions.Item label="存证流水号"><Text code>{drawerApp.tx_hash}</Text></Descriptions.Item>
                                  <Descriptions.Item label="共识状态"><Tag color="success">已完成多节点共识确认</Tag></Descriptions.Item>
                                  <Descriptions.Item label="存证时间">{dayjs(drawerApp.updated_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                              </Descriptions>
                              <div style={{ marginTop: 16, color: '#94a3b8', fontSize: 11 }}>* 此凭证基于 Hyperledger Fabric 去中心化网络构建，数据篡改极难实现。</div>
                          </div>
                        ),
                      });
                    }}
                    style={{ borderRadius: 8, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                   >
                     查看完整核验链
                   </Button>
                 </div>
               ) : (
                 <div className="bento-item bento-item-web3" style={{ background: '#f8fafc', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                    <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
                       <div style={{ fontSize: '20px', marginBottom: 8 }}>⛓️</div>
                       <div style={{ fontSize: '12px' }}>该流程尚在传统数据库存证中...</div>
                    </div>
                 </div>
               )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '24px 32px', background: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
               <Button 
                 size="large" 
                 style={{ borderRadius: 12, height: 48, padding: '0 32px', border: 'none', background: '#f1f5f9', color: '#64748b' }}
                 onClick={() => setDrawerApp(null)}
               >
                 关闭
               </Button>
               
               {drawerApp && statusConfig[drawerApp.status]?.next.includes('rejected') && (
                 <Button 
                   size="large" 
                   danger
                   style={{ borderRadius: 12, height: 48, padding: '0 32px' }}
                   onClick={() => openAction(drawerApp, 'rejected')}
                 >
                   淘汰候选人
                 </Button>
               )}

               {drawerApp && statusConfig[drawerApp.status]?.next.filter(n => n !== 'rejected').map(ns => (
                 <Button 
                   key={ns}
                   type="primary"
                   size="large"
                   style={{ 
                     borderRadius: 12, 
                     height: 48, 
                     padding: '0 40px',
                     background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                     border: 'none',
                     boxShadow: '0 8px 20px -6px rgba(59, 130, 246, 0.5)',
                     fontWeight: 700
                   }}
                   onClick={() => openAction(drawerApp, ns)}
                 >
                   {statusNextLabel[ns]}
                 </Button>
               ))}

               {drawerApp?.status === 'signed' && (
                 <Button danger size="large" onClick={() => handleDismiss(drawerApp)} style={{ borderRadius: 12, height: 48 }}>
                   流失/辞退
                 </Button>
               )}

               {['offered', 'signed'].includes(drawerApp?.status) && (
                 <Button 
                   size="large"
                   icon={<UploadOutlined />} 
                   onClick={() => setUploadModal({ app: drawerApp, open: true })} 
                   style={{ borderRadius: 12, height: 48, background: '#f59e0b', color: '#fff', border: 'none' }}
                 >
                   上传正式合同
                 </Button>
               )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!actionModal}
        title={<Text strong style={{ fontSize: 18 }}>更新候选人状态：{statusNextLabel[actionModal?.nextStatus]}</Text>}
        onCancel={() => setActionModal(null)}
        footer={null}
        destroyOnClose
        centered
      >
        <Form form={actionForm} layout="vertical" onFinish={handleAction} style={{ marginTop: 24 }}>
          {actionModal?.nextStatus === 'interviewing' && (
            <Form.Item label={<Text strong>安排面试时间</Text>} name="interview_time" rules={[{ required: true, message: '请选择面试时间' }]}>
              <DatePicker showTime style={{ width: '100%', height: 44, borderRadius: 10, background: '#f8fafc' }} format="YYYY-MM-DD HH:mm" placeholder="选择时间" />
            </Form.Item>
          )}
          <Form.Item label={<Text strong>备注说明（选填）</Text>} name="remark">
            <Input.TextArea rows={4} placeholder="在此填写备注或给候选人的评价..." style={{ borderRadius: 12, background: '#f8fafc', border: 'none', padding: 12 }} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => setActionModal(null)} style={{ borderRadius: 8, height: 40, background: '#f1f5f9', color: '#64748b', border: 'none' }}>取消</Button>
              <Button
                type="primary" htmlType="submit" loading={saving}
                danger={actionModal?.nextStatus === 'rejected'}
                style={actionModal?.nextStatus !== 'rejected' ? {
                  background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 8, height: 40, padding: '0 24px', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                } : { borderRadius: 8, height: 40, padding: '0 24px', fontWeight: 600 }}
              >
                确认提交
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 合同上传 Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 18 }}>📤 上传录用合同</Text>}
        open={uploadModal.open}
        onCancel={() => setUploadModal({ app: null, open: false })}
        footer={null}
        destroyOnClose
        centered
      >
        <div style={{ padding: '20px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <Text type="secondary">请为候选人 <Text strong>{uploadModal.app?.real_name || uploadModal.app?.username}</Text> 上传正式的录用合同文档。</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>支持格式：.pdf, .doc, .docx | 最大限制：10MB</Text>
          </div>
          
          <Input 
            type="file" 
            accept=".pdf,.doc,.docx"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              
              const formData = new FormData();
              formData.append('file', file);
              
              setSaving(true);
              try {
                await enterpriseApi.uploadContract(uploadModal.app.id, formData);
                message.success('🎉 合同上传成功！');
                setUploadModal({ app: null, open: false });
                fetchApps(filterStatus, page);
              } catch (err) {
                message.error('上传失败：' + (err.response?.data?.message || err.message));
              } finally {
                setSaving(false);
              }
            }}
          />
          
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => setUploadModal({ app: null, open: false })} style={{ borderRadius: 8 }}>取消</Button>
          </div>
        </div>
      </Modal>

      <Modal 
        title={previewTitle} 
        open={previewVisible} 
        onCancel={() => setPreviewVisible(false)} 
        footer={null} 
        width={1000} 
        bodyStyle={{ height: 'calc(100vh - 200px)', padding: 0, overflow: 'hidden' }} 
        style={{ top: 20 }}
      >
        {parsing ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" tip="正在解析内容流..." />
          </div>
        ) : (
          previewTitle.toLowerCase().endsWith('.pdf') ? (
            <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none' }} title="预览PDF" />
          ) : previewHtml ? (
            <div style={{ height: '100%', overflowY: 'auto', padding: '40px 60px', background: '#fff' }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
            </div>
          ) : (
            <div style={{ padding: '100px 0', textAlign: 'center' }}>
              <Empty description="当前格式不支持在线预览，请直接下载" />
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
