import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  FolderKanban,
  BarChart3,
  Activity,
  Users,
  CreditCard,
  Plus,
  ChevronDown,
  Sparkles,
  Check,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

export const Sidebar = () => {
  const navigate = useNavigate();
  const { user, activeWorkspace, workspaces, setActiveWorkspaceId } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, setCreateProjectModalOpen } = useUIStore();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Kanban Board', icon: Kanban, path: '/board' },
    { label: 'Projects', icon: FolderKanban, path: '/projects' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { label: 'Activity Feed', icon: Activity, path: '/activity' },
    { label: 'Team Members', icon: Users, path: '/members' },
    { label: 'Billing & Plans', icon: CreditCard, path: '/billing' },
  ];

  return (
    <aside
      className={cn(
        'relative h-screen bg-[#0d0e12] border-r border-white/10 flex flex-col transition-all duration-300 z-30 select-none shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Workspace Header */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className={cn(
              'w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-800/60 transition-colors border border-transparent hover:border-white/10 text-left',
              sidebarCollapsed ? 'justify-center p-1.5' : ''
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30 shrink-0">
              {activeWorkspace?.name?.charAt(0) || 'K'}
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-zinc-100 truncate">
                    {activeWorkspace?.name || 'Workspace'}
                  </span>
                  <Badge variant="pro" className="text-[10px] py-0 px-1.5 uppercase font-bold">
                    {activeWorkspace?.plan || 'PRO'}
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
              </div>
            )}

            {!sidebarCollapsed && <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
          </button>

          {/* Workspace Switcher Dropdown */}
          {workspaceMenuOpen && !sidebarCollapsed && (
            <div className="absolute top-full left-0 mt-1.5 w-full bg-[#18191d] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50">
              <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase tracking-wider">
                Workspaces
              </div>
              <div className="space-y-0.5">
                {workspaces.map((ws) => (
                  <button
                    key={ws._id}
                    onClick={() => {
                      setActiveWorkspaceId(ws._id);
                      setWorkspaceMenuOpen(false);
                      navigate('/board');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                      ws._id === activeWorkspace?._id
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                    )}
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws._id === activeWorkspace?._id && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setWorkspaceMenuOpen(false);
                  navigate('/members');
                }}
                className="w-full mt-1.5 pt-1.5 border-t border-white/10 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Join with Company Code</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
                sidebarCollapsed ? 'justify-center px-0' : ''
              )
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Bottom User & Collapse Action */}
      <div className="p-2 border-t border-white/10 space-y-2">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
