import { create } from 'zustand';

export const useUIStore = create((set) => ({
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  isCreateTaskModalOpen: false,
  setCreateTaskModalOpen: (open) => set({ isCreateTaskModalOpen: open }),

  isInviteModalOpen: false,
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),

  isCreateProjectModalOpen: false,
  setCreateProjectModalOpen: (open) => set({ isCreateProjectModalOpen: open }),

  isBillingModalOpen: false,
  setBillingModalOpen: (open) => set({ isBillingModalOpen: open }),

  activeTaskId: null,
  setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),

  // Task event dispatcher for zero-refresh instant synchronization
  lastTaskMutation: null,
  notifyTaskMutation: (mutation) => set({ lastTaskMutation: { ...mutation, timestamp: Date.now() } }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
