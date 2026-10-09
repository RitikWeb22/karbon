import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true, // e.g. 'task:created', 'task:moved', 'task:updated', 'member:invited'
    },
    resourceType: {
      type: String,
      enum: ['task', 'project', 'board', 'workspace', 'comment'],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

ActivitySchema.index({ workspaceId: 1, createdAt: -1 });

export const Activity = mongoose.model('Activity', ActivitySchema);
