import React, { useEffect, useState } from 'react';
import {
  Typography, Button, Tag, Space, Input, Select, Modal, Form, message, 
  Popconfirm, Tooltip, Avatar, Pagination, Spin, Empty
} from 'antd';
import {
  PlusOutlined, StopOutlined, CheckOutlined,
  DeleteOutlined, KeyOutlined, SearchOutlined,
  MailOutlined, ClockCircleOutlined, UserOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { adminApi, chatApi } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// --- CSS 注入区 ---
const customStyles = `
  .user-management-container {
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: 40px;
  }

  /* 顶部控制中枢 */
  .control-console {
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

  .control-input .ant-input-affix-wrapper:focus,
  .control-input .ant-input-affix-wrapper-focused {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }

  .control-select .ant-select-selector {
    border-radius: 8px !important;
  }

  /* 悬浮行卡片 (Row Card) */
  .user-row-card {
    display: flex;
    align-items: center;
    background: #ffffff;
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 12px;
    border: 1px solid #f8fafc;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.01);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .user-row-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.06);
    border-color: #e2e8f0;
  }
  .user-row-card:hover .action-group {
    opacity: 1;
  }

  /* 隐式操作组 */
  .action-group {
    opacity: 0.3;
    transition: opacity 0.3s;
    display: flex;
    gap: 8px;
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    color: #64748b;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .action-btn:hover {
    background: #e2e8f0;
    color: #0f172a;
  }
  .action-btn.danger:hover {
    background: #fee2e2;
    color: #ef4444;
  }
  .action-btn.primary:hover {
    background: #dbeafe;
    color: #2563eb;
  }

  /* 胶囊标签 (Pill Badges) */
  .pill-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
  }
`;

// 角色配置与色彩
const ROLE_CONFIG = {
  admin:      { label: '管理员', bg: '#fee2e2', color: '#b91c1c' },
  school:     { label: '学校管理员', bg: '#f3e8ff', color: '#7e22ce' },
  enterprise: { label: '企业代表', bg: '#dbeafe', color: '#1d4ed8' },
  student:    { label: '学生', bg: '#dcfce7', color: '#15803d' },
};

// 头像专属渐变规范 (统一品牌色调)
const getAvatarGradient = (username) => {
  return 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)'; // 天蓝色系
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ role_code: '', keyword: '', status: '', page: 1 });
  const [createModal, setCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchUsers = async (f = filters) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ ...f, pageSize: 10 });
      setUsers(res.data.list);
      setTotal(res.data.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    await adminApi.toggleStatus(id, { status: currentStatus === 1 ? 0 : 1 });
    message.success('账户状态已更新');
    fetchUsers();
  };

  const handleDelete = async (id) => {
    await adminApi.deleteUser(id);
    message.success('用户已永久删除');
    fetchUsers();
  };

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      await adminApi.createUser(values);
      message.success('新用户创建成功');
      setCreateModal(false);
      createForm.resetFields();
      fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreChat = async (userId) => {
    try {
      await chatApi.restoreChat(userId);
      message.success('该用户的通讯数据回档补全成功');
    } catch (e) {
      console.error(e);
      message.error('回档操作失败');
    }
  };

  const handleReset = async (id) => {
    try {
      await adminApi.resetPassword(id);
      message.success('用户密码已成功还原为初始设定');
    } catch (err) {
      message.error('密码重置失败');
    }
  };

  return (
    <div className="user-management-container">
      <style>{customStyles}</style>

      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>用户管理</Title>
          <Text style={{ color: '#64748b', fontSize: 14 }}>统一调度平台所有用户的身份认证与访问权限</Text>
        </div>
        <Button
          type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}
          style={{ height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
        >
          新增用户
        </Button>
      </div>

      {/* 过滤中心控制台 */}
      <div className="control-console">
         <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flex: 1 }}>
            <Input
               className="control-input"
               placeholder="搜索用户名或邮箱..."
               prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
               allowClear
               style={{ width: 280, borderRadius: 8, height: 40, background: '#f8fafc', border: 'none' }}
               onPressEnter={(e) => { const f = { ...filters, keyword: e.target.value, page: 1 }; setFilters(f); fetchUsers(f); }}
               onChange={(e) => { if (!e.target.value) { const f = { ...filters, keyword: '', page: 1 }; setFilters(f); fetchUsers(f); } }}
            />
            
            <Select
               className="control-select"
               placeholder="用户角色" allowClear
               style={{ width: 140, height: 40 }}
               onChange={(v) => { const f = { ...filters, role_code: v || '', page: 1 }; setFilters(f); fetchUsers(f); }}
            >
              {Object.entries(ROLE_CONFIG).map(([k, v]) =>
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              )}
            </Select>

            <Select
               className="control-select"
               placeholder="访问状态" allowClear
               style={{ width: 120, height: 40 }}
               onChange={(v) => { const f = { ...filters, status: v ?? '', page: 1 }; setFilters(f); fetchUsers(f); }}
            >
              <Select.Option value={1}>正常</Select.Option>
              <Select.Option value={0}>已禁用</Select.Option>
            </Select>
         </div>
         <Text type="secondary" style={{ fontSize: 13 }}>当前共检索到 <Text strong>{total}</Text> 位用户</Text>
      </div>

      {/* Row Cards 列表主体 */}
      <Spin spinning={loading}>
        {users.length > 0 ? (
          users.map(user => (
            <div className="user-row-card" key={user.id}>
              {/* 一柱：头像与身份 */}
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 220 }}>
                 <Avatar 
                    size={48} 
                    style={{ background: getAvatarGradient(user.username), color: '#fff', fontSize: 18, fontWeight: 700 }}
                 >
                    {user.username?.substring(0, 2).toUpperCase()}
                 </Avatar>
                 <div style={{ marginLeft: 16 }}>
                    <Text strong style={{ fontSize: 16, color: '#0f172a', display: 'block' }}>{user.username}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>UID: {String(user.id).padStart(6, '0')}</Text>
                 </div>
              </div>

              {/* 二柱：角色与邮箱 */}
              <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 24 }}>
                 {ROLE_CONFIG[user.role_code] && (
                    <Tag className="pill-badge" style={{ background: ROLE_CONFIG[user.role_code].bg, color: ROLE_CONFIG[user.role_code].color }}>
                      {ROLE_CONFIG[user.role_code].label}
                    </Tag>
                 )}
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                    <MailOutlined /> <Text style={{ fontSize: 13 }}>{user.email || '未绑定邮箱'}</Text>
                 </div>
              </div>

              {/* 三柱：时空属性与状态 */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 24 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                    <ClockCircleOutlined /> <Text style={{ fontSize: 12 }}>{dayjs(user.created_at).format('YYYY-MM-DD')}</Text>
                 </div>
                 {user.status === 1 ? (
                   <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                     <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                     <Text style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>正常</Text>
                   </div>
                 ) : (
                   <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                     <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                     <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>已禁用</Text>
                   </div>
                 )}
              </div>

              {/* 四柱：精细化隐藏操作列 */}
              <div className="action-group">
                 <Tooltip title="消息数据回档">
                    <Popconfirm title="确定修复并回档该用户的所有通讯记录吗？" onConfirm={() => handleRestoreChat(user.id)}>
                       <button className="action-btn primary"><SyncOutlined /></button>
                    </Popconfirm>
                 </Tooltip>
                 <Tooltip title="重置密码">
                    <Popconfirm title="确定还原该用户的密码为初始设定吗？" onConfirm={() => handleReset(user.id)}>
                       <button className="action-btn"><KeyOutlined /></button>
                    </Popconfirm>
                 </Tooltip>
                 <Tooltip title={user.status === 1 ? '禁用用户' : '解禁用户'}>
                    <button className="action-btn" onClick={() => handleToggleStatus(user.id, user.status)}>
                      {user.status === 1 ? <StopOutlined style={{ color: '#f59e0b' }} /> : <CheckOutlined style={{ color: '#10b981' }} />}
                    </button>
                 </Tooltip>
                 <Tooltip title="永久删除此用户">
                    <Popconfirm title="删除后将清空其所有数据，确定删除？" onConfirm={() => handleDelete(user.id)}>
                       <button className="action-btn danger"><DeleteOutlined /></button>
                    </Popconfirm>
                 </Tooltip>
              </div>
            </div>
          ))
        ) : (
          <Empty description="未能检索到相应用户" style={{ padding: 60 }} />
        )}
      </Spin>

      {/* 底部翻页组件 */}
      {total > 10 && (
         <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <Pagination
               current={filters.page}
               pageSize={10}
               total={total}
               showSizeChanger={false}
               onChange={(p) => { const f = { ...filters, page: p }; setFilters(f); fetchUsers(f); }}
            />
         </div>
      )}

      {/* 新增用户配置面版 */}
      <Modal title={<Text strong style={{ fontSize: 18 }}>设定新用户凭证</Text>} open={createModal} onCancel={() => setCreateModal(false)} footer={null} destroyOnClose>
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 24 }}>
          <Form.Item label={<Text strong>登录用户名</Text>} name="username" rules={[{ required: true, message: '请提供唯一用户名' }, { min: 3, message: '不能短于3个字符' }]}>
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="用于系统登入..." style={{ height: 44, borderRadius: 8, background: '#f8fafc' }} />
          </Form.Item>
          <Form.Item label={<Text strong>联系邮箱 (选填)</Text>} name="email" rules={[{ type: 'email', message: '必须为有效的电子邮箱格式' }]}>
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="留作接收通知单据..." style={{ height: 44, borderRadius: 8, background: '#f8fafc' }} />
          </Form.Item>
          <Form.Item label={<Text strong>身份归属角色</Text>} name="role_code" rules={[{ required: true, message: '必须指认一类身份' }]}>
            <Select style={{ height: 44 }}>
              {Object.entries(ROLE_CONFIG).map(([k, v]) =>
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label={<Text strong>系统初始密码</Text>} name="password" rules={[{ required: true, message: '不可为空' }, { min: 6, message: '至少 6 位安全强度' }]}>
            <Input.Password prefix={<KeyOutlined style={{ color: '#94a3b8' }} />} placeholder="设定不少于6位的密钥..." style={{ height: 44, borderRadius: 8, background: '#f8fafc' }} />
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => setCreateModal(false)} style={{ borderRadius: 8, height: 40, background: '#f1f5f9', color: '#64748b', border: 'none' }}>取消</Button>
              <Button type="primary" htmlType="submit" loading={saving} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 8, height: 40, padding: '0 24px', fontWeight: 600 }}>
                核准并创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
