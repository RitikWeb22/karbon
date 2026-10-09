import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../search/CommandPalette';
import { TaskDetailDrawer } from '../task-detail/TaskDetailDrawer';
import { CreateTaskModal } from '../kanban/CreateTaskModal';

export const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100">
      {/* Collapsible Luxury Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Command Bar */}
        <Topbar />

        {/* Dynamic Nested View */}
        <main className="flex-1 overflow-y-auto bg-[#09090b] relative">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Global Slide-Over Task Detail Drawer */}
      <TaskDetailDrawer />

      {/* Global Task Creation Modal */}
      <CreateTaskModal />
    </div>
  );
};
