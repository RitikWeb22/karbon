import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  Clock,
  Send,
  Trash2,
  Plus,
  Layers,
  Image as ImageIcon,
  Paperclip,
  UploadCloud,
  ExternalLink,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { processImageForUpload } from '../../lib/imageUtils';
import { formatDate, PRIORITY_CONFIG, isOverdue } from '../../lib/utils';
import { toast } from 'sonner';

export const TaskDetailDrawer = () => {
  const { activeTaskId, setActiveTaskId, notifyTaskMutation } = useUIStore();
  const { user } = useAuthStore();
  const [task, setTask] = useState(null);
  const [boardColumns, setBoardColumns] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [remoteTypingUser, setRemoteTypingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!activeTaskId) {
      setTask(null);
      setComments([]);
      setBoardColumns([]);
      return;
    }

    const fetchTask = async () => {
      try {
        const [taskRes, commentsRes] = await Promise.all([
          api.get(`/tasks/${activeTaskId}`),
          api.get(`/comments/tasks/${activeTaskId}`),
        ]);
        const currentTask = taskRes.data.data;
        setTask(currentTask);
        setComments(commentsRes.data.data);

        // Fetch board columns for status dropdown
        const boardId =
          typeof currentTask.boardId === 'object'
            ? currentTask.boardId._id
            : currentTask.boardId;

        if (boardId) {
          const boardRes = await api.get(`/boards/${boardId}`);
          setBoardColumns(boardRes.data.data.columns || []);
        }
      } catch (err) {
        console.error('Failed to load task details', err);
        toast.error('Failed to load task details');
      }
    };

    fetchTask();

    // Socket Room Listeners for Task
    const socket = getSocket();
    socket.emit('join:task', { taskId: activeTaskId });

    const handleCommentCreated = ({ comment }) => {
      setComments((prev) => [...prev, comment]);
    };

    const handleTypingStatus = ({ user: typingUser, isTyping: remoteIsTyping }) => {
      if (typingUser._id !== user?._id) {
        setRemoteTypingUser(remoteIsTyping ? typingUser.name : null);
      }
    };

    socket.on('comment:created:v1', handleCommentCreated);
    socket.on('typing:status:v1', handleTypingStatus);

    return () => {
      socket.emit('leave:task', { taskId: activeTaskId });
      socket.off('comment:created:v1', handleCommentCreated);
      socket.off('typing:status:v1', handleTypingStatus);
    };
  }, [activeTaskId, user?._id]);

  const handleUpdateField = async (field, value) => {
    if (!task) return;
    try {
      const updated = { ...task, [field]: value };
      setTask(updated);
      notifyTaskMutation({ type: 'updated', task: updated });
      await api.patch(`/tasks/${task._id}`, { [field]: value });
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleStatusChange = async (newColId) => {
    if (!task || !newColId) return;
    try {
      const selectedCol = boardColumns.find((c) => c._id === newColId);
      const updated = {
        ...task,
        columnId: selectedCol || newColId,
      };
      setTask(updated);
      notifyTaskMutation({ type: 'updated', task: updated });

      await api.post(`/tasks/${task._id}/move`, {
        targetColumnId: newColId,
      });
      toast.success(
        `Task moved to ${selectedCol ? selectedCol.name : 'new column'}`
      );
    } catch (err) {
      toast.error('Failed to change task status');
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/tasks/${task._id}`);
      notifyTaskMutation({ type: 'deleted', taskId: task._id });
      toast.success('Task deleted successfully');
      setActiveTaskId(null);
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPG, PNG, WebP, GIF) are supported.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image size must be under 20MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      toast.loading('Processing image...', { id: 'drawer-image' });
      const optimizedUrl = await processImageForUpload(file);
      const newAttachment = {
        name: file.name,
        url: optimizedUrl,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      };

      const updatedAttachments = [...(task.attachments || []), newAttachment];
      await handleUpdateField('attachments', updatedAttachments);
      toast.success('Image attached successfully', { id: 'drawer-image' });
    } catch (err) {
      toast.error('Failed to attach image', { id: 'drawer-image' });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = async (indexToRemove) => {
    if (!task) return;
    const updated = (task.attachments || []).filter((_, idx) => idx !== indexToRemove);
    await handleUpdateField('attachments', updated);
    toast.success('Attachment removed');
  };

  const handleToggleSubtask = async (subtaskId) => {
    if (!task) return;
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    handleUpdateField('subtasks', updatedSubtasks);
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;

    const newSubtask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      isCompleted: false,
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    handleUpdateField('subtasks', updatedSubtasks);
    setNewSubtaskTitle('');
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    try {
      await api.post(`/comments/tasks/${task._id}`, { content: newComment.trim() });
      setNewComment('');
      const socket = getSocket();
      socket.emit('typing:stop', { taskId: task._id });
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  const completedSubtasks = task?.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasks = task?.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const attachments = task?.attachments || [];

  const currentColumnId =
    typeof task?.columnId === 'object' ? task?.columnId?._id : task?.columnId;

  return (
    <AnimatePresence>
      {activeTaskId && task && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveTaskId(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-Over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-[#111215] border-l border-white/10 shadow-2xl flex flex-col h-full z-10"
          >
            {/* Drawer Header with Title Badge and Action Controls */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="indigo" className="font-mono text-xs">
                  {task.identifier}
                </Badge>
                <span className="text-xs text-zinc-400 font-medium">{task.projectId?.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Delete Task Button in Header */}
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Close Drawer Button */}
                <button
                  type="button"
                  onClick={() => setActiveTaskId(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Editable Title */}
              <div>
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                  onBlur={(e) => handleUpdateField('title', e.target.value)}
                  className="w-full text-xl font-bold bg-transparent text-zinc-100 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1.5 py-1 -ml-1.5"
                />
              </div>

              {/* Metadata Grid: Column/Status, Priority, Department, Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-900/60 border border-white/10">
                {/* Column / Status Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Column / Status
                  </label>
                  <select
                    value={currentColumnId || ''}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {boardColumns.map((col) => (
                      <option key={col._id} value={col._id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdateField('priority', e.target.value)}
                    className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Department / Category */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={task.department || 'general'}
                    onChange={(e) => handleUpdateField('department', e.target.value)}
                    className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">🌐 General</option>
                    <option value="development">💻 Development</option>
                    <option value="design">🎨 Design</option>
                    <option value="marketing">📈 Marketing</option>
                    <option value="sales">💼 Sales</option>
                    <option value="operations">⚙️ Operations</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleUpdateField('dueDate', e.target.value)}
                      className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={task.description}
                  onChange={(e) => setTask({ ...task, description: e.target.value })}
                  onBlur={(e) => handleUpdateField('description', e.target.value)}
                  placeholder="Add a detailed description..."
                  className="w-full bg-[#18191d] border border-white/10 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>

              {/* Attachments & Images Gallery Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Images & Attachments ({attachments.length})
                    </span>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      isLoading={isUploadingImage}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                    </Button>
                  </div>
                </div>

                {/* Attachments Preview Grid */}
                {attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden border border-white/10 bg-zinc-900/60 flex flex-col"
                      >
                        <div className="h-28 overflow-hidden bg-black/40 relative">
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                            title="Open full image"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="p-2 flex items-center justify-between gap-1 text-[11px] bg-zinc-900">
                          <span className="text-zinc-300 truncate font-medium max-w-[120px]" title={att.name}>
                            {att.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/15 hover:border-indigo-500/50 rounded-xl p-5 text-center cursor-pointer transition-colors bg-zinc-900/30 group"
                  >
                    <UploadCloud className="w-6 h-6 text-zinc-500 group-hover:text-indigo-400 mx-auto mb-1.5 transition-colors" />
                    <p className="text-xs text-zinc-300 font-medium">Click to upload an image or screenshot</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, WebP or GIF up to 8MB</p>
                  </div>
                )}
              </div>

              {/* Subtasks Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Subtasks ({completedSubtasks}/{totalSubtasks})
                    </span>
                  </div>
                  {totalSubtasks > 0 && (
                    <span className="text-xs text-zinc-400 font-mono">{subtaskProgress}%</span>
                  )}
                </div>

                {totalSubtasks > 0 && (
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  {task.subtasks?.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-[#18191d] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={st.isCompleted}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span
                        className={`text-xs flex-1 ${
                          st.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add Subtask Input */}
                <form onSubmit={handleAddSubtask} className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 bg-[#18191d] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <Button size="sm" type="submit" variant="secondary">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </Button>
                </form>
              </div>

              {/* Discussion & Comments */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Discussion ({comments.length})
                  </span>
                </div>

                {/* Comments List */}
                <div className="space-y-3 mb-4">
                  {comments.map((comment) => (
                    <div key={comment._id} className="flex gap-2.5">
                      <Avatar src={comment.authorId?.avatarUrl} name={comment.authorId?.name} size="sm" />
                      <div className="flex-1 bg-[#18191d] border border-white/10 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-zinc-200">
                            {comment.authorId?.name}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Typing Indicator */}
                {remoteTypingUser && (
                  <p className="text-xs text-indigo-400 italic mb-2 animate-pulse">
                    {remoteTypingUser} is typing...
                  </p>
                )}

                {/* Add Comment Input */}
                <form onSubmit={handleSendComment} className="flex items-center gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value);
                      const socket = getSocket();
                      socket.emit('typing:start', { taskId: task._id });
                    }}
                    placeholder="Write a comment..."
                    className="flex-1 bg-[#18191d] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <Button size="sm" type="submit">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>

              {/* Danger Zone: Delete Task */}
              <div className="pt-4 border-t border-white/10">
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-rose-400">Danger Zone</h5>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Accidentally created this task? Permanently delete it from the board.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteTask}
                    isLoading={isDeleting}
                    className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 text-xs shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete Task</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
