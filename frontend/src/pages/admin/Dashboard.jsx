import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin, Space, Tag, Tooltip, Avatar, Divider } from 'antd';
import {
  TeamOutlined, BankOutlined, FileSearchOutlined,
  CheckCircleOutlined, UserOutlined, SafetyOutlined, SwapRightOutlined,
  BlockOutlined, BulbOutlined, SafetyCertificateOutlined, CodeOutlined
} from '@ant-design/icons';
import { adminApi } from '../../api/services';

const { Title, Text, Paragraph } = Typography;

const customStyles = `
  /* 全局容器底色设定 (更趋向清冷灰白宇宙感) */
  .admin-dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    padding-bottom: 40px;
  }

  /* 顶部统领级 Bento 盒子聚合区 */
  .bento-metric-card {
    background: #f8fafc;
    border-radius: 20px;
    padding: 24px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02), inset 0 2px 0 rgba(255,255,255,0.7);
    cursor: default;
  }
  .bento-metric-card:hover {
    transform: translateY(-4px) scale(1.02);
    background: #ffffff;
    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1);
  }

  .bento-icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 16px;
    box-shadow: 0 8px 16px -4px currentColor;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
  }

  /* 柔性漏斗可视化组 (Soft Funnel Group) */
  .soft-funnel-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 0;
  }
  
  .funnel-layer {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }
  .funnel-layer:hover {
    filter: brightness(1.1) drop-shadow(0 0 12px rgba(0,0,0,0.1));
    z-index: 10;
  }
  
  /* 悬浮脱轨数据牌 (Pill floating badges) */
  .funnel-floating-badge {
    position: absolute;
    right: -130px;
    background: #ffffff;
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 14px;
    color: #0f172a;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .funnel-floating-badge::before {
    content: '';
    position: absolute;
    left: -30px;
    top: 50%;
    width: 26px;
    height: 1px;
    background: #cbd5e1;
  }

  /* 内嵌结构 - 系统组件盒 (Nested Sub-boxes) */
  .system-bento-subbox {
    background: #f1f5f9;
    border-radius: 16px;
    padding: 20px;
    height: 100%;
    border: 1px solid rgba(255,255,255,0.5);
    transition: all 0.3s;
  }
  .system-bento-subbox:hover {
    background: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  }

  /* 科技内敛字 (Sky Blue Text) */
  .neon-text-ai {
    background: linear-gradient(to right, #0284c7, #0ea5e9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 800;
  }
  
  .neon-text-web3 {
    background: linear-gradient(to right, #0369a1, #0284c7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 800;
  }

  /* 系统脉冲呼吸灯 (Breathing Light Indicator) */
  .breathing-indicator {
    width: 10px;
    height: 10px;
    background-color: #38bdf8;
    border-radius: 50%;
    position: relative;
    display: inline-block;
  }
  .breathing-indicator::after {
    content: '';
    position: absolute;
    top: -4px; right: -4px; bottom: -4px; left: -4px;
    border-radius: 50%;
    border: 2px solid #38bdf8;
    animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(2.5); opacity: 0; }
  }
`;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminApi.getStats();
        setStats(res.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!stats) return null;

  const bentoMetrics = [
    { title: '平台注册总数', value: stats.userCount, icon: <UserOutlined />, color: '#0284c7', bg: '#e0f2fe' },
    { title: '在校学生', value: stats.stuCount, icon: <TeamOutlined />, color: '#0369a1', bg: '#e0f2fe' },
    { title: '认证企业', value: stats.entCount, icon: <BankOutlined />, color: '#0ea5e9', bg: '#f0f9ff' },
    { title: '开放岗位', value: stats.jobCount, icon: <FileSearchOutlined />, color: '#0284c7', bg: '#f0f9ff' },
    { title: '投递总量', value: stats.appCount, icon: <SafetyOutlined />, color: '#38bdf8', bg: '#e0f2fe' },
    { title: '完成签约', value: stats.signedCount, icon: <CheckCircleOutlined />, color: '#0ea5e9', bg: '#f0f9ff' },
  ];

  return (
    <div className="admin-dashboard-container">
      <style>{customStyles}</style>

      {/* Title Section */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
            🚀 系统主仪表盘
          </Title>
          <Text style={{ color: '#64748b', fontSize: 15, marginTop: 8, display: 'block' }}>
            监控各项核心数据与全局系统状态
          </Text>
        </div>

        {/* 全时监控灯珠指示 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', padding: '8px 16px', borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div className="breathing-indicator" />
          <Text strong style={{ color: '#334155', fontSize: 13 }}>系统运行正常</Text>
        </div>
      </div>

      {/* 顶部数字海矩阵 (6 Bento metrics) */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {bentoMetrics.map((c, i) => (
          <Col key={c.title} xs={12} sm={8} lg={4}>
            <div className="bento-metric-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div>
                <div className="bento-icon-wrapper" style={{ backgroundColor: c.bg, color: c.color }}>
                  {c.icon}
                </div>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{c.title}</Text>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginTop: 16, lineHeight: 1 }}>
                {c.value.toLocaleString()}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        {/* 手造柔性漏斗可视化 (Soft Funnel Grid) */}
        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ borderRadius: 20, height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
            bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 40 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800 }}>📉 招聘转化漏斗</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>从学生入驻到最终确立雇用的层级转化分析</Text>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="soft-funnel-container">
                {/* Layer 1: 在校学生 */}
                <div className="funnel-layer">
                  <svg width="280" height="90" viewBox="0 0 280 90">
                    <defs>
                      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 0 L 280 0 L 230 90 L 50 90 Z" fill="url(#g1)" />
                  </svg>
                  <div className="funnel-floating-badge" style={{ right: -140 }}>
                    <TeamOutlined style={{ color: '#0284c7' }} /> 在校学生 <Tag color="default" style={{ margin: 0, background: '#f0f9ff', border: '1px solid #bae6fd' }}>{stats.stuCount}</Tag>
                  </div>
                </div>

                {/* Layer 2: 投递总量 */}
                <div className="funnel-layer">
                  <svg width="180" height="90" viewBox="0 0 180 90">
                    <defs>
                      <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 0 L 180 0 L 120 90 L 60 90 Z" fill="url(#g2)" />
                  </svg>
                  <div className="funnel-floating-badge" style={{ right: -120, top: 20 }}>
                    <SafetyOutlined style={{ color: '#0284c7' }} /> 总投递数 <Tag color="default" style={{ margin: 0, background: '#f0f9ff', border: '1px solid #bae6fd' }}>{stats.appCount}</Tag>
                  </div>
                </div>

                {/* Layer 3: 完成签约 */}
                <div className="funnel-layer">
                  <svg width="60" height="90" viewBox="0 0 60 90">
                    <defs>
                      <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 0 L 60 0 L 40 90 L 20 90 Z" fill="url(#g3)" />
                  </svg>
                  <div className="funnel-floating-badge" style={{ right: -140, top: 20 }}>
                    <CheckCircleOutlined style={{ color: '#0ea5e9' }} /> 完成签约 <Tag color="default" style={{ margin: 0, background: '#e0f2fe', border: '1px solid #7dd3fc' }}>{stats.signedCount}</Tag>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 聚合核心子区块 - 系统运行状态栏 (Neon Stack Boxes) */}
        <Col xs={24} lg={14}>
          <Card bordered={false} style={{ borderRadius: 20, height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
            bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800 }}>🛡️ 系统运行状态</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>全局各依赖系统状态监控与版本信息</Text>
            </div>

            <Row gutter={[16, 16]} style={{ flex: 1 }}>
              {/* 智囊节点：AI Engine */}
              <Col span={24}>
                <div className="system-bento-subbox" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar size={48} style={{ background: '#e0f2fe', color: '#0ea5e9' }} icon={<BulbOutlined />} />
                    <div>
                      <Text style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 700 }}>AI 智能核心模型</Text>
                      <Text className="neon-text-ai" style={{ fontSize: 18 }}>智谱 简历诊断引擎 (运行中)</Text>
                    </div>
                  </div>
                  <Tag color="cyan" style={{ borderRadius: 12, padding: '4px 12px', border: 'none', fontWeight: 600 }}>服务正常</Tag>
                </div>
              </Col>

              {/* 信任节点：Web3 Blockchain */}
              <Col xs={24} md={12}>
                <div className="system-bento-subbox" style={{ background: '#f0f9ff' }}>
                  <BlockOutlined style={{ fontSize: 24, color: '#0284c7', marginBottom: 12 }} />
                  <Text style={{ display: 'block', color: '#0369a1', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>区块链信任中心</Text>
                  <Text className="neon-text-web3" style={{ fontSize: 16 }}>以太坊存证服务连接正常</Text>
                </div>
              </Col>

              {/* 高保真容器：Parse */}
              <Col xs={24} md={12}>
                <div className="system-bento-subbox" style={{ background: '#e0f2fe' }}>
                  <FileSearchOutlined style={{ fontSize: 24, color: '#0ea5e9', marginBottom: 12 }} />
                  <Text style={{ display: 'block', color: '#0369a1', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>高性能文档解析服务</Text>
                  <Text style={{ fontSize: 16, color: '#0284c7', fontWeight: 800 }}>Mammoth / PDF.js 联合解析</Text>
                </div>
              </Col>

              {/* 架构基座：Code Stack */}
              <Col span={24}>
                <div className="system-bento-subbox" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
                    <CodeOutlined style={{ fontSize: 18 }} />
                    <Text strong style={{ fontSize: 15 }}>核心技术栈 (Technology Stack)</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Tag bordered={false} color="default" style={{ background: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 13 }}>React 18 + Vite</Tag>
                    <Tag bordered={false} color="default" style={{ background: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 13 }}>Node.js Express</Tag>
                    <Tag bordered={false} color="default" style={{ background: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 13 }}>MySQL + RBAC</Tag>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 12 }}>
                    <Text type="secondary">所属产品线：职引星系统</Text>
                    <Text type="secondary">Build v2.1.0 稳定版</Text>
                  </div>
                </div>
              </Col>
            </Row>

          </Card>
        </Col>
      </Row>
    </div>
  );
}
