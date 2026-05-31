import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err?.response?.data?.error || err.message)
);

export const healthCheck = () => api.get('/health');
export const getMyself = () => api.get('/myself');

// Projects
export const getProjects = () => api.get('/projects');
export const createProject = (data) => api.post('/projects', data);

// Issues
export const getIssues = (params) => api.get('/issues', { params });
export const getIssue = (key) => api.get(`/issues/${key}`);
export const createIssue = (data) => api.post('/issues', data);
export const updateIssue = (key, data) => api.put(`/issues/${key}`, data);
export const deleteIssue = (key) => api.delete(`/issues/${key}`);
export const getTransitions = (key) => api.get(`/issues/${key}/transitions`);
export const transitionIssue = (key, transitionId) => api.post(`/issues/${key}/transitions`, { transitionId });

// Comments
export const getComments = (key) => api.get(`/issues/${key}/comments`);
export const addComment = (key, body) => api.post(`/issues/${key}/comments`, { body });

// Sprints
export const getBoards = () => api.get('/boards');
export const getSprints = (boardId) => api.get(`/boards/${boardId}/sprints`);
export const getSprintIssues = (sprintId) => api.get(`/sprints/${sprintId}/issues`);
export const moveIssueSprint = (issueKey, transitionId) => api.post('/sprints/move', { issueKey, transitionId });

// Users
export const getUsers = () => api.get('/users');

// Analytics
export const getAnalyticsOverview = () => api.get('/analytics/overview');
export const getAnalyticsProjects = () => api.get('/analytics/projects');

// AI - goes through backend
export const aiChat = (messages, system) => api.post('/ai/chat', { messages, system });

export default api;

// Issue Detail + Subtasks
export const getIssueDetail = (key) => api.get(`/issues/${key}/detail`);
export const createSubtask = (key, data) => api.post(`/issues/${key}/subtask`, data);

// Confluence
export const getConfluenceSpaces = () => api.get('/confluence/spaces');
export const getConfluencePages = () => api.get('/confluence/pages');
export const getSpacePages = (spaceId) => api.get(`/confluence/spaces/${spaceId}/pages`);
export const getConfluencePage = (pageId) => api.get(`/confluence/pages/${pageId}`);
export const createConfluencePage = (data) => api.post('/confluence/pages', data);
export const updateConfluencePage = (pageId, data) => api.put(`/confluence/pages/${pageId}`, data);
export const deleteConfluencePage = (pageId) => api.delete(`/confluence/pages/${pageId}`);
export const createSprintReport = (data) => api.post('/confluence/sprint-report', data);
export const createMeetingNotes = (data) => api.post('/confluence/meeting-notes', data);

// Automation
export const runSprintClose = (data) => api.post('/automation/sprint-close', data);
export const runAIEscalation = () => api.post('/automation/ai-escalation', {});

// Work Assignment
export const getWorkPackages = () => api.get('/workassign/packages');
export const createWorkPackage = (data) => api.post('/workassign/packages', data);
export const assignWorkPackage = (key, data) => api.put(`/workassign/packages/${key}/assign`, data);
export const submitWorkPackage = (key, data) => api.post(`/workassign/packages/${key}/submit`, data);
export const approveWorkPackage = (key, data) => api.post(`/workassign/packages/${key}/approve`, data);
export const rejectWorkPackage = (key, data) => api.post(`/workassign/packages/${key}/reject`, data);
export const getWorkAssignStats = () => api.get('/workassign/stats');

// Notifications
export const getNotifications = () => api.get('/notifications');

// Risks
export const getRisks = () => api.get('/risks');

// Roles persistence
export const getRoles = () => api.get('/roles');
export const saveRoles = (data) => api.post('/roles', data);

// Milestones
export const getMilestones = () => api.get('/milestones');
