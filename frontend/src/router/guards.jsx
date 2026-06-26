import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// 角色 → 默认首页映射
const roleHomeMap = {
  admin:      '/admin/dashboard',
  school:     '/school/dashboard',
  enterprise: '/enterprise/jobs',
  student:    '/student/dashboard',
};

// 路由守卫：未登录跳转到 /login
export const RequireAuth = ({ children }) => {
  const { token } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

// 路由守卫：已登录的人访问 /login 跳转到对应首页
export const GuestOnly = ({ children }) => {
  const { token, user } = useAuthStore();
  if (token && user) {
    const home = roleHomeMap[user.role_code] || '/';
    return <Navigate to={home} replace />;
  }
  return children;
};

// 角色守卫：访问不属于自己角色的页面时重定向
export const RequireRole = ({ roles, children }) => {
  const { user } = useAuthStore();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!user || !allowed.includes(user.role_code)) {
    const home = roleHomeMap[user?.role_code] || '/login';
    return <Navigate to={home} replace />;
  }
  return children;
};

export { roleHomeMap };
