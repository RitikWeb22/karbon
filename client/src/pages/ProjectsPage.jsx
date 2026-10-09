import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, ArrowRight, Layout } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import api from '../lib/api';
import { toast } from 'sonner';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useAuthStore();
  const { isCreateProjectModalOpen, setCreateProjectModalOpen } = useUIStore();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  useEffect(() => {
    if (activeWorkspace?._id) {
      fetchProjects();
    }
  }, [activeWorkspace?._id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post('/projects', {
        name: name.trim(),
        key: key.toUpperCase().trim(),
        description: description.trim(),
        color,
      });
      toast.success('Project created with default sprint board');
      setCreateProjectModalOpen(false);
      setName('');
      setKey('');
      setDescription('');
      fetchProjects();
    } catch (err) {
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Projects</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Organize workflows, boards, and task sequences across your teams.
          </p>
        </div>

        <Button onClick={() => setCreateProjectModalOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <div
            key={proj._id}
            onClick={() => navigate('/board')}
            className="p-6 rounded-2xl bg-[#111215] border border-white/10 hover:border-indigo-500/40 cursor-pointer transition-all shadow-sm flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-md"
                    style={{ backgroundColor: proj.color || '#6366f1' }}
                  />
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {proj.name}
                  </h3>
                </div>
                <Badge variant="indigo" className="font-mono text-[10px]">
                  {proj.key}
                </Badge>
              </div>

              <p className="text-xs text-zinc-400 line-clamp-2 mb-6">
                {proj.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span>{proj.totalTasks || 0} tasks</span>
                <span>•</span>
                <span>{proj.boardsCount || 1} boards</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Project Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!key) {
                setKey(e.target.value.substring(0, 3).toUpperCase());
              }
            }}
            placeholder="e.g. Mobile Application V2"
            required
            autoFocus
          />

          <Input
            label="Key Prefix (for task identifiers)"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="e.g. MOB"
            maxLength={6}
            required
          />

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline project scope and mission..."
              className="w-full bg-[#18191d] border border-white/10 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
