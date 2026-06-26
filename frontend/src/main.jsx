import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import router from './router/index';
import './index.css';

dayjs.locale('zh-cn');

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#3b82f6',
        borderRadius: 8,
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        colorBgLayout: '#f8fafc',
      },
    }}
  >
    <RouterProvider router={router} />
  </ConfigProvider>
);
