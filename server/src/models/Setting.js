import mongoose from 'mongoose';

// Small server-wide values the app creates for itself (e.g. the push notification keys)
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
});

export default mongoose.model('Setting', settingSchema);
