import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';
import { User } from '../../models/User.js';
import { Workspace } from '../../models/Workspace.js';
import { Membership } from '../../models/Membership.js';
import { Project } from '../../models/Project.js';
import { Board } from '../../models/Board.js';
import { Column } from '../../models/Column.js';
import { Task } from '../../models/Task.js';

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, ENV.JWT_ACCESS_SECRET, {
    expiresIn: '1d',
  });
  const refreshToken = jwt.sign({ id: userId }, ENV.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

export const registerUser = async ({ name, email, password, companyCode }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');

  // 1. If user provided a company code, validate workspace first before creating user
  let companyWorkspace = null;
  if (companyCode && companyCode.trim()) {
    const cleanCode = companyCode.trim().toUpperCase();
    companyWorkspace = await Workspace.findOne({ inviteCode: cleanCode });
    if (!companyWorkspace) {
      throw new Error(`Invalid Company Code "${cleanCode}". Please verify the code with your workspace admin.`);
    }

    if (companyWorkspace.plan === 'free') {
      throw new Error(`Workspace "${companyWorkspace.name}" is on the Free single-user plan. The workspace owner must upgrade to Pro to add team members.`);
    }

    const memberCount = await Membership.countDocuments({ workspaceId: companyWorkspace._id });
    const maxMembers = companyWorkspace.plan === 'pro' ? 100 : 1000;
    if (memberCount >= maxMembers) {
      throw new Error(
        `Workspace "${companyWorkspace.name}" has reached the member limit (${maxMembers}) for its current plan.`
      );
    }
  }

  let user = existingUser;

  if (existingUser) {
    // If user already exists, verify whether they are activating an invited membership with company code
    if (companyWorkspace) {
      // Allow user to set their permanent password and name
      user.name = name.trim();
      user.password = password;
      await user.save();
    } else {
      throw new Error('An account with this email address already exists. Please sign in with your password.');
    }
  } else {
    // 2. Create the User
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
    });
  }

  // 3. If joining existing company workspace:
  if (companyWorkspace) {
    const existingMembership = await Membership.findOne({
      workspaceId: companyWorkspace._id,
      userId: user._id,
    });

    if (!existingMembership) {
      await Membership.create({
        workspaceId: companyWorkspace._id,
        userId: user._id,
        role: 'member',
        department: 'general',
      });
    }

    const tokens = generateTokens(user._id);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        themePreference: user.themePreference,
      },
      defaultWorkspaceId: companyWorkspace._id,
      workspaceName: companyWorkspace.name,
      ...tokens,
    };
  }

  // 4. If independent registration (no company code):
  // User receives Free Tier workspace as requested
  const workspaceSlug =
    name.toLowerCase().replace(/[^a-z0-9]/g, '-') +
    '-workspace-' +
    Math.floor(1000 + Math.random() * 9000);

  const workspace = await Workspace.create({
    name: `${name}'s Workspace`,
    slug: workspaceSlug,
    ownerId: user._id,
    plan: 'free', // Free tier for new self-registered users
    subscriptionStatus: 'active',
  });

  await Membership.create({
    workspaceId: workspace._id,
    userId: user._id,
    role: 'owner',
  });

  // Create starter Project and Board
  const project = await Project.create({
    workspaceId: workspace._id,
    name: 'General Project',
    description: 'Welcome to your Karbon workspace.',
    key: 'KB',
    color: '#6366f1',
    creatorId: user._id,
  });

  const board = await Board.create({
    workspaceId: workspace._id,
    projectId: project._id,
    name: 'Main Board',
    description: 'Track and ship tasks efficiently.',
    isDefault: true,
  });

  // Create standard columns
  const colBacklog = await Column.create({
    workspaceId: workspace._id,
    boardId: board._id,
    name: 'Backlog',
    color: '#64748b',
    rank: 1000,
  });

  const colInProgress = await Column.create({
    workspaceId: workspace._id,
    boardId: board._id,
    name: 'In Progress',
    color: '#6366f1',
    rank: 2000,
    wipLimit: 3,
  });

  const colDone = await Column.create({
    workspaceId: workspace._id,
    boardId: board._id,
    name: 'Done',
    color: '#10b981',
    rank: 3000,
  });

  // Welcome starter task
  await Task.create({
    workspaceId: workspace._id,
    projectId: project._id,
    boardId: board._id,
    columnId: colInProgress._id,
    identifier: 'KB-1',
    sequenceNumber: 1,
    title: 'Welcome to Karbon! Explore your workspace',
    description: 'Your workspace is ready. You can invite team members with your unique company code or upgrade anytime.',
    priority: 'medium',
    assigneeIds: [user._id],
    creatorId: user._id,
    rank: 1000,
    labels: ['Getting Started'],
  });

  const tokens = generateTokens(user._id);

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      themePreference: user.themePreference,
    },
    defaultWorkspaceId: workspace._id,
    workspaceName: workspace.name,
    ...tokens,
  };
};

export const loginUser = async ({ email, password, companyCode }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  let targetWorkspaceId = null;

  // If user provided a company code during login, ensure membership exists
  if (companyCode && companyCode.trim()) {
    const cleanCode = companyCode.trim().toUpperCase();
    const companyWorkspace = await Workspace.findOne({ inviteCode: cleanCode });
    if (!companyWorkspace) {
      throw new Error(`Invalid Company Code "${cleanCode}". Workspace not found.`);
    }

    let existingMembership = await Membership.findOne({
      workspaceId: companyWorkspace._id,
      userId: user._id,
    });

    if (!existingMembership) {
      const memberCount = await Membership.countDocuments({ workspaceId: companyWorkspace._id });
      const maxMembers =
        companyWorkspace.plan === 'free' ? 1 : companyWorkspace.plan === 'pro' ? 100 : 1000;
      if (memberCount >= maxMembers) {
        throw new Error(
          `Workspace "${companyWorkspace.name}" has reached the member limit (${maxMembers}) for its current plan.`
        );
      }

      await Membership.create({
        workspaceId: companyWorkspace._id,
        userId: user._id,
        role: 'member',
      });
    }

    targetWorkspaceId = companyWorkspace._id;
  }

  // Find user's primary or last workspace if not specified
  if (!targetWorkspaceId) {
    const membership = await Membership.findOne({ userId: user._id }).sort({ createdAt: -1 });
    targetWorkspaceId = membership ? membership.workspaceId : null;
  }

  const tokens = generateTokens(user._id);

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      themePreference: user.themePreference,
    },
    defaultWorkspaceId: targetWorkspaceId,
    ...tokens,
  };
};
