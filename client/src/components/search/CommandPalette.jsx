import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Kanban, BarChart3, CreditCard, Users, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useUIStore } from '../../store/useUIStore';
import api from '../../lib/api';

export const CommandPalette = () => {
  const navigate = useNavigate();
  const { isCommandPaletteOpen, setCommandPaletteOpen, setCreateTaskModalOpen, setActiveTaskId } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], projects: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Global key listener for Ctrl+K / Cmd+K and 'c'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      // 'c' shortcut to create task if not typing in an input
      if (
        e.key === 'c' &&
        !isCommandPaletteOpen &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        setCreateTaskModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, setCreateTaskModalOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ tasks: [], projects: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data.data);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const quickActions = [
    {
      label: 'Create New Task',
      icon: Plus,
      action: () => {
        setCommandPaletteOpen(false);
        setCreateTaskModalOpen(true);
      },
    },
    {
      label: 'View Kanban Board',
      icon: Kanban,
      action: () => {
        setCommandPaletteOpen(false);
        navigate('/board');
      },
    },
    {
      label: 'Open Analytics Dashboard',
      icon: BarChart3,
      action: () => {
        setCommandPaletteOpen(false);
        navigate('/analytics');
      },
    },
    {
      label: 'Manage Team Members',
      icon: Users,
      action: () => {
        setCommandPaletteOpen(false);
        navigate('/members');
      },
    },
    {
      label: 'Billing & Subscriptions',
      icon: CreditCard,
      action: () => {
        setCommandPaletteOpen(false);
        navigate('/billing');
      },
    },
  ];

  return (
    <Modal
      isOpen={isCommandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      maxWidth="max-w-xl"
      className="p-0 bg-[#111215]/95 backdrop-blur-2xl border-white/10"
    >
      {/* Search Bar Input */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Search className="w-5 h-5 text-zinc-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command, task title, or project key..."
          className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto p-2 space-y-3">
        {/* Search Results */}
        {results.tasks.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 px-3 py-1 uppercase tracking-wider">
              Tasks
            </div>
            <div className="space-y-0.5">
              {results.tasks.map((task) => (
                <button
                  key={task._id}
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    setActiveTaskId(task._id);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400">{task.identifier}</span>
                    <span className="font-medium text-zinc-100 truncate">{task.title}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!query && (
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 px-3 py-1 uppercase tracking-wider">
              Navigation & Actions
            </div>
            <div className="space-y-0.5">
              {quickActions.map((qa, idx) => (
                <button
                  key={idx}
                  onClick={qa.action}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <qa.icon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    <span>{qa.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
