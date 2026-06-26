import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Statistic, Spin, Avatar, Button, Space, Divider, Progress, Empty } from 'antd';
import { UserOutlined, SendOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { studentApi } from '../../api/services';

const { Title, Text, Paragraph } = Typography;

const dashboardStyles = `
  .glass-banner {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.15);
  }
  .glass-banner::before {
    content: '';
    position: absolute;
    top: -50%; left: -10%;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
    filter: blur(40px);
  }
  .glass-banner::after {
    content: '';
    position: absolute;
    bottom: -50%; right: -10%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
    filter: blur(60px);
  }
  .stat-card {
    position: relative;
    overflow: hidden;
    border-radius: 16px !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.8) !important;
  }
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1);
  }
  .stat-card-blue { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); }
  .stat-card-orange { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); }
  .stat-card-green { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce3 100%); }
  
  .stat-bg-icon {
    position: absolute;
    right: -10px;
    bottom: -20px;
    font-size: 90px;
    opacity: 0.06;
    transform: rotate(-15deg);
    pointer-events: none;
    transition: all 0.3s ease;
  }
  .stat-card:hover .stat-bg-icon {
    transform: rotate(0deg) scale(1.1);
    opacity: 0.1;
  }
  
  .app-list-item {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
  }
  .app-list-item:hover {
    background: #ffffff !important;
    border-color: #e2e8f0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    transform: translateX(4px);
  }
`;

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [appRes, profileRes] = await Promise.all([
          studentApi.getApplications({ page: 1, pageSize: 100 }), // Get all apps for stats
          studentApi.getProfile()
        ]);
        setApps(appRes.data.list || []);
        setProfile(profileRes.data || {});
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  const totalApplied = apps.length;
  const interviewing = apps.filter(a => a.status === 'interviewing').length;
  const offered = apps.filter(a => a.status === 'offered' || a.status === 'signed').length;
  
  // Calculate profile completeness loosely
  let completeness = 30;
  if (profile?.real_name) completeness += 20;
  if (profile?.school_name) completeness += 20;
  if (profile?.major) completeness += 15;
  if (profile?.self_intro) completeness += 15;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return '早上好';
    if (hour >= 11 && hour < 13) return '中午好';
    if (hour >= 13 && hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <style>{dashboardStyles}</style>

      {/* 欢迎模块 */}
      <Card bordered={false} className="glass-banner" style={{ borderRadius: 20, marginBottom: 24 }}>
        <Row align="middle" gutter={24} style={{ position: 'relative', zIndex: 2 }}>
          <Col>
            <Avatar size={76} icon={<UserOutlined />} 
              src={user?.avatar?.startsWith('http') ? user.avatar : `http://localhost:3001${user?.avatar}`}
              style={{ backgroundColor: '#6366f1', border: '4px solid #ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          </Col>
          <Col flex="1">
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
              {getGreeting()}，{profile?.real_name || user?.username}！欢迎来到职引星
            </Title>
            <Paragraph style={{ color: '#475569', marginTop: 10, marginBottom: 0, fontSize: 16 }}>
              {profile?.school_name ? <span style={{fontWeight:500}}>你是来自 {profile.school_name} 的优秀学子，</span> : ''}去追寻你的心仪岗位吧！
            </Paragraph>
          </Col>
          <Col>
            <Space>
              <Button type="primary" size="large" icon={<RocketOutlined />} onClick={() => navigate('/student/jobs')} 
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)', borderRadius: '10px', height: '48px', padding: '0 24px', fontSize: '16px' }}>
                立 即 启 航
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 数据统计 */}
        <Col xs={24} md={16}>
          <Card title={<span style={{fontSize: 18, fontWeight: 700}}>📊 我的求职进度</span>} bordered={false} style={{ borderRadius: 20, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Card className="stat-card stat-card-blue" bordered={false} bodyStyle={{ padding: '24px' }}>
                  <SendOutlined className="stat-bg-icon" style={{ color: '#3b82f6' }} />
                  <Statistic 
                    title={<Text type="secondary" style={{fontSize: 15}}>本月已投递</Text>} 
                    value={totalApplied} 
                    valueStyle={{ color: '#2563eb', fontWeight: 800, fontSize: 32 }} 
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="stat-card stat-card-orange" bordered={false} bodyStyle={{ padding: '24px' }}>
                  <ClockCircleOutlined className="stat-bg-icon" style={{ color: '#f59e0b' }} />
                  <Statistic 
                    title={<Text type="secondary" style={{fontSize: 15}}>面试邀约</Text>} 
                    value={interviewing} 
                    valueStyle={{ color: '#d97706', fontWeight: 800, fontSize: 32 }} 
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="stat-card stat-card-green" bordered={false} bodyStyle={{ padding: '24px' }}>
                  <CheckCircleOutlined className="stat-bg-icon" style={{ color: '#10b981' }} />
                  <Statistic 
                    title={<Text type="secondary" style={{fontSize: 15}}>获得 Offer</Text>} 
                    value={offered} 
                    valueStyle={{ color: '#059669', fontWeight: 800, fontSize: 32 }} 
                  />
                </Card>
              </Col>
            </Row>
            
            <Divider style={{ margin: '32px 0 24px' }} />
            
            <div>
              <Title level={5} style={{ marginBottom: 20, fontWeight: 700 }}>🕒 最近投递动态</Title>
              {apps.length === 0 ? (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description={<Text type="secondary" style={{fontSize: 15}}>当前还没有投递记录呢</Text>}
                  style={{ padding: '30px 0' }}
                >
                  <Button type="primary" onClick={() => navigate('/student/jobs')} style={{ borderRadius: 8, background: '#3b82f6', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
                    去广场发现机会
                  </Button>
                </Empty>
              ) : (
                apps.slice(0, 4).map(app => (
                  <div key={app.id} className="app-list-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', background: '#f8fafc', borderRadius: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b' }}>{app.job_title}</div>
                      <Text type="secondary" style={{ fontSize: 13 }}>{app.company_name}</Text>
                    </div>
                    <div style={{ alignSelf: 'center' }}>
                      <Button style={{ borderRadius: 6, fontWeight: 500 }} onClick={() => navigate('/student/applications')}>查看进度</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>

        {/* 档案完成度 & 快捷操作 */}
        <Col xs={24} md={8}>
          <Card title={<span style={{fontSize: 18, fontWeight: 700}}>📝 简历与档案</span>} bordered={false} style={{ borderRadius: 20, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ textAlign: 'center', padding: '24px 0 10px' }}>
              <Progress
                type="circle"
                percent={completeness}
                size={160}
                strokeWidth={8}
                strokeColor={{
                  '0%': '#3b82f6',
                  '100%': '#8b5cf6',
                }}
                format={(percent) => (
                  <div style={{ display: 'flex', flexDirection: 'column', color: '#1e293b' }}>
                    <span style={{ fontSize: 36, fontWeight: 800 }}>{percent}%</span>
                  </div>
                )}
              />
              <Title level={4} style={{ marginTop: 24, marginBottom: 8, fontWeight: 700 }}>档案完成度</Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                完善度越高，企业通过率越高！
              </Text>
            </div>
            
            <Space direction="vertical" style={{ width: '100%', marginTop: 32 }} size="middle">
              <Button block type="primary" size="large" onClick={() => navigate('/settings')} style={{ borderRadius: 10, fontWeight: 600, background: '#1e293b', borderColor: '#1e293b' }}>
                去完善档案信息
              </Button>
              <Button block size="large" onClick={() => navigate('/student/resumes')} style={{ borderRadius: 10, fontWeight: 500, color: '#475569', borderColor: '#cbd5e1' }}>
                管理附件简历 (PDF/Word)
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
