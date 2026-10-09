import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  FolderKanban,
  ArrowRight,
  Plus,
  Activity as ActivityIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { formatDate, PRIORITY_CONFIG } from '../lib/utils';
import api from '../lib/api';

export const DashboardPage = () => {
  const { user, activeWorkspace } = useAuthStore();
  const { setActiveTaskId, setCreateTaskModalOpen, setInviteModalOpen } = useUIStore();
  const [stats, setStats] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace?._id) return;

    const fetchDashboard = async () => {
      try {
        const [analyticsRes, actRes] = await Promise.all([
          api.get('/analytics'),
          api.get('/activity?limit=6'),
        ]);

        setStats(analyticsRes.data.data);
        setActivities(actRes.data.data);

        // Fetch user's tasks
        const projRes = await api.get('/projects');
        if (projRes.data.data.length > 0) {
          const boardRes = await api.get(`/boards/${projRes.data.data[0].defaultBoardId}`);
          const userAssigned = (boardRes.data.data.tasks || []).filter((t) =>
            t.assigneeIds?.some((a) => a._id === user?._id)
          );
          setMyTasks(userAssigned);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [activeWorkspace?._id, user?._id]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Here's what is happening across <span className="text-zinc-200 font-semibold">{activeWorkspace?.name}</span> today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateTaskModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111215] border border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <FolderKanban className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalTasks || 0}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Across all workspace boards</p>
        </div>

        <div className="bg-[#111215] border border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats?.completedTasks || 0}</div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {stats?.completionRate || 0}% overall completion velocity
          </p>
        </div>

        <div className="bg-[#111215] border border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Urgent Priority</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{stats?.urgentTasks || 0}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Critical path initiatives</p>
        </div>

        <div className="bg-[#111215] border border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats?.overdueTasks || 0}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Requires immediate attention</p>
        </div>
      </div>

      {/* Grid: My Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: My Tasks (2 Cols) */}
        <div className="lg:col-span-2 bg-[#111215] border border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Assigned to Me</h2>
            <Badge variant="indigo">{myTasks.length} tasks</Badge>
          </div>

          <div className="space-y-2.5">
            {myTasks.length > 0 ? (
              myTasks.map((task) => {
                const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div
                    key={task._id}
                    onClick={() => setActiveTaskId(task._id)}
                    className="p-3.5 rounded-xl bg-[#18191d] border border-white/5 hover:border-indigo-500/30 flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-indigo-400 font-semibold">
                        {task.identifier}
                      </span>
                      <span className="text-xs font-medium text-zinc-200 group-hover:text-white">
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={priorityMeta.color}>{priorityMeta.label}</Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center border border-dashed border-white/5 rounded-xl">
                <p className="text-xs text-zinc-500">No tasks currently assigned to you</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Workspace Activity Stream */}
        <div className="bg-[#111215] border border-white/10 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Recent Activity</h2>
            <ActivityIcon className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex-1 space-y-4">
            {activities.map((act) => (
              <div key={act._id} className="flex gap-3 text-xs">
                <Avatar src={act.actorId?.avatarUrl} name={act.actorId?.name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200">
                    <span className="font-semibold text-white">{act.actorId?.name}</span>{' '}
                    <span className="text-zinc-400">{act.action.replace(':', ' ')}</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{formatDate(act.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
