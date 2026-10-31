import mongoose from 'mongoose';

export const EXERCISE_TYPES = ['mcq', 'fill_blank', 'order_code', 'code_challenge'];

// One schema for every exercise type; only the fields for its type are set.
const exerciseSchema = new mongoose.Schema({
  type: { type: String, enum: EXERCISE_TYPES, required: true },
  prompt: { type: String, required: true },
  explanation: { type: String, default: '' },
  // mcq
  options: { type: [String], default: undefined },
  correctIndex: Number,
  // fill_blank: `text` marks each blank with ___ and `answers` holds one answer per blank
  text: String,
  answers: { type: [String], default: undefined },
  // order_code: lines in the correct order (shown shuffled)
  lines: { type: [String], default: undefined },
  // code_challenge: each test `check` is a JS expression evaluated against the student's preview
  starter: {
    type: new mongoose.Schema({ html: String, css: String, js: String }, { _id: false }),
    default: undefined,
  },
  tests: {
    type: [new mongoose.Schema({ label: String, check: String }, { _id: false })],
    default: undefined,
  },
});

const lessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    videoUrl: { type: String, default: '' },
    reading: { type: String, default: '' },
    xp: { type: Number, default: 10 },
    exercises: [exerciseSchema],
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1, moduleId: 1, order: 1 });
lessonSchema.set('toJSON', { versionKey: false });

export default mongoose.model('Lesson', lessonSchema);
