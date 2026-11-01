import mongoose from 'mongoose';

// Every answer a student submits during a session (one per "Check" press)
const answerSchema = new mongoose.Schema(
  {
    exerciseId: { type: mongoose.Schema.Types.ObjectId, required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, required: true },
    correct: { type: Boolean, required: true },
    answer: { type: String, default: '' }, // what they answered, as readable text
    timeMs: { type: Number, default: 0 }, // time on the question before this check
    failedChecks: { type: [String], default: undefined }, // code challenges only
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// One lesson or practice-round session, from opening it to finishing (or leaving)
const lessonAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['lesson', 'practice'], required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
  startedAt: { type: Date, default: Date.now },
  lastEventAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  completed: { type: Boolean, default: false },
  firstTime: { type: Boolean, default: false }, // first completion of this lesson
  xpEarned: { type: Number, default: 0 },
  localDate: { type: String, required: true }, // YYYY-MM-DD in the student's timezone
  localHour: { type: Number, required: true },
  answers: [answerSchema],
});

lessonAttemptSchema.index({ user: 1, startedAt: -1 });
lessonAttemptSchema.index({ startedAt: -1 });
lessonAttemptSchema.index({ lesson: 1 });

export default mongoose.model('LessonAttempt', lessonAttemptSchema);
