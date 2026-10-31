import mongoose from 'mongoose';

// A student's place in one week's league group. Created the first time they earn XP that week.
const leagueMembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    week: { type: String, required: true }, // Monday of the week, YYYY-MM-DD
    tier: { type: Number, required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, required: true },
    xp: { type: Number, default: 0 },
    // Set when the week is closed
    result: { type: String, enum: ['promoted', 'demoted', 'stayed', null], default: null },
    rank: Number,
  },
  { timestamps: true }
);

leagueMembershipSchema.index({ user: 1, week: 1 }, { unique: true });
leagueMembershipSchema.index({ week: 1, groupId: 1, xp: -1 });
leagueMembershipSchema.index({ result: 1, week: 1 });

export default mongoose.model('LeagueMembership', leagueMembershipSchema);
