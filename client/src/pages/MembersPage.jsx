import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Shield, Trash2, Mail, Copy, Check, Sparkles, Building2, Briefcase, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { formatDate } from '../lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

export const MembersPage = () => {
  const navigate = useNavigate();
  const { user, activeWorkspace, joinWorkspace } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteDepartment, setInviteDepartment] = useState('development');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const isFreePlan = activeWorkspace?.plan === 'free';
  const currentUserRole = members.find((m) => m.user?._id === user?._id)?.role || 'member';
  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  const fetchMembers = async () => {
    try {
      const res = await api.get('/workspaces/' + activeWorkspace?._id + '/members');
      setMembers(res.data.data);
    } catch (err) {
      console.error('Failed to load members', err);
    }
  };

  useEffect(() => {
    if (activeWorkspace?._id) {
      fetchMembers();
    }
  }, [activeWorkspace?._id]);

  const handleCopyCode = () => {
    const code = activeWorkspace?.inviteCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setHasCopied(true);
    toast.success(`Copied invite code: ${code}`);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (isFreePlan) {
      toast.error('Free tier is single-user only. Please upgrade to Pro to add team members.');
      return;
    }

    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post('/workspaces/' + activeWorkspace?._id + '/invitations', {
        email: inviteEmail.trim(),
        role: inviteRole,
        department: inviteDepartment,
      });
      toast.success('Teammate invited to workspace');
      setIsInviteOpen(false);
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWithCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    try {
      await joinWorkspace(joinCode.trim().toUpperCase());
      toast.success('Successfully joined workspace!');
      setIsJoinOpen(false);
      setJoinCode('');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to join workspace');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.patch('/workspaces/' + activeWorkspace?._id + '/members/' + memberId, {
        role: newRole,
      });
      toast.success('Role updated');
      fetchMembers();
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleDepartmentChange = async (memberId, newDepartment) => {
    try {
      await api.patch('/workspaces/' + activeWorkspace?._id + '/members/' + memberId, {
        department: newDepartment,
      });
      toast.success('Department updated');
      fetchMembers();
    } catch (err) {
      toast.error('Failed to update department');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the workspace?')) return;
    try {
      await api.delete('/workspaces/' + activeWorkspace?._id + '/members/' + memberId);
      toast.success('Member removed');
      fetchMembers();
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Workspace Members</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your team directory, department categories, and role permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => setIsJoinOpen(true)}>
            <Building2 className="w-4 h-4 mr-1 text-indigo-400" />
            <span>Join with Code</span>
          </Button>

          {isFreePlan ? (
            <Button onClick={() => navigate('/billing')} className="bg-gradient-to-r from-indigo-600 to-purple-600">
              <Zap className="w-4 h-4 mr-1 text-amber-300" />
              <span>Upgrade to Pro to Invite</span>
            </Button>
          ) : (
            <Button onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              <span>Invite Teammate</span>
            </Button>
          )}
        </div>
      </div>

      {/* Free Plan Notice or Company Invite Code Banner */}
      {isFreePlan ? (
        <div className="bg-gradient-to-r from-zinc-900 via-[#111215] to-[#18191d] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold text-zinc-300">
                Personal Free Tier
              </Badge>
              <h3 className="text-sm font-bold text-white">Single-User Personal Workspace</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xl">
              Free accounts are tailored for personal task tracking. To add teammates, assign department permissions (Developer, Marketer, Designer), and enable live multiplayer collaboration, upgrade to Karbon Pro.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/billing')}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs shrink-0"
          >
            Upgrade Workspace ($16/mo)
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-[#111215] border border-indigo-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-white">Company Invite Code</h3>
              <Badge variant="pro" className="text-[10px] uppercase font-bold">Pro Active</Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Teammates can use this code to register & join{' '}
              <span className="text-zinc-200 font-medium">{activeWorkspace?.name}</span> with their own password, accessing department-specific tasks immediately.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <code className="px-3.5 py-1.5 bg-zinc-900/90 border border-indigo-500/30 rounded-xl font-mono text-xs font-bold text-indigo-300 tracking-wider">
              {activeWorkspace?.inviteCode || 'KARBON-PRO-2026'}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              className="border-white/10 hover:border-indigo-500/30 text-xs"
            >
              {hasCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-[#111215] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          <span>Member</span>
          <div className="flex items-center gap-12 pr-6">
            <span className="w-28 text-left">Department</span>
            <span className="w-24 text-left">Role</span>
            <span className="w-20 text-left">Joined</span>
            <span className="w-8 text-right">Actions</span>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {members.map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/40 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar src={m.user?.avatarUrl} alt={m.user?.name} fallback={m.user?.name} />
                <div>
                  <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <span>{m.user?.name}</span>
                    {m.user?._id === user?._id && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 border-white/20">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">{m.user?.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-12 pr-6">
                {/* Department Selector */}
                <div className="w-28">
                  {isFreePlan || !isOwnerOrAdmin || m.role === 'owner' ? (
                    <span className="text-xs text-zinc-300 font-medium capitalize">
                      {m.department === 'development' ? '💻 Dev' : m.department === 'design' ? '🎨 Design' : m.department === 'marketing' ? '📈 Mktg' : m.department === 'sales' ? '💼 Sales' : '🌐 General'}
                    </span>
                  ) : (
                    <select
                      value={m.department || 'general'}
                      onChange={(e) => handleDepartmentChange(m.id, e.target.value)}
                      className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Teams</option>
                      <option value="development">💻 Development</option>
                      <option value="design">🎨 Design</option>
                      <option value="marketing">📈 Marketing</option>
                      <option value="sales">💼 Sales</option>
                      <option value="operations">⚙️ Operations</option>
                      <option value="general">🌐 General</option>
                    </select>
                  )}
                </div>

                {/* Role Selector */}
                <div className="w-24">
                  {m.role === 'owner' ? (
                    <Badge variant="pro" className="uppercase font-bold text-[10px]">
                      Owner
                    </Badge>
                  ) : isFreePlan || !isOwnerOrAdmin ? (
                    <span className="text-xs text-zinc-400 capitalize">{m.role}</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      disabled={m.user?._id === user?._id}
                      className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                </div>

                <div className="text-xs text-zinc-500 w-20">{formatDate(m.joinedAt)}</div>

                <div className="w-8 text-right">
                  {m.role !== 'owner' && m.user?._id !== user?._id && isOwnerOrAdmin && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Teammate">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Work Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@yourcompany.com"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Workspace Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Department / Access</label>
              <select
                value={inviteDepartment}
                onChange={(e) => setInviteDepartment(e.target.value)}
                className="w-full bg-[#18191d] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="development">💻 Development</option>
                <option value="design">🎨 Design</option>
                <option value="marketing">📈 Marketing</option>
                <option value="sales">💼 Sales</option>
                <option value="operations">⚙️ Operations</option>
                <option value="general">🌐 General</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Workspace with Code Modal */}
      <Modal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} title="Join Company Workspace">
        <form onSubmit={handleJoinWithCode} className="space-y-4">
          <Input
            label="Company Invite Code"
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. KARBON-PRO-2026"
            className="uppercase tracking-wider font-mono text-sm"
            required
            autoFocus
          />

          <p className="text-xs text-zinc-400">
            Enter the unique company code provided by your workspace administrator or team lead.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isJoining}>
              Join Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
