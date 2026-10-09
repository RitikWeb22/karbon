import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckSquare, MessageSquare, AlertCircle, Calendar, Trash2, Paperclip, ImageIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useUIStore } from '../../store/useUIStore';
import { formatDate, PRIORITY_CONFIG, isOverdue, cn } from '../../lib/utils';
import api from '../../lib/api';
import { toast } from 'sonner';

export const TaskCard = ({ task, onDelete }) => {
  const { setActiveTaskId, notifyTaskMutation } = useUIStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { task } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = task.dueDate && isOverdue(task.dueDate);

  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const attachments = task.attachments || [];
  const firstImage = attachments.find((a) => a.type?.startsWith('image/') || a.url?.startsWith('data:image'));

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    setIsDeleting(true);
    try {
      await api.delete(`/tasks/${task._id}`);
      notifyTaskMutation({ type: 'deleted', taskId: task._id });
      onDelete?.(task._id);
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveTaskId(task._id)}
      className={cn(
        'group relative bg-[#18191d] border border-white/5 hover:border-white/15 rounded-xl p-3.5 shadow-sm transition-all cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-40 scale-105 border-indigo-500/50 shadow-2xl z-50'
      )}
    >
      {/* Optional Attachment Cover Image */}
      {firstImage && (
        <div className="mb-2.5 rounded-lg overflow-hidden bg-black/40 border border-white/10 max-h-36">
          <img
            src={firstImage.url}
            alt={firstImage.name || 'Cover'}
            className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {/* Priority Pill & Task Identifier + Quick Delete Button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[11px] font-semibold text-zinc-400 group-hover:text-indigo-400 transition-colors">
            {task.identifier}
          </span>
          <Badge className={cn('text-[10px] py-0 px-1.5 uppercase font-semibold', priorityMeta.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full mr-1', priorityMeta.indicator)} />
            {priorityMeta.label}
          </Badge>
          {task.department && task.department !== 'general' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-300 font-medium border border-white/10">
              {task.department === 'development'
                ? '💻 Dev'
                : task.department === 'design'
                ? '🎨 Design'
                : task.department === 'marketing'
                ? '📈 Mktg'
                : task.department === 'sales'
                ? '💼 Sales'
                : '⚙️ Ops'}
            </span>
          )}
        </div>

        {/* Delete button appears on hover */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          title="Delete Task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-white line-clamp-2 leading-relaxed mb-2.5">
        {task.title}
      </h4>

      {/* Subtasks Progress Indicator (if subtasks exist) */}
      {totalSubtasks > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-indigo-400" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
            <span className="font-mono">{Math.round((completedSubtasks / totalSubtasks) * 100)}%</span>
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Footer: Due Date, Attachments count, Assignees */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2.5">
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1 text-[10px] font-medium',
                overdue ? 'text-rose-400 font-semibold' : 'text-zinc-400'
              )}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDate(task.dueDate)}</span>
            </span>
          )}

          {attachments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
              <Paperclip className="w-3 h-3 text-zinc-500" />
              <span>{attachments.length}</span>
            </span>
          )}
        </div>

        {/* Assignees Avatar Stack */}
        <div className="flex -space-x-1.5 overflow-hidden">
          {task.assigneeIds?.map((assignee) => (
            <Avatar
              key={assignee._id}
              src={assignee.avatarUrl}
              name={assignee.name}
              size="xs"
              className="ring-1 ring-[#18191d]"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
