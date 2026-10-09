import { Workspace } from '../../models/Workspace.js';
import { Membership } from '../../models/Membership.js';
import { User } from '../../models/User.js';
import { Project } from '../../models/Project.js';
import { Board } from '../../models/Board.js';
import { Column } from '../../models/Column.js';
import { Activity } from '../../models/Activity.js';

export const listWorkspaces = async (req, res, next) => {
  try {
    const memberships = await Membership.find({ userId: req.user._id })
      .populate('workspaceId')
      .sort({ createdAt: -1 });

    const workspaces = memberships
      .filter((m) => m.workspaceId != null)
      .map((m) => ({
        ...m.workspaceId.toObject(),
        role: m.role,
      }));

    res.json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    next(error);
  }
};

export const createWorkspace = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Workspace name must be at least 2 characters.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 10000);
    const workspace = await Workspace.create({
      name: name.trim(),
      slug,
      ownerId: req.user._id,
      plan: 'free',
      subscriptionStatus: 'active',
    });

    await Membership.create({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: 'owner',
    });

    // Create a starter project and board
    const project = await Project.create({
      workspaceId: workspace._id,
      name: 'General Project',
      key: 'GEN',
      creatorId: req.user._id,
    });

    const board = await Board.create({
      workspaceId: workspace._id,
      projectId: project._id,
      name: 'Sprint Board',
      isDefault: true,
    });

    await Column.create([
      { workspaceId: workspace._id, boardId: board._id, name: 'Backlog', rank: 1000, color: '#64748b' },
      { workspaceId: workspace._id, boardId: board._id, name: 'In Progress', rank: 2000, color: '#6366f1' },
      { workspaceId: workspace._id, boardId: board._id, name: 'Done', rank: 3000, color: '#10b981' },
    ]);

    await Activity.create({
      workspaceId: workspace._id,
      actorId: req.user._id,
      action: 'workspace:created',
      resourceType: 'workspace',
      resourceId: workspace._id,
      metadata: { workspaceName: workspace.name },
    });

    res.status(201).json({
      success: true,
      data: {
        ...workspace.toObject(),
        role: 'owner',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspace = async (req, res, next) => {
  try {
    const membersCount = await Membership.countDocuments({ workspaceId: req.workspace._id });
    const projectsCount = await Project.countDocuments({ workspaceId: req.workspace._id, isArchived: false });

    res.json({
      success: true,
      data: {
        ...req.workspace.toObject(),
        role: req.membership.role,
        membersCount,
        projectsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (req, res, next) => {
  try {
    const { name, settings } = req.body;
    if (name) req.workspace.name = name.trim();
    if (settings) req.workspace.settings = { ...req.workspace.settings, ...settings };

    await req.workspace.save();

    res.json({
      success: true,
      data: req.workspace,
    });
  } catch (error) {
    next(error);
  }
};

export const listMembers = async (req, res, next) => {
  try {
    const members = await Membership.find({ workspaceId: req.workspace._id })
      .populate('userId', 'name email avatarUrl')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: members.map((m) => ({
        id: m._id,
        role: m.role,
        department: m.department || 'all',
        joinedAt: m.joinedAt,
        user: m.userId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const { email, role = 'member', department = 'general' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Free tier workspaces cannot invite team members (Single user only)
    if (req.workspace.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Adding team members is an exclusive Pro & Enterprise feature. Upgrade to Karbon Pro to invite teammates and collaborate in real time.',
      });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Auto-create a pending invited user with placeholder name
      const name = email.split('@')[0];
      user = await User.create({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: email.toLowerCase().trim(),
        password: 'ChangeMe123!',
        avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
      });
    }

    const existingMembership = await Membership.findOne({
      workspaceId: req.workspace._id,
      userId: user._id,
    });

    if (existingMembership) {
      return res.status(400).json({ success: false, message: 'User is already a member of this workspace.' });
    }

    const membership = await Membership.create({
      workspaceId: req.workspace._id,
      userId: user._id,
      role,
      department,
    });

    await Activity.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      action: 'member:invited',
      resourceType: 'workspace',
      resourceId: req.workspace._id,
      metadata: { memberEmail: email, role, department },
    });

    res.status(201).json({
      success: true,
      message: 'Teammate invited successfully',
      data: {
        id: membership._id,
        role: membership.role,
        department: membership.department,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { role, department } = req.body;

    // Free tier cannot change or assign roles
    if (req.workspace.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Role and Department management is available on Karbon Pro & Enterprise plans.',
      });
    }

    const membership = await Membership.findOne({
      _id: memberId,
      workspaceId: req.workspace._id,
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    if (role) membership.role = role;
    if (department !== undefined) membership.department = department;
    await membership.save();

    res.json({
      success: true,
      message: 'Member details updated successfully',
      data: membership,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const membership = await Membership.findOne({
      _id: memberId,
      workspaceId: req.workspace._id,
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    if (membership.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot remove the workspace owner.' });
    }

    await Membership.findByIdAndDelete(memberId);

    res.json({
      success: true,
      message: 'Member removed from workspace',
    });
  } catch (error) {
    next(error);
  }
};

export const joinWorkspaceWithCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ success: false, message: 'Invite code is required.' });
    }

    const cleanCode = inviteCode.trim().toUpperCase();
    const workspace = await Workspace.findOne({ inviteCode: cleanCode });
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: `Invalid Company Code "${cleanCode}". No workspace found.`,
      });
    }

    // Check if user is already a member
    let membership = await Membership.findOne({
      workspaceId: workspace._id,
      userId: req.user._id,
    });

    if (!membership) {
      // Check workspace plan member quota (Free plan is personal single-user only)
      const currentMemberCount = await Membership.countDocuments({ workspaceId: workspace._id });
      const maxAllowed = workspace.plan === 'free' ? 1 : workspace.plan === 'pro' ? 100 : 1000;
      if (currentMemberCount >= maxAllowed) {
        return res.status(400).json({
          success: false,
          message: workspace.plan === 'free' 
            ? `Workspace "${workspace.name}" is on the Free single-user plan. The workspace owner must upgrade to Pro to add team members.`
            : `Workspace "${workspace.name}" has reached its maximum member capacity (${maxAllowed}) for the current plan.`,
        });
      }

      membership = await Membership.create({
        workspaceId: workspace._id,
        userId: req.user._id,
        role: 'member',
      });

      await Activity.create({
        workspaceId: workspace._id,
        actorId: req.user._id,
        action: 'member:joined_via_code',
        resourceType: 'workspace',
        resourceId: workspace._id,
        metadata: { inviteCode: cleanCode },
      });
    }

    res.json({
      success: true,
      message: `Successfully joined ${workspace.name}!`,
      data: {
        ...workspace.toObject(),
        role: membership.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
