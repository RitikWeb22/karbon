import { Comment } from '../../models/Comment.js';
import { Task } from '../../models/Task.js';
import { getIO } from '../../sockets/socketServer.js';

export const listComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const comments = await Comment.find({
      workspaceId: req.workspace._id,
      taskId,
    })
      .populate('authorId', 'name email avatarUrl')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty' });
    }

    const task = await Task.findOne({ _id: taskId, workspaceId: req.workspace._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const comment = await Comment.create({
      workspaceId: req.workspace._id,
      taskId,
      authorId: req.user._id,
      content: content.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate('authorId', 'name email avatarUrl');

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('comment:created:v1', {
        comment: populatedComment,
      });
      // Also emit on board channel for real-time task card badge update
      io.to(`board:${task.boardId}`).emit('task:commentAdded:v1', {
        taskId,
      });
    }

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findOne({
      _id: commentId,
      workspaceId: req.workspace._id,
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Only author or admin/owner can delete
    if (comment.authorId.toString() !== req.user._id.toString() && !['owner', 'admin'].includes(req.membership.role)) {
      return res.status(403).json({ success: false, message: 'Permission denied to delete this comment' });
    }

    await Comment.findByIdAndDelete(commentId);

    const io = getIO();
    if (io) {
      io.to(`task:${comment.taskId}`).emit('comment:deleted:v1', { commentId });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
