import mongoose from 'mongoose';

const ColumnSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    rank: {
      type: Number,
      required: true,
      default: 1000,
    },
    wipLimit: {
      type: Number,
      default: 0, // 0 = unlimited
    },
  },
  { timestamps: true }
);

ColumnSchema.index({ workspaceId: 1, boardId: 1, rank: 1 });

export const Column = mongoose.model('Column', ColumnSchema);
