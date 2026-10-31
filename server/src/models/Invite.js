import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    // When set, only this email can redeem the invite
    email: { type: String, lowercase: true, trim: true },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    // At most one cohort per course; the student joins it on sign-up
    cohorts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cohort' }],
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inviteSchema.virtual('status').get(function () {
  if (this.usedAt) return 'used';
  if (this.expiresAt < new Date()) return 'expired';
  return 'pending';
});

inviteSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.id;
    return ret;
  },
});

export default mongoose.model('Invite', inviteSchema);
