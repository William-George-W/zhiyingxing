import request from './index';

export const authApi = {
  login:          (data) => request.post('/auth/login', data),
  register:       (data) => request.post('/auth/register', data),
  sendCode:       (email) => request.post('/auth/send-code', { email }),
  loginWithCode:  (data) => request.post('/auth/login-code', data),
  getMe:          ()     => request.get('/auth/me'),
  changePassword: (data) => request.put('/auth/change-password', data),
  updateProfile:  (data) => request.put('/auth/profile', data),
  uploadAvatar:   (form) => request.post('/auth/upload-avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const studentApi = {
  // 档案
  getProfile:    ()     => request.get('/student/profile'),
  updateProfile: (data) => request.put('/student/profile', data),
  // 简历
  getResumes:    ()     => request.get('/student/resumes'),
  uploadResume:  (form) => request.post('/student/resumes', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteResume:  (id)   => request.delete(`/student/resumes/${id}`),
  setDefault:    (id)   => request.put(`/student/resumes/${id}/default`),
  getResumeDiagnosis: (id, targetJob = '') => request.get(`/student/resumes/${id}/diagnosis`, { params: { targetJob } }),
  // 岗位
  getJobs:       (p)    => request.get('/student/jobs', { params: p }),
  getJobDetail:  (id)   => request.get(`/student/jobs/${id}`),
  // 投递
  applyJob:      (data) => request.post('/student/applications', data),
  getApplications:(p)   => request.get('/student/applications', { params: p }),
  getContracts:  ()    => request.get('/student/contracts'),
  resign:        (id, data) => request.put(`/student/applications/${id}/resign`, data),
  verifyBlockchain: (txHash) => request.get(`/student/blockchain/verify/${txHash}`),
};

export const enterpriseApi = {
  // 企业信息
  getProfile:    ()     => request.get('/enterprise/profile'),
  updateProfile: (data) => request.put('/enterprise/profile', data),
  // 岗位
  getJobs:       (p)    => request.get('/enterprise/jobs', { params: p }),
  createJob:     (data) => request.post('/enterprise/jobs', data),
  updateJob:     (id, data) => request.put(`/enterprise/jobs/${id}`, data),
  deleteJob:     (id)   => request.delete(`/enterprise/jobs/${id}`),
  // 投递
  getApplications:      (p)      => request.get('/enterprise/applications', { params: p }),
  updateAppStatus:      (id, data) => request.put(`/enterprise/applications/${id}/status`, data),
  dismissApp:           (id, data) => request.put(`/enterprise/applications/${id}/dismiss`, data),
  uploadContract:       (applicationId, formData) => request.post(`/enterprise/contracts/${applicationId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const adminApi = {
  getStats:        ()       => request.get('/admin/stats'),
  getUsers:        (p)      => request.get('/admin/users', { params: p }),
  createUser:      (data)   => request.post('/admin/users', data),
  toggleStatus:    (id, data) => request.put(`/admin/users/${id}/status`, data),
  resetPassword:   (id, data) => request.put(`/admin/users/${id}/reset-password`, data),
  deleteUser:      (id)     => request.delete(`/admin/users/${id}`),
  getEnterprises:  (p)      => request.get('/admin/enterprises', { params: p }),
  verifyEnterprise:(id, data) => request.put(`/admin/enterprises/${id}/verify`, data),
};

export const schoolApi = {
  getDashboard: () => request.get('/school/dashboard'),
};

export const chatApi = {
  getContacts: () => request.get('/chat/contacts'),
  getMessages: (contactId) => request.get(`/chat/messages/${contactId}`),
  sendMessage: (data) => request.post('/chat/send', data),
  getRecommendableStudents: () => request.get('/chat/recommendable-students'),
  getDiscoverable: () => request.get('/chat/discoverable'),
  addFriend: (targetId) => request.post('/chat/add-friend', { targetId }),
  sendFriendRequest: (data) => request.post('/chat/friend-request', data),
  getFriendRequests: () => request.get('/chat/friend-requests'),
  handleFriendRequest: (data) => request.post('/chat/handle-friend-request', data),
  searchUser: (username) => request.get(`/chat/search/${username}`),
  restoreChat: (userId) => request.post('/chat/admin/restore', { userId }),
  deleteSession: (contactId) => request.post('/chat/delete-session', { contactId }),
  downloadResume: (id) => request.get(`/chat/download-resume/${id}`, { responseType: 'blob' }),
};

export const messageApi = {
  getMessages: (p) => request.get('/messages', { params: p }),
  getUnreadCount: () => request.get('/messages/unread-count'),
  markAsRead: (id) => request.put(`/messages/${id}/read`),
  markAllAsRead: () => request.put('/messages/read-all'),
};
