import React, { useEffect, useState } from 'react';
import {
  Tag, Card, Button, Typography, Space, Tooltip,
  Modal, Descriptions, Empty, Input, message, Progress, Popover,
  Row, Col, Segmented, Pagination, Spin, Alert, Steps
} from 'antd';
import {
  EyeOutlined, ClockCircleOutlined, SafetyCertificateOutlined,
  RobotOutlined, SyncOutlined, EnvironmentOutlined, ApartmentOutlined, CodeOutlined
} from '@ant-design/icons';
import { studentApi } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const statusConfig = {
  applied: { text: '已投递', icon: '📤', bgColor: '#f1f5f9', fontColor: '#475569' },
  screening: { text: '筛选中', icon: '🔍', bgColor: '#e0f2fe', fontColor: '#0284c7' },
  passed: { text: '简历通过', icon: '✅', bgColor: '#cffafe', fontColor: '#0891b2' },
  interviewing: { text: '面试中', icon: '💬', bgColor: '#dbeafe', fontColor: '#2563eb' },
  offered: { text: '录用通知', icon: '🎉', bgColor: '#fef08a', fontColor: '#ca8a04' },
  signed: { text: '已签约', icon: '🤝', bgColor: '#dcfce3', fontColor: '#16a34a' },
  rejected: { text: '未通过', icon: '❌', bgColor: '#fee2e2', fontColor: '#dc2626' },
  dismissed: { text: '已辞退', icon: '🚫', bgColor: '#ffedd5', fontColor: '#ea580c' },
  resigned: { text: '已辞职', icon: '🏃', bgColor: '#ffe4e6', fontColor: '#e11d48' },
};

const getStepCurrentAndStatus = (status) => {
  const map = {
    'applied': { current: 0, status: 'finish' },
    'screening': { current: 1, status: 'process' },
    'passed': { current: 2, status: 'wait' },
    'interviewing': { current: 2, status: 'process' },
    'offered': { current: 3, status: 'finish' },
    'signed': { current: 3, status: 'finish' },
    'rejected': { current: 1, status: 'error' },
    'dismissed': { current: 3, status: 'error' },
    'resigned': { current: 3, status: 'wait' }
  };
  return map[status] || { current: 0, status: 'wait' };
};

const appStyles = `
  .custom-segmented-container {
    background: #f8fafc;
    border-radius: 16px;
    padding: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.02) inset;
    overflow-x: auto;
    white-space: nowrap;
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    border: 1px solid #e2e8f0;
    margin-bottom: 24px;
    display: flex;
  }
  .custom-segmented-container::-webkit-scrollbar {
    display: none;
  }
  .custom-segmented .ant-segmented-item {
    border-radius: 12px;
    padding: 8px 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: #64748b;
  }
  .custom-segmented .ant-segmented-item-selected {
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    color: #0f172a;
    font-weight: 600;
  }

  @keyframes web3-pulse {
    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
    70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
  }
  .web3-tag-pending {
    background: #eef2ff !important;
    border: 1px solid #c7d2fe !important;
    color: #4f46e5 !important;
    animation: web3-pulse 2s infinite;
    position: relative;
    padding: 4px 12px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .web3-tag-verified {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce3 100%) !important;
    border: 1px solid #86efac !important;
    color: #16a34a !important;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    position: relative;
    padding: 4px 12px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .web3-tag-verified:hover {
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
    transform: scale(1.02);
  }

  .job-row-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    background: #ffffff;
    border-radius: 16px;
    margin-bottom: 16px;
    border: 1px solid #f1f5f9;
    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }
  .job-row-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 32px -8px rgba(0,0,0,0.08);
    border-color: #cbd5e1;
    background: #f8fafc;
  }
  
  .status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid rgba(0,0,0,0.05);
  }

  .salary-text {
    color: #d97706;
    font-weight: 700;
    font-size: 15px;
  }

  .job-action-btn {
    opacity: 0.3;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: #f1f5f9 !important;
    color: #475569 !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
  }
  .job-row-card:hover .job-action-btn {
    opacity: 1;
    background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
  }
  
  .company-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #94a3b8, #cbd5e1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    font-weight: 800;
    flex-shrink: 0;
  }

  /* Bento 专属区块 */
  .bento-box {
    background: #f8fafc;
    border-radius: 16px;
    padding: 24px;
    border: 1px solid #f1f5f9;
  }
  .bento-header {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 极客风深色 Web3 卡片 */
  .web3-dark-card {
    background: #0f172a;
    border-radius: 16px;
    padding: 24px;
    border: 1px solid #334155;
    color: #e2e8f0;
    position: relative;
    box-shadow: inset 0 0 40px rgba(0,0,0,0.5);
  }
  .web3-dark-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, #22c55e, transparent);
    opacity: 0.3;
  }
  .hash-text {
    font-family: 'Courier New', Courier, monospace;
    color: #22c55e;
    font-size: 13px;
    word-break: break-all;
    line-height: 1.5;
    background: rgba(34, 197, 94, 0.1);
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px dashed rgba(34, 197, 94, 0.3);
  }
  /* AI 智算中心专属深色卡片 */
  .ai-compute-card {
    background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid #312e81;
    color: #e2e8f0;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
  }
  .ai-compute-card::after {
    content: '';
    position: absolute;
    top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }
  .ai-status-tag {
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.4);
    color: #818cf8;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export default function StudentApplications() {
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [blockchainData, setBlockchainData] = useState(null);

  const fetch = async (status = activeStatus, pg = page) => {
    setLoading(true);
    try {
      const res = await studentApi.getApplications({ status, page: pg, pageSize: 10 });
      setApps(res.data.list);
      setTotal(res.data.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleResign = (id) => {
    Modal.confirm({
      title: '确认辞职吗？',
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>请填写辞职理由：</div>
          <Input.TextArea id="resign-reason" rows={4} placeholder="请输入辞职理由..." />
        </div>
      ),
      onOk: async () => {
        const reason = document.getElementById('resign-reason').value;
        if (!reason) {
          message.error('请填写辞职理由');
          return Promise.reject();
        }
        try {
          await studentApi.resign(id, { reason });
          message.success('辞职成功');
          fetch(activeStatus, page);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleVerifyBlockchain = async (txHash) => {
    setVerifyLoading(true);
    setBlockchainData(null);
    try {
      const res = await studentApi.verifyBlockchain(txHash);
      setBlockchainData(res.data);
      message.success('链上数据侦测并解构成功');
    } catch (e) {
      console.error(e);
      message.error('终端核验失败：' + (e.response?.data?.message || e.message));
    } finally {
      setVerifyLoading(false);
    }
  };

  const segmentItems = [
    { value: '', label: <span style={{ fontSize: 15 }}>全部</span> },
    ...Object.entries(statusConfig).map(([k, v]) => ({
      value: k,
      label: <span style={{ fontSize: 15 }}>{v.icon} {v.text}</span>,
    }))
  ];

  return (
    <div>
      <style>{appStyles}</style>
      <Title level={4} style={{ marginBottom: 20 }}>📋 我的投递动态</Title>

      {/* 现代胶囊分段 Tab 组件 */}
      <div className="custom-segmented-container">
        <Segmented
          className="custom-segmented"
          options={segmentItems}
          value={activeStatus}
          onChange={(k) => { setActiveStatus(k); setPage(1); fetch(k, 1); }}
        />
      </div>

      {/* 统计提示 */}
      <div style={{ margin: '4px 8px 16px', color: '#64748b', fontSize: 15 }}>
        共找到 <Text strong style={{ color: '#3b82f6', fontSize: 18 }}>{total}</Text> 份投递记录
      </div>

      {/* 列表流 (代替 Table) */}
      <div className="app-card-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
            <Spin size="large" tip={<div style={{ marginTop: 16, color: '#475569', fontSize: 16, fontWeight: 500 }}>同步上链数据中，请稍后...</div>} />
          </div>
        ) : apps.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 16, padding: '60px 0' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<Text type="secondary" style={{ fontSize: 16 }}>该分类下暂无投递数据</Text>}
            />
          </Card>
        ) : (
          apps.map((app) => {
            const cfg = statusConfig[app.status] || {};
            return (
              <div key={app.id} className="job-row-card" onClick={() => setDetailModal(app)}>

                {/* 1. 左侧职务详情 */}
                <div style={{ flex: 1.5 }}>
                  <Row align="middle" gutter={16} wrap={false}>
                    <Col>
                      <div className="company-logo">
                        {app.company_name?.[0]}
                      </div>
                    </Col>
                    <Col flex="1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <Text style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{app.job_title}</Text>
                        <span className="status-badge" style={{ background: cfg.bgColor, color: cfg.fontColor }}>
                          {cfg.icon} {cfg.text}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Text type="secondary" style={{ fontWeight: 500, color: '#475569' }}>{app.company_name}</Text>
                        <Text className="salary-text">
                          {app.salary_min && app.salary_max ? `${app.salary_min / 1000}K-${app.salary_max / 1000}K` : '面议'}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* 2. 中间时间与反馈 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    投递：{dayjs(app.applied_at).format('YYYY-MM-DD HH:mm')}
                  </Text>
                  {app.interview_time && (
                    <Space style={{ background: '#f0f9ff', padding: '4px 8px', borderRadius: 6, border: '1px solid #bae6fd' }}>
                      <ClockCircleOutlined style={{ color: '#0ea5e9' }} />
                      <Text style={{ color: '#0369a1', fontSize: 13, fontWeight: 500 }}>
                        面试: {dayjs(app.interview_time).format('MM-DD HH:mm')}
                      </Text>
                    </Space>
                  )}
                  {app.enterprise_remark && (
                    <div style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '4px 8px', borderRadius: 6 }}>
                      <strong>反馈:</strong> {app.enterprise_remark.length > 20 ? app.enterprise_remark.substring(0, 20) + '...' : app.enterprise_remark}
                    </div>
                  )}
                </div>

                {/* 3. 区块链 Web3 存证状态 */}
                <div style={{ flex: 0.8, textAlign: 'center' }}>
                  {app.tx_hash ? (
                    <Tooltip title="点击徽章立刻前往核验防伪数据">
                      <div className="web3-tag-verified" onClick={(e) => { e.stopPropagation(); setDetailModal(app); }}>
                        <SafetyCertificateOutlined /> 已链上存证
                      </div>
                    </Tooltip>
                  ) : (
                    <div className="web3-tag-pending">
                      <SyncOutlined spin /> 存证打包中
                    </div>
                  )}
                </div>

                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'flex-end', flex: 0.5 }}>
                    <Button size="large" className="job-action-btn" icon={<EyeOutlined />}>详情</Button>
                  </div>

              </div>
            );
          })
        )}
      </div>

      {/* 底部翻页 */}
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 40 }}>
          <Pagination
            current={page}
            pageSize={10}
            total={total}
            showSizeChanger={false}
            onChange={(p) => { setPage(p); fetch(activeStatus, p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </div>
      )}

      {/* 详情弹窗 Modal 优化为左右双列 Bento 及暗黑 Web3 呈现 */}
      <Modal
        open={!!detailModal}
        onCancel={() => { setDetailModal(null); setBlockchainData(null); }}
        footer={null}
        width={950}
        centered
        closeIcon={<span style={{ fontSize: 18 }}>✖</span>}
      >
        {detailModal && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* --- 顶部中枢区：横向延展岗位快照 --- */}
            <div className="bento-box" style={{ padding: '24px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div className="company-logo" style={{ width: 64, height: 64, fontSize: 28, borderRadius: 16 }}>
                    {detailModal.company_name?.[0]}
                  </div>
                  <div>
                    <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{detailModal.job_title}</Title>
                    <Space size="middle" style={{ marginTop: 8, color: '#475569', fontSize: 14 }}>
                      <span><ApartmentOutlined /> {detailModal.company_name}</span>
                      <span><EnvironmentOutlined /> {detailModal.city}</span>
                      <span className="salary-text">
                        {detailModal.salary_min && detailModal.salary_max ? `${detailModal.salary_min / 1000}K - ${detailModal.salary_max / 1000}K` : '面议薪资'}
                      </span>
                    </Space>
                  </div>
                </div>
                <div>
                  <span className="status-badge" style={{ background: statusConfig[detailModal.status]?.bgColor, color: statusConfig[detailModal.status]?.fontColor, fontSize: 15, padding: '8px 16px' }}>
                    {statusConfig[detailModal.status]?.icon} {statusConfig[detailModal.status]?.text}
                  </span>
                </div>
              </div>
            </div>

            {/* --- 底部双列底盘：人机协管 --- */}
            <Row gutter={24} style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* == 下左舷：时空调度 (Timeline) == */}
              <Col span={10} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Timeline 轨道槽 */}
                <div className="bento-box">
                  <div className="bento-header">
                    <ClockCircleOutlined style={{ color: '#3b82f6' }} /> 动态溯源轨迹
                  </div>
                  <div style={{ padding: '16px 8px 0', minHeight: 250 }}>
                    <Steps
                      direction="vertical"
                      current={getStepCurrentAndStatus(detailModal.status).current}
                      status={getStepCurrentAndStatus(detailModal.status).status}
                      items={[
                        { title: '简历已投递', description: dayjs(detailModal.applied_at).format('YYYY-MM-DD HH:mm') },
                        { title: '企业端筛选', description: '正在多维评估履历契合度' },
                        {
                          title: '面试邀请',
                          description: detailModal.interview_time
                            ? <span style={{ color: '#0ea5e9' }}>已约至: {dayjs(detailModal.interview_time).format('MM-DD HH:mm')}</span>
                            : '等候面试通知'
                        },
                        { title: '最终缔约', description: '等待 Offer 发放或回绝' },
                      ]}
                    />
                  </div>

                  {detailModal.enterprise_remark && (
                    <Alert
                      style={{ marginTop: 16, borderRadius: 10 }}
                      message="企业回执信息"
                      description={detailModal.enterprise_remark}
                      type="info"
                      showIcon
                    />
                  )}
                  {detailModal.action_remark && (
                    <Alert
                      style={{ marginTop: 16, borderRadius: 10 }}
                      message="特别阻断原因"
                      description={detailModal.action_remark}
                      type="warning"
                      showIcon
                    />
                  )}
                  {detailModal.status === 'signed' && (
                    <div style={{ marginTop: 24, textAlign: 'left' }}>
                      <Button danger type="primary" style={{ borderRadius: 8 }} onClick={() => { setDetailModal(null); handleResign(detailModal.id); }}>
                        辞职
                      </Button>
                    </div>
                  )}
                </div>

              </Col>

              {/* == 下右舷：去中心化节点与智算前哨 == */}
              <Col span={14} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="web3-dark-card">
                  <div className="bento-header" style={{ color: '#e2e8f0', marginBottom: 24 }}>
                    <CodeOutlined style={{ color: '#22c55e', fontSize: 20 }} />
                    <span>Web3 Proof / 去中心化防伪凭证台</span>
                    {detailModal.tx_hash && (
                      <Button
                        type="primary"
                        size="small"
                        loading={verifyLoading}
                        onClick={() => handleVerifyBlockchain(detailModal.tx_hash)}
                        style={{ marginLeft: 'auto', background: '#16a34a', border: 'none', borderRadius: 6, fontWeight: 600 }}
                      >
                        Run Node Sync
                      </Button>
                    )}
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>0x_Signature_Hash</Text>
                    <div className="hash-text" style={{ marginTop: 8 }}>
                      {detailModal.tx_hash || 'Initializing smart contract deployment...'}
                    </div>
                  </div>

                  {blockchainData && (
                    <div style={{ marginTop: 16, padding: '16px', background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
                      <Text strong style={{ color: '#22c55e', display: 'block', marginBottom: 12 }}>{'>_ BLOCKNODE_DECODED_SUCCESSFULLY'}</Text>

                      {blockchainData.decodedData?.args || (blockchainData.decodedData?.raw && blockchainData.decodedData.raw !== '0x') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div><span style={{ color: '#94a3b8' }}>区块高度 // </span><span style={{ color: '#e2e8f0' }}>#{blockchainData.blockNumber}</span></div>
                          
                          {(() => {
                            const args = blockchainData.decodedData.args;
                            let displayId = 'N/A';
                            if (args?.applicationId) {
                              displayId = `UID_${args.applicationId}`;
                            } else if (blockchainData.decodedData.raw) {
                              try {
                                const parsed = JSON.parse(blockchainData.decodedData.raw);
                                if (parsed.applicationId) displayId = `UID_${parsed.applicationId} (Bare Tx)`;
                                else if (parsed.event === 'Apply') displayId = `UID_${parsed.applicationId || 'UNK'} (Legacy)`;
                              } catch (e) {
                                displayId = 'Raw Data (Non-JSON)';
                              }
                            }
                            return <div><span style={{ color: '#94a3b8' }}>溯源标识 // </span><span style={{ color: '#e2e8f0' }}>{displayId}</span></div>;
                          })()}

                          <div>
                            <span style={{ color: '#94a3b8', display: 'block', marginBottom: 6 }}>封存脱敏数据核 {`{ JSON }`} // </span>
                            <pre style={{ fontSize: 12, padding: 12, background: '#0f172a', borderRadius: 6, color: '#38bdf8', margin: 0, overflowX: 'auto', border: '1px solid #1e293b' }}>
                              {(() => {
                                try {
                                  const args = blockchainData.decodedData.args;
                                  const raw = blockchainData.decodedData.raw;
                                  let data = args ? args.extraData : raw;
                                  
                                  if (!data) return '{}';
                                  const trimmed = data.trim();
                                  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                                    return JSON.stringify(JSON.parse(trimmed), null, 2);
                                  }
                                  return data;
                                } catch (e) {
                                  return blockchainData.decodedData.raw || 'N/A';
                                }
                              })()}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <Text type="danger" style={{ fontFamily: 'monospace' }}>Err: ABI offset failure or unexposed Data: {blockchainData.decodedData?.hex || 'N/A'}</Text>
                      )}
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
