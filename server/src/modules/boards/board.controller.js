import { Board } from '../../models/Board.js';
import { Column } from '../../models/Column.js';
import { Task } from '../../models/Task.js';
import { broadcastBoardEvent } from '../../sockets/socketServer.js';

export const getBoardDetails = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const board = await Board.findOne({
      _id: boardId,
      workspaceId: req.workspace._id,
    });

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found in active workspace.' });
    }

    const columns = await Column.find({
      workspaceId: req.workspace._id,
      boardId: board._id,
    }).sort({ rank: 1 });

    // Category / Department scoping in Pro & Enterprise workspaces
    const taskQuery = {
      workspaceId: req.workspace._id,
      boardId: board._id,
      isArchived: false,
    };

    const { Membership } = await import('../../models/Membership.js');
    const userMembership = await Membership.findOne({
      workspaceId: req.workspace._id,
      userId: req.user._id,
    });

    const isPrivileged = ['owner', 'admin'].includes(userMembership?.role);
    const requestedDept = req.query.department;

    if (!isPrivileged && userMembership?.department && userMembership.department !== 'all') {
      // Non-admin members with a designated department only see their department tasks, general tasks, or tasks assigned to them
      taskQuery.$or = [
        { department: userMembership.department },
        { department: 'general' },
        { assigneeIds: req.user._id },
      ];
    } else if (requestedDept && requestedDept !== 'all') {
      taskQuery.department = requestedDept;
    }

    const tasks = await Task.find(taskQuery)
      .populate('assigneeIds', 'name email avatarUrl')
      .populate('creatorId', 'name email avatarUrl')
      .sort({ rank: 1 });

    res.json({
      success: true,
      data: {
        board,
        columns,
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createColumn = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { name, color = '#6366f1', wipLimit = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Column name is required' });
    }

    const lastColumn = await Column.findOne({
      workspaceId: req.workspace._id,
      boardId,
    }).sort({ rank: -1 });

    const newRank = lastColumn ? lastColumn.rank + 1000 : 1000;

    const column = await Column.create({
      workspaceId: req.workspace._id,
      boardId,
      name: name.trim(),
      color,
      wipLimit,
      rank: newRank,
    });

    broadcastBoardEvent(boardId, 'column:created:v1', {
      column,
      actor: { id: req.user._id, name: req.user.name },
    });

    res.status(201).json({
      success: true,
      data: column,
    });
  } catch (error) {
    next(error);
  }
};

export const updateColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { name, color, wipLimit } = req.body;

    const column = await Column.findOne({
      _id: columnId,
      workspaceId: req.workspace._id,
    });

    if (!column) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    if (name) column.name = name.trim();
    if (color) column.color = color;
    if (wipLimit !== undefined) column.wipLimit = wipLimit;

    await column.save();

    broadcastBoardEvent(column.boardId.toString(), 'column:updated:v1', {
      column,
      actor: { id: req.user._id, name: req.user.name },
    });

    res.json({
      success: true,
      data: column,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;

    const column = await Column.findOne({
      _id: columnId,
      workspaceId: req.workspace._id,
    });

    if (!column) {
      return res.status(404).json({ success: false, message: 'Column not found' });
    }

    const boardId = column.boardId.toString();

    // Soft delete tasks in this column
    await Task.updateMany({ workspaceId: req.workspace._id, columnId: column._id }, { isArchived: true });
    await Column.findByIdAndDelete(columnId);

    broadcastBoardEvent(boardId, 'column:deleted:v1', {
      columnId,
      actor: { id: req.user._id, name: req.user.name },
    });

    res.json({
      success: true,
      message: 'Column deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
