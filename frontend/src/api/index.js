import axios from 'axios';
import { message } from 'antd';
import { useAuthStore } from '../store/authStore';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
});

// 请求拦截器 - 自动注入 Token
request.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data } = response;
    // 如果是二进制内容（下载文件），不按 JSON 处理，直接返回数据
    if (data instanceof Blob || data instanceof ArrayBuffer) {
      return data;
    }
    if (data.code !== 0) {
      const isAuthRoute = window.location.pathname === '/login';
      if (!isAuthRoute) {
        const isAdmin = useAuthStore.getState().user?.role_code === 'admin';
        if (isAdmin) {
          message.error(data.message || '请求中心返回异常提示');
        } else {
          // 不再硬跳 404，由组件业务逻辑处理报错显示
          console.warn('[API Logic Error]', data.message);
        }
      }
      return Promise.reject(new Error(data.message));
    }
    return data;
  },
  (error) => {
    const isAdmin = useAuthStore.getState().user?.role_code === 'admin';
    const isAuthRoute = window.location.pathname === '/login';

    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        const hasToken = !!useAuthStore.getState().token;
        if (hasToken) {
          message.error('登录已过期，请重新登录');
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else if (status === 403) {
        message.error('权限不足');
      } else if (!isAuthRoute) {
        if (isAdmin) {
          message.error(data?.message || `服务端连接异常 (${status})`);
        } else {
          // 不再硬跳 404
        }
      }
    } else if (error.request) {
      if (!isAuthRoute) {
        if (isAdmin) {
          message.error('网络连接失败，请检查后台服务是否启动');
        } else {
          // 不再硬跳 404
        }
      }
    }
    return Promise.reject(error);
  }
);

export default request;
