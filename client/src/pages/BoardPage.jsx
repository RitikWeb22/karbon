import React, { useState, useEffect } from 'react';
import { Filter, Search, Plus, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getSocket } from '../lib/socket';
import api from '../lib/api';

export const BoardPage = () => {
  const { activeWorkspace } = useAuthStore();
  const { setCreateTaskModalOpen, lastTaskMutation, notifyTaskMutation } = useUIStore();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [boardData, setBoardData] = useState({ board: null, columns: [], tasks: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial load
  useEffect(() => {
    if (!activeWorkspace?._id) return;

    const loadProjectsAndBoard = async () => {
      setIsLoading(true);
      try {
        const projRes = await api.get('/projects');
        const projList = projRes.data.data;
        setProjects(projList);

        if (projList.length > 0) {
          const currentProj = projList[0];
          setSelectedProject(currentProj);

          if (currentProj.defaultBoardId) {
            const boardRes = await api.get(`/boards/${currentProj.defaultBoardId}`);
            setBoardData(boardRes.data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load board data', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectsAndBoard();
  }, [activeWorkspace?._id]);

  // Synchronize task mutations (created, deleted, updated) instantly with zero refresh
  useEffect(() => {
    if (!lastTaskMutation) return;

    const { type, task, taskId } = lastTaskMutation;

    setBoardData((prev) => {
      if (!prev.board) return prev;

      if (type === 'created' && task) {
        // If task belongs to this active board
        const taskBoardId = typeof task.boardId === 'object' ? task.boardId._id : task.boardId;
        if (taskBoardId === prev.board._id) {
          const exists = prev.tasks.some((t) => t._id === task._id);
          if (!exists) {
            return {
              ...prev,
              tasks: [...prev.tasks, task],
            };
          }
        }
      } else if (type === 'deleted' && taskId) {
        return {
          ...prev,
          tasks: prev.tasks.filter((t) => t._id !== taskId),
        };
      } else if (type === 'updated' && task) {
        return {
          ...prev,
          tasks: prev.tasks.map((t) => (t._id === task._id ? task : t)),
        };
      }
      return prev;
    });
  }, [lastTaskMutation]);

  // Socket.IO real-time multiplayer board events
  useEffect(() => {
    if (!boardData.board?._id) return;
    const socket = getSocket();
    const boardId = boardData.board._id;

    socket.emit('join:board', { boardId });

    const handleTaskCreated = ({ task }) => {
      notifyTaskMutation({ type: 'created', task });
    };

    const handleTaskDeleted = ({ taskId }) => {
      notifyTaskMutation({ type: 'deleted', taskId });
    };

    const handleTaskUpdated = ({ task }) => {
      notifyTaskMutation({ type: 'updated', task });
    };

    socket.on('task:created:v1', handleTaskCreated);
    socket.on('task:deleted:v1', handleTaskDeleted);
    socket.on('task:updated:v1', handleTaskUpdated);

    return () => {
      socket.emit('leave:board', { boardId });
      socket.off('task:created:v1', handleTaskCreated);
      socket.off('task:deleted:v1', handleTaskDeleted);
      socket.off('task:updated:v1', handleTaskUpdated);
    };
  }, [boardData.board?._id]);

  const handleSelectProject = async (proj) => {
    setSelectedProject(proj);
    if (proj.defaultBoardId) {
      try {
        const boardRes = await api.get(`/boards/${proj.defaultBoardId}`);
        setBoardData(boardRes.data.data);
      } catch (err) {
        console.error('Failed to switch project board', err);
      }
    }
  };

  // Filter tasks locally by search, department, and priority
  const filteredTasks = (boardData.tasks || []).filter((task) => {
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesDept =
      filterDepartment === 'all' ||
      (task.department || 'general') === filterDepartment;
    const matchesSearch =
      !searchQuery.trim() ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.identifier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesDept && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400">Loading board state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Board Sub-Header & Controls */}
      <div className="px-6 py-3 border-b border-white/5 bg-[#0d0e12]/60 flex flex-wrap items-center justify-between gap-3">
        {/* Project Selector & Details */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-md"
              style={{ backgroundColor: selectedProject?.color || '#6366f1' }}
            />
            <h2 className="text-sm font-bold text-zinc-100">{selectedProject?.name || 'Project'}</h2>
            <Badge variant="indigo" className="font-mono text-[10px]">
              {selectedProject?.key || 'KB'}
            </Badge>
          </div>

          {/* Plan Indicator */}
          {activeWorkspace?.plan === 'free' ? (
            <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-400 border border-white/5">
              Personal Free Plan
            </Badge>
          ) : (
            <Badge variant="emerald" className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Pro Team Active
            </Badge>
          )}

          {/* Project Switcher Pills */}
          {projects.length > 1 && (
            <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-white/10">
              {projects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => handleSelectProject(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    p._id === selectedProject?._id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters: Department, Priority, Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Department / Category Filter */}
          <div className="flex items-center gap-1 bg-[#18191d] p-1 border border-white/10 rounded-lg text-xs">
            {[
              { id: 'all', label: 'All Teams' },
              { id: 'development', label: '💻 Dev' },
              { id: 'design', label: '🎨 Design' },
              { id: 'marketing', label: '📈 Mktg' },
              { id: 'sales', label: '💼 Sales' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setFilterDepartment(d.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterDepartment === d.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="bg-[#18191d] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-36"
            />
          </div>

          {/* Priority Quick Filter */}
          <div className="flex items-center gap-1 bg-[#18191d] p-1 border border-white/10 rounded-lg text-xs">
            {['all', 'urgent', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-1.5 py-0.5 rounded text-[11px] capitalize transition-colors ${
                  filterPriority === p ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => setCreateTaskModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </Button>
        </div>
      </div>

      {/* Main Drag-and-Drop Board */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {boardData.board ? (
          <KanbanBoard
            boardId={boardData.board._id}
            projectId={selectedProject?._id}
            initialColumns={boardData.columns}
            initialTasks={filteredTasks}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-zinc-500">No board found for this project</p>
          </div>
        )}
      </div>
    </div>
  );
};
