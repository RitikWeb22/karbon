import { Task } from '../../models/Task.js';
import { Project } from '../../models/Project.js';
import { Column } from '../../models/Column.js';
import { Workspace } from '../../models/Workspace.js';
import { Activity } from '../../models/Activity.js';
import { calculateRank } from '../../utils/lexorank.js';
import { broadcastBoardEvent } from '../../sockets/socketServer.js';

export const syncWorkspaceStorage = async (workspaceId) => {
  try {
    const tasksWithAttachments = await Task.find(
      { workspaceId, 'attachments.0': { $exists: true } },
      'attachments'
    );
    let totalBytes = 0;
    tasksWithAttachments.forEach((t) => {
      t.attachments?.forEach((att) => {
        if (att.size && att.size > 0) {
          totalBytes += att.size;
        } else if (att.url && typeof att.url === 'string' && att.url.startsWith('data:')) {
          totalBytes += Math.round(att.url.length * 0.75);
        }
      });
    });
    await Workspace.findByIdAndUpdate(workspaceId, { storageUsedBytes: totalBytes });
  } catch (err) {
    console.error('Storage sync error:', err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const {
      boardId,
      columnId,
      projectId,
      title,
      description = '',
      priority = 'medium',
      department = 'general',
      assigneeIds = [],
      dueDate,
      attachments = [],
    } = req.body;

    if (!title || !columnId || !boardId || !projectId) {
      return res.status(400).json({ success: false, message: 'Title, columnId, boardId, and projectId are required.' });
    }

    const project = await Project.findOne({ _id: projectId, workspaceId: req.workspace._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Auto-increment sequence number for workspace
    const taskCount = await Task.countDocuments({ workspaceId: req.workspace._id, projectId });
    const sequenceNumber = taskCount + 1;
    const identifier = `${project.key}-${sequenceNumber}`;

    // Get last task rank in this column
    const lastTask = await Task.findOne({
      workspaceId: req.workspace._id,
      boardId,
      columnId,
    }).sort({ rank: -1 });

    const rank = lastTask ? lastTask.rank + 1000 : 1000;

    const task = await Task.create({
      workspaceId: req.workspace._id,
      projectId,
      boardId,
      columnId,
      identifier,
      sequenceNumber,
      title: title.trim(),
      description,
      priority,
      department,
      assigneeIds,
      creatorId: req.user._id,
      rank,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      subtasks: [],
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeIds', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl');

    await Activity.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      action: 'task:created',
      resourceType: 'task',
      resourceId: task._id,
      metadata: { taskTitle: task.title, identifier: task.identifier },
    });

    broadcastBoardEvent(boardId, 'task:created:v1', {
      task: populatedTask,
      actor: { id: req.user._id, name: req.user.name },
    });

    if (attachments.length > 0) {
      syncWorkspaceStorage(req.workspace._id);
    }

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: req.workspace._id,
    })
      .populate('assigneeIds', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl')
      .populate('projectId', 'name key color')
      .populate('columnId', 'name color');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found in active workspace.' });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: req.workspace._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const allowedFields = ['title', 'description', 'priority', 'department', 'assigneeIds', 'labels', 'startDate', 'dueDate', 'subtasks', 'columnId', 'attachments'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeIds', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl')
      .populate('projectId', 'name key color')
      .populate('columnId', 'name color');

    broadcastBoardEvent(task.boardId.toString(), 'task:updated:v1', {
      task: populatedTask,
      actor: { id: req.user._id, name: req.user.name },
    });

    if (updates.attachments !== undefined) {
      syncWorkspaceStorage(req.workspace._id);
    }

    res.json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { targetColumnId, prevRank, nextRank } = req.body;

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: req.workspace._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const fromColumnId = task.columnId;
    const newRank = calculateRank(prevRank, nextRank);

    task.columnId = targetColumnId;
    task.rank = newRank;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeIds', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl');

    broadcastBoardEvent(task.boardId.toString(), 'task:moved:v1', {
      taskId: task._id,
      fromColumnId,
      toColumnId: targetColumnId,
      newRank,
      task: populatedTask,
      actor: { id: req.user._id, name: req.user.name },
    });

    // Check if column changed to log activity
    if (fromColumnId.toString() !== targetColumnId.toString()) {
      const targetColumn = await Column.findById(targetColumnId);
      await Activity.create({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'task:moved',
        resourceType: 'task',
        resourceId: task._id,
        metadata: {
          taskTitle: task.title,
          identifier: task.identifier,
          toColumn: targetColumn ? targetColumn.name : 'Unknown Column',
        },
      });
    }

    res.json({
      success: true,
      message: 'Task moved successfully',
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: req.workspace._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const boardId = task.boardId.toString();
    const hadAttachments = (task.attachments || []).length > 0;
    await Task.findByIdAndDelete(taskId);

    await Activity.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      action: 'task:deleted',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { taskTitle: task.title, identifier: task.identifier },
    });

    broadcastBoardEvent(boardId, 'task:deleted:v1', {
      taskId: task._id,
      actor: { id: req.user._id, name: req.user.name },
    });

    if (hadAttachments) {
      syncWorkspaceStorage(req.workspace._id);
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      data: { taskId: task._id },
    });
  } catch (error) {
    next(error);
  }
};
