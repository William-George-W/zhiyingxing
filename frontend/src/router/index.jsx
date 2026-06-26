import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { RequireAuth, RequireRole, GuestOnly } from './guards';
import MainLayout from '../layouts/MainLayout';

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

const L = (Component) => (
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
);

// 页面懒加载
const Login         = lazy(() => import('../pages/auth/Login'));
const Register      = lazy(() => import('../pages/auth/Register'));
// 学生
const StudentDashboard   = lazy(() => import('../pages/student/Dashboard'));
const StudentJobs        = lazy(() => import('../pages/student/Jobs'));

const StudentResumes     = lazy(() => import('../pages/student/Resumes'));
const StudentApplications= lazy(() => import('../pages/student/Applications'));
const StudentMyJobs      = lazy(() => import('../pages/student/MyJobs'));
// 企业
const EnterpriseJobs     = lazy(() => import('../pages/enterprise/Jobs'));
const EnterpriseApps     = lazy(() => import('../pages/enterprise/Applications'));
const EnterpriseEmps     = lazy(() => import('../pages/enterprise/Employees'));
// 高校
const SchoolDashboard    = lazy(() => import('../pages/school/Dashboard'));
// 管理员
const AdminDashboard     = lazy(() => import('../pages/admin/Dashboard'));
const AdminUsers         = lazy(() => import('../pages/admin/Users'));
const AdminEnterprises   = lazy(() => import('../pages/admin/Enterprises'));
const Settings           = lazy(() => import('../pages/Settings'));
const MessageCenter      = lazy(() => import('../pages/MessageCenter'));
const NotFound           = lazy(() => import('../pages/error/NotFound'));

const router = createBrowserRouter([
  {
    path: '/',
    children: [
      {
        index: true,
        element: <GuestOnly>{L(Login)}</GuestOnly>,
      },
      {
        path: 'login',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'register',
        element: <GuestOnly>{L(Register)}</GuestOnly>,
      },
      {
        element: <RequireAuth><MainLayout /></RequireAuth>,
        children: [
          // ── 通用 ───────────────────────────────────────
          { path: 'settings', element: L(Settings) },
          { path: 'messages', element: L(MessageCenter) },

          // ── 学生 ───────────────────────────────────────
          {
            path: 'student',
            element: <RequireRole roles="student"><Outlet /></RequireRole>,
            children: [
              { index: true, element: <Navigate to="/student/dashboard" replace /> },
              { path: 'dashboard',    element: L(StudentDashboard) },
              { path: 'jobs',         element: L(StudentJobs) },

              { path: 'resumes',      element: L(StudentResumes) },
              { path: 'applications', element: L(StudentApplications) },
              { path: 'my-jobs',      element: L(StudentMyJobs) },
            ],
          },

          // ── 企业 ───────────────────────────────────────
          {
            path: 'enterprise',
            element: <RequireRole roles="enterprise"><Outlet /></RequireRole>,
            children: [
              { index: true, element: <Navigate to="/enterprise/jobs" replace /> },
              { path: 'jobs',      element: L(EnterpriseJobs) },
              { path: 'applications', element: L(EnterpriseApps) },
              { path: 'employees',    element: L(EnterpriseEmps) },
            ],
          },

          // ── 高校 ───────────────────────────────────────
          {
            path: 'school',
            element: <RequireRole roles={['school', 'admin']}><Outlet /></RequireRole>,
            children: [
              { index: true, element: <Navigate to="/school/dashboard" replace /> },
              { path: 'dashboard', element: L(SchoolDashboard) },
            ],
          },

          // ── 管理员 ─────────────────────────────────────
          {
            path: 'admin',
            element: <RequireRole roles="admin"><Outlet /></RequireRole>,
            children: [
              { index: true, element: <Navigate to="/admin/dashboard" replace /> },
              { path: 'dashboard',   element: L(AdminDashboard) },
              { path: 'users',       element: L(AdminUsers) },
              { path: 'enterprises', element: L(AdminEnterprises) },
            ],
          },
        ],
      },
      {
        path: '404',
        element: L(NotFound),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
