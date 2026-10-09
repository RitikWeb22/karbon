import { Task } from '../../models/Task.js';
import { Project } from '../../models/Project.js';

export const globalSearch = async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) {
      return res.json({ success: true, data: { tasks: [], projects: [] } });
    }

    const regex = new RegExp(q, 'i');

    const [tasks, projects] = await Promise.all([
      Task.find({
        workspaceId: req.workspace._id,
        isArchived: false,
        $or: [{ title: regex }, { identifier: regex }, { description: regex }],
      })
        .limit(10)
        .populate('columnId', 'name color')
        .populate('projectId', 'name key color'),

      Project.find({
        workspaceId: req.workspace._id,
        isArchived: false,
        $or: [{ name: regex }, { key: regex }],
      }).limit(5),
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
};
