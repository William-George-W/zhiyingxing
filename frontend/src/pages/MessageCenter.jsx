import React, { useState, useEffect, useRef } from 'react';
import {
  Layout, List, Avatar, Input, Button, Typography,
  Badge, Card, Space, Divider, Modal, message, Empty, Spin, Tag,
  Descriptions, Popconfirm, Row, Col
} from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SendOutlined,
  UserOutlined,
  SolutionOutlined,
  SearchOutlined,
  CheckCircleFilled,
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  BankOutlined,
  UsergroupAddOutlined,
  AliwangwangOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { chatApi, studentApi } from '../api/services';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import mammoth from 'mammoth';
import ReactMarkdown from 'react-markdown';

// ── AI 建议指令集 (Suggested Prompts) ──
const SUGGESTED_PROMPTS = [
  { icon: '✨', title: '优化简历', desc: '让 AI 诊断并重写你的简历亮点', text: '请帮我分析并优化我的简历，提炼核心亮点' },
  { icon: '🎨', title: '模拟面试', desc: '针对目标岗位进行 AI 面试陪练', text: '请帮我模拟一场前端开发岗位的面试，从专业问题开始' },
  { icon: '💰', title: '推荐高薪岗位', desc: '根据我的背景匹配高薪职位', text: '根据我的背景，为我推荐目前市场上薪资最高的相关岗位' },
  { icon: '📊', title: '薪资谈判策略', desc: 'AI 教你如何谈一个好 offer', text: '我收到了一份 offer，请帮我制定一套有效的薪资谈判策略' },
];

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

// ── 岗位列表行子组件（纯内联样式，支持 hover 交互，无 Tailwind 依赖）──
const JobRecommendItem = ({ job, safeLogo, salaryText, onRecommend }) => {
  const [hovered, setHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  // 企业头像：统一浅蓝色系渐变
  const palette = {
    bg: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // 更改为更醒目的 AI 风格渐变
    color: '#ffffff',
  };

  return (
    <List.Item
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setBtnHovered(false); }}
      style={{
        padding: '12px 16px',
        marginBottom: 6,
        borderRadius: 12,
        border: '1px solid transparent',
        background: hovered ? '#f8fafc' : 'transparent',
        boxShadow: hovered ? '0 2px 12px rgba(79,70,229,0.06)' : 'none',
        transition: 'all 0.25s ease',
        cursor: 'default',
      }}
      actions={[
        <Button
          key="recommend"
          size="small"
          shape="round"
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          onClick={onRecommend}
          style={{
            opacity: hovered ? 1 : 0,
            transition: 'all 0.25s ease',
            color: btnHovered ? '#fff' : '#4f46e5',
            background: btnHovered ? '#4f46e5' : '#eef2ff',
            borderColor: btnHovered ? '#4f46e5' : '#c7d2fe',
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          推荐此岗位
        </Button>
      ]}
    >
      <List.Item.Meta
        avatar={(() => {
          const logoUrl = job.company_logo || safeLogo;
          const fullLogo = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : `http://localhost:3001${logoUrl}`) : null;

          if (fullLogo) {
            return (
              <Avatar
                shape="square"
                size={48}
                src={fullLogo}
                style={{ borderRadius: 12, border: '1px solid #e2e8f0', flexShrink: 0 }}
                onError={() => true} // 防止加载失败时显示碎图
              />
            );
          }
          return (
            <Avatar
              shape="square"
              size={48}
              style={{
                borderRadius: 12,
                background: palette.bg,
                color: palette.color,
                fontWeight: 700,
                fontSize: 20,
                border: '1px solid #e2e8f0',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {job.company_name ? job.company_name.charAt(0) : '企'}
            </Avatar>
          );
        })()}
        title={
          <Text style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>
            {job.title}
          </Text>
        }
        description={
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
              {job.company_name} · {job.city}
            </div>
            <div style={{ color: '#f97316', fontWeight: 600, fontSize: 14 }}>
              {salaryText}
            </div>
          </div>
        }
      />
    </List.Item>
  );
};

const MessageCenter = () => {
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // 推荐学生相关
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [recommendableStudents, setRecommendableStudents] = useState([]);
  const [recommendLoading, setRecommendLoading] = useState(false);

  // 发现联系人相关
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [discoverableContacts, setDiscoverableContacts] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // 学生详情查看
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // 预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [parsing, setParsing] = useState(false);

  // 好友申请相关
  const [friendRequests, setFriendRequests] = useState([]);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // 搜索好友相关
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // 搜索与过滤
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [addressBookSearch, setAddressBookSearch] = useState('');

  // 推荐岗位相关
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const scrollRef = useRef(null);

  // 初始化联系人
  const fetchContacts = async () => {
    try {
      const res = await chatApi.getContacts();
      setContacts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchContacts();

      // 🚀 检查是否有导航过来的目标联系人
      if (location.state?.contactId) {
        const { contactId, username, orgName, avatar } = location.state;
        handleStartChat({ contact_id: contactId, username, org_name: orgName, avatar });
        window.history.replaceState({}, document.title);
      }
    };
    init();
    fetchRequests();

    const timer = setInterval(() => {
      fetchContacts();
      fetchRequests();
    }, 3000);
    return () => clearInterval(timer);
  }, [location.state]);

  // 获取申请列表
  const fetchRequests = async () => {
    try {
      const res = await chatApi.getFriendRequests();
      setFriendRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 监听联系人点击
  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    fetchMessages(contact.contact_id);
  };

  // 加载消息
  const fetchMessages = async (contactId, silent = false) => {
    if (!silent) setMsgLoading(true);
    try {
      const scrollEl = scrollRef.current;
      const wasAtBottom = scrollEl ? (scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 150) : true;

      const res = await chatApi.getMessages(contactId);

      setMessages(prev => {
        if (JSON.stringify(prev) === JSON.stringify(res.data)) return prev;
        return res.data;
      });

      if (!silent || wasAtBottom) {
        scrollToBottom(true);
      }
    } catch (err) {
      if (!silent) message.error('获取消息失败');
    } finally {
      if (!silent) setMsgLoading(false);
    }
  };

  // 轮询频率 1.5s
  useEffect(() => {
    let msgTimer = null;
    if (activeContact) {
      msgTimer = setInterval(() => {
        fetchMessages(activeContact.contact_id, true);
      }, 1500);
    }
    return () => {
      if (msgTimer) clearInterval(msgTimer);
    };
  }, [activeContact]);

  const scrollToBottom = (force = false) => {
    setTimeout(() => {
      if (scrollRef.current) {
        if (force) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeContact) return;
    try {
      await chatApi.sendMessage({
        receiverId: activeContact.contact_id,
        content: inputText.trim(),
        msgType: 'text'
      });
      setInputText('');
      fetchMessages(activeContact.contact_id);
    } catch (err) {
      message.error('发送失败');
    }
  };

  const openRecommendModal = async () => {
    setIsRecommendModalOpen(true);
    setRecommendLoading(true);
    try {
      const res = await chatApi.getRecommendableStudents();
      const filtered = res.data.filter(s => s.user_id !== activeContact.contact_id);
      setRecommendableStudents(filtered);
    } catch (err) {
      message.error('加载学生列表失败');
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleRecommend = async (student) => {
    try {
      const content = `[人才推荐] 我向您推荐了一位本校优秀学生：${student.real_name} (${student.major}/${student.degree})`;
      await chatApi.sendMessage({
        receiverId: activeContact.contact_id,
        content: content,
        msgType: 'recommendation',
        relatedId: student.user_id
      });
      message.success('推荐成功！');
      setIsRecommendModalOpen(false);
      fetchMessages(activeContact.contact_id);
    } catch (err) {
      message.error('推荐失败');
    }
  };

  const openDiscoverModal = async () => {
    setIsDiscoverModalOpen(true);
    setDiscoverLoading(true);
    try {
      const res = await chatApi.getDiscoverable();
      setDiscoverableContacts(res.data);
    } catch (err) {
      message.error('加载可选联系人失败');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleStartChat = (contact) => {
    const existing = contacts.find(c => c.contact_id === contact.contact_id);
    if (!existing) {
      const newContact = {
        ...contact,
        last_msg: '尚未开始对话',
        last_time: new Date().toISOString(),
        unread_count: 0
      };
      setContacts([newContact, ...contacts]);
      setActiveContact(newContact);
      setMessages([]);
    } else {
      setActiveContact(existing);
      fetchMessages(existing.contact_id);
    }
    setIsDiscoverModalOpen(false);
  };

  const handleSendFriendRequest = async (contact) => {
    try {
      await chatApi.sendFriendRequest({ receiverId: contact.contact_id });
      message.success('申请已发送，请等待对方通过');
    } catch (err) {
      message.error(err.response?.data?.message || '发送申请失败');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await chatApi.handleFriendRequest({ requestId, action: 'accept' });
      message.success('已同意好友申请');
      fetchRequests();
      fetchContacts();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await chatApi.handleFriendRequest({ requestId, action: 'reject' });
      message.success('已忽略申请');
      fetchRequests();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await chatApi.searchUser(searchUsername);
      setSearchResult(res.data);
    } catch (err) {
      message.info('未找到该用户，请检查用户名是否输入正确');
    } finally {
      setIsSearching(false);
    }
  };

  const openJobModal = async () => {
    setIsJobModalOpen(true);
    setJobsLoading(true);
    try {
      const res = await studentApi.getJobs({ pageSize: 100 });
      setAvailableJobs(res.data.list || []);
    } catch (err) {
      message.error('加载岗位列表失败');
    } finally {
      setJobsLoading(false);
    }
  };

  const handleRecommendJob = async (job) => {
    try {
      await chatApi.sendMessage({
        receiverId: activeContact.contact_id,
        content: job.title,
        msgType: 'job_recommendation',
        relatedId: job.id
      });
      message.success('已推荐该岗位！');
      setIsJobModalOpen(false);
      fetchMessages(activeContact.contact_id);
    } catch (err) {
      message.error('推荐失败');
    }
  };

  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);
  const [currentJobDetail, setCurrentJobDetail] = useState(null);

  const handleViewDetail = (msg) => {
    setSelectedStudent({
      name: msg.student_name,
      major: msg.student_major,
      school: msg.student_school,
      degree: msg.student_degree,
      year: msg.student_year,
      resume: msg.student_resume,
      resumeId: msg.resume_id,
      resumeName: msg.resume_name
    });
    setIsDetailModalOpen(true);
  };

  const handlePreview = async () => {
    if (!selectedStudent?.resume) return;
    const url = `http://localhost:3001${selectedStudent.resume}`;
    setPreviewUrl(url);
    setPreviewTitle(selectedStudent.resumeName || '简历预览');
    setPreviewVisible(true);
    setPreviewHtml('');

    if (selectedStudent.resumeName?.toLowerCase().endsWith('.docx')) {
      setParsing(true);
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value);
      } catch (e) {
        console.error('Word 解析失败:', e);
        message.error('内容解析失败');
      } finally {
        setParsing(false);
      }
    }
  };

  const handleDownloadAction = async () => {
    if (!selectedStudent?.resumeId) return;
    try {
      const blob = await chatApi.downloadResume(selectedStudent.resumeId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedStudent.resumeName || '简历附件.docx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      message.error('下载失败');
    }
  };

  const handleDeleteSession = async (e, contactId) => {
    e.stopPropagation();
    try {
      await chatApi.deleteSession(contactId);
      message.success('对话已清除');
      if (activeContact?.contact_id === contactId) {
        setActiveContact(null);
        setMessages([]);
      }
      fetchContacts();
    } catch (err) {
      message.error('清除失败');
    }
  };

  const handleSendPrompt = async (text) => {
    if (isAiProcessing) return;

    let target = activeContact;

    // 🚀 如果当前未选中任何会话，则自动在联系人列表中寻找 AI（星小智）
    if (!target) {
      const aiContact = contacts.find(c =>
        c.role_code === 'ai' ||
        String(c.contact_id) === "-1" ||
        c.username?.includes('星小智') ||
        c.student_real_name?.includes('星小智')
      );

      if (aiContact) {
        target = aiContact;
        handleSelectContact(target); // 执行界面跳转和消息加载
      } else {
        message.warning('未找到 AI 聊天通道（请确保侧边栏已加载星小智）');
        return;
      }
    }

    // 经过上面的逻辑，我们现在有了确定的发送目标 (target)

    // 1. 立即乐观更新展示用户发送的消息
    const userMsg = {
      id: Date.now(),
      sender_id: user.id,
      sender_name: user.username,
      sender_avatar: user.avatar,
      content: text,
      msg_type: 'text',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom(true);

    // 2. 发送请求
    setIsAiProcessing(true);
    try {
      await chatApi.sendMessage({
        receiverId: target.contact_id,
        content: text,
        msgType: 'text'
      });
      // 发送成功后，轮询逻辑会自动拉取 AI 的回复（轮询周期 1.5s）
    } catch (err) {
      message.error('发送指令失败');
    } finally {
      // 这里的 loading 状态建议在轮询到新消息时再关闭，或者设定一个最小延迟
      setTimeout(() => setIsAiProcessing(false), 2000);
    }
  };

  return (
    <>
      <style>{`
        .mc-contact-row { transition: background 0.2s ease; border-radius: 12px; margin-bottom: 2px; }
        .mc-contact-row:hover { background: #f1f5f9 !important; }
        .mc-contact-row.active { background: #fff !important; box-shadow: 0 2px 16px rgba(79,70,229,0.10); }
        .mc-sidebar-search .ant-input-affix-wrapper { background: #f1f5f9 !important; border: none !important; border-radius: 12px !important; }
        .ai-badge {
          display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
          background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.12) 100%);
          color: #6366f1; border: 1px solid rgba(99,102,241,0.25); box-shadow: 0 0 10px rgba(99,102,241,0.15);
        }
        .ai-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #818cf8; animation: aiPulse 2s infinite; }
        @keyframes aiPulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #818cf8; } 50% { opacity: 0.5; box-shadow: 0 0 12px #a78bfa; } }
        
        .bento-card { 
          background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; 
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-align: left; 
        }
        .bento-card:hover { 
          border-color: #a5b4fc; box-shadow: 0 10px 25px rgba(99,102,241,0.15); 
          transform: translateY(-4px); background: #f5f7ff;
        }
        .bento-card:active { transform: translateY(-2px); }
        .bento-card-disabled {
          opacity: 0.5; pointer-events: none; filter: grayscale(0.5);
        }
        
        .floating-input-panel {
          background: #fff; border-radius: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); border: 1px solid #e2e8f0; overflow: hidden;
        }
        .floating-input-panel:focus-within { border-color: #c7d2fe; box-shadow: 0 8px 40px rgba(79,70,229,0.15); }
      `}</style>
      <Card
        bordered={false}
        style={{ height: 'calc(100vh - 120px)', borderRadius: 20, overflow: 'hidden', background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: 0, height: '100%' }}
      >
        <Layout style={{ background: 'transparent', height: '100%' }}>
          <Sider width={300} style={{ background: '#f8fafc', borderRight: 'none', boxShadow: 'inset -1px 0 0 #e2e8f0' }}>
            <div style={{ padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>消息中心</span>
              <Button type="text" icon={<UsergroupAddOutlined />} onClick={() => setIsAddressBookOpen(true)} style={{ color: '#4f46e5', background: '#eef2ff', borderRadius: 10 }} />
            </div>
            <div style={{ padding: '0 14px 12px' }} className="mc-sidebar-search">
              <Input placeholder="搜索会话..." prefix={<SearchOutlined />} value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} allowClear />
            </div>
            <div style={{ height: 'calc(100% - 100px)', overflowY: 'auto', padding: '0 8px' }}>
              <div onClick={() => setIsRequestsModalOpen(true)} className="mc-contact-row" style={{ padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Badge count={friendRequests.length} size="small"><Avatar icon={<PlusOutlined />} style={{ background: '#fbbf24' }} /></Badge>
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>新的朋友</div><div style={{ fontSize: 12, color: '#94a3b8' }}>查看好友申请</div></div>
              </div>
              {contacts.filter(c => c.username.toLowerCase().includes(sidebarSearch.toLowerCase()) || (c.org_name && c.org_name.toLowerCase().includes(sidebarSearch.toLowerCase()))).map(item => (
                <div
                  key={item.contact_id} onClick={() => handleSelectContact(item)}
                  className={`mc-contact-row${activeContact?.contact_id === item.contact_id ? ' active' : ''}`}
                  style={{ padding: '11px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}
                >
                  {activeContact?.contact_id === item.contact_id && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'linear-gradient(180deg, #6366f1, #a78bfa)' }} />}
                  <Badge count={activeContact?.contact_id === item.contact_id ? 0 : item.unread_count} size="small">
                    <Avatar src={item.avatar?.startsWith('http') ? item.avatar : `http://localhost:3001${item.avatar}`} icon={<UserOutlined />} size={42} style={{ border: activeContact?.contact_id === item.contact_id ? '2px solid #a5b4fc' : 'none' }} />
                  </Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600, fontSize: 14 }}>{item.student_real_name || item.username}</span><span style={{ fontSize: 11, color: '#94a3b8' }}>{item.last_time ? dayjs(item.last_time).format('HH:mm') : ''}</span></div>
                    <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.last_msg || item.org_name || '暂无消息'}</div>
                  </div>
                </div>
              ))}
            </div>
          </Sider>

          <Content style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
            {activeContact ? (
              <>
                <div style={{ padding: '14px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setActiveContact(null)}
                      style={{ marginRight: 4, color: '#64748b' }}
                    />
                    <Avatar src={activeContact.avatar?.startsWith('http') ? activeContact.avatar : `http://localhost:3001${activeContact.avatar}`} size={36} />
                    <div><div style={{ fontWeight: 700, fontSize: 15 }}>{activeContact.student_real_name || activeContact.username}</div>{activeContact.org_name && <div style={{ fontSize: 12, color: '#94a3b8' }}>{activeContact.org_name}</div>}</div>
                    {(activeContact.role_code === 'ai' || activeContact.contact_id === -1) && <span className="ai-badge">职引星大模型算力中心</span>}
                  </div>
                  <Space>
                    {((user.role_code === 'student' && activeContact.role_code === 'student') || (user.role_code === 'school' && activeContact.role_code === 'student')) && <Button icon={<SendOutlined />} onClick={openJobModal} size="small" style={{ borderRadius: 8, color: '#6366f1', borderColor: '#6366f1' }}>推荐岗位</Button>}
                    {user.role_code === 'school' && (activeContact.role_code === 'student' || activeContact.role_code === 'enterprise') && <Button type="primary" icon={<SolutionOutlined />} onClick={openRecommendModal} size="small" style={{ borderRadius: 8, background: '#6366f1' }}>推荐学生</Button>}
                  </Space>
                </div>

                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {messages.map((m) => {
                    const isMe = m.sender_id === user.id;
                    return (
                      <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 12, maxWidth: '75%' }}>
                        <Avatar src={m.sender_avatar?.startsWith('http') ? m.sender_avatar : `http://localhost:3001${m.sender_avatar}`} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          <Text type="secondary" style={{ fontSize: 11, marginBottom: 4 }}>{m.sender_name} · {dayjs(m.created_at).format('HH:mm')}</Text>
                          {m.msg_type === 'recommendation' ? (
                            <Card size="small" style={{ borderRadius: 16, border: '2px solid #4f46e5', background: '#f5f7ff', width: 220 }}>
                              <div style={{ textAlign: 'center' }}><Avatar size={48} icon={<UserOutlined />} style={{ background: '#4f46e5' }} /><div style={{ marginTop: 8 }}><Text strong>{m.student_name}</Text><div style={{ fontSize: 12, color: '#64748b' }}>{m.student_major}</div><Button type="link" size="small" onClick={() => handleViewDetail(m)}>查看详情</Button></div></div>
                            </Card>
                          ) : m.msg_type === 'job_recommendation' ? (
                            <Card size="small" style={{ borderRadius: 16, border: '1px solid #e2e8f0', width: 280 }}>
                              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                <Avatar
                                  shape="square"
                                  src={m.job_company_logo?.startsWith('http') ? m.job_company_logo : (m.job_company_logo ? `http://localhost:3001${m.job_company_logo}` : null)}
                                  style={{
                                    background: 'linear-gradient(135deg, #6366f1 10%, #a855f7 90%)',
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    boxShadow: '0 4px 10px rgba(99,102,241,0.2)'
                                  }}
                                >
                                  {m.job_company?.charAt(0) || '企'}
                                </Avatar>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{m.job_title}</div>
                                  <div style={{ fontSize: 12, color: '#64748b' }}>{m.job_company}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong style={{ color: '#f97316' }}>{m.salary_min && m.salary_max ? `${Math.floor(m.salary_min / 1000)}k-${Math.floor(m.salary_max / 1000)}k` : '薪资面议'}</Text>
                                <Tag>{m.job_city}</Tag>
                              </div>
                              <Button type="primary" block ghost size="middle" icon={<EyeOutlined />} style={{ marginTop: 12, borderRadius: 8 }} onClick={() => navigate(`/student/jobs`, { state: { openJobId: m.related_id } })}>查看岗位详情</Button>
                            </Card>
                          ) : (
                            <div style={{ padding: '12px 18px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? '#4f46e5' : '#fff', color: isMe ? '#fff' : '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
                              <ReactMarkdown components={{ p: props => <p style={{ margin: 0, whiteSpace: 'pre-wrap' }} {...props} /> }}>
                                {m.content || ''}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '16px 24px 20px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                  <div className="floating-input-panel" style={{ display: 'flex', alignItems: 'center', padding: '6px 6px 6px 18px', gap: 8 }}>
                    <Input placeholder={activeContact?.contact_id === -1 ? '向 AI 发起提问...' : '发送消息...'} value={inputText} onChange={e => setInputText(e.target.value)} onPressEnter={handleSend} bordered={false} style={{ flex: 1, height: 44 }} />
                    <Button type="primary" onClick={handleSend} style={{ height: 40, width: 40, borderRadius: 14, background: inputText.trim() ? 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' : '#e2e8f0', border: 'none' }} icon={<SendOutlined />} />
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#cbd5e1' }}>按 Enter 发送 · Powered by 职引星 LLM</div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 20 }}>✨</div>
                <Title level={3}>你好，我是星小智</Title>
                <div style={{ color: '#94a3b8', marginBottom: 32 }}>你的 AI 求职助手，随时为你答疑解惑</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 520 }}>
                  {SUGGESTED_PROMPTS.map((cmd, i) => (
                    <div
                      key={i}
                      className={`bento-card ${isAiProcessing ? 'bento-card-disabled' : ''}`}
                      onClick={() => handleSendPrompt(cmd.text)}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>{cmd.icon}</div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{cmd.title}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{cmd.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Content>
        </Layout>

        <Modal title="推荐优秀生源" open={isRecommendModalOpen} onCancel={() => setIsRecommendModalOpen(false)} footer={null} width={500}>
          <List dataSource={recommendableStudents} renderItem={s => (
            <List.Item actions={[<Button type="link" onClick={() => handleRecommend(s)}>推荐他</Button>]}>
              <List.Item.Meta avatar={<Avatar src={s.avatar} />} title={s.real_name} description={`${s.major} / ${s.degree}`} />
            </List.Item>
          )} />
        </Modal>

        <Modal
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
              <span>通讯录</span>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => { setIsAddressBookOpen(false); setSearchResult(null); setSearchUsername(''); setIsDiscoverModalOpen(true); }}
                style={{ borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', border: 'none', fontSize: 13 }}
              >
                添加好友
              </Button>
            </div>
          }
          open={isAddressBookOpen}
          onCancel={() => setIsAddressBookOpen(false)}
          footer={null}
          width={500}
        >
          <List dataSource={contacts} renderItem={item => (
            <List.Item style={{ cursor: 'pointer' }} onClick={() => { handleSelectContact(item); setIsAddressBookOpen(false); }}>
              <List.Item.Meta avatar={<Avatar src={item.avatar} />} title={item.student_real_name || item.username} description={item.org_name} />
            </List.Item>
          )} />
        </Modal>

        <Modal title="查找好友" open={isDiscoverModalOpen} onCancel={() => setIsDiscoverModalOpen(false)} footer={null}>
          <Input.Search
            placeholder="请输入用户名"
            value={searchUsername}
            onChange={e => setSearchUsername(e.target.value)}
            onSearch={handleSearchUser}
            loading={isSearching}
            enterButton
          />
          {searchResult && (
            <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 12 }}>
              <List.Item actions={[<Button type="primary" onClick={() => handleSendFriendRequest(searchResult)}>申请好友</Button>]}>
                <List.Item.Meta title={searchResult.username} description={searchResult.org_name} />
              </List.Item>
            </div>
          )}
        </Modal>

        <Modal title="推荐优质岗位" open={isJobModalOpen} onCancel={() => setIsJobModalOpen(false)} footer={null} width={560}>
          <List dataSource={availableJobs} renderItem={job => (
            <JobRecommendItem key={job.id} job={job} salaryText={`${job.salary_min / 1000}k-${job.salary_max / 1000}k`} onRecommend={() => handleRecommendJob(job)} />
          )} />
        </Modal>

        <Modal title="人才详情档案" open={isDetailModalOpen} onCancel={() => setIsDetailModalOpen(false)} footer={null} centered width={400}>
          {selectedStudent && (
            <div style={{ textAlign: 'center' }}>
              <Avatar size={80} icon={<UserOutlined />} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', marginBottom: 16 }} />
              <Title level={4}>{selectedStudent.name}</Title>
              <Tag color="blue">{selectedStudent.degree} · {selectedStudent.year}届</Tag>
              <Descriptions column={1} bordered size="small" style={{ margin: '20px 0' }}>
                <Descriptions.Item label="毕业院校">{selectedStudent.school}</Descriptions.Item>
                <Descriptions.Item label="所学专业">{selectedStudent.major}</Descriptions.Item>
              </Descriptions>
              <Row gutter={16}>
                <Col span={12}><Button block icon={<EyeOutlined />} style={{ borderRadius: 10 }} onClick={handlePreview}>在线预览</Button></Col>
                <Col span={12}><Button type="primary" block icon={<DownloadOutlined />} style={{ borderRadius: 10, background: 'linear-gradient(135deg, #6e8efb, #a777e3)', border: 'none' }} onClick={handleDownloadAction}>下载简历</Button></Col>
              </Row>
            </div>
          )}
        </Modal>

        <Modal
          title={<Space><Avatar icon={<PlusOutlined />} style={{ background: '#fbbf24' }} /> 新的朋友</Space>}
          open={isRequestsModalOpen}
          onCancel={() => setIsRequestsModalOpen(false)}
          footer={null}
          width={520}
          className="friend-requests-modal"
          centered
        >
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <List
              loading={requestsLoading}
              dataSource={friendRequests}
              locale={{ emptyText: <Empty description="暂无新的好友申请" /> }}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button type="primary" size="small" onClick={() => handleAcceptRequest(item.id)} style={{ borderRadius: 6, background: '#10b981' }}>同意</Button>,
                    <Button size="small" onClick={() => handleRejectRequest(item.id)} style={{ borderRadius: 6 }}>忽略</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={item.sender_avatar?.startsWith('http') ? item.sender_avatar : `http://localhost:3001${item.sender_avatar}`} icon={<UserOutlined />} />}
                    title={item.sender_name}
                    description={`来自：${item.sender_org || '校友'} · ${dayjs(item.created_at).format('MM-DD HH:mm')}`}
                  />
                </List.Item>
              )}
            />
          </div>
        </Modal>

        <Modal title={previewTitle} open={previewVisible} onCancel={() => setPreviewVisible(false)} footer={null} width={1000} bodyStyle={{ padding: 0 }}>
          <div style={{ height: 'calc(100vh - 160px)' }}>
            {/* PDF：直接用 iframe 渲染，浏览器原生支持 */}
            {previewUrl && previewTitle?.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                title={previewTitle}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '0 0 8px 8px' }}
              />
            ) : previewHtml ? (
              /* Word 解析完成：显示 HTML 内容 */
              <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              /* Word 解析中：显示 loading */
              <Spin tip="正在解析文档内容..." style={{ margin: '100px auto', display: 'block' }} />
            )}
          </div>
        </Modal>
      </Card>
    </>
  );
};

export default MessageCenter;
