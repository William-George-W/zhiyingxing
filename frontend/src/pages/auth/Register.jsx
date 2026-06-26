import React, { useState } from 'react';
import {
  Form, Input, Button, Select, message, Typography, Card, Alert
} from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/services';
import { roleHomeMap } from '../../router/guards';
import './Login.css'; // 复用登录页样式

const { Title, Text } = Typography;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [shake, setShake] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (values) => {
    setRegisterError('');
    const username = (values.username || '').trim();
    const password = (values.password || '').trim();
    const confirm = (values.confirm || '').trim();
    
    if (password !== confirm) {
      setRegisterError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({ ...values, username, password });
      message.success('🎉 注册成功！正在为您自动登录...');
      
      // 自动登录
      try {
        const res = await authApi.login({ username, password });
        setAuth(res.data.token, res.data.user);
        message.success('登录成功，欢迎加入！');
        const home = roleHomeMap[res.data.user.role_code] || '/';
        navigate(home, { replace: true });
      } catch (loginErr) {
        message.warning('自动登录失败，请手动登录');
        navigate('/login');
      }
      
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '注册失败，请稍后重试';
      setRegisterError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* 背景装饰（复用登录页） */}
      <div className="login-bg">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="bg-blob blob-3" />
      </div>

      <div className="login-content-wrapper">
        {/* 左侧品牌区（复用登录页，可根据需要微调内容） */}
        <div className="login-left">
          <div className="brand-container">
            <div className="brand">
              <div className="brand-icon">🚀</div>
              <Title level={1} className="brand-name">职引星</Title>
            </div>
            <Title level={3} className="brand-slogan">
              开启你的职场星途
            </Title>
            <Text className="brand-desc">
              只需几步，即可加入我们，开启智能职业匹配之旅。
            </Text>

            <div className="feature-list">
              {[
                { title: '极简注册', desc: '快速开启求职/招聘权限', icon: '📝' },
                { title: '身份自选', desc: '学生、企业两类专属档案', icon: '👤' },
              ].map((f) => (
                <div key={f.title} className="feature-item">
                  <div className="feature-icon-wrapper">
                    <span className="feature-icon">{f.icon}</span>
                  </div>
                  <div className="feature-text">
                    <div className="feature-title">{f.title}</div>
                    <div className="feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧注册卡片 */}
        <div className="login-right" style={{ width: '480px' }}>
          <Card className="login-card" bordered={false}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 32, color: '#1e293b' }}>账户注册</Title>
            
            <Form
              layout="vertical"
              onFinish={handleRegister}
              size="large"
              onValuesChange={() => setRegisterError('')}
              className={shake ? 'form-shake' : ''}
            >
              {registerError && (
                <Alert
                  message={registerError}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setRegisterError('')}
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />
              )}
              
              <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '用户名至少3位' }]}>
                <Input prefix={<UserOutlined />} placeholder="用户名 (3位以上)" />
              </Form.Item>

              <Form.Item name="email" rules={[{ required: true, message: '请输入电子邮箱' }, { type: 'email', message: '请输入有效的邮箱格式' }]}>
                <Input prefix={<MailOutlined />} placeholder="电子邮箱 (必填)" />
              </Form.Item>

              <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input prefix={<PhoneOutlined />} placeholder="手机号 (必填)" />
              </Form.Item>

              <Form.Item name="role_code" rules={[{ required: true, message: '请选择您的身份' }]}>
                <Select placeholder="请选择身份" size="large">
                  <Select.Option value="student">🎓 应届学生</Select.Option>
                  <Select.Option value="enterprise">🏢 企业代理 (HR)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="设置密码 (6位以上)" />
              </Form.Item>

              <Form.Item name="confirm" rules={[{ required: true, message: '请确认您的密码' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block className="login-btn">
                  注 册 并 登 录
                </Button>
              </Form.Item>

              <div className="login-footer-links">
                已有账号？ <Link to="/login">返回登录</Link>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
