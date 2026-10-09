import mongoose from 'mongoose';

const WebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['processed', 'failed'],
      default: 'processed',
    },
    error: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const WebhookEvent = mongoose.model('WebhookEvent', WebhookEventSchema);
