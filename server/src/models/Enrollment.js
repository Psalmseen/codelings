import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', default: null },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    lastActivityAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.set('toJSON', { versionKey: false });

export default mongoose.model('Enrollment', enrollmentSchema);
