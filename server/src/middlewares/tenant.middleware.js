import mongoose from 'mongoose';
import { Workspace } from '../models/Workspace.js';
import { Membership } from '../models/Membership.js';

export const requireWorkspace = async (req, res, next) => {
  try {
    const workspaceId =
      req.params.workspaceId ||
      req.headers['x-workspace-id'] ||
      req.body.workspaceId ||
      req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace context missing. workspaceId parameter or X-Workspace-Id header required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace identifier format.',
      });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found.',
      });
    }

    const membership = await Membership.findOne({
      workspaceId: workspace._id,
      userId: req.user._id,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. You are not a member of this workspace.',
      });
    }

    req.workspace = workspace;
    req.membership = membership;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify tenant workspace scope.',
      error: error.message,
    });
  }
};
