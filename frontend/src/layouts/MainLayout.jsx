import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Space, Button, Typography, Badge, theme, Modal
} from 'antd';
import {
  UserOutlined, LogoutOutlined, SettingOutlined,
  BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  DashboardOutlined, FileTextOutlined, BankOutlined,
  TeamOutlined, SearchOutlined, SolutionOutlined,
  BarChartOutlined, SafetyOutlined, AuditOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { messageApi } from '../api/services';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 角色菜单配置
const menusByRole = {
  student: [
    { key: '/student/dashboard',    icon: <DashboardOutlined />,  label: '工作台' },
    { key: '/student/jobs',         icon: <SearchOutlined />,     label: '岗位广场' },
    { key: '/student/applications', icon: <SolutionOutlined />,   label: '我的投递' },
    { key: '/student/my-jobs',      icon: <BankOutlined />,       label: '我的岗位' },
    { key: '/student/resumes',      icon: <FileTextOutlined />,   label: '简历管理' },
    { key: '/messages',             icon: <MessageOutlined />,    label: '消息中心' },
  ],
  enterprise: [
    { key: '/enterprise/jobs',         icon: <FileTextOutlined />,label: '岗位管理' },
    { key: '/enterprise/applications', icon: <TeamOutlined />,    label: '简历收件箱' },
    { key: '/enterprise/employees',    icon: <SolutionOutlined />, label: '员工管理' },
    { key: '/messages',                icon: <MessageOutlined />, label: '对话中心' },
  ],
  school: [
    { key: '/school/dashboard', icon: <BarChartOutlined />, label: '就业大屏' },
    { key: '/messages',         icon: <MessageOutlined />,  label: '联络中心/推才' },
  ],
  admin: [
    { key: '/admin/dashboard',   icon: <DashboardOutlined />, label: '系统概览' },
    { key: '/admin/users',       icon: <TeamOutlined />,      label: '用户管理' },
    { key: '/admin/enterprises', icon: <AuditOutlined />,     label: '企业审核' },
    { key: '/school/dashboard',  icon: <BarChartOutlined />,  label: '就业大屏' },
  ],
};

const roleLabels = {
  admin:      '超级管理员',
  school:     '高校管理员',
  enterprise: '企业HR',
  student:    '应届学生',
};

const roleColors = {
  admin:      '#f5222d',
  school:     '#722ed1',
  enterprise: '#1677ff',
  student:    '#52c41a',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [msgOpen, setMsgOpen] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: designToken } = theme.useToken();

  const fetchUnread = async () => {
    try {
      const { data } = await messageApi.getUnreadCount();
      // data.count might be string depending on mysql2 config hook
      setUnreadCount(Number(data?.count) || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await messageApi.getMessages({ pageSize: 15 });
      setMessages(data?.list || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnread();
      // 短轮询以便准实时获取未读数量，每5秒查询一次
      const timer = setInterval(fetchUnread, 5000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const handleMsgOpenChange = (open) => {
    setMsgOpen(open);
    if (open) {
      fetchUnread();
      fetchMessages();
    }
  };

  const handleViewMsg = async (m) => {
    setSelectedMsg(m);
    if (!m.is_read) {
      try {
        await messageApi.markAsRead(m.id);
        fetchUnread();
        fetchMessages();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleReadAll = async () => {
    try {
      await messageApi.markAllAsRead();
      fetchUnread();
      setMessages([]);
      setMsgOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = menusByRole[user?.role_code] || [];
  const selectedKey = '/' + location.pathname.split('/').slice(1, 3).join('/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'settings', icon: <SettingOutlined />, label: '账户设置', onClick: () => navigate('/settings') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: handleLogout },
  ];

  return (
    <Layout className="main-layout">
      {/* ── 侧边栏 ── */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="main-sider"
        width={220}
      >
        {/* Logo 区域 */}
        <div className="sider-logo">
          <div className="logo-icon">⭐</div>
          {!collapsed && <span className="logo-text">职引星</span>}
        </div>

        {/* 用户信息卡片 */}
        {!collapsed && (
          <div className="sider-user-card">
            <Avatar size={40} icon={<UserOutlined />} 
              src={user?.avatar?.startsWith('http') ? user.avatar : `http://localhost:3001${user?.avatar}`}
              style={{ backgroundColor: roleColors[user?.role_code] }} />
            <div className="user-info">
              <Text className="username" ellipsis>{user?.username}</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <Badge
                  color={roleColors[user?.role_code]}
                  text={<span className="role-tag">{roleLabels[user?.role_code]}</span>}
                />
                {user?.org_name && (
                  <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.2 }}>
                    {user.org_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="main-menu"
        />
      </Sider>

      {/* ── 右侧主区域 ── */}
      <Layout>
        {/* Header */}
        <Header className="main-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
          />

          <div className="header-right">
            <Dropdown
              open={msgOpen}
              onOpenChange={handleMsgOpenChange}
              trigger={['click']}
              dropdownRender={() => (
                <div className="message-dropdown-box" style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.08)', width: 320, padding: 0 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>消息通知</Text>
                    {messages.length > 0 && <Button type="link" size="small" onClick={handleReadAll}>全部已读</Button>}
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {messages.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>暂无消息</div>
                    ) : (
                      messages.map(m => (
                        <div 
                          key={m.id} 
                          className="msg-item" 
                          onClick={() => handleViewMsg(m)} 
                          style={{ 
                            padding: '12px 16px', 
                            borderBottom: '1px solid #f0f0f0', 
                            cursor: 'pointer',
                            opacity: m.is_read ? 0.6 : 1 
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Space size={6}>
                              {m.is_read ? null : <Badge status="error" />}
                              <Text strong style={{ fontSize: 13 }} ellipsis>{m.title}</Text>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(m.created_at).toLocaleDateString()}
                            </Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ rows: 2 }}>{m.content}</Text>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            >
              <Badge count={location.pathname === '/messages' ? 0 : unreadCount} overflowCount={99}>
                <Button type="text" icon={<BellOutlined />} className="icon-btn" />
              </Badge>
            </Dropdown>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space className="user-dropdown" style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  src={user?.avatar?.startsWith('http') ? user.avatar : `http://localhost:3001${user?.avatar}`}
                  style={{ backgroundColor: roleColors[user?.role_code] }}
                />
                <Text className="header-username">{user?.username}</Text>
              </Space>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content className="main-content">
          <Outlet />
        </Content>
      </Layout>

      {/* 消息详情弹窗 */}
      <Modal
        title={selectedMsg?.title || '消息详情'}
        open={!!selectedMsg}
        footer={null}
        onCancel={() => setSelectedMsg(null)}
        width={400}
      >
        <div style={{ padding: '10px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            发送时间：{selectedMsg?.created_at ? new Date(selectedMsg.created_at).toLocaleString() : ''}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: '1.6' }}>
            {selectedMsg?.content}
          </Text>
        </div>
      </Modal>
    </Layout>
  );
}
