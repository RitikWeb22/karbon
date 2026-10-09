import { create } from 'zustand';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

export const useAuthStore = create((set, get) => ({
  user: null,
  activeWorkspaceId: localStorage.getItem('karbon_active_workspace') || null,
  activeWorkspace: null,
  workspaces: [],
  isAuthenticated: !!localStorage.getItem('karbon_token'),
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem('karbon_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const { user, memberships } = res.data.data;

      const wsList = memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      }));

      let activeId = get().activeWorkspaceId;
      if (!activeId || !wsList.some((w) => w._id === activeId)) {
        activeId = wsList[0]?._id || null;
      }

      if (activeId) {
        localStorage.setItem('karbon_active_workspace', activeId);
      }

      const activeWs = wsList.find((w) => w._id === activeId) || null;

      set({
        user,
        workspaces: wsList,
        activeWorkspaceId: activeId,
        activeWorkspace: activeWs,
        isAuthenticated: true,
        isLoading: false,
      });

      connectSocket();
    } catch (err) {
      console.error('Failed to initialize session:', err);
      localStorage.removeItem('karbon_token');
      localStorage.removeItem('karbon_active_workspace');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password, companyCode) => {
    const res = await api.post('/auth/login', { email, password, companyCode });
    const { user, accessToken, defaultWorkspaceId } = res.data.data;

    localStorage.setItem('karbon_token', accessToken);
    if (defaultWorkspaceId) {
      localStorage.setItem('karbon_active_workspace', defaultWorkspaceId);
    }

    set({
      user,
      activeWorkspaceId: defaultWorkspaceId,
      isAuthenticated: true,
    });

    connectSocket();
    await get().initialize();
    return res.data;
  },

  register: async (name, email, password, companyCode) => {
    const res = await api.post('/auth/register', { name, email, password, companyCode });
    const { user, accessToken, defaultWorkspaceId } = res.data.data;

    localStorage.setItem('karbon_token', accessToken);
    if (defaultWorkspaceId) {
      localStorage.setItem('karbon_active_workspace', defaultWorkspaceId);
    }

    set({
      user,
      activeWorkspaceId: defaultWorkspaceId,
      isAuthenticated: true,
    });

    connectSocket();
    await get().initialize();
    return res.data;
  },

  joinWorkspace: async (inviteCode) => {
    const res = await api.post('/workspaces/join', { inviteCode });
    const joinedWorkspace = res.data.data;
    if (joinedWorkspace?._id) {
      localStorage.setItem('karbon_active_workspace', joinedWorkspace._id);
      set({ activeWorkspaceId: joinedWorkspace._id });
    }
    await get().initialize();
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('karbon_token');
    localStorage.removeItem('karbon_active_workspace');
    disconnectSocket();
    set({
      user: null,
      activeWorkspaceId: null,
      activeWorkspace: null,
      workspaces: [],
      isAuthenticated: false,
    });
  },

  setActiveWorkspaceId: (workspaceId) => {
    localStorage.setItem('karbon_active_workspace', workspaceId);
    const activeWs = get().workspaces.find((w) => w._id === workspaceId) || null;
    set({
      activeWorkspaceId: workspaceId,
      activeWorkspace: activeWs,
    });
  },

  setWorkspaces: (workspaces) => {
    set({ workspaces });
  },
}));
