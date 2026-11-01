import mongoose from 'mongoose';
import { levelInfo } from '../utils/levels.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'student'], default: 'student' },
    phone: { type: String, default: '' },
    // Set when an account starts with an emailed temporary password
    mustChangePassword: { type: Boolean, default: false },
    referralCode: { type: String, default: undefined }, // students share it so friends can apply
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
    xp: { type: Number, default: 0 },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActiveOn: { type: String, default: null }, // YYYY-MM-DD in the user's timezone
      freezes: { type: Number, default: 0 }, // earned every 7 streak days, max 2
    },
    hearts: {
      count: { type: Number, default: 5 },
      refilledAt: { type: Date, default: Date.now },
    },
    league: {
      tier: { type: Number, default: 0 },
      highestTier: { type: Number, default: 0 },
    },
    // One-off messages for the student (freeze used, league result), dismissed in the app
    notices: [
      {
        type: { type: String, required: true },
        data: mongoose.Schema.Types.Mixed,
        at: { type: Date, default: Date.now },
      },
    ],
    timezone: { type: String, default: 'Africa/Lagos' },
    emailReminders: { type: Boolean, default: true },
    pushReminders: { type: Boolean, default: true }, // only reaches devices that allowed notifications
    lastReminderOn: { type: String, default: null }, // YYYY-MM-DD (user's timezone) of the last reminder email
    lastSeenAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });

userSchema.virtual('levelInfo').get(function () {
  return levelInfo(this.xp);
});

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.id;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
