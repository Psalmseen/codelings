import mongoose from 'mongoose';

// One browser/phone that agreed to receive notifications for a user
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
    lastSuccessAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1 });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
