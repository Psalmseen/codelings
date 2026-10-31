import mongoose from 'mongoose';

// Module order is the order of this array; lessons live in their own collection.
const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    emoji: { type: String, default: '💻' },
    color: { type: String, default: '#6D4AFF' },
    pacing: { type: String, enum: ['self', 'cohort'], default: 'self' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    modules: [moduleSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

courseSchema.set('toJSON', { versionKey: false });

export default mongoose.model('Course', courseSchema);
