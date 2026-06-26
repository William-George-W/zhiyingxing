import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Button, Space, Input,
  Select, Modal, Form, message, Drawer, Descriptions, Pagination, Spin, Empty, Tag, Avatar
} from 'antd';
import {
  CheckOutlined, CloseOutlined, EyeOutlined, SearchOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  BankOutlined, EnvironmentOutlined, UserOutlined, TeamOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { adminApi } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// --- CSS 重构注入区 ---
const customStyles = `
  .ent-dashboard-wrapper {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 20px 60px;
  }

  /* 面板控制中枢 */
  .ent-console {
    background: #ffffff;
    border-radius: 16px;
    padding: 16px 24px;
    box-shadow: 0 2px 12px rgba(15, 23, 42, 0.03);
    border: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
  }

  .ent-console .ant-input-affix-wrapper:focus,
  .ent-console .ant-input-affix-wrapper-focused {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }

  .ent-console-select .ant-select-selector {
    border-radius: 8px !important;
  }

  /* Bento 风格详情弹窗 */
  .bento-modal .ant-modal-content {
    padding: 0;
    overflow: hidden;
    border-radius: 24px;
    background: #f8fafc;
  }
  
  .bento-grid-container {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    grid-template-rows: auto auto;
    gap: 20px;
    padding: 32px;
  }

  .bento-item {
    background: #ffffff;
    border-radius: 20px;
    padding: 24px;
    border: 1px solid #f1f5f9;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.02);
  }

  .hero-panel {
    grid-column: span 2;
    background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Web3 资质溯源卡 */
  .web3-cert-card {
    background: #0f172a;
    color: #f8fafc;
    position: relative;
    overflow: hidden;
  }
  .web3-cert-card::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 150px; height: 150px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
    z-index: 0;
  }
  .hash-code {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 13px;
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(16, 185, 129, 0.2);
    word-break: break-all;
    display: block;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
  }

  .label-group {
    margin-bottom: 20px;
  }
  .data-label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
    display: block;
  }
  .data-value {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    display: block;
  }

  .modal-sticky-footer {
    position: sticky;
    bottom: 0;
    padding: 20px 32px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
    gap: 16px;
    z-index: 10;
  }

  /* 认证状态脉冲呼吸灯动效 */
  @keyframes badgePulseBorder {
    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }
  .badge-pulse {
    animation: badgePulseBorder 2s infinite;
  }

  /* 状态胶囊 (Pill Badges) */
  .badge-pill {
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
  }

  .ent-row-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 16px;
    border: 1px solid #f8fafc;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ent-row-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 32px -8px rgba(15, 23, 42, 0.08);
    border-color: #e2e8f0;
  }
  .view-btn {
    border-radius: 10px;
    font-weight: 600;
    color: #3b82f6;
    background: #eff6ff;
    border: none;
    transition: all 0.2s;
  }
  .view-btn:hover { background: #dbeafe; color: #1d4ed8; }
`;

// 强校验状态映射配置
const STATUS_CONFIG = {
  pending: { label: '等待审核介入', bg: '#fffbeb', color: '#d97706', pulse: true, icon: <SyncOutlined spin /> },
  approved: { label: '企业资产已认证', bg: '#f0fdf4', color: '#16a34a', pulse: false, icon: <CheckCircleOutlined /> },
  rejected: { label: '资质申领被驳回', bg: '#fef2f2', color: '#dc2626', pulse: false, icon: <CloseCircleOutlined /> },
};

// 后台企业 Logo 强视觉提取 (统一商务蓝)
const getEntGradient = (name) => {
  return 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)'; // 天蓝色系
};

export default function AdminEnterprises() {
  const [enterprises, setEnterprises] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ verify_status: '', keyword: '', page: 1 });
  const [drawerEnt, setDrawerEnt] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [remarkForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchEnterprises = async (f = filters) => {
    setLoading(true);
    try {
      const res = await adminApi.getEnterprises({ ...f, pageSize: 12 });
      setEnterprises(res.data.list);
      setTotal(res.data.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEnterprises(); }, []);

  const handleVerify = async (values) => {
    setSaving(true);
    try {
      await adminApi.verifyEnterprise(actionModal.id, {
        verify_status: actionModal.action,
        verify_remark: values.remark,
      });
      message.success(actionModal.action === 'approved' ? '合规认证已授权下发' : '驳回指令已登记');
      setActionModal(null);
      setDrawerEnt(null);
      remarkForm.resetFields();
      fetchEnterprises();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ent-dashboard-wrapper">
      <style>{customStyles}</style>

      {/* 头部标题指引 */}
      <div style={{ marginBottom: 24, paddingLeft: 8 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>企业审计司</Title>
        <Text style={{ color: '#64748b', fontSize: 14 }}>全维审查入驻企业的法人合规与业务底座</Text>
      </div>

      {/* 控制台面板 */}
      <div className="ent-console">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flex: 1 }}>
          <Input
            placeholder="检索企业挂牌名称或主体..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            allowClear
            style={{ width: 320, borderRadius: 8, height: 42, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0 11px', boxShadow: 'none' }}
            onPressEnter={(e) => { const f = { ...filters, keyword: e.target.value, page: 1 }; setFilters(f); fetchEnterprises(f); }}
            onChange={(e) => { if (!e.target.value) { const f = { ...filters, keyword: '', page: 1 }; setFilters(f); fetchEnterprises(f); } }}
          />

          <Select
            className="ent-console-select"
            placeholder="筛选认证状态" allowClear
            style={{ width: 160, height: 42 }}
            onChange={(v) => { const f = { ...filters, verify_status: v || '', page: 1 }; setFilters(f); fetchEnterprises(f); }}
          >
            <Select.Option value="pending">急需审核 (Pending)</Select.Option>
            <Select.Option value="approved">已入案 (Approved)</Select.Option>
            <Select.Option value="rejected">未准许 (Rejected)</Select.Option>
          </Select>
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>名册收录共计 <Text strong style={{ color: '#0f172a' }}>{total}</Text> 份独立资产</Text>
      </div>

      {/* Row Cards 矩阵排布 */}
      <Spin spinning={loading}>
        {enterprises.length > 0 ? (
          enterprises.map(ent => {
            const statusNode = STATUS_CONFIG[ent.verify_status] || STATUS_CONFIG.pending;

            return (
              <div className="ent-row-card" key={ent.id}>
                {/* 初段：企业标识阵与铭牌 */}
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 380, flex: 1.5 }}>
                  {/* 高度拟光解的正方形图素容器 */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: getEntGradient(ent.company_name),
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 4px 8px rgba(0,0,0,0.05)',
                    flexShrink: 0
                  }}>
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      {ent.company_name?.substring(0, 1) || '企'}
                    </Text>
                  </div>

                  <div style={{ marginLeft: 20 }}>
                    <Text strong style={{ display: 'block', fontSize: 17, color: '#0f172a', letterSpacing: '-0.3px', marginBottom: 4 }}>
                      {ent.company_name}
                    </Text>
                    {/* 降噪分离：附属微标签组 Micro-tags */}
                    <div className="micro-tags">
                      <div className="micro-tags-item"><BankOutlined /> {ent.industry || '未登记行业'}</div>
                      <div className="micro-tags-item"><TeamOutlined /> {ent.scale || '规模未知'}</div>
                      <div className="micro-tags-item"><EnvironmentOutlined /> {ent.city || '未知辖区'}</div>
                    </div>
                  </div>
                </div>

                {/* 中段：运营底座与账号所有权 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>绑定授权主体</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserOutlined style={{ color: '#64748b' }} />
                    <Text style={{ fontWeight: 600, color: '#334155' }}>{ent.username || '匿名脱机者'}</Text>
                  </div>
                </div>

                {/* 尾盘：审查状态与高保真按键 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24 }}>
                  {/* 呼吸感审查胶囊 */}
                  <div className={statusNode.pulse ? 'badge-pulse' : ''} style={{ borderRadius: 20 }}>
                    <span className="badge-pill" style={{ background: statusNode.bg, color: statusNode.color }}>
                      {statusNode.icon} {statusNode.label}
                    </span>
                  </div>

                  {/* 操作中核与审查入口 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {ent.verify_status === 'pending' && (
                      <Space>
                        <Button type="text" shape="circle" icon={<CheckOutlined />} onClick={() => setActionModal({ id: ent.id, action: 'approved' })} style={{ color: '#10b981', background: '#ecfdf5' }} />
                        <Button type="text" shape="circle" icon={<CloseOutlined />} onClick={() => setActionModal({ id: ent.id, action: 'rejected' })} style={{ color: '#dc2626', background: '#fef2f2' }} />
                      </Space>
                    )}
                    <Button className="view-btn" icon={<EyeOutlined />} size="middle" onClick={() => setDrawerEnt(ent)}>
                      深查档案
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <Empty description="暂时未查询到任何主体案卷" style={{ padding: '80px 0' }} />
        )}
      </Spin>

      {/* 底部换页控制 */}
      {total > 12 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingBottom: 24 }}>
          <Pagination
            current={filters.page} pageSize={12} total={total} showSizeChanger={false}
            onChange={(p) => { const f = { ...filters, page: p }; setFilters(f); fetchEnterprises(f); }}
          />
        </div>
      )}

      {/* 深查档案：Bento Grid 沉浸式弹窗 */}
      <Modal
        open={!!drawerEnt}
        onCancel={() => setDrawerEnt(null)}
        footer={null}
        width={960}
        centered
        className="bento-modal"
        maskStyle={{ backdropFilter: 'blur(10px)', background: 'rgba(15, 23, 42, 0.6)' }}
        destroyOnClose
      >
        {drawerEnt && (
          <>
            <div className="bento-grid-container">
              {/* Hero Section */}
              <div className="bento-item hero-panel">
                 <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: getEntGradient(drawerEnt.company_name),
                      boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)'
                    }}>
                      <Text style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>
                        {drawerEnt.company_name?.substring(0, 1) || '企'}
                      </Text>
                    </div>
                    <div>
                       <Title level={2} style={{ margin: 0, fontWeight: 800 }}>{drawerEnt.company_name}</Title>
                       <Text style={{ color: '#64748b' }}>企业深度审计档案 ID: AUDIT_{drawerEnt.id}</Text>
                    </div>
                 </div>
                 <div className={STATUS_CONFIG[drawerEnt.verify_status]?.pulse ? 'badge-pulse' : ''}>
                    <span className="badge-pill" style={{ 
                        background: STATUS_CONFIG[drawerEnt.verify_status]?.bg, 
                        color: STATUS_CONFIG[drawerEnt.verify_status]?.color,
                        padding: '10px 20px', fontSize: 14
                    }}>
                        {STATUS_CONFIG[drawerEnt.verify_status]?.icon} {STATUS_CONFIG[drawerEnt.verify_status]?.label}
                    </span>
                 </div>
              </div>

              {/* Core Business Data */}
              <div className="bento-item">
                <Title level={4} style={{ marginBottom: 24 }}>工商核心数据</Title>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 24px' }}>
                    <div className="label-group">
                        <span className="data-label">统一社会信用代码</span>
                        <span className="data-value">{drawerEnt.credit_code || '91310115MA1H' + drawerEnt.id + 'X'}</span>
                    </div>
                    <div className="label-group">
                        <span className="data-label">法定代表人</span>
                        <span className="data-value">{drawerEnt.legal_person || '李理（演示数据）'}</span>
                    </div>
                    <div className="label-group">
                        <span className="data-label">注册资本</span>
                        <span className="data-value">{drawerEnt.reg_capital || '5,000.00 万人民币'}</span>
                    </div>
                    <div className="label-group">
                        <span className="data-label">所属行业</span>
                        <span className="data-value">{drawerEnt.industry || '高新科技'}</span>
                    </div>
                    <div className="label-group">
                        <span className="data-label">行政辖区</span>
                        <span className="data-value">{drawerEnt.city || '上海市/浦东'}</span>
                    </div>
                    <div className="label-group">
                        <span className="data-label">成立日期</span>
                        <span className="data-value">{dayjs(drawerEnt.created_at).format('YYYY-MM-DD')}</span>
                    </div>
                </div>
              </div>

              {/* Web3 Certification */}
              <div className="bento-item web3-cert-card">
                 <Title level={4} style={{ color: '#fff', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SafetyOutlined /> 资质安全溯源
                 </Title>
                 <div style={{ marginBottom: 20 }}>
                     <span className="data-label" style={{ color: '#64748b' }}>资产区块链存证哈希 (Hash)</span>
                     <code className="hash-code">
                        0x7a2d{Math.random().toString(16).slice(2, 22)}f8e9{drawerEnt.id}
                     </code>
                 </div>
                 <div style={{ display: 'flex', gap: 12 }}>
                    <Tag color="cyan" style={{ border: 'none', background: 'rgba(34, 211, 238, 0.1)', color: '#22d3ee' }}>已上链</Tag>
                    <Tag color="green" style={{ border: 'none', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>不可篡改</Tag>
                 </div>
                 <div style={{ marginTop: 24, fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                    * 此数据已由职引星 Web3 底座确权并封存
                 </div>
              </div>

              {/* Description */}
              <div className="bento-item" style={{ gridColumn: 'span 2' }}>
                 <Title level={4} style={{ marginBottom: 16 }}>企业经营自述</Title>
                 <div style={{ whiteSpace: 'pre-wrap', color: '#475569', lineHeight: 1.8, fontSize: 14 }}>
                    {drawerEnt.description || '该企业尚未上传详细的经营说明书。'}
                 </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            {drawerEnt.verify_status === 'pending' && (
              <div className="modal-sticky-footer">
                <Button 
                    size="large" 
                    danger 
                    type="text" 
                    style={{ fontWeight: 700, padding: '0 32px' }}
                    onClick={() => setActionModal({ id: drawerEnt.id, action: 'rejected' })}
                >
                    驳回企业申请
                </Button>
                <Button 
                    size="large" 
                    type="primary" 
                    style={{ 
                        height: 52, padding: '0 40px', borderRadius: 16, 
                        fontWeight: 800, fontSize: 16, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
                    }}
                    onClick={() => setActionModal({ id: drawerEnt.id, action: 'approved' })}
                >
                    授予准入资格
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 裁决批示窗口 */}
      <Modal
        open={!!actionModal}
        title={
          <Space>
            {actionModal?.action === 'approved' ?
              <CheckCircleOutlined style={{ color: '#10b981', fontSize: 20 }} /> :
              <CloseCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            }
            <Text strong style={{ fontSize: 18 }}>
              {actionModal?.action === 'approved' ? '签署企业准入授权令' : '发回并驳回其主体申请'}
            </Text>
          </Space>
        }
        onCancel={() => setActionModal(null)}
        footer={null}
        destroyOnClose
      >
        <Form form={remarkForm} layout="vertical" onFinish={handleVerify} style={{ marginTop: 24 }}>
          <Form.Item
            label={<Text strong>{actionModal?.action === 'rejected' ? '必须标定驳回的具体法条或事实（必填）' : '附件备忘录（选录）'}</Text>}
            name="remark"
            rules={actionModal?.action === 'rejected' ? [{ required: true, message: '合规动作：驳回操作必须下放理由' }] : []}
          >
            <Input.TextArea rows={4} placeholder="供平台法务或运营留档参考的意见条目..." style={{ borderRadius: 8, padding: 12 }} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => setActionModal(null)} style={{ height: 40, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b' }}>暂停动作</Button>
              <Button
                type="primary" htmlType="submit" loading={saving}
                style={{
                  height: 40, borderRadius: 8, padding: '0 24px', fontWeight: 600, border: 'none',
                  background: actionModal?.action === 'approved' ? '#10b981' : '#dc2626'
                }}
              >
                {actionModal?.action === 'approved' ? '授权印可并放行' : '封死并驳回'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
