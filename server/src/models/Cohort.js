import mongoose from 'mongoose';

// A group of students who start a course on the same date and share a private leaderboard
const cohortSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
  },
  { timestamps: true }
);

cohortSchema.index({ course: 1, startDate: 1 });
cohortSchema.set('toJSON', { versionKey: false });

export default mongoose.model('Cohort', cohortSchema);
