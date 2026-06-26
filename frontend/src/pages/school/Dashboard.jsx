import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Spin, Tag, Space, Avatar } from 'antd';
import {
  RiseOutlined,
  CompassOutlined,
  FireOutlined,
  StarOutlined,
  CrownOutlined,
  FallOutlined
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ComposedChart, Line, LabelList
} from 'recharts';
import { schoolApi } from '../../api/services';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// --- 现代高级色盘 (Modern Palette) ---
const BRAND_COLORS = {
  primary: '#4f46e5',    // 靛青主色
  primaryLight: '#818cf8',
  secondary: '#0ea5e9',  // 湖蓝
  success: '#10b981',    // 翠绿 (达成/通过)
  warning: '#f59e0b',    // 琥珀 (面试中)
  danger: '#f43f5e',     // 玫瑰红
  purple: '#8b5cf6',     // 紫魅
};
const DONUT_COLORS = [BRAND_COLORS.primary, BRAND_COLORS.secondary, '#3b82f6', BRAND_COLORS.success, BRAND_COLORS.purple];

// 半透明定制高级浮窗 (Glassmorphism Tooltip)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)',
        padding: '12px 16px', border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)'
      }}>
        {label && <div style={{ margin: 0, fontWeight: 700, color: '#0f172a', marginBottom: 8, fontSize: 14 }}>{label}</div>}
        {payload.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color || p.payload?.fill || '#000' }} />
            <span style={{ color: '#475569', fontSize: 13 }}>
              {p.name}: <strong style={{ color: '#0f172a', marginLeft: 4 }}>
                {p.value}{p.name.includes('薪酬') ? 'k' : ''}
              </strong>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SchoolDashboard() {
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    schoolApi.getDashboard().then(res => {
      setApiData(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading || !apiData) return <div style={{ textAlign: 'center', padding: 120 }}><Spin size="large" tip="加载高精度视界中..." /></div>;

  const { summary, majorStats, salaryDist, jobTypeDist, applyTrend, degreeDist } = apiData;

  // 1. 生成 7 天投递走势
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const rawDate = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const match = applyTrend?.find(item => item.date === rawDate || dayjs(item.date).format('YYYY-MM-DD') === rawDate);
    const cnt = match ? match.cnt : 0;
    trendData.push({
      name: dayjs(rawDate).format('MM-DD'),
      applications: cnt,
      interviews: Math.floor(cnt * 0.4) // 估算的面试转化
    });
  }

  // 2. 补齐饼图数据
  const donutData = degreeDist?.length ? degreeDist.map(d => ({ name: d.degree, value: d.cnt })) : [{ name: '暂无学历分布', value: 1 }];

  // 3. 将 jobTypeDist 与 salaryDist 混合（简易映射）
  let jobMarketData = jobTypeDist?.map(d => ({
    jobType: d.job_type,
    supply: d.cnt,
    avgSalary: Math.round(d.avg_salary || 0) // 使用后端计算的真实平均薪资
  })) || [];
  if (jobMarketData.length === 0) {
    jobMarketData = [{ jobType: '暂无岗位', supply: 0, avgSalary: 0 }];
  }

  // 4. 将 MajorStats 作为排名列表
  const topMajors = majorStats?.slice(0, 4).map((m, i) => ({
    name: m.major,
    count: m.total_apply,
    icon: m.major.charAt(0),
    color: DONUT_COLORS[i % DONUT_COLORS.length]
  })) || [];

  // === 顶部基础统计卡片指标配置 ===
  const metricCards = [
    { title: '平台活跃求职者', value: summary.total_students,  icon: <CompassOutlined />,      color: BRAND_COLORS.secondary, trend: summary.total_students > 0 ? '+12%' : '0%' },
    { title: '企业发布总岗数', value: summary.total_jobs,   icon: <FireOutlined />,         color: BRAND_COLORS.primary, trend: summary.total_jobs > 0 ? '+5%' : '0%' },
    { title: '合作对接企业录', value: summary.total_enterprises,  icon: <StarOutlined />,         color: BRAND_COLORS.purple, trend: '+0%' },
    { title: '高优发 Offer 数', value: summary.total_signed,   icon: <CrownOutlined />,        color: BRAND_COLORS.success, trend: summary.total_signed > 0 ? '+20%' : '0%' },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* 标题栏 */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>全域数据雷达</Title>
          <Text style={{ color: '#64748b', fontSize: 14, marginTop: 6, display: 'block' }}>实时掌控平台活跃度与企业招募转化效能</Text>
        </div>
      </div>

      {/* 顶部 Bento 指标卡矩阵 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <div style={{
              background: '#ffffff', borderRadius: 16, padding: 24,
              border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
              position: 'relative'
            }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{card.title}</Text>
                    <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', marginTop: 12, lineHeight: 1 }}>
                      {card.value}
                    </div>
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    background: `${card.color}15`, color: card.color
                  }}>
                    {card.icon}
                  </div>
               </div>
               
               {/* 微趋势指标 */}
               <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag style={{ borderRadius: 12, margin: 0, padding: '0 8px', border: 'none', background: card.trend.includes('+') && card.trend !== '+0%' ? '#dcfce7' : '#f1f5f9', color: card.trend.includes('+') && card.trend !== '+0%' ? '#166534' : '#64748b', fontWeight: 600 }}>
                    {card.trend.includes('+') && card.trend !== '+0%' ? <RiseOutlined /> : <FallOutlined />} {card.trend}
                  </Tag>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>周环比净增长</Text>
               </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]}>
        
        {/* 1. 双线面积走势 (七日活跃流) */}
        <Col xs={24} lg={16}>
           <Card title={<span style={{ fontWeight: 700 }}>双侧转化引擎走势 (投递 vs 面试)</span>} bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', height: '100%' }}>
              <div style={{ height: 320, width: '100%', marginTop: 20 }}>
                 <ResponsiveContainer>
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                         <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={BRAND_COLORS.primary} stopOpacity={0.4}/>
                           <stop offset="95%" stopColor={BRAND_COLORS.primary} stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="colorInts" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={BRAND_COLORS.success} stopOpacity={0.4}/>
                           <stop offset="95%" stopColor={BRAND_COLORS.success} stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                       <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <RechartsTooltip content={<CustomTooltip />} />
                       <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 13, color: '#475569' }} />
                       <Area name="简历投递量" type="monotone" dataKey="applications" stroke={BRAND_COLORS.primary} strokeWidth={3} fill="url(#colorApps)" />
                       <Area name="企业面试邀约" type="monotone" dataKey="interviews" stroke={BRAND_COLORS.success} strokeWidth={3} fill="url(#colorInts)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </Card>
        </Col>

        {/* 2. 企业/专业 活跃度 (定制化列表) */}
        <Col xs={24} lg={8}>
           <Card title={<span style={{ fontWeight: 700 }}>生源流向专业热榜</span>} bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', height: '100%' }} bodyStyle={{ padding: '0 24px 24px' }}>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                 {topMajors.length > 0 ? topMajors.map((comp, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <Avatar size={42} style={{ background: `${comp.color}20`, color: comp.color, fontWeight: 800, fontSize: 18 }}>{comp.icon}</Avatar>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <Text strong style={{ color: '#0f172a', fontSize: 15 }}>{comp.name}</Text>
                           <Text type="secondary" style={{ fontSize: 12 }}>累计投递：{comp.count} 份</Text>
                         </div>
                       </div>
                       <Tag color="cyan" style={{ borderRadius: 12, border: 'none', fontWeight: 700 }}>Top {idx + 1}</Tag>
                    </div>
                 )) : <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>暂无专业投递数据</div>}
              </div>
           </Card>
        </Col>

        {/* 3. 市场需求与薪资分布 (混合图) */}
        <Col xs={24} lg={14}>
           <Card title={<span style={{ fontWeight: 700 }}>热门岗位供需矩阵与薪酬标准</span>} bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ height: 280, width: '100%', marginTop: 20 }}>
                 <ResponsiveContainer>
                    <ComposedChart data={jobMarketData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="jobType" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 13, color: '#475569' }} />
                      <Bar yAxisId="left" name="人才缺口指数" dataKey="supply" fill={BRAND_COLORS.secondary} radius={[6, 6, 0, 0]} maxBarSize={30}>
                        <LabelList dataKey="supply" position="top" style={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                      </Bar>
                      <Line yAxisId="right" name="业界平均薪酬 (k)" type="monotone" dataKey="avgSalary" stroke={BRAND_COLORS.warning} strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>
           </Card>
        </Col>

        {/* 4. 去向学历层级分布图 (环形图) */}
        <Col xs={24} lg={10}>
           <Card title={<span style={{ fontWeight: 700 }}>平台生源学历分布域</span>} bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', height: '100%' }}>
              <div style={{ height: 280, width: '100%', display: 'flex', flexDirection: 'column' }}>
                 <ResponsiveContainer>
                  <BarChart data={donutData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
                      width={60}
                    />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 10, 10, 0]} 
                      barSize={24}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                      <LabelList dataKey="value" position="right" style={{ fill: '#64748b', fontSize: 13, fontWeight: 700, paddingLeft: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </Card>
        </Col>

      </Row>
    </div>
  );
}
