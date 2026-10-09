import { Activity } from '../../models/Activity.js';

export const listWorkspaceActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;

    const activities = await Activity.find({
      workspaceId: req.workspace._id,
    })
      .populate('actorId', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};
