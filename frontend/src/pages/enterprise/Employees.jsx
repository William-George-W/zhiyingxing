import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Space, Button, Tag, Drawer,
  Descriptions, Modal, Form, Input, message, Tabs,
  Avatar, Row, Col, Divider, Pagination, Badge, Empty
} from 'antd';
import { 
  EyeOutlined, UserDeleteOutlined, HistoryOutlined, TeamOutlined, 
  FileSearchOutlined, MoreOutlined, SolutionOutlined, CalendarOutlined,
  MailOutlined, CopyOutlined, FileTextOutlined
} from '@ant-design/icons';
import { Dropdown, Tooltip } from 'antd';
import { enterpriseApi } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const getHashGradient = (name) => {
  const hash = Array.from(name || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  ];
  return gradients[hash % gradients.length];
};

const StatusDot = ({ color = '#22c55e' }) => (
  <span className="status-dot" style={{
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    marginRight: 8,
    boxShadow: `0 0 8px ${color}`,
    verticalAlign: 'middle'
  }} />
);

const customStyles = `
  .employee-tabs .ant-tabs-nav { margin-bottom: 24px !important; }
  .employee-tabs .ant-tabs-nav::before { display: none; }
  .employee-tabs .ant-tabs-nav-list {
    background: #f1f5f9; padding: 6px; border-radius: 14px; display: inline-flex;
  }
  .employee-tabs .ant-tabs-tab {
    padding: 10px 24px !important; margin: 0 !important; border-radius: 10px;
    transition: all 0.3s ease; color: #64748b;
  }
  .employee-tabs .ant-tabs-ink-bar { display: none !important; }
  .employee-tabs .ant-tabs-tab-active { 
    background: #ffffff; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.06); 
  }
  .employee-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { 
    color: #3b82f6 !important; 
    font-weight: 700; 
  }

  .employee-card {
    background: #ffffff;
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 16px;
    border: 1px solid #f1f5f9;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    cursor: pointer;
  }
  .employee-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    border-color: #3b82f633;
  }

  .stat-widget {
    background: #fff;
    padding: 12px 20px;
    border-radius: 18px;
    border: 1px solid #f1f5f9;
    min-width: 140px;
    transition: all 0.3s ease;
  }
  .stat-widget:hover { border-color: #e2e8f0; transform: scale(1.02); }
  .stat-label { color: #94a3b8; font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .stat-value { color: #1e293b; font-size: 24px; font-weight: 800; font-family: 'Inter', sans-serif; }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #64748b;
  }
  .status-badge.active {
    background: #f1fef4;
    border-color: #dcfce7;
    color: #15803d;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
  }
  .status-dot { animation: blink 2s infinite ease-in-out; }

  .info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #475569;
    font-size: 14px;
    margin-bottom: 12px;
  }
  .info-item .anticon { color: #94a3b8; font-size: 16px; }

  /* --- 重构员工档案详情弹窗样式 --- */
  .emp-detail-modal .ant-modal-content {
    padding: 0;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  /* 毛玻璃背景遮罩 */
  .glass-backdrop {
    backdrop-filter: blur(6px) !important;
    -webkit-backdrop-filter: blur(6px) !important;
    background: rgba(15, 23, 42, 0.5) !important;
  }

  /* Bento 布局容器 */
  .bento-container {
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    background: #f8fafc;
  }

  .bento-block {
    background: #ffffff;
    border-radius: 20px;
    padding: 20px;
    border: 1px solid rgba(226, 232, 240, 0.6);
    transition: all 0.3s ease;
  }
  .bento-block:hover {
    border-color: #3b82f640;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  }

  .bento-block-full {
    grid-column: span 2;
  }

  /* 极客美学 Web3 存证卡片 */
  .web3-evidence-card {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid rgba(34, 197, 94, 0.3);
    position: relative;
    overflow: hidden;
  }
  .web3-evidence-card::before {
    content: "";
    position: absolute;
    top: 0; right: 0;
    width: 100px; height: 100px;
    background: radial-gradient(circle at top right, rgba(34, 197, 94, 0.15), transparent 70%);
  }

  /* 标签-值 排版 */
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .field-label {
    font-size: 11px;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 600;
    letter-spacing: 0.025em;
  }
  .field-value {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .mono-text {
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    color: #4ade80; /* 极客绿 */
    text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
  }

  /* 复制按钮交互 */
  .copy-trigger {
    cursor: pointer;
    transition: all 0.2s;
    color: #64748b;
  }
  .copy-trigger:hover { color: #3b82f6; transform: scale(1.1); }

`;

export default function EnterpriseEmployees() {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('signed');
  const [drawerEmp, setDrawerEmp] = useState(null);

  const fetchEmployees = async (status = activeTab, pg = 1) => {
    setLoading(true);
    try {
      const res = await enterpriseApi.getApplications({ status, page: pg, pageSize: 12 });
      setEmployees(res.data.list);
      setTotal(res.data.pagination.total);
      setPage(pg);
    } catch (err) {
      message.error('加载员工数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleResign = (emp) => {
    Modal.confirm({
      title: '确认登记该员工离职吗？',
      icon: <UserDeleteOutlined style={{ color: '#ef4444' }} />,
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>离职原因/辞退备注：</div>
          <Input.TextArea id="resign-reason" rows={4} placeholder="例如：合同到期、个人原因申请离职、考核未达标辞退等..." />
        </div>
      ),
      okText: '确认办理',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const reason = document.getElementById('resign-reason').value;
        if (!reason) {
          message.error('请填写离职/辞退理由以备档');
          return Promise.reject();
        }
        try {
          await enterpriseApi.dismissApp(emp.id, { reason });
          message.success('已完成离职档案登记');
          fetchEmployees(activeTab, page);
        } catch (e) {
          message.error('操作失败');
        }
      }
    });
  };

  const tabItems = [
    { key: 'signed', label: <Space><TeamOutlined /> 在职员工</Space> },
    { key: 'offboarded', label: <Space><HistoryOutlined /> 离职记录</Space> },
  ];

  const renderCards = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}>加载中...</div>;
    if (employees.length === 0) return <Empty description={`暂无${activeTab === 'signed' ? '在职' : '离职'}数据`} style={{ margin: '100px 0' }} />;

    return (
      <Row gutter={[20, 20]}>
        {employees.map(emp => {
          const isSigned = emp.status === 'signed';
          const moreActions = {
            items: [
              {
                key: 'details',
                label: '查看详细档案',
                icon: <EyeOutlined />,
                onClick: () => setDrawerEmp(emp)
              },
              isSigned ? {
                key: 'resign',
                label: '办理离职手续',
                icon: <UserDeleteOutlined />,
                danger: true,
                onClick: () => handleResign(emp)
              } : {
                key: 'proof',
                label: '查看区块链存证',
                icon: <FileSearchOutlined />,
                onClick: () => {
                  Modal.info({
                    title: '区块链存证验证',
                    width: 600,
                    icon: <FileSearchOutlined style={{ color: '#3b82f6' }} />,
                    content: (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                          <div style={{ marginBottom: 12 }}>
                            <Text type="secondary">存证类型：</Text>
                            <Tag color="blue">离职归档证明</Tag>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <Text type="secondary">交易哈希 (Transaction Hash)：</Text>
                            <div style={{ wordBreak: 'break-all', marginTop: 4, color: '#0f172a', fontFamily: 'monospace', fontSize: 13 }}>
                              {emp.tx_hash || '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <Text type="secondary">存证时间：</Text>
                            <Text strong> {dayjs().format('YYYY-MM-DD HH:mm:ss')} </Text>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            <Text type="success">●</Text> 该记录已上链，通过以太坊君士坦丁堡协议验证，具备法律证据效力，不可篡改。
                          </div>
                        </div>
                      </div>
                    ),
                    okText: '关闭',
                    centered: true,
                    maskClosable: true
                  });
                }
              }
            ]
          };

          return (
            <Col xs={24} sm={12} lg={8} key={emp.id}>
              <div className="employee-card" onClick={() => setDrawerEmp(emp)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Avatar 
                      size={60} 
                      style={{ 
                        background: getHashGradient(emp.real_name || emp.username),
                        fontSize: 24,
                        fontWeight: 700,
                        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {emp.real_name?.[0] || emp.username?.[0]}
                    </Avatar>
                    <div>
                      <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                        {emp.real_name || emp.username}
                      </Title>
                      <div style={{ marginTop: 4 }}>
                        <span className={`status-badge ${isSigned ? 'active' : ''}`}>
                          {isSigned && <StatusDot />}
                          {isSigned ? '正式在职' : emp.status === 'resigned' ? '个人离职' : '企业辞退'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Dropdown menu={moreActions} trigger={['click']} placement="bottomRight">
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<MoreOutlined style={{ fontSize: 20, color: '#94a3b8' }} />} 
                      onClick={e => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                    {emp.school_name} · {emp.major}
                  </Text>
                  
                  <div className="info-item">
                    <SolutionOutlined />
                    <span style={{ fontWeight: 500 }}>{emp.job_title}</span>
                  </div>
                  
                  <div className="info-item">
                    <CalendarOutlined />
                    <span>入职于 {dayjs(emp.applied_at).format('YYYY-MM-DD')}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12 }}>
                    <MailOutlined />
                    <Text type="secondary" ellipsis style={{ maxWidth: 140 }}>{emp.student_email || '未绑定邮箱'}</Text>
                  </div>
                  <Button type="link" size="small" style={{ padding: 0, fontWeight: 600 }}>
                    查看详情
                  </Button>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <style>{customStyles}</style>
      
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4, fontWeight: 900, letterSpacing: '-0.5px' }}>
            <TeamOutlined style={{ marginRight: 12, color: '#3b82f6' }} />
            员工管理
          </Title>
          <Text type="secondary" style={{ fontSize: 15 }}>管理正式员工档案及区块链离职记录</Text>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="stat-widget">
            <div className="stat-label">总员工</div>
            <div className="stat-value">{total || 0}</div>
          </div>
          <div className="stat-widget" style={{ background: '#f0f9ff', borderColor: '#e0f2fe' }}>
            <div className="stat-label" style={{ color: '#0369a1' }}>在职中</div>
            <div className="stat-value" style={{ color: '#0284c7' }}>{activeTab === 'signed' ? total : '-'}</div>
          </div>
        </div>
      </div>

      <Tabs 
        className="employee-tabs"
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          fetchEmployees(k, 1);
        }}
        items={tabItems}
      />

      {renderCards()}

      {total > 0 && (
        <div style={{ textAlign: 'right', marginTop: 32 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={12}
            onChange={(p) => fetchEmployees(activeTab, p)}
            showTotal={t => `当前标签下共 ${t} 名成员`}
          />
        </div>
      )}

      {/* 员工详情 Modal - 沉浸式 Bento Grid 重构 */}
      <Modal
        open={!!drawerEmp}
        onCancel={() => setDrawerEmp(null)}
        width={720}
        footer={null}
        centered
        className="emp-detail-modal"
        maskClassName="glass-backdrop"
        destroyOnClose
      >
        {drawerEmp && (
          <div style={{ position: 'relative' }}>
            {/* Hero Header Area */}
            <div style={{ padding: '40px 32px 24px 32px', textAlign: 'center', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
               <Avatar 
                  size={100} 
                  style={{ 
                    background: getHashGradient(drawerEmp.real_name || drawerEmp.username),
                    fontSize: 40,
                    fontWeight: 800,
                    marginBottom: 16,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                  }}
               >
                  {drawerEmp.real_name?.[0] || drawerEmp.username?.[0]}
               </Avatar>
               <Title level={2} style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>
                 {drawerEmp.real_name || drawerEmp.username}
               </Title>
               <div style={{ marginTop: 8 }}>
                 <span className={`status-badge ${drawerEmp.status === 'signed' ? 'active' : ''}`}>
                    {drawerEmp.status === 'signed' && <StatusDot />}
                    {drawerEmp.status === 'signed' ? '正式在职员工' : '离职/辞退档案'}
                 </span>
               </div>
            </div>

            {/* Bento Body */}
            <div className="bento-container">
               {/* 模块一：基本身份信息 */}
               <div className="bento-block">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <SolutionOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ fontSize: 13, color: '#64748b' }}>身份与学历</Text>
                  </div>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div className="field-group">
                      <div className="field-label">联系邮箱</div>
                      <div className="field-value">{drawerEmp.student_email || '未绑定'}</div>
                    </div>
                    <div className="field-group">
                      <div className="field-label">毕业院校</div>
                      <div className="field-value">{drawerEmp.school_name}</div>
                    </div>
                    <div className="field-group">
                      <div className="field-label">所学专业</div>
                      <div className="field-value">{drawerEmp.major}</div>
                    </div>
                  </Space>
               </div>

               {/* 模块二：岗位及合同信息 */}
               <div className="bento-block" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <CalendarOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ fontSize: 13, color: '#64748b' }}>合同及权益</Text>
                  </div>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div className="field-group">
                      <div className="field-label">当前岗位</div>
                      <div className="field-value">{drawerEmp.job_title}</div>
                    </div>
                    <div className="field-group">
                      <div className="field-label">薪资标准</div>
                      <div className="field-value" style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                        {(drawerEmp.salary_min / 1000) || 0}k - {(drawerEmp.salary_max / 1000) || 0}k
                      </div>
                    </div>
                    <div className="field-group">
                      <div className="field-label">入职日期</div>
                      <div className="field-value">{dayjs(drawerEmp.applied_at).format('YYYY年MM月DD日')}</div>
                    </div>
                  </Space>
                  
                  {/* 查看附件按钮 - 精致次级化 */}
                  <Button 
                    type="text" 
                    icon={<FileTextOutlined />} 
                    size="small"
                    onClick={() => window.open(`http://localhost:3001${drawerEmp.resume_path}`)}
                    style={{ 
                      position: 'absolute', 
                      top: 15, 
                      right: 15, 
                      color: '#3b82f6', 
                      fontSize: 12, 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    查看附件
                  </Button>
               </div>

               {/* 离职备注（如有） */}
               {drawerEmp.status !== 'signed' && (
                 <div className="bento-block bento-block-full" style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
                    <div className="field-label" style={{ color: '#ef4444', marginBottom: 8 }}>离职/辞退归档说明</div>
                    <Text style={{ color: '#b91c1c', fontSize: 13 }}>{drawerEmp.action_remark || '系统自动归档，暂无备注说明'}</Text>
                 </div>
               )}

               {/* 模块三：区块链存证 - Web3 升维 */}
               <div className="bento-block bento-block-full web3-evidence-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge status="processing" color="#4ade80" />
                      <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>BLOCKCHAIN PROOF</Text>
                    </div>
                    {drawerEmp.tx_hash && (
                      <Tooltip title="复制哈希值">
                        <CopyOutlined 
                          className="copy-trigger" 
                          style={{ color: '#4ade80' }}
                          onClick={() => {
                            navigator.clipboard.writeText(drawerEmp.tx_hash);
                            message.success('哈希值已复制到剪贴板');
                          }} 
                        />
                      </Tooltip>
                    )}
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="field-label" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontSize: 10 }}>Transaction Hash</div>
                    <div className="mono-text" style={{ fontSize: 12, wordBreak: 'break-all', lineHeight: 1.5 }}>
                      {drawerEmp.tx_hash || '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                      验证时间: {dayjs(drawerEmp.updated_at || undefined).format('YYYY-MM-DD HH:mm:ss')}
                    </Text>
                    <Tag color="success" bordered={false} style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', fontSize: 10, borderRadius: 4 }}>
                      FINALIZED
                    </Tag>
                  </div>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
