import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'pro',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'none'],
      default: 'active',
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
    },
    storageUsedBytes: {
      type: Number,
      default: 0,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    settings: {
      taskKeyPrefix: {
        type: String,
        default: 'KB',
      },
      defaultTaskVisibility: {
        type: String,
        default: 'public',
      },
    },
  },
  { timestamps: true }
);

WorkspaceSchema.pre('save', function (next) {
  if (!this.inviteCode) {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.inviteCode = `KB-${randomSuffix}`;
  }
  next();
});

export const Workspace = mongoose.model('Workspace', WorkspaceSchema);
