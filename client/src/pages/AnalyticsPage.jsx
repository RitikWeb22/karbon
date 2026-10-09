import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';

const STATUS_COLORS = ['#64748b', '#6366f1', '#f59e0b', '#10b981', '#ec4899'];

export const AnalyticsPage = () => {
  const { activeWorkspace } = useAuthStore();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace?._id) return;

    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics');
        setAnalytics(res.data.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [activeWorkspace?._id]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Velocity & Insights</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Real-time productivity metrics for{' '}
          <span className="text-zinc-200 font-semibold">{activeWorkspace?.name}</span>
        </p>
      </div>

      {/* Top Velocity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111215] border border-white/10 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Completion Rate
          </span>
          <div className="text-3xl font-extrabold text-indigo-400 mt-2">
            {analytics?.completionRate || 0}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {analytics?.completedTasks} of {analytics?.totalTasks} tasks resolved
          </p>
        </div>

        <div className="bg-[#111215] border border-white/10 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Critical Path Burden
          </span>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">
            {analytics?.urgentTasks || 0}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Urgent tasks in flight</p>
        </div>

        <div className="bg-[#111215] border border-white/10 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Overdue Risk
          </span>
          <div className="text-3xl font-extrabold text-amber-400 mt-2">
            {analytics?.overdueTasks || 0}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Tasks past target due date</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="bg-[#111215] border border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-4">Task Distribution by Priority</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.priorityData || []}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18191d',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics?.priorityData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-[#111215] border border-white/10 rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4">Column / Status Spread</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.statusData || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                >
                  {analytics?.statusData?.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18191d',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Member Workload */}
      <div className="bg-[#111215] border border-white/10 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-4">Team Workload Distribution</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.workloadData || []}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18191d',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="totalTasks" name="Assigned Tasks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completedTasks" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
