import { Project } from '../../models/Project.js';
import { Board } from '../../models/Board.js';
import { Column } from '../../models/Column.js';
import { Task } from '../../models/Task.js';
import { Activity } from '../../models/Activity.js';
import { broadcastWorkspaceEvent } from '../../sockets/socketServer.js';

export const listProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      workspaceId: req.workspace._id,
      isArchived: false,
    }).sort({ createdAt: -1 });

    // Enrich with task metrics
    const enrichedProjects = await Promise.all(
      projects.map(async (p) => {
        const totalTasks = await Task.countDocuments({ workspaceId: req.workspace._id, projectId: p._id, isArchived: false });
        const boards = await Board.find({ workspaceId: req.workspace._id, projectId: p._id });
        return {
          ...p.toObject(),
          totalTasks,
          boardsCount: boards.length,
          defaultBoardId: boards.length > 0 ? boards[0]._id : null,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedProjects,
    });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { name, description, key, color } = req.body;
    if (!name || !key) {
      return res.status(400).json({ success: false, message: 'Project name and key prefix are required' });
    }

    const project = await Project.create({
      workspaceId: req.workspace._id,
      name: name.trim(),
      description: description || '',
      key: key.toUpperCase().trim(),
      color: color || '#6366f1',
      creatorId: req.user._id,
    });

    // Automatically create a default Kanban Board
    const board = await Board.create({
      workspaceId: req.workspace._id,
      projectId: project._id,
      name: `${project.name} Board`,
      isDefault: true,
    });

    // Create 4 initial columns
    await Column.create([
      { workspaceId: req.workspace._id, boardId: board._id, name: 'Backlog', rank: 1000, color: '#64748b' },
      { workspaceId: req.workspace._id, boardId: board._id, name: 'In Progress', rank: 2000, color: '#6366f1', wipLimit: 4 },
      { workspaceId: req.workspace._id, boardId: board._id, name: 'In Review', rank: 3000, color: '#f59e0b' },
      { workspaceId: req.workspace._id, boardId: board._id, name: 'Done', rank: 4000, color: '#10b981' },
    ]);

    await Activity.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      action: 'project:created',
      resourceType: 'project',
      resourceId: project._id,
      metadata: { projectName: project.name, key: project.key },
    });

    broadcastWorkspaceEvent(req.workspace._id.toString(), 'project:created:v1', {
      project,
      actor: { id: req.user._id, name: req.user.name },
    });

    res.status(201).json({
      success: true,
      data: {
        ...project.toObject(),
        defaultBoardId: board._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({
      _id: projectId,
      workspaceId: req.workspace._id,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found in active workspace.' });
    }

    const boards = await Board.find({ workspaceId: req.workspace._id, projectId: project._id });

    res.json({
      success: true,
      data: {
        ...project.toObject(),
        boards,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, color } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      workspaceId: req.workspace._id,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description;
    if (color) project.color = color;

    await project.save();

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({
      _id: projectId,
      workspaceId: req.workspace._id,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.isArchived = true;
    await project.save();

    res.json({
      success: true,
      message: 'Project archived successfully',
    });
  } catch (error) {
    next(error);
  }
};
