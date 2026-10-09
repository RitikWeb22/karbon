import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Membership } from '../models/Membership.js';
import { Project } from '../models/Project.js';
import { Board } from '../models/Board.js';
import { Column } from '../models/Column.js';
import { Task } from '../models/Task.js';

export const seedDatabaseIfEmpty = async () => {
  // 1. Remove old demo users (Alex & Elena)
  try {
    await User.deleteMany({ email: { $in: ['alex@karbon.dev', 'elena@karbon.dev'] } });
  } catch (err) {
    console.warn('Cleanup check:', err.message);
  }

  // 2. Ensure Ritik Admin exists with password ritik@123
  let ritik = await User.findOne({ email: 'ritikweb30@gmail.com' });

  if (!ritik) {
    ritik = await User.create({
      name: 'Ritik (Admin)',
      email: 'ritikweb30@gmail.com',
      password: 'ritik@123',
      avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=RitikAdmin',
      themePreference: 'dark',
      isVerified: true,
    });
    console.log('✅ Created production Admin user: ritikweb30@gmail.com');
  } else {
    ritik.name = 'Ritik (Admin)';
    ritik.password = 'ritik@123';
    await ritik.save();
    console.log('✅ Synchronized Admin credentials for ritikweb30@gmail.com');
  }

  // 3. Ensure primary production workspace exists
  let workspace = await Workspace.findOne({ ownerId: ritik._id });
  if (!workspace) {
    workspace = await Workspace.create({
      name: 'Karbon Technologies',
      slug: 'karbon-technologies',
      ownerId: ritik._id,
      plan: 'pro',
      subscriptionStatus: 'active',
      inviteCode: 'KARBON-PRO-2026',
      settings: {
        taskKeyPrefix: 'KB',
        defaultTaskVisibility: 'public',
      },
    });
    console.log('✅ Created primary production workspace with inviteCode: KARBON-PRO-2026');
  } else {
    workspace.name = 'Karbon Technologies';
    if (!workspace.inviteCode) {
      workspace.inviteCode = 'KARBON-PRO-2026';
    }
    await workspace.save();
  }

  // 4. Ensure Membership exists for Ritik
  const existingMembership = await Membership.findOne({
    workspaceId: workspace._id,
    userId: ritik._id,
  });

  if (!existingMembership) {
    await Membership.create({
      workspaceId: workspace._id,
      userId: ritik._id,
      role: 'owner',
    });
  }

  // 5. Ensure at least one starter project and board exists
  let project = await Project.findOne({ workspaceId: workspace._id });
  if (!project) {
    project = await Project.create({
      workspaceId: workspace._id,
      name: 'Core Engineering',
      description: 'Production track and feature execution.',
      key: 'KB',
      color: '#6366f1',
      creatorId: ritik._id,
    });

    const board = await Board.create({
      workspaceId: workspace._id,
      projectId: project._id,
      name: 'Sprint Board',
      isDefault: true,
    });

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
      wipLimit: 4,
    });

    const colDone = await Column.create({
      workspaceId: workspace._id,
      boardId: board._id,
      name: 'Done',
      color: '#10b981',
      rank: 3000,
    });

    await Task.create([
      {
        workspaceId: workspace._id,
        projectId: project._id,
        boardId: board._id,
        columnId: colInProgress._id,
        identifier: 'KB-1',
        sequenceNumber: 1,
        title: 'Production Architecture & Stripe Gateway Verification',
        description: 'Multiplayer Kanban SaaS deployed with strict tenant isolation and role-based access control.',
        priority: 'urgent',
        assigneeIds: [ritik._id],
        creatorId: ritik._id,
        rank: 1000,
        labels: ['Core', 'Security'],
      },
      {
        workspaceId: workspace._id,
        projectId: project._id,
        boardId: board._id,
        columnId: colBacklog._id,
        identifier: 'KB-2',
        sequenceNumber: 2,
        title: 'Team Onboarding & Company Invite Flow',
        description: 'New members can join via workspace invite code directly at registration.',
        priority: 'high',
        assigneeIds: [ritik._id],
        creatorId: ritik._id,
        rank: 1000,
        labels: ['Onboarding'],
      },
    ]);
  }
};
