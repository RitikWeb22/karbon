import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

ProjectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
ProjectSchema.index({ workspaceId: 1, isArchived: 1 });

export const Project = mongoose.model('Project', ProjectSchema);
