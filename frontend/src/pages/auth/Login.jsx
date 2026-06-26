import React, { useState } from 'react';
import {
  Form, Input, Button, Tabs, Select, message, Typography, Card, Alert, Checkbox, Space
} from 'antd';
import { CloseCircleOutlined, UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, CheckCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/services';
import { roleHomeMap } from '../../router/guards';
import './Login.css';

const { Title, Text } = Typography;

export default function Login() {
  const [activeTab, setActiveTab] = useState('login_account');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [shake, setShake] = useState(false);
  const [remember, setRemember] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [codeLoading, setCodeLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation(); // Hook for initializing based on path

  // 🚀 核心修复：保持左侧面板状态不重载，用内部变量去控制右侧显隐
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');

  const [loginForm] = Form.useForm();
  const [codeForm] = Form.useForm();
  const [registerForm] = Form.useForm(); // 新增注册表单钩子

  // 记住账号的 key
  const RM_KEY = 'zhiyinxing_last_username';

  // 初始化记住的账号
  React.useEffect(() => {
    const saved = localStorage.getItem(RM_KEY);
    if (saved) {
      loginForm.setFieldsValue({ username: saved });
    }
  }, [loginForm]);

  // 触发抖动动画
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleLogin = async (values) => {
    setLoginError('');
    setLoading(true);
    const trimmed = { ...values, username: (values.username || '').trim(), password: (values.password || '').trim() };
    try {
      const res = await authApi.login(trimmed);
      
      // 🚀 记住账号逻辑
      if (remember) {
        localStorage.setItem(RM_KEY, trimmed.username);
      } else {
        localStorage.removeItem(RM_KEY);
      }

      setAuth(res.data.token, res.data.user);
      message.success('登录成功，欢迎回来！');
      const home = roleHomeMap[res.data.user.role_code] || '/';
      navigate(home, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // 🚀 将注册逻辑内嵌复用
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
      
      try {
        const res = await authApi.login({ username, password });
        setAuth(res.data.token, res.data.user);
        message.success('登录成功，欢迎加入！');
        const home = roleHomeMap[res.data.user.role_code] || '/';
        navigate(home, { replace: true });
      } catch (loginErr) {
        message.warning('自动登录失败，请手动登录');
        setIsLogin(true);
      }
      
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '注册失败，请稍后重试';
      setRegisterError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // 🚀 发送验证码逻辑
  const handleSendCode = async () => {
    try {
      const email = codeForm.getFieldValue('email');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        message.error('请输入正确的邮箱地址');
        return;
      }
      
      setCodeLoading(true);
      await authApi.sendCode(email);
      message.success('验证码已发送，请查收邮件（若未收到请检查垃圾箱）');
      
      // 开启倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      message.error(err?.response?.data?.message || '发送失败，请稍后重试');
    } finally {
      setCodeLoading(false);
    }
  };

  // 🚀 验证码登录 logic
  const handleCodeLogin = async (values) => {
    setLoginError('');
    setLoading(true);
    try {
      const res = await authApi.loginWithCode(values);
      setAuth(res.data.token, res.data.user);
      message.success('验证码登录成功！');
      const home = roleHomeMap[res.data.user.role_code] || '/';
      navigate(home, { replace: true });
    } catch (err) {
      setLoginError(err?.response?.data?.message || '登录失败，请检查验证码');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* 背景装饰 */}
      <div className="login-bg">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="bg-blob blob-3" />
      </div>

      {/* 左侧介绍区 */}
      <div className="login-content-wrapper">
        <div className="login-left">
        <div className="brand-container">
          <div className="brand">
            <div className="brand-icon">⭐</div>
            <Title level={1} className="brand-name">职引星</Title>
          </div>
          <Title level={3} className="brand-slogan">
            AI 驱动 · 校园招聘新范式
          </Title>
          <Text className="brand-desc">
            连接高校学生与优质企业，智能匹配、流程透明、签约可信。
          </Text>

          <div className="feature-list">
            {[
              { title: '智能匹配', desc: 'AI驱动人岗双向推荐', icon: '🎯' },
              { title: '数据看板', desc: '全局就业数据可视化', icon: '📊' },
              { title: '安全认证', desc: '企业级状态流转控制', icon: '🔐' },
              { title: '状态追踪', desc: '全流程求职进度管理', icon: '⚡' },
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

      {/* 右侧卡片状态切换 */}
      <div className="login-right">
        {isLogin ? (
          <Card className="login-card" bordered={false}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              centered
              items={[
                {
                  key: 'login_account',
                  label: '账户登录',
                  children: (
                    <Form
                      form={loginForm}
                      layout="vertical"
                      onFinish={handleLogin}
                      size="large"
                      onValuesChange={() => setLoginError('')}
                      className={shake && activeTab === 'login_account' ? 'form-shake' : ''}
                    >
                      {loginError && (
                        <Alert
                          message={loginError}
                          type="error"
                          showIcon
                          icon={<CloseCircleOutlined />}
                          closable
                          onClose={() => setLoginError('')}
                          style={{ marginBottom: 16, borderRadius: 8 }}
                        />
                      )}
                      <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="用户名"
                          status={loginError ? 'error' : ''}
                        />
                      </Form.Item>
                      <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="密码"
                          status={loginError ? 'error' : ''}
                        />
                      </Form.Item>
                      
                      <div className="login-extras">
                        <Checkbox 
                          checked={remember} 
                          onChange={(e) => setRemember(e.target.checked)}
                        >
                          记住账户
                        </Checkbox>
                      </div>

                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block className="login-btn">
                          登 录
                        </Button>
                      </Form.Item>
                      
                      <div className="login-footer-links">
                         没有账号？<a onClick={() => setIsLogin(false)}>立即注册</a>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: 'login_email',
                  label: '邮箱登录',
                  children: (
                    <Form
                      form={codeForm}
                      layout="vertical"
                      onFinish={handleCodeLogin}
                      size="large"
                      onValuesChange={() => setLoginError('')}
                      className={shake && activeTab === 'login_email' ? 'form-shake' : ''}
                    >
                      {loginError && (
                        <Alert
                          message={loginError}
                          type="error"
                          showIcon
                          icon={<CloseCircleOutlined />}
                          closable
                          onClose={() => setLoginError('')}
                          style={{ marginBottom: 16, borderRadius: 8 }}
                        />
                      )}
                      <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入注册邮箱' }]}>
                        <Input
                          prefix={<MailOutlined />}
                          placeholder="请输入注册邮箱"
                        />
                      </Form.Item>
                      
                      <Form.Item name="code" rules={[{ required: true, message: '请输入 6 位验证码' }]}>
                        {/* 🚀 方案 B：相对/绝对内嵌式设计 */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <Input
                            prefix={<SafetyOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="6位验证码"
                            maxLength={6}
                            style={{ width: '100%', paddingRight: 120 }}
                          />
                          <Button 
                            type="text"
                            disabled={countdown > 0} 
                            loading={codeLoading}
                            onClick={handleSendCode}
                            style={{ 
                              position: 'absolute', 
                              right: 4, 
                              top: '50%', 
                              transform: 'translateY(-50%)',
                              zIndex: 10,
                              height: 32,
                              padding: '0 12px',
                              fontSize: 13,
                              borderRadius: 6,
                              color: countdown > 0 ? '#94a3b8' : '#3b82f6',
                              background: countdown > 0 ? 'transparent' : '#eff6ff',
                              fontWeight: 600,
                              border: 'none',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (countdown === 0) e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseLeave={(e) => { if (countdown === 0) e.currentTarget.style.background = '#eff6ff'; }}
                          >
                            {countdown > 0 ? `${countdown}s 后重新发送` : '获取验证码'}
                          </Button>
                        </div>
                      </Form.Item>

                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block className="login-btn">
                          登 录
                        </Button>
                      </Form.Item>
                      
                      <div className="login-footer-links">
                        没有账号？<a onClick={() => setIsLogin(false)}>立即注册</a>
                      </div>
                    </Form>
                  ),
                },
              ]}
            />
          </Card>
        ) : (
          <Card className="login-card" bordered={false}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 32, color: '#1e293b' }}>账户注册</Title>
            
            <Form
              form={registerForm}
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
                已有账号？ <a onClick={() => setIsLogin(true)}>返回登录</a>
              </div>
            </Form>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
