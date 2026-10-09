import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, AlertTriangle, Check } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../store/useUIStore';
import api from '../../lib/api';
import { toast } from 'sonner';

export const KanbanColumn = ({ column, tasks = [], projectId, onTaskCreated }) => {
  const { notifyTaskMutation } = useUIStore();
  const { setNodeRef, isOver } = useDroppable({
    id: column._id,
    data: { column },
  });

  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWipExceeded = column.wipLimit > 0 && tasks.length > column.wipLimit;

  const handleInlineSubmit = async (e) => {
    e.preventDefault();
    if (!inlineTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/tasks', {
        title: inlineTitle.trim(),
        columnId: column._id,
        boardId: column.boardId,
        projectId,
        priority: 'medium',
      });
      const newTask = res.data.data;
      notifyTaskMutation({ type: 'created', task: newTask });
      onTaskCreated?.(newTask);
      setInlineTitle('');
      setIsAddingInline(false);
      toast.success('Task created');
    } catch (err) {
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-80 shrink-0 bg-[#111215]/80 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col max-h-[calc(100vh-140px)] transition-all',
        isOver && 'border-indigo-500/50 bg-[#14151a]'
      )}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color || '#6366f1' }}
          />
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            {column.name}
          </h3>
          <span className="text-[11px] font-mono font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* WIP Limit Alert */}
          {isWipExceeded && (
            <Badge variant="rose" className="gap-1 text-[10px] py-0 px-1.5">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>WIP ({column.wipLimit})</span>
            </Badge>
          )}

          <button
            onClick={() => setIsAddingInline(true)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Add task to column"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAddingInline && (
          <div className="p-6 text-center border border-dashed border-white/5 rounded-xl">
            <p className="text-xs text-zinc-500">No tasks in this column</p>
          </div>
        )}
      </div>

      {/* Inline Task Creator */}
      {isAddingInline && (
        <div className="p-2.5 border-t border-white/5 bg-[#18191d]/60 rounded-b-2xl">
          <form onSubmit={handleInlineSubmit} className="space-y-2">
            <input
              autoFocus
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAddingInline(false);
              }}
              placeholder="What needs to be done?..."
              className="w-full bg-[#111215] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Press Enter to save, Esc to cancel</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAddingInline(false)}
                  className="px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inlineTitle.trim() || isSubmitting}
                  className="px-2 py-0.5 bg-indigo-600 text-white rounded font-medium disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
