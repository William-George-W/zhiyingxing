import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Card, List, Button, Tag, Space, 
  Empty, Spin, message, Divider, Badge, Tooltip, Modal, Row, Col, Progress, Input, Segmented
} from 'antd';
import {
  BankOutlined, EnvironmentOutlined, ClockCircleOutlined,
  FileTextOutlined, SafetyCertificateOutlined,
  ArrowRightOutlined, DownloadOutlined, EyeOutlined, CheckCircleFilled,
  SolutionOutlined
} from '@ant-design/icons';
import { studentApi } from '../../api/services';
import dayjs from 'dayjs';
import mammoth from 'mammoth';

const { Title, Text, Paragraph } = Typography;

const contractStatusConfig = {
  pending: { color: '#f59e0b', text: '待签署', bg: '#fffbeb' },
  signed: { color: '#10b981', text: '已签约', bg: '#f0fdf4' },
  processing: { color: '#3b82f6', text: '办理中', bg: '#eff6ff' },
  resigned: { color: '#94a3b8', text: '已辞职', bg: '#f1f5f9' },
  dismissed: { color: '#94a3b8', text: '已辞退', bg: '#f1f5f9' },
};

const customStyles = `
  .my-jobs-container {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
  }
  .job-pill-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 24px 32px;
    border: 1px solid #f1f5f9;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .job-pill-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
  }
  .job-pill-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 6px;
    background: #3b82f6;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .job-pill-card:hover::before {
    opacity: 1;
  }
  .company-hero-logo {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, #f8fafc, #e2e8f0);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #3b82f6;
    font-weight: 800;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    flex-shrink: 0;
  }
  .salary-badge {
    color: #ef4444;
    font-weight: 800;
    font-size: 16px;
  }
  .contract-status-tag {
    padding: 6px 16px;
    border-radius: 30px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    border: none;
  }

  /* Bento 风格详情样式 */
  .bento-mini-card {
    background: #f8fafc;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid #f1f5f9;
    height: 100%;
  }
  .b-label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
  .b-value { font-size: 15px; font-weight: 700; color: #1e293b; }
  .rich-typography { color: #475569; line-height: 1.8; font-size: 14px; white-space: pre-line; }
  .ai-glass-card {
    background: linear-gradient(135deg, rgba(245, 247, 255, 0.8) 0%, rgba(235, 239, 255, 0.8) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid #fff;
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
`;

export default function MyJobs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  
  // 详情弹窗相关
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);

  // 预览相关状态
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [parsing, setParsing] = useState(false);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await studentApi.getContracts();
      setContracts(res.data);
    } catch (err) {
      console.error(err);
      message.error('获取岗位数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handlePreview = async (item) => {
    const fileUrl = item.file_path;
    const url = `http://localhost:3001${fileUrl}`;
    setPreviewUrl(url);
    setPreviewTitle(item.file_name || '合同文件');
    setPreviewModalOpen(true);
    setPreviewHtml('');

    if (fileUrl.toLowerCase().endsWith('.docx')) {
      setParsing(true);
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value);
      } catch (e) {
        console.error('Word 解析失败:', e);
        message.error('内容预览失败，建议下载查看');
      } finally {
        setParsing(false);
      }
    }
  };

  const openJobDetail = async (jobId) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const res = await studentApi.getJobDetail(jobId);
      setCurrentJob(res.data);
    } catch (err) {
      message.error('加载岗位详情失败');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getContractStatus = (item) => {
    if (item.app_status === 'resigned') return contractStatusConfig.resigned;
    if (item.app_status === 'dismissed') return contractStatusConfig.dismissed;
    
    // 优先检查投递大状态，确保两端对齐
    if (item.app_status === 'signed' || (item.student_signed && item.enterprise_signed)) {
      return contractStatusConfig.signed;
    }
    if (item.student_signed || item.enterprise_signed) {
      return contractStatusConfig.processing;
    }
    return contractStatusConfig.pending;
  };

  const filteredContracts = contracts.filter(c => {
    if (activeTab === 'active') {
      return !['resigned', 'dismissed'].includes(c.app_status);
    }
    return ['resigned', 'dismissed'].includes(c.app_status);
  });

  const handleDownload = async (fileUrl, fileName) => {
    if (!fileUrl) return;
    try {
      const hide = message.loading('正在准备下载...', 0);
      const response = await fetch(`http://localhost:3001${fileUrl}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || '合同文件';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      hide();
    } catch (error) {
      console.error(error);
      message.error('下载失败，请稍后重试');
    }
  };

  const handleResign = (applicationId) => {
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
          await studentApi.resign(applicationId, { reason });
          message.success('辞职手续已办理。');
          fetchContracts();
        } catch (e) {
          console.error(e);
          message.error(e.response?.data?.message || '辞职失败');
        }
      }
    });
  };

  return (
    <div className="my-jobs-container">
      <style>{customStyles}</style>

      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>✨ 我的正式岗位</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>在此查看您的就业历史与当前正在执行的入职合同。</Text>
        </div>
        
        <div style={{ background: '#f8fafc', padding: 4, borderRadius: 12, border: '1px solid #f1f5f9' }}>
          <Segmented
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { label: '进行中岗位', value: 'active' },
              { label: '历史记录', value: 'history' }
            ]}
            style={{ borderRadius: 10 }}
          />
        </div>
      </div>

      <Spin spinning={loading}>
        {filteredContracts.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 24, textAlign: 'center', padding: '60px 0' }}>
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    {activeTab === 'active' ? '您目前还没有正在进行的岗位记录' : '暂无历史就业记录'}
                  </Text>
                  {activeTab === 'active' && (
                    <div style={{ marginTop: 20 }}>
                      <Button 
                        type="primary" size="large" style={{ borderRadius: 12 }} 
                        icon={<ArrowRightOutlined />}
                        onClick={() => navigate('/student/jobs')}
                      >
                        前往岗位广场看看
                      </Button>
                    </div>
                  )}
                </div>
              } 
            />
          </Card>
        ) : (
          <List
            dataSource={filteredContracts}
            renderItem={(item) => {
              const status = getContractStatus(item);
              const isSigned = item.student_signed && item.enterprise_signed;

              return (
                <div className="job-pill-card">
                  <div className="company-hero-logo">
                    {item.company_logo ? <img src={`http://localhost:3001${item.company_logo}`} alt="logo" style={{ width: '100%', height: '100%', borderRadius: 16 }} /> : item.company_name?.[0]}
                  </div>

                  <div style={{ marginLeft: 24, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <Text style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{item.job_title}</Text>
                      <span className="contract-status-tag" style={{ background: status.bg, color: status.color }}>
                        <SafetyCertificateOutlined /> {status.text}
                      </span>
                    </div>
                    <Space split={<Divider type="vertical" />} style={{ color: '#64748b' }}>
                      <Text style={{ fontWeight: 600, color: '#475569' }}><BankOutlined /> {item.company_name}</Text>
                      <Text><EnvironmentOutlined /> {item.job_city}</Text>
                      <Text className="salary-text" style={{ color: '#ef4444', fontWeight: 700 }}>
                        {item.salary_min/1000}k-{item.salary_max/1000}k
                      </Text>
                    </Space>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>
                      <ClockCircleOutlined /> 录用于 {dayjs(item.created_at).format('YYYY-MM-DD')}
                    </div>
                    <Space>
                      {item.file_path ? (
                        <>
                          <Tooltip title="在线预览合同内容">
                            <Button 
                              icon={<EyeOutlined />} 
                              style={{ borderRadius: 10 }}
                              onClick={() => handlePreview(item)}
                            >
                              预览
                            </Button>
                          </Tooltip>
                          <Tooltip title={`下载原始文件: ${item.file_name || '合同文档'}`}>
                            <Button 
                              type="primary"
                              icon={<DownloadOutlined />} 
                              style={{ borderRadius: 10, background: '#10b981', border: 'none' }}
                              onClick={() => handleDownload(item.file_path, item.file_name)}
                            >
                              下载正式合同
                            </Button>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="企业正在努力准备合同中，请稍后再次查看">
                          <Button disabled icon={<FileTextOutlined />} style={{ borderRadius: 10 }}>生成合同中</Button>
                        </Tooltip>
                      )}
                      
                      {item.app_status === 'resigned' ? (
                        <Button disabled style={{ borderRadius: 10, fontWeight: 600 }}>
                          已辞职
                        </Button>
                      ) : item.app_status === 'dismissed' ? (
                        <Button disabled style={{ borderRadius: 10, fontWeight: 600 }}>
                          已辞退
                        </Button>
                      ) : item.app_status === 'signed' ? (
                        <Button 
                          danger 
                          style={{ borderRadius: 10, fontWeight: 600 }}
                          onClick={() => handleResign(item.application_id)}
                        >
                          辞职
                        </Button>
                      ) : null}

                      <Button 
                        type="default" 
                        icon={<SolutionOutlined />} 
                        style={{ borderRadius: 10, fontWeight: 600 }}
                        onClick={() => openJobDetail(item.job_id)}
                      >
                        就业详情
                      </Button>
                    </Space>
                  </div>
                </div>
              )
            }}
          />
        )}
      </Spin>

      {/* 岗位详情 Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{currentJob?.title || '岗位详情'}</span>
            {currentJob?.job_type && (
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
                {currentJob.job_type}
              </Tag>
            )}
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={800}
        centered
        footer={null}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Spin spinning={loadingDetail}>
          {currentJob && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 20 }}>
              {/* 企业概览 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div className="company-hero-logo" style={{ width: 72, height: 72, fontSize: 32, borderRadius: 16 }}>
                  {currentJob.logo ? <img src={`http://localhost:3001${currentJob.logo}`} alt="logo" style={{ width: '100%', height: '100%', borderRadius: 16 }} /> : currentJob.company_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{currentJob.company_name}</Title>
                  <Space size="middle" style={{ marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><EnvironmentOutlined /> {currentJob.company_city}</span>
                    <span>{currentJob.industry || '综合行业'}</span>
                    <span>{currentJob.scale || '规模未知'}</span>
                  </Space>
                </div>
              </div>

              {/* Bento 数据格 */}
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <div className="bento-mini-card">
                    <div className="b-label">薪资范围</div>
                    <div className="b-value" style={{ color: '#ef4444' }}>
                      {currentJob.salary_min/1000}K - {currentJob.salary_max/1000}K
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="bento-mini-card">
                    <div className="b-label">学历要求</div>
                    <div className="b-value">{currentJob.education_req}</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="bento-mini-card">
                    <div className="b-label">工作地点</div>
                    <div className="b-value">{currentJob.city}</div>
                  </div>
                </Col>
              </Row>


              {/* 岗位描述 */}
              <div>
                <Title level={5} style={{ marginBottom: 12, color: '#1e293b', fontWeight: 800 }}>📋 岗位工作描述</Title>
                <div className="rich-typography">
                  {currentJob.description || '暂无详细描述'}
                </div>
              </div>

              {/* 任职要求 */}
              <div>
                <Title level={5} style={{ marginBottom: 12, color: '#1e293b', fontWeight: 800 }}>✅ 任职必备条件</Title>
                <div className="rich-typography">
                  {currentJob.requirements ? (
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      {currentJob.requirements.split('\n').map((line, idx) => {
                        if (!line.trim()) return null;
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '4px 0' }}>
                            <CheckCircleFilled style={{ color: '#10b981', fontSize: 18, marginTop: 4 }} />
                            <span style={{ flex: 1, color: '#334155' }}>{line.replace(/^[\d\.、\-*\s]+/, '')}</span>
                          </div>
                        );
                      })}
                    </Space>
                  ) : '暂无特定要求'}
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Modal>

      {/* 合同预览 Modal - 对齐简历管理样式 */}
      <Modal
        title={previewTitle}
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        footer={[
          <Button 
            key="download" 
            icon={<DownloadOutlined />} 
            onClick={() => {
              const currentContract = contracts.find(c => c.file_name === previewTitle || `http://localhost:3001${c.file_path}` === previewUrl);
              if (currentContract) handleDownload(currentContract.file_path, currentContract.file_name);
            }}
            style={{ borderRadius: 8 }}
          >
            保存附件
          </Button>,
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setPreviewModalOpen(false)} 
            style={{ background: '#6366f1', borderRadius: 8, border: 'none' }}
          >
            关闭预览
          </Button>
        ]}
        width={1000}
        centered
        styles={{ body: { height: 'calc(100vh - 260px)', padding: 0, overflow: 'hidden' } }}
      >
        {parsing ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" tip="系统正在解析内容流..." />
          </div>
        ) : (
          <div style={{ height: '100%', background: '#fff' }}>
            {previewUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="合同预览视图"
              />
            ) : previewHtml ? (
              <div
                style={{ height: '100%', overflowY: 'auto', padding: '40px 60px' }}
                className="docx-preview-content"
              >
                <style>{`
                  .docx-preview-content table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                  .docx-preview-content td, .docx-preview-content th { border: 1px solid #ddd; padding: 8px; }
                  .docx-preview-content p { margin-bottom: 1em; line-height: 1.6; }
                  .docx-preview-content img { max-width: 100%; height: auto; }
                `}</style>
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <FileTextOutlined style={{ fontSize: 64, color: '#3b82f6', marginBottom: 20 }} />
                <Text strong style={{ fontSize: 18 }}>当前格式暂不支持通过在线引擎预览</Text>
                <Text type="secondary" style={{ marginTop: 10 }}>建议：请直接下载并在本地应用程序查阅文档副本。</Text>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  style={{ marginTop: 24, background: '#10b981', border: 'none', borderRadius: 10 }}
                  onClick={() => {
                    const currentContract = contracts.find(c => c.file_name === previewTitle || `http://localhost:3001${c.file_path}` === previewUrl);
                    if (currentContract) handleDownload(currentContract.file_path, currentContract.file_name);
                  }}
                >
                  本地下载
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
