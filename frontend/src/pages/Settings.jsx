import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Form, Input, Button, Upload, message,
  Typography, Row, Col, Divider, Select, DatePicker, Spin
} from 'antd';
import {
  UserOutlined, MailOutlined, PhoneOutlined, LockOutlined,
  SaveOutlined, SafetyOutlined, SolutionOutlined,
  CameraOutlined, BankOutlined, SyncOutlined,
  CheckCircleFilled, CloseCircleFilled, EnvironmentOutlined, GlobalOutlined
} from '@ant-design/icons';
import { authApi, studentApi, enterpriseApi } from '../api/services';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const verifyStatusMap = {
  pending: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', text: '审核中', icon: <SyncOutlined spin /> },
  approved: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '已认证', icon: <CheckCircleFilled /> },
  rejected: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '已驳回', icon: <CloseCircleFilled /> },
};

const scaleOptions = ['少于15人', '15-50人', '50-150人', '150-500人', '500-2000人', '2000人以上'];

const customStyles = `
  .settings-page { max-width: 1000px; margin: 0 auto; }
  .custom-settings-tabs .ant-tabs-nav { margin-bottom: 32px !important; }
  .custom-settings-tabs .ant-tabs-nav::before { display: none; }
  .custom-settings-tabs .ant-tabs-nav-list { background: #f1f5f9; padding: 6px; border-radius: 14px; display: inline-flex; }
  .custom-settings-tabs .ant-tabs-tab { padding: 10px 24px !important; margin: 0 !important; border-radius: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #64748b; }
  .custom-settings-tabs .ant-tabs-ink-bar { display: none !important; }
  .custom-settings-tabs .ant-tabs-tab-active { background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .custom-settings-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #0f172a !important; font-weight: 700; }
  .modern-input .ant-input, .modern-input.ant-input-password, .modern-input.ant-select-selector, .modern-input.ant-picker { border: none !important; background: #f8fafc !important; border-radius: 12px !important; height: 48px !important; padding: 0 16px !important; box-shadow: none !important; transition: all 0.3s ease; font-size: 15px; display: flex; align-items: center; }
  .modern-input textarea.ant-input { border: none !important; background: #f8fafc !important; border-radius: 12px !important; padding: 16px !important; height: auto !important; }
  .modern-input .ant-input-prefix { color: #94a3b8; margin-right: 10px; font-size: 16px; }
  .modern-input .ant-input:focus, .modern-input.ant-input-password-focused, .modern-input.ant-select-focused .ant-select-selector, .modern-input.ant-picker-focused, .modern-input textarea.ant-input:focus { background: #ffffff !important; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15) !important; outline: 2px solid #6366f1 !important; }
  .modern-input-disabled .ant-input { background: #f1f5f9 !important; border: 1px dashed #cbd5e1 !important; color: #94a3b8 !important; cursor: not-allowed; }
  .ant-form-item-label > label { font-weight: 600; color: #1e293b; }
  .interactive-avatar-container { position: relative; width: 150px; height: 150px; margin: 0 auto 24px; border-radius: 50%; cursor: pointer; }
  .interactive-avatar-container::before { content: ''; position: absolute; inset: -6px; border-radius: 50%; background: linear-gradient(135deg, #3b82f640, #8b5cf640); z-index: 0; transition: all 0.4s ease; filter: blur(8px); }
  .interactive-avatar-container:hover::before { inset: -10px; background: linear-gradient(135deg, #3b82f670, #8b5cf670); filter: blur(12px); }
  .interactive-avatar-img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; border: 4px solid #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.08); object-fit: cover; z-index: 1; overflow: hidden; background: #e2e8f0; }
  .avatar-hover-overlay { position: absolute; inset: 0; border-radius: 50%; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .interactive-avatar-container:hover .avatar-hover-overlay { opacity: 1; }
  .avatar-hover-overlay .anticon { font-size: 36px; margin-bottom: 8px; transform: translateY(12px); transition: transform 0.3s ease; }
  .interactive-avatar-container:hover .avatar-hover-overlay .anticon { transform: translateY(0); }
  .avatar-hover-overlay span { font-size: 13px; font-weight: 500; }
  .gravity-save-btn { background: linear-gradient(135deg, #3b82f6, #6366f1) !important; border: none !important; height: 48px !important; padding: 0 36px !important; border-radius: 12px !important; font-weight: 600 !important; font-size: 15px !important; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; width: 100%; margin-top: 12px; }
  .gravity-save-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -6px rgba(59, 130, 246, 0.4) !important; }
  .danger-save-btn { background: linear-gradient(135deg, #ef4444, #dc2626) !important; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25) !important; }
  .danger-save-btn:hover { box-shadow: 0 12px 24px -6px rgba(239, 68, 68, 0.4) !important; }
`;

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [studentForm] = Form.useForm();
  const [enterpriseForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const [entProfile, setEntProfile] = useState(null);

  const currentAvatar = Form.useWatch('avatar', profileForm) || user?.avatar;

  const getFullAvatarUrl = (url) => {
    if (!url) return 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    return `http://localhost:3001${url}`;
  };

  useEffect(() => {
    // 🚀 核心逻辑：挂载时强制刷新一次用户信息，同步 ID 重排后的 org_name 等元数据
    const refreshUserInfo = async () => {
      try {
        const res = await authApi.getMe();
        updateUser(res.data);
      } catch (err) {
        console.error('[Settings] 刷新用户信息失败:', err);
      }
    };
    refreshUserInfo();
  }, []);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        org_name: user.org_name || (user.role_code === 'school' ? '未关联学校' : ''),
        email: user.email,
        phone: user.phone,
        avatar: user.avatar
      });
    }
  }, [user, profileForm]);

  useEffect(() => {
    if (user?.role_code === 'student') {
      const fetchStudentProfile = async () => {
        try {
          const res = await studentApi.getProfile();
          const profileData = {
            ...res.data,
            phone: res.data.phone || user.phone,
            email: res.data.email || user.email,
            birth_date: res.data.birth_date ? dayjs(res.data.birth_date) : null,
            graduation_year: res.data.graduation_year ? dayjs(`${res.data.graduation_year}-01-01`) : null,
          };
          studentForm.setFieldsValue(profileData);
        } catch (err) {
          console.error('[Settings] 获取学生档案失败:', err);
        }
      };
      fetchStudentProfile();
    }
  }, [user, studentForm]);

  useEffect(() => {
    if (user?.role_code === 'enterprise') {
      const fetchEntProfile = async () => {
        try {
          const res = await enterpriseApi.getProfile();
          setEntProfile(res.data);
          enterpriseForm.setFieldsValue(res.data);
        } catch (err) {
          console.error('[Settings] 获取企业档案失败:', err);
        }
      };
      fetchEntProfile();
    }
  }, [user, enterpriseForm]);

  const handleUpdateBasic = async (values) => {
    setLoading(true);
    try {
      await authApi.updateProfile(values);
      message.success('基本资料已保存');
      updateUser(values);
      // 🚀 同时同步更新“个人档案”表单中的字段
      if (user?.role_code === 'student') {
        studentForm.setFieldsValue({
          phone: values.phone,
          email: values.email
        });
      }
    } catch (err) {
      message.error(err.response?.data?.message || '资料更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudentProfile = async (values) => {
    setLoading(true);
    try {
      const data = {
        ...values,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
        graduation_year: values.graduation_year ? values.graduation_year.year() : null,
      };
      await studentApi.updateProfile(data);
      message.success('个人档案已保存同步');

      // 🚀 更新全局状态，确保“基本设置”页签同步更新
      updateUser({ phone: values.phone, email: values.email });
      profileForm.setFieldsValue({ phone: values.phone, email: values.email });
    } catch (err) {
      message.error(err.response?.data?.message || '档案保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEnterpriseProfile = async (values) => {
    setLoading(true);
    try {
      await enterpriseApi.updateProfile(values);
      message.success('✅ 企业档案已保存更新，等待审核生效');
      const res = await enterpriseApi.getProfile();
      setEntProfile(res.data);
    } catch (err) {
      message.error(err.response?.data?.message || '企业档案更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const { data } = await authApi.uploadAvatar(formData);
      profileForm.setFieldsValue({ avatar: data.url });
      message.success('头像上传成功，点击下方保存更新使其生效。');
      onSuccess(data);
    } catch (err) {
      message.error('图片上传失败');
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await authApi.changePassword(values);
      message.success('新密码已设置成功，请妥善保管。');
      pwdForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || '原密码错误或设置失败');
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: 'basic',
      label: <span style={{ fontSize: 16 }}><UserOutlined /> 基本设置</span>,
      children: (
        <Row gutter={64}>
          <Col xs={24} md={14} lg={12}>
            <Form form={profileForm} layout="vertical" onFinish={handleUpdateBasic}>
              <Form.Item label="登录名 / 用户名" name="username">
                <Input className="modern-input modern-input-disabled" disabled prefix={<UserOutlined />} />
              </Form.Item>
              {(user?.org_name || user?.role_code === 'school') && (
                <Form.Item label={user?.role_code === 'school' ? "所属高校" : "所属机构"} name="org_name">
                  <Input 
                    className="modern-input modern-input-disabled" 
                    disabled 
                    prefix={<BankOutlined />} 
                    placeholder="系统自动载入..."
                  />
                </Form.Item>
              )}
              <Form.Item label="电子邮箱" name="email" rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}>
                <Input className="modern-input" prefix={<MailOutlined />} placeholder="如：hr@company.com" />
              </Form.Item>
              <Form.Item label="联系电话" name="phone">
                <Input className="modern-input" prefix={<PhoneOutlined />} placeholder="请输入手机号" />
              </Form.Item>
              <Form.Item name="avatar" noStyle shouldUpdate>{() => <div style={{ display: 'none' }} />}</Form.Item>
              <Form.Item style={{ marginTop: 24 }}>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} className="gravity-save-btn">保存更新</Button>
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={10} lg={12} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>
            <Upload accept="image/*" showUploadList={false} customRequest={handleCustomUpload}>
              <div className="interactive-avatar-container">
                <img className="interactive-avatar-img" src={getFullAvatarUrl(currentAvatar)} alt="avatar" />
                <div className="avatar-hover-overlay"><CameraOutlined /><span>点击更换头像</span></div>
              </div>
            </Upload>
            <div style={{ marginTop: 16 }}><Text type="secondary" style={{ fontSize: 13 }}>支持 JPG、PNG 等常规格式</Text></div>
            {loading && <Spin style={{ marginTop: 20 }} tip="上传中..." />}
          </Col>
        </Row>
      ),
    },
    ...(user?.role_code === 'student' ? [{
      key: 'student_profile',
      label: <span style={{ fontSize: 16 }}><SolutionOutlined /> 个人档案填写</span>,
      children: (
        <Form form={studentForm} layout="vertical" onFinish={handleUpdateStudentProfile}>
          <Divider orientation="left">基本身份信息</Divider>
          <Row gutter={24}>
            <Col xs={24} sm={12}><Form.Item label="真实姓名" name="real_name"><Input className="modern-input" prefix={<UserOutlined />} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="学号" name="student_no"><Input className="modern-input" /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="性别" name="gender">
                <Select className="modern-input"><Select.Option value={1}>男</Select.Option><Select.Option value={0}>女</Select.Option></Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}><Form.Item label="出生日期" name="birth_date"><DatePicker className="modern-input" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                extra={<Text type="secondary" style={{ fontSize: 11 }}></Text>}
              >
                <Input className="modern-input" prefix={<PhoneOutlined />} placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="联系邮箱"
                name="email"
                extra={<Text type="secondary" style={{ fontSize: 11 }}></Text>}
              >
                <Input className="modern-input" prefix={<MailOutlined />} placeholder="请输入联系邮箱" />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">教育经历</Divider>
          <Row gutter={24}>
            <Col xs={24} sm={12}><Form.Item label="毕业院校" name="school_name"><Input className="modern-input" /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="所学专业" name="major"><Input className="modern-input" /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="最高学历" name="degree">
                <Select className="modern-input">{['专科', '本科', '硕士', '博士'].map(d => <Select.Option key={d} value={d}>{d}</Select.Option>)}</Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="毕业年份" name="graduation_year">
                <DatePicker picker="year" className="modern-input" style={{ width: '100%' }} placeholder="请选择毕业年份" />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">自我介绍</Divider>
          <Form.Item name="self_intro"><Input.TextArea className="modern-input" rows={4} showCount maxLength={500} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} className="gravity-save-btn">保存并同步档案</Button>
        </Form>
      )
    }] : []),
    ...(user?.role_code === 'enterprise' ? [{
      key: 'enterprise_profile',
      label: <span style={{ fontSize: 16 }}><BankOutlined /> 企业档案信息</span>,
      children: (
        <Form form={enterpriseForm} layout="vertical" onFinish={handleUpdateEnterpriseProfile}>
          {entProfile && (
            <div style={{
              marginBottom: 24, padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
              background: (verifyStatusMap[entProfile.verify_status] || verifyStatusMap.pending).bg,
              border: `1px solid ${(verifyStatusMap[entProfile.verify_status] || verifyStatusMap.pending).border}`
            }}>
              <span style={{ fontSize: 20 }}>{(verifyStatusMap[entProfile.verify_status] || verifyStatusMap.pending).icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: (verifyStatusMap[entProfile.verify_status] || verifyStatusMap.pending).color }}>认证状态：{(verifyStatusMap[entProfile.verify_status] || verifyStatusMap.pending).text}</div>
                {entProfile.verify_status === 'rejected' && entProfile.verify_remark && <Text type="danger" style={{ fontSize: 12 }}>驳回原因：{entProfile.verify_remark}</Text>}
              </div>
            </div>
          )}
          <Divider orientation="left">基本信息</Divider>
          <Row gutter={24}>
            <Col xs={24} sm={12}><Form.Item label="企业全称" name="company_name" rules={[{ required: true }]}><Input className="modern-input" prefix={<BankOutlined />} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="所属行业" name="industry"><Select className="modern-input">{['互联网/IT', '金融/银行', '教育培训', '医疗健康', '制造业', '人工智能', '电商/零售', '其他'].map(i => <Select.Option key={i} value={i}>{i}</Select.Option>)}</Select></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="企业规模" name="scale"><Select className="modern-input">{scaleOptions.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}</Select></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="主营城市" name="city"><Select mode="tags" maxCount={1} placeholder="选择或输入城市" className="modern-input" allowClear>{['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '其他'].map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}</Select></Form.Item></Col>
            <Col xs={24}><Form.Item label="详细地址" name="address"><Input className="modern-input" prefix={<EnvironmentOutlined />} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="企业官网" name="website"><Input className="modern-input" prefix={<GlobalOutlined />} placeholder="https://..." /></Form.Item></Col>
          </Row>
          <Divider orientation="left">企业简介</Divider>
          <Form.Item name="description"><Input.TextArea className="modern-input" rows={5} showCount maxLength={1000} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} className="gravity-save-btn">保存并更新档案</Button>
        </Form>
      )
    }] : []),
    {
      key: 'security',
      label: <span style={{ fontSize: 16 }}><SafetyOutlined /> 安全设置</span>,
      children: (
        <div style={{ maxWidth: 500 }}>
          <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword}>
            <Form.Item label="当前密码" name="oldPassword" rules={[{ required: true }]}><Input.Password className="modern-input" prefix={<LockOutlined />} /></Form.Item>
            <Divider style={{ margin: '32px 0' }} />
            <Form.Item label="新密码" name="newPassword" rules={[{ required: true, min: 6 }]}><Input.Password className="modern-input" prefix={<LockOutlined />} /></Form.Item>
            <Form.Item label="确认新密码" name="confirm" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, val) { if (!val || getFieldValue('newPassword') === val) return Promise.resolve(); return Promise.reject(new Error('密码不一致')); } })]}><Input.Password className="modern-input" prefix={<LockOutlined />} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} className="gravity-save-btn danger-save-btn">重置账户密码</Button>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div className="settings-page">
      <style>{customStyles}</style>
      <Title level={3} style={{ marginBottom: 8, color: '#0f172a', fontWeight: 800 }}>⚙️ 账户设置</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 28, fontSize: 14 }}>在此管理您的基础资料。管理员可以在此获取高详细度报错信息。</Text>
      <Card bordered={false} style={{ borderRadius: 16, border: '1px solid #f1f5f9' }} bodyStyle={{ padding: '32px' }}>
        <Tabs className="custom-settings-tabs" defaultActiveKey="basic" items={items} />
      </Card>
    </div>
  );
}
