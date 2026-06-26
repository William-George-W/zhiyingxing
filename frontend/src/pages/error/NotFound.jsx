import React from 'react';
import { Result, Button, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, CustomerServiceOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      {/* 装饰背景元素 */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        filter: 'blur(100px)',
        opacity: 0.15,
        borderRadius: '50%',
        top: '20%',
        left: '20%'
      }} />
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
        filter: 'blur(100px)',
        opacity: 0.1,
        borderRadius: '50%',
        bottom: '20%',
        right: '25%'
      }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        padding: '60px 80px',
        borderRadius: '32px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        maxWidth: '600px',
        width: '90%'
      }}>
        <Result
          status="404"
          extra={
            <Space size="large" direction="vertical" style={{ width: '100%' }}>
              <div style={{ marginBottom: 24 }}>
                <Title level={1} style={{ color: '#fff', fontSize: '120px', margin: 0, fontWeight: 800, letterSpacing: '-5px', lineHeight: 1 }}>
                  404
                </Title>
                <Title level={3} style={{ color: '#94a3b8', margin: '12px 0 0 0', fontWeight: 500 }}>
                  OOPS! 资源暂时不可用
                </Title>
                <Text style={{ color: '#64748b', fontSize: '16px', display: 'block', marginTop: 16 }}>
                  系统检测到访问异常或后台服务正在维护中。<br />
                </Text>
              </div>
              
              <Space size="middle">
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<HomeOutlined />}
                  onClick={() => navigate('/')}
                  style={{ 
                    height: '50px', 
                    padding: '0 32px', 
                    borderRadius: '12px', 
                    fontSize: '16px', 
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  返回安全区域
                </Button>
                <Button 
                  ghost 
                  size="large" 
                  icon={<CustomerServiceOutlined />}
                  style={{ 
                    height: '50px', 
                    padding: '0 24px', 
                    borderRadius: '12px', 
                    fontSize: '16px',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: '#94a3b8'
                  }}
                  onClick={() => window.location.reload()}
                >
                  重试连接
                </Button>
              </Space>
            </Space>
          }
        />
      </div>
    </div>
  );
}
