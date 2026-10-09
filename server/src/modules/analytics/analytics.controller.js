import { Task } from '../../models/Task.js';
import { Column } from '../../models/Column.js';
import { Membership } from '../../models/Membership.js';

export const getWorkspaceAnalytics = async (req, res, next) => {
  try {
    const workspaceId = req.workspace._id;

    const allTasks = await Task.find({ workspaceId, isArchived: false })
      .populate('columnId', 'name color')
      .populate('assigneeIds', 'name avatarUrl');

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.columnId && t.columnId.name.toLowerCase() === 'done').length;
    const urgentTasks = allTasks.filter((t) => t.priority === 'urgent').length;
    const overdueTasks = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.columnId?.name?.toLowerCase() !== 'done').length;

    // Status breakdown
    const statusMap = {};
    allTasks.forEach((task) => {
      const colName = task.columnId ? task.columnId.name : 'Unassigned';
      statusMap[colName] = (statusMap[colName] || 0) + 1;
    });

    const statusData = Object.entries(statusMap).map(([name, count]) => ({
      name,
      count,
    }));

    // Priority breakdown
    const priorityMap = { urgent: 0, high: 0, medium: 0, low: 0 };
    allTasks.forEach((t) => {
      priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1;
    });

    const priorityData = [
      { name: 'Urgent', count: priorityMap.urgent, fill: '#f43f5e' },
      { name: 'High', count: priorityMap.high, fill: '#f59e0b' },
      { name: 'Medium', count: priorityMap.medium, fill: '#6366f1' },
      { name: 'Low', count: priorityMap.low, fill: '#64748b' },
    ];

    // Assignee workload
    const members = await Membership.find({ workspaceId }).populate('userId', 'name avatarUrl');
    const workloadData = members.map((m) => {
      const userTasks = allTasks.filter((t) =>
        t.assigneeIds && t.assigneeIds.some((a) => a._id.toString() === m.userId._id.toString())
      );
      return {
        name: m.userId.name,
        avatarUrl: m.userId.avatarUrl,
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter((t) => t.columnId?.name?.toLowerCase() === 'done').length,
      };
    });

    res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        urgentTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        statusData,
        priorityData,
        workloadData,
      },
    });
  } catch (error) {
    next(error);
  }
};
