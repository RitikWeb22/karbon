import React, { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

export const ActivityPage = () => {
  const { activeWorkspace } = useAuthStore();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace?._id) return;

    const fetchActivity = async () => {
      try {
        const res = await api.get('/activity?limit=100');
        setActivities(res.data.data);
      } catch (err) {
        console.error('Failed to load activity', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [activeWorkspace?._id]);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Activity Audit Trail</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Chronological ledger of mutations and collaboration events across{' '}
          <span className="text-zinc-200 font-semibold">{activeWorkspace?.name}</span>
        </p>
      </div>

      <div className="bg-[#111215] border border-white/10 rounded-2xl p-6 shadow-sm divide-y divide-white/5">
        {activities.map((act) => (
          <div key={act._id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
            <Avatar src={act.actorId?.avatarUrl} name={act.actorId?.name} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-zinc-200">
                  {act.actorId?.name}
                </span>
                <span className="text-xs text-zinc-500">{formatDate(act.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="indigo" className="text-[10px] uppercase font-mono">
                  {act.action}
                </Badge>
                {act.metadata?.taskTitle && (
                  <span className="text-xs text-zinc-300 truncate">
                    "{act.metadata.taskTitle}"
                  </span>
                )}
                {act.metadata?.toColumn && (
                  <span className="text-xs text-zinc-400">
                    → moved to <span className="text-indigo-400 font-medium">{act.metadata.toColumn}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && !isLoading && (
          <div className="p-8 text-center">
            <p className="text-xs text-zinc-500">No activity recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
