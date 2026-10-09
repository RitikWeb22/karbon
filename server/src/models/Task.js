import mongoose from 'mongoose';

const SubtaskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
});

const DependencySchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  relation: {
    type: String,
    enum: ['blocked_by', 'blocks', 'relates_to'],
    default: 'relates_to',
  },
});

const AttachmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    default: 'image/png',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const TaskSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    columnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Column',
      required: true,
    },
    identifier: {
      type: String,
      required: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium',
    },
    department: {
      type: String,
      enum: ['development', 'design', 'marketing', 'sales', 'operations', 'general'],
      default: 'general',
    },
    assigneeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rank: {
      type: Number,
      required: true,
      default: 1000,
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    subtasks: [SubtaskSchema],
    attachments: [AttachmentSchema],
    dependencies: [DependencySchema],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

TaskSchema.index({ workspaceId: 1, identifier: 1 }, { unique: true });
TaskSchema.index({ workspaceId: 1, boardId: 1, columnId: 1, rank: 1 });
TaskSchema.index({ workspaceId: 1, assigneeIds: 1 });
TaskSchema.index({ workspaceId: 1, dueDate: 1 });

export const Task = mongoose.model('Task', TaskSchema);
