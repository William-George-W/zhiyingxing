import React, { useState, useEffect } from 'react';
import { 
  Typography, Card, Row, Col, Input, Select, Button, Space, Tag, 
  Progress, Pagination, Modal, Divider, Empty, Spin, List, Avatar, message 
} from 'antd';
import { SearchOutlined, SendOutlined, EyeOutlined, RobotOutlined, EnvironmentOutlined, BookOutlined, CheckCircleFilled, MessageOutlined, ShareAltOutlined, UserOutlined } from '@ant-design/icons';
import { studentApi, chatApi } from '../../api/services';
import { useNavigate, useLocation } from 'react-router-dom';
import './Jobs.css';

const { Title, Text, Paragraph } = Typography;

const jobTypeColors = { '全职': 'blue', '实习': 'green', '兼职': 'orange' };

export default function StudentJobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', city: '', job_type: '', page: 1, pageSize: 10 });

  // Drawer states
  const [detailJob, setDetailJob] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  // Resume states
  const [myResumes, setMyResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);

  // Share states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchJobs = async (f = filters) => {
    setLoading(true);
    try {
      const res = await studentApi.getJobs(f);
      setJobs(res.data.list);
      setTotal(res.data.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchJobs(); 
    // 🚀 检查是否有导航过来的岗位 ID
    if (location.state?.openJobId) {
      openDetail({ id: location.state.openJobId });
      // 清理 state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const openDetail = async (job) => {
    const hide = message.loading(<span style={{ fontSize: '16px', fontWeight: 500, padding: '4px 8px' }}>数据加载中，请稍后...</span>, 0);
    try {
      const res = await studentApi.getJobDetail(job.id);
      setDetailJob(res.data);
      const resumeRes = await studentApi.getResumes();
      setMyResumes(resumeRes.data);
      const def = resumeRes.data.find(r => r.is_default);
      setSelectedResume(def?.id || resumeRes.data[0]?.id || null);
      setDrawerOpen(true);
    } catch (error) {
      console.error(error);
      message.error('加载岗位详情失败，请重试');
    } finally {
      hide();
    }
  };

  const handleApply = async () => {
    if (!selectedResume) {
      message.warning('请先选择或上传一份简历');
      return;
    }
    setApplyLoading(true);
    try {
      await studentApi.applyJob({ job_id: detailJob?.id, resume_id: selectedResume });
      message.success('🎉 投递成功！');
      setDrawerOpen(false);
    } catch (error) {
      console.error(error);
      if (!error.response && error.message !== '未返回有效数据') {
        message.error('投递失败：' + (error.message || '未知错误'));
      }
    } finally {
      setApplyLoading(false);
    }
  };

  // 🚀 立即咨询 HR
  const handleTalkToHR = () => {
    if (!detailJob?.hr_user_id) {
      message.error('该岗位暂时无法发起在线咨询');
      return;
    }
    navigate('/messages', { 
      state: { 
        contactId: detailJob.hr_user_id, 
        username: detailJob.company_name + ' HR',
        orgName: detailJob.company_name,
        avatar: detailJob.logo
      } 
    });
  };

  // 🚀 分享给好友逻辑
  const openShareModal = async () => {
    setShareLoading(true);
    setShareModalOpen(true);
    try {
      // 获取好友列表 (即可发现的联系人，此时后端已过滤为本校/好友)
      const res = await chatApi.getDiscoverable();
      setFriends(res.data.filter(u => u.role_code === 'student'));
    } catch (error) {
      message.error('加载好友列表失败');
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareToFriend = async (friendId) => {
    try {
      await chatApi.sendMessage({
        receiverId: friendId,
        msgType: 'job_recommendation',
        content: `向你推荐一个岗位：${detailJob.title}`,
        relatedId: detailJob.id
      });
      message.success('分享成功！');
      setShareModalOpen(false);
    } catch (error) {
      message.error('分享失败');
    }
  };

  const handleSearchClick = () => {
    // 强制触发一次重置页码的搜索
    const f = { ...filters, page: 1 };
    setFilters(f);
    fetchJobs(f);
  };

  return (
    <div className="jobs-page">
      {/* 搜索控制台 (Filter Card) */}
      <Card className="filter-card" bordered={false} bodyStyle={{ padding: '24px 32px' }}>
        <Title level={4} style={{ margin: 0, marginBottom: 20, fontWeight: 700, color: '#1e293b' }}>
          ✨ 发现绝佳机会
        </Title>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Input
              size="large"
              placeholder="搜索岗位名称、公司团队、指定技能..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              allowClear
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onPressEnter={handleSearchClick}
              style={{ borderRadius: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              size="large"
              placeholder="指定城市"
              allowClear
              style={{ width: '100%' }}
              value={filters.city || undefined}
              onChange={(v) => {
                const f = { ...filters, city: v || '', page: 1 };
                setFilters(f);
                fetchJobs(f);
              }}
              options={['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉'].map(c => ({ label: c, value: c }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              size="large"
              placeholder="岗位属性"
              allowClear
              style={{ width: '100%' }}
              value={filters.job_type || undefined}
              onChange={(v) => {
                const f = { ...filters, job_type: v || '', page: 1 };
                setFilters(f);
                fetchJobs(f);
              }}
              options={['全职', '实习', '兼职'].map(t => ({ label: t, value: t }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button
              type="primary"
              size="large"
              block
              icon={<SearchOutlined />}
              onClick={handleSearchClick}
              style={{
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                fontWeight: 600
              }}
            >
              检索
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 统计提示 */}
      <div style={{ margin: '4px 8px', color: '#64748b', fontSize: 15 }}>
        为您精心筛选出 <Text strong style={{ color: '#3b82f6', fontSize: 18 }}>{total}</Text> 份职位空缺
      </div>

      {/* 卡片式岗位流 (Card-based List) */}
      <div className="job-list-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
            <Spin size="large" tip={<div style={{ marginTop: 16, color: '#475569', fontSize: 16, fontWeight: 500 }}>数据加载中，请稍后...</div>} />
          </div>
        ) : jobs.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 16, padding: '40px 0' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<Text type="secondary" style={{ fontSize: 16 }}>没有找到符合条件的岗位</Text>}
            />
          </Card>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="job-row-card" onClick={() => openDetail(job)}>
              {/* 左侧：核心信息 */}
              <div style={{ flex: 1 }}>
                <Row align="middle" gutter={16} wrap={false}>
                  <Col>
                    <div className="company-logo" style={{ width: 44, height: 44, fontSize: 18, borderRadius: 10 }}>
                      {job.company_name?.[0]}
                    </div>
                  </Col>
                  <Col flex="1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <Text style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{job.title}</Text>
                      <Text className="salary-text">
                        {job.salary_min && job.salary_max ? `${job.salary_min / 1000}K-${job.salary_max / 1000}K` : '面议薪资'}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Text type="secondary" style={{ fontWeight: 500, color: '#475569' }}>{job.company_name}</Text>
                      <Space size={8}>
                        <Tag icon={<EnvironmentOutlined />} bordered={false} color="default">{job.city}</Tag>
                        <Tag color={jobTypeColors[job.job_type]} bordered={false}>{job.job_type}</Tag>
                        <Tag icon={<BookOutlined />} bordered={false} color="default">{job.education_req}</Tag>
                      </Space>
                    </div>
                  </Col>
                </Row>
              </div>

                <Button
                  size="large"
                  className="job-action-btn"
                  icon={<EyeOutlined />}
                  onClick={(e) => { e.stopPropagation(); openDetail(job); }}
                >
                  预览
                </Button>
              </div>
          ))
        )}
      </div>

      {/* 底部翻页 */}
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, marginBottom: 30 }}>
          <Pagination
            current={filters.page}
            pageSize={filters.pageSize}
            total={total}
            showSizeChanger={false}
            onChange={(page, pageSize) => {
              const f = { ...filters, page, pageSize };
              setFilters(f);
              fetchJobs(f);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* 岗位详情 Modal 升级为 Bento Grid 结构 */}
      <Modal
        className="custom-modal"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{detailJob?.title}</span>
            {detailJob?.job_type && (
              <Tag color={jobTypeColors[detailJob.job_type]} style={{ borderRadius: 6, fontWeight: 600 }}>
                {detailJob.job_type}
              </Tag>
            )}
          </div>
        }
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        width={800}
        centered
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' } }}
Footer
        footer={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Select
                  size="large"
                  value={selectedResume}
                  onChange={setSelectedResume}
                  style={{ width: '100%' }}
                  placeholder="请选择您的投递简历"
                  options={myResumes.map(r => ({ label: r.file_name, value: r.id }))}
                />
              </div>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleApply}
                loading={applyLoading}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  border: 'none',
                  padding: '0 32px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
                }}
              >
                一键投递
              </Button>
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div style={{ display: 'flex', gap: 12 }}>
              <Button 
                block 
                size="large" 
                icon={<MessageOutlined />} 
                onClick={handleTalkToHR}
                style={{ borderRadius: 10, borderColor: '#6366f1', color: '#6366f1', fontWeight: 600 }}
              >
                立即咨询
              </Button>
              <Button 
                block 
                size="large" 
                icon={<ShareAltOutlined />} 
                onClick={openShareModal}
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                推荐给好友
              </Button>
            </div>
          </div>
        }
      >
        {detailJob && (
          <div className="job-detail" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* 1. 顶部企业概览 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div className="company-logo" style={{ width: 72, height: 72, fontSize: 32, borderRadius: 16 }}>
                {detailJob.company_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{detailJob.company_name}</Title>
                <Space size="middle" style={{ marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><EnvironmentOutlined /> {detailJob.company_city}</span>
                  <span>{detailJob.industry || '综合行业'}</span>
                  <span>{detailJob.scale || '规模未知'}</span>
                </Space>
              </div>
            </div>

            {/* 2. Bento Grid 核心数据格 */}
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div className="bento-mini-card bento-salary">
                  <div className="b-label">薪资范围</div>
                  <div className="b-value">
                    {detailJob.salary_min && detailJob.salary_max ? `${detailJob.salary_min / 1000}K - ${detailJob.salary_max / 1000}K` : '面议'}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="bento-mini-card">
                  <div className="b-label">学历与经验要求</div>
                  <div className="b-value">{detailJob.education_req}</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="bento-mini-card">
                  <div className="b-label">招聘缺口</div>
                  <div className="b-value">{detailJob.headcount || 1} 人</div>
                </div>
              </Col>
            </Row>


            {/* 4. 排版优化的长文本区 */}
            <div>
              <Title level={5} style={{ marginBottom: 12, color: '#1e293b', fontWeight: 800 }}>📋 岗位工作描述</Title>
              <div className="rich-typography">
                {detailJob.description || '企业暂未填写描述'}
              </div>
            </div>

            <div>
              <Title level={5} style={{ marginBottom: 12, color: '#1e293b', fontWeight: 800 }}>✅ 任职必备条件</Title>
              <div className="rich-typography">
                {detailJob.requirements ? (
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {detailJob.requirements.split('\n').map((line, idx) => {
                      if (!line.trim()) return null;
                      // 正则剔除开头的数字编号或符号 (如 1. 1、 - *) 换发成专属圆圈打勾
                      const cleanLine = line.replace(/^[\d\.、\-*\s]+/, '');
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '4px 0' }}>
                          <CheckCircleFilled style={{ color: '#10b981', fontSize: 18, marginTop: 4 }} />
                          <span style={{ flex: 1, color: '#334155' }}>{cleanLine}</span>
                        </div>
                      );
                    })}
                  </Space>
                ) : '暂无特定要求'}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* 好友分享 Modal */}
      <Modal
        title="推荐职位给好友"
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        footer={null}
        width={400}
        centered
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {shareLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
          ) : friends.length === 0 ? (
            <Empty description="暂无可以推荐的学生好友" />
          ) : (
            <List
              dataSource={friends}
              renderItem={friend => (
                <List.Item
                  actions={[
                    <Button key="share" type="link" onClick={() => handleShareToFriend(friend.contact_id)}>发送</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={friend.avatar?.startsWith('http') ? friend.avatar : `http://localhost:3001${friend.avatar}`} icon={<UserOutlined />} />}
                    title={friend.username}
                    description={friend.org_name || '学生'}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
