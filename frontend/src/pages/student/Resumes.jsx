import React, { useEffect, useState } from 'react';
import {
  Card, Button, Upload, List, Tag, Space, Typography, Popconfirm,
  message, Empty, Tooltip, Modal, Row, Col, Progress, Divider, Input, Spin
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, StarOutlined, StarFilled,
  FilePdfOutlined, FileWordOutlined, EyeOutlined, RobotOutlined,
  CheckCircleOutlined, DownloadOutlined, InboxOutlined
} from '@ant-design/icons';
import { studentApi } from '../../api/services';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const getFileIcon = (name) => {
  if (!name) return <FilePdfOutlined />;
  if (name.toLowerCase().endsWith('.pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
  return <FileWordOutlined style={{ color: '#3b82f6' }} />;
};

const customStyles = `
  /* 大体量拖拽区 */
  .resume-dragger-wrapper {
    margin-bottom: 32px;
  }
  .resume-dragger-wrapper .ant-upload.ant-upload-drag {
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 16px;
    transition: all 0.3s;
  }
  .resume-dragger-wrapper .ant-upload.ant-upload-drag:hover {
    border-color: #6366f1;
    background: #eef2ff;
  }
  
  /* 资产悬浮卡片 */
  .asset-card {
    background: #ffffff;
    border-radius: 16px;
    margin-bottom: 20px !important;
    padding: 8px 12px;
    border: none;
    box-shadow: 0 2px 16px rgba(0,0,0,0.03);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    border: 1px solid transparent;
  }
  .asset-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 32px -8px rgba(0,0,0,0.08);
    border: 1px solid #e2e8f0;
  }
  
  .asset-card-default {
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    border: 1px solid #bfdbfe;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.1);
  }
  .asset-card-default:hover {
    border: 1px solid #93c5fd;
    box-shadow: 0 16px 32px -8px rgba(59, 130, 246, 0.15);
  }

  /* 技能胶囊 */
  .pill-badge {
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    border-radius: 20px;
    padding: 2px 12px;
    font-size: 11px;
    color: #475569;
    border: none;
    margin-right: 6px;
    margin-bottom: 6px;
    display: inline-block;
  }

  /* 静默操作按钮 (Hover 激活) */
  .action-icon-btn {
    color: #94a3b8 !important;
    transition: all 0.3s;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .action-icon-btn:hover {
    color: #3b82f6 !important;
    background: #f1f5f9 !important;
    transform: scale(1.1);
  }
  .action-icon-delete:hover {
    color: #ef4444 !important;
    background: #fee2e2 !important;
  }
  .action-icon-default {
    color: #cbd5e1 !important;
  }
  .action-icon-default:hover {
    color: #f59e0b !important;
    background: #fef3c7 !important;
  }

  /* 统一规范的行动按钮 (替代过于花哨的极光渐变) */
  .ai-diag-btn {
    background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    padding: 0 16px !important;
    height: 36px !important;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
  }
  .ai-diag-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35) !important;
  }
  .ai-diag-btn .anticon {
    font-size: 16px;
  }
`;

export default function StudentResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [parsing, setParsing] = useState(false);

  const navigate = useNavigate();

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await studentApi.getResumes();
      setResumes(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleUpload = async ({ file }) => {
    if (!['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(file.type)) {
      return message.error('只支持 PDF / Word 格式');
    }
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await studentApi.uploadResume(form);
      message.success('🎉 简历上传成功');
      fetchResumes();
    } catch (err) {
      console.error(err);
      if (!err.response) {
        message.error('上传失败：' + (err.message || '未知错误'));
      }
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDelete = async (id) => {
    try {
      await studentApi.deleteResume(id);
      message.success('已删除');
      fetchResumes();
    } catch (e) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const handleSetDefault = async (id) => {
    await studentApi.setDefault(id);
    message.success('✅ 默认简历已切换');
    fetchResumes();
  };

  const handlePreview = async (resume) => {
    const url = `http://localhost:3001${resume.file_path}`;
    setPreviewUrl(url);
    setPreviewTitle(resume.file_name);
    setPreviewVisible(true);
    setPreviewHtml('');

    if (resume.file_name.toLowerCase().endsWith('.docx')) {
      setParsing(true);
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value);
      } catch (e) {
        console.error('Word 解析失败:', e);
        message.error('文字预览失败，建议下载查看');
      } finally {
        setParsing(false);
      }
    }
  };

  const handleDownload = async (resume) => {
    try {
      const url = `http://localhost:3001${resume.file_path}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = resume.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      message.error('下载失败，请尝试右键另存为');
      window.open(`http://localhost:3001${resume.file_path}`, '_blank');
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <style>{customStyles}</style>

      <Title level={3} style={{ color: '#0f172a', fontWeight: 800, marginBottom: 8 }}>💼 我的简历库</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 13 }}>
        管理您的在线简历资源。设置默认简历后，系统将直接调用该履历进行匹配与推荐。
      </Text>

      {/* 现代激进风格的空投提取仓 */}
      <div className="resume-dragger-wrapper">
        <Dragger
          customRequest={handleUpload}
          showUploadList={false}
          accept=".pdf,.doc,.docx"
          disabled={uploading}
        >
          <div style={{ padding: '24px 0' }}>
            <p className="ant-upload-drag-icon">
              {uploading ? <Spin size="large" /> : <InboxOutlined style={{ color: '#6366f1' }} />}
            </p>
            <p className="ant-upload-text" style={{ fontSize: 18, color: '#1e293b', fontWeight: 600 }}>点击或将简历文件拖拽至此区域上传</p>
            <p className="ant-upload-hint" style={{ color: '#64748b' }}>
              支持 PDF, DOC, DOCX 格式文档。您的简历数据将受系统级加密保护。
            </p>
          </div>
        </Dragger>
      </div>

      <div className="resume-assets-list">
        {resumes.length === 0 && !loading ? (
          <Empty
            description={<span>目前空空如也，<Text style={{ color: '#6366f1' }}>请尝试在上方上传您的第一份简历。</Text></span>}
            style={{ padding: '60px 0', background: '#ffffff', borderRadius: 16 }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            loading={loading}
            dataSource={resumes}
            renderItem={(r) => (
              <List.Item
                className={`asset-card ${r.is_default ? 'asset-card-default' : ''}`}
                actions={[
                  <Tooltip title={r.is_default ? '当前默认简历' : '设为默认简历'}>
                    <Button
                      key="default"
                      className={`action-icon-btn ${r.is_default ? '' : 'action-icon-default'}`}
                      shape="circle"
                      icon={r.is_default ? <StarFilled style={{ color: '#f59e0b', fontSize: 18 }} /> : <StarOutlined />}
                      onClick={() => !r.is_default && handleSetDefault(r.id)}
                    />
                  </Tooltip>,
                  <Tooltip title="预览内容">
                    <Button
                      key="preview"
                      className="action-icon-btn"
                      shape="circle"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(r)}
                    />
                  </Tooltip>,
                  <Tooltip title="下载文件">
                    <Button
                      key="download"
                      className="action-icon-btn"
                      shape="circle"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(r)}
                    />
                  </Tooltip>,
                  <Popconfirm 
                    key="delete"
                    title={<span style={{ fontWeight: 600 }}>确定要删除这份简历吗？</span>}
                    description={<span style={{ color: '#64748b' }}>删除操作不可逆转。</span>}
                    onConfirm={() => handleDelete(r.id)} 
                    okText="确定删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true, size: 'small', style: { borderRadius: 6 } }}
                    cancelButtonProps={{ size: 'small', type: 'text' }}
                    placement="topRight"
                  >
                    <Tooltip title="删除简历">
                      <Button className="action-icon-btn action-icon-delete" shape="circle" icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={<div style={{ fontSize: 36, padding: '4px' }}>{getFileIcon(r.file_name)}</div>}
                  title={
                    <Space style={{ marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 16, color: '#0f172a' }}>{r.file_name}</Text>
                      {r.is_default && <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>系统默认</span>}
                    </Space>
                  }
                  description={
                    <div>
                      <Space size="middle" style={{ marginBottom: 10 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {r.file_size ? `${(r.file_size / 1024).toFixed(0)} KB` : ''}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          上传时间：{dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={() => {
            const currentResume = resumes.find(r => r.file_name === previewTitle);
            if (currentResume) handleDownload(currentResume);
          }}>
            保存附件
          </Button>,
          <Button key="close" type="primary" onClick={() => setPreviewVisible(false)} style={{ background: '#6366f1' }}>
            关闭预览
          </Button>
        ]}
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(100vh - 200px)', padding: 0, overflow: 'hidden' }}
      >
        {parsing ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" tip="系统正在解析内容流..." />
          </div>
        ) : (
          <>
            {previewUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="简历视图终端"
              />
            ) : previewHtml ? (
              <div
                style={{ height: '100%', overflowY: 'auto', padding: '40px 60px', background: '#fff' }}
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
                <FileWordOutlined style={{ fontSize: 64, color: '#3b82f6', marginBottom: 20 }} />
                <Text strong style={{ fontSize: 18 }}>当前格式暂不支持通过在线引擎预览</Text>
                <Text type="secondary" style={{ marginTop: 10 }}>建议：请直接下载并在本地应用程序查阅文档副本。</Text>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  style={{ marginTop: 24, background: '#10b981', border: 'none' }}
                  onClick={() => {
                    const currentResume = resumes.find(r => r.file_name === previewTitle);
                    if (currentResume) handleDownload(currentResume);
                  }}
                >
                  本地下载
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
