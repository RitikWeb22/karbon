import React, { useState, useEffect } from 'react';
import { Search, Plus, Bell, LogOut, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { getSocket } from '../../lib/socket';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export const Topbar = () => {
  const { user, activeWorkspace, logout } = useAuthStore();
  const { setCommandPaletteOpen, setCreateTaskModalOpen } = useUIStore();
  const [activeViewers, setActiveViewers] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Listen to board presence synchronization
  useEffect(() => {
    const socket = getSocket();
    const handlePresenceSync = ({ users }) => {
      setActiveViewers(users || []);
    };

    socket.on('presence:sync:v1', handlePresenceSync);
    return () => {
      socket.off('presence:sync:v1', handlePresenceSync);
    };
  }, []);

  return (
    <header className="h-14 bg-[#09090b]/80 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-20 shrink-0">
      {/* Left: Breadcrumbs & Quick Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">{activeWorkspace?.name || 'Workspace'}</span>
          <span>/</span>
          <span className="text-zinc-400">Active Board</span>
        </div>

        {/* Command Palette Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18191d] border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-all shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search or jump to...</span>
          <kbd className="ml-2 font-mono text-[10px] bg-zinc-800 border border-white/10 px-1.5 py-0.5 rounded text-zinc-300">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Presence Stack, Quick Actions, Profile */}
      <div className="flex items-center gap-3">
        {/* Real-Time Multiplayer Presence Avatars */}
        {activeViewers.length > 0 && (
          <div className="flex items-center gap-1.5 pl-2 pr-3 py-1 bg-zinc-900/60 border border-white/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-presence mr-0.5" />
            <div className="flex -space-x-2 overflow-hidden">
              {activeViewers.slice(0, 4).map((viewer, idx) => (
                <div key={viewer._id || idx} title={`${viewer.name} (Active)`} className="relative ring-2 ring-[#09090b] rounded-full">
                  <Avatar src={viewer.avatarUrl} name={viewer.name} size="xs" />
                </div>
              ))}
            </div>
            {activeViewers.length > 4 && (
              <span className="text-[10px] font-medium text-zinc-400 pl-1">
                +{activeViewers.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Quick New Task Button */}
        <Button
          size="sm"
          onClick={() => setCreateTaskModalOpen(true)}
          className="gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">New Task</span>
          <kbd className="hidden md:inline font-mono text-[10px] bg-indigo-700/60 px-1 py-0.2 rounded text-indigo-100">
            c
          </kbd>
        </Button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/50 transition-all"
          >
            <Avatar src={user?.avatarUrl} name={user?.name} size="sm" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#18191d] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name}</p>
                <p className="text-[11px] text-zinc-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
