import React, { useEffect, useState } from 'react';
import {
  Button, Tag, Card, Typography, Space, Modal, Form,
  Input, Select, InputNumber, DatePicker, message, Popconfirm,
  Row, Col, Tabs, Progress, Pagination, Tooltip, Empty
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, 
  EnvironmentOutlined, AppstoreOutlined, ClockCircleOutlined,
  ThunderboltOutlined, FundOutlined, LockOutlined, CheckOutlined
} from '@ant-design/icons';
import { enterpriseApi } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const statusColors = { open: 'success', filled: 'warning', closed: 'error', draft: 'default' };
const statusText   = { open: '招聘中',  filled: '已招满', closed: '已关闭', draft: '草稿' };

const customStyles = `
  /* 统计超级看板 Bento Grid */
  .bento-stat-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    height: 100%;
  }
  .bento-stat-card::after {
    content: '';
    position: absolute;
    right: -20px;
    bottom: -20px;
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
  }
  .bento-icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin-right: 20px;
    box-shadow: 0 8px 16px -4px rgba(0,0,0,0.1);
  }

  /* 胶囊型 Segmented Tab 伪装 */
  .custom-settings-tabs .ant-tabs-nav { margin-bottom: 24px !important; }
  .custom-settings-tabs .ant-tabs-nav::before { display: none; }
  .custom-settings-tabs .ant-tabs-nav-list {
    background: #f1f5f9;
    padding: 6px;
    border-radius: 14px;
    display: inline-flex;
  }
  .custom-settings-tabs .ant-tabs-tab {
    padding: 10px 24px !important;
    margin: 0 !important;
    border-radius: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: #64748b;
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

  /* 现代化 Row Card 瀑布流 */
  .job-row-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 2px 10px rgba(0,0,0,0.01);
  }
  .job-row-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 32px -8px rgba(0,0,0,0.06);
    border-color: #cbd5e1;
  }
  
  /* 幽灵操作系统 */
  .ghost-actions {
    display: flex;
    gap: 8px;
    opacity: 0.15; /* 平时极度隐蔽的透明度 */
    transform: translateX(10px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .job-row-card:hover .ghost-actions {
    opacity: 1;
    transform: translateX(0);
  }
  .ghost-btn {
    background: #f1f5f9 !important;
    border: none !important;
    color: #64748b !important;
    box-shadow: none !important;
    transition: all 0.2s !important;
  }
  .ghost-btn:hover {
    background: #ffffff !important;
    color: #3b82f6 !important;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
  }
  .ghost-btn.danger:hover {
    color: #ef4444 !important;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2) !important;
  }

  /* 发布按钮大浮力 */
  .hyper-publish-btn {
    background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
    border: none !important;
    border-radius: 12px !important;
    height: 44px !important;
    padding: 0 24px !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
    transition: all 0.3s ease !important;
  }
  .hyper-publish-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4) !important;
  }
`;

export default function EnterpriseJobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('open');
  const [form] = Form.useForm();

  const fetchJobs = async (pg = 1, status = activeTab) => {
    setLoading(true);
    try {
      const params = { page: pg, pageSize: 10 };
      if (status !== 'all') params.status = status;
      const res = await enterpriseApi.getJobs(params);
      setJobs(res.data.list);
      setTotal(res.data.pagination.total);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(1, 'open'); }, []);

  const onTabChange = (key) => {
    setActiveTab(key);
    fetchJobs(1, key);
  };

  const openCreate = () => {
    setEditingJob(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    form.setFieldsValue({
      ...job,
      deadline: job.deadline ? dayjs(job.deadline) : null,
    });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const data = {
        ...values,
        deadline: values.deadline && typeof values.deadline.format === 'function' 
          ? values.deadline.format('YYYY-MM-DD') 
          : values.deadline,
      };
      if (editingJob) {
        await enterpriseApi.updateJob(editingJob.id, data);
        message.success('岗位更新成功');
      } else {
        await enterpriseApi.createJob(data);
        message.success('🎉 新岗位发布成功！');
      }
      setModalOpen(false);
      fetchJobs(page);
    } catch (err) {
      message.error(err.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeJob = async (job) => {
    try {
      const data = {
        ...job,
        status: 'open',
        deadline: job.deadline ? dayjs(job.deadline).format('YYYY-MM-DD') : null
      };
      await enterpriseApi.updateJob(job.id, data);
      message.success('岗位已成功从空缺状态恢复为招聘中');
      fetchJobs(page);
    } catch (err) {
      console.error(err);
      message.error('操作失败');
    }
  };

  const handleClose = async (id) => {
    await enterpriseApi.deleteJob(id);
    message.success('岗位已关闭');
    fetchJobs(page);
  };

  // 生成 Row Card 列表替代原 Table
  const renderJobCards = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: '60px 0' }}>加载数据中...</div>;
    if (jobs.length === 0) return (
      <Empty 
        image={Empty.PRESENTED_IMAGE_SIMPLE} 
        description={<Text type="secondary">暂无岗位数据，可通过右上角进行发布</Text>}
        style={{ padding: '60px 0' }}
      />
    );

    return jobs.map(r => {
      // 自动计算转化率
      let rate = 0;
      if (r.view_count && r.view_count > 0 && r.apply_count) {
        rate = ((r.apply_count / r.view_count) * 100).toFixed(1);
      }

      return (
        <div className="job-row-card" key={r.id}>
          {/* 左翼：基础原信息 */}
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Space align="center">
              <Text strong style={{ fontSize: 17, color: '#0f172a' }}>{r.title}</Text>
              {r.status === 'filled' && r.signed_count < r.headcount ? (
                <Tooltip title={`当前已有人员离职，名额空缺 (${r.signed_count}/${r.headcount})，您可以点击右侧“恢复”或编辑名额。`}>
                  <Tag color="volcano" icon={<ThunderboltOutlined />} style={{ borderRadius: 12, fontWeight: 700, animation: 'pulse 2s infinite', border: 'none' }}>
                    名额空缺 · 待处理
                  </Tag>
                </Tooltip>
              ) : (
                <Tag color={statusColors[r.status]} style={{ borderRadius: 12, border: 'none', fontWeight: 600 }}>
                  {statusText[r.status]}
                </Tag>
              )}
            </Space>
            <style>{`
              @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.03); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}</style>
            <Space style={{ color: '#64748b', fontSize: 13 }}>
              <span><EnvironmentOutlined /> {r.city}</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span><AppstoreOutlined /> {r.job_type}</span>
            </Space>
          </div>

          {/* 中枢：薪资及死线 */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text strong style={{ color: '#d97706', fontSize: 16 }}>
              {r.salary_min && r.salary_max ? `${r.salary_min/1000}K - ${r.salary_max/1000}K` : '面议薪资'}
            </Text>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              <ClockCircleOutlined /> 截止: {r.deadline ? dayjs(r.deadline).format('YYYY-MM-DD') : '保持开放直至关闭'}
            </div>
          </div>

          {/* 右翼数据洞察：漏斗环与具体数据 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <Progress 
              type="dashboard" 
              percent={rate} 
              size={54} 
              strokeWidth={10} 
              strokeColor={{ '0%': '#10b981', '100%': '#3b82f6' }}
              format={(p) => <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700 }}>{p}%</span>}
            />
            <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Text strong style={{ fontSize: 14, color: '#1e293b' }}>{r.apply_count || 0} <span style={{ fontSize: 12, color: '#64748b', fontWeight: 'normal' }}>人投递</span></Text>
              <Text style={{ fontSize: 12, color: '#94a3b8' }}>/ 浏览次数 {r.view_count || 0}</Text>
            </div>
          </div>

          {/* 右侧幽灵操作区 */}
          <div className="ghost-actions" style={{ flexShrink: 0, width: 120, justifyContent: 'flex-end', gap: 8 }}>
            {r.status === 'filled' && r.signed_count < r.headcount && (
              <Popconfirm title="确定要针对空缺名额恢复招聘吗？" onConfirm={() => handleResumeJob(r)}>
                <Tooltip title="恢复招聘">
                  <Button className="ghost-btn" style={{ color: '#10b981' }} shape="circle" icon={<CheckOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
            <Tooltip title="编辑岗位参数">
              <Button className="ghost-btn" shape="circle" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
            {r.status === 'open' && (
              <Popconfirm title="确定要永久锁定闭锁该岗位吗？" okType="danger" onConfirm={() => handleClose(r.id)}>
                <Tooltip title="关闭招聘">
                  <Button className="ghost-btn danger" shape="circle" icon={<LockOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        </div>
      );
    });
  };

  // 全局收到的简历数计算
  const totalReceived = jobs.reduce((s, j) => s + (j.apply_count || 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <style>{customStyles}</style>

      {/* 首部引擎控制台 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>📋 企业岗位管理</Title>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>在此发布与管理您的招聘岗位信息</Text>
        </div>

        <Button
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={openCreate}
          className="hyper-publish-btn"
        >
          发布新岗位
        </Button>
      </div>

      {/* Bento 超级看板 */}
      <Row gutter={24} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12}>
          <div className="bento-stat-card">
            <div className="bento-icon-wrapper" style={{ background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', color: '#3b82f6' }}>
              <ThunderboltOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>当前列表总岗位数</Text>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{total}</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="bento-stat-card">
            <div className="bento-icon-wrapper" style={{ background: 'linear-gradient(135deg, #fef3c7, #fffbeb)', color: '#f59e0b' }}>
              <FundOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>累计收到简历数</Text>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{totalReceived}</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* 内容大盘 */}
      <Tabs
        className="custom-settings-tabs"
        activeKey={activeTab}
        onChange={onTabChange}
        items={[
          { key: 'open',   label: '招聘中' },
          { key: 'filled', label: '已锁定' },
          { key: 'all',    label: '全部岗位' },
        ]}
      />

      {/* Row Cards 轨道 */}
      <div style={{ minHeight: 400 }}>
        {renderJobCards()}
      </div>

      {/* 高端分页器 */}
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Pagination
            current={page}
            pageSize={10}
            total={total}
            onChange={(p) => fetchJobs(p, activeTab)}
            showTotal={t => `共 ${t} 条`}
          />
        </div>
      )}

      {/* 发布/编辑岗位弹窗 (保持极简) */}
      <Modal
        title={editingJob ? '编辑岗位' : '发布新岗位'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
        centered
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleSave} 
          style={{ marginTop: 20 }}
          className="modern-form-input"
          initialValues={{
            job_type: '全职',
            education_req: '不限',
            headcount: 1,
            allow_reapply: 1
          }}
        >
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label={<Text strong>岗位名称</Text>} name="title" rules={[{ required: true }]}>
                <Input placeholder="如：Java 后端工程师" style={{ background: '#f8fafc', border: 'none' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={<Text strong>工作城市</Text>} name="city">
                <Select 
                  mode="tags"
                  maxCount={1}
                  placeholder="选择或输入城市"
                  style={{ background: '#f8fafc' }}
                  allowClear
                >
                  {['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '其他'].map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={<Text strong>工作类型</Text>} name="job_type">
                <Select 
                  style={{ background: '#f8fafc' }}
                  options={['全职','实习','兼职'].map(t => ({ label: t, value: t }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={<Text strong>最低薪资 (元/月)</Text>} name="salary_min">
                <InputNumber style={{ width: '100%', background: '#f8fafc', border: 'none' }} min={0} step={1000} placeholder="如：8000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={<Text strong>最高薪资 (元/月)</Text>} name="salary_max">
                <InputNumber style={{ width: '100%', background: '#f8fafc', border: 'none' }} min={0} step={1000} placeholder="如：15000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={<Text strong>学历要求</Text>} name="education_req">
                <Select 
                  style={{ background: '#f8fafc' }}
                  options={['不限','专科','本科','硕士','博士'].map(e => ({ label: e, value: e }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={<Text strong>专业要求</Text>} name="major_req">
                <Input placeholder="如：计算机、软件工程" style={{ background: '#f8fafc', border: 'none' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={<Text strong>招聘人数</Text>} name="headcount">
                <InputNumber style={{ width: '100%', background: '#f8fafc', border: 'none' }} min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={<Text strong>截止日期</Text>} name="deadline">
                <DatePicker style={{ width: '100%', background: '#f8fafc', border: 'none' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                label={<Text strong>回流政策</Text>} 
                name="allow_reapply" 
                tooltip="开启后，之前已辞职或被淘汰的学生可以再次对此岗位发起申请。"
              >
                <Select 
                  style={{ background: '#f8fafc' }}
                  options={[
                    { label: '允许已离职/被淘汰人员重新投递', value: 1 },
                    { label: '禁止已离职/被淘汰人员重新投递', value: 0 },
                  ]}
                />
              </Form.Item>
            </Col>
            {editingJob && (
              <Col xs={24} sm={12}>
                <Form.Item label={<Text strong>岗位状态</Text>} name="status">
                  <Select
                    style={{ background: '#f8fafc' }}
                    options={[
                      { label: '招聘中', value: 'open' },
                      { label: '已招满', value: 'filled' },
                      { label: '关闭', value: 'closed' },
                      { label: '草稿', value: 'draft' },
                    ]}
                  />
                </Form.Item>
              </Col>
            )}
            <Col xs={24}>
              <Form.Item label={<Text strong>岗位描述 (JD)</Text>} name="description" rules={[{ required: true, message: '请填写岗位描述' }]}>
                <Input.TextArea rows={4} placeholder="描述岗位职责、工作内容等..." showCount maxLength={2000} style={{ background: '#f8fafc', border: 'none', borderRadius: 12, padding: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label={<Text strong>任职要求</Text>} name="requirements">
                <Input.TextArea rows={4} placeholder="描述技能要求、经验要求..." showCount maxLength={2000} style={{ background: '#f8fafc', border: 'none', borderRadius: 12, padding: 12 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ textAlign: 'right', marginTop: 12, marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 8, height: 40, border: 'none', background: '#f1f5f9', color: '#64748b' }}>取消</Button>
              <Button
                type="primary" htmlType="submit" loading={saving}
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 8, height: 40, padding: '0 24px', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.2)' }}
              >
                {editingJob ? '保存修改' : '确认发布'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
