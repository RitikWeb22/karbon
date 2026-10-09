import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { UploadCloud, Image as ImageIcon, X, Layers } from 'lucide-react';
import { processImageForUpload } from '../../lib/imageUtils';
import api from '../../lib/api';
import { toast } from 'sonner';

export const CreateTaskModal = ({
  projectId: propProjectId,
  boardId: propBoardId,
  columns: propColumns = [],
  onTaskCreated,
}) => {
  const { isCreateTaskModalOpen, setCreateTaskModalOpen, notifyTaskMutation } = useUIStore();
  const { activeWorkspace } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [department, setDepartment] = useState('general');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Dynamic projects and columns resolution
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(propProjectId || '');
  const [selectedBoardId, setSelectedBoardId] = useState(propBoardId || '');
  const [availableColumns, setAvailableColumns] = useState(propColumns);
  const [columnId, setColumnId] = useState(propColumns[0]?._id || '');

  // If props change or modal opens, resolve projects & columns
  useEffect(() => {
    if (!isCreateTaskModalOpen) return;

    const loadData = async () => {
      try {
        const projRes = await api.get('/projects');
        const projList = projRes.data.data || [];
        setProjects(projList);

        const currentProj =
          projList.find((p) => p._id === (propProjectId || selectedProjectId)) ||
          projList[0];

        if (currentProj) {
          setSelectedProjectId(currentProj._id);
          const boardIdToUse = propBoardId || currentProj.defaultBoardId;
          setSelectedBoardId(boardIdToUse);

          if (boardIdToUse) {
            const boardRes = await api.get(`/boards/${boardIdToUse}`);
            const cols = boardRes.data.data.columns || [];
            setAvailableColumns(cols);
            if (cols.length > 0) {
              setColumnId((prev) => (cols.some((c) => c._id === prev) ? prev : cols[0]._id));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load projects/columns for task creation', err);
      }
    };

    if (propColumns.length > 0) {
      setAvailableColumns(propColumns);
      setSelectedProjectId(propProjectId || '');
      setSelectedBoardId(propBoardId || '');
      setColumnId(propColumns[0]._id);
    } else {
      loadData();
    }
  }, [isCreateTaskModalOpen, propProjectId, propBoardId, propColumns]);

  // When project changes, fetch its board & columns
  const handleProjectChange = async (newProjId) => {
    setSelectedProjectId(newProjId);
    const proj = projects.find((p) => p._id === newProjId);
    if (proj && proj.defaultBoardId) {
      setSelectedBoardId(proj.defaultBoardId);
      try {
        const boardRes = await api.get(`/boards/${proj.defaultBoardId}`);
        const cols = boardRes.data.data.columns || [];
        setAvailableColumns(cols);
        if (cols.length > 0) {
          setColumnId(cols[0]._id);
        }
      } catch (e) {
        console.error('Failed to load columns for project', e);
      }
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (PNG, JPG, WebP) are supported');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image size must be under 20MB');
      return;
    }

    try {
      toast.loading('Processing image...', { id: 'image-upload' });
      const optimizedUrl = await processImageForUpload(file);
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: optimizedUrl,
          size: file.size,
          type: file.type,
        },
      ]);
      toast.success('Image attached', { id: 'image-upload' });
    } catch (err) {
      toast.error('Failed to process image', { id: 'image-upload' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (idxToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !columnId || !selectedBoardId || !selectedProjectId) {
      toast.error('Please fill in title and select a column');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/tasks', {
        title: title.trim(),
        description: description.trim(),
        columnId,
        boardId: selectedBoardId,
        projectId: selectedProjectId,
        priority,
        department,
        dueDate: dueDate || undefined,
        attachments,
      });

      const newTask = res.data.data;

      // Broadcast task creation globally so board updates IMMEDIATELY without refresh
      notifyTaskMutation({ type: 'created', task: newTask });
      onTaskCreated?.(newTask);

      toast.success('Task created successfully');
      setCreateTaskModalOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setDepartment('general');
      setAttachments([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isCreateTaskModalOpen}
      onClose={() => setCreateTaskModalOpen(false)}
      title="Create New Task"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Implement OAuth token refresh rotation"
          autoFocus
          required
        />

        {/* Project Selector (if multiple projects exist) */}
        {projects.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {projects.map((proj) => (
                <option key={proj._id} value={proj._id}>
                  {proj.name} ({proj.key})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Column / Status Dropdown */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Column / Status <span className="text-rose-400">*</span>
            </label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              required
              className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {availableColumns.length === 0 ? (
                <option value="">No columns found</option>
              ) : (
                availableColumns.map((col) => (
                  <option key={col._id} value={col._id}>
                    {col.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Department / Category */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Department / Category
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
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
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context, acceptance criteria or specifications..."
            className="w-full bg-[#18191d] border border-white/10 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Image Attachment Upload */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-zinc-400">
              Attach Image / Screenshot <span className="text-[10px] text-zinc-500">(Optional)</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>+ Choose Image</span>
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-lg overflow-hidden border border-white/15 bg-zinc-900 w-20 h-16 shrink-0"
                >
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCreateTaskModalOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!columnId}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
