import mongoose from 'mongoose';

// A request to join, from the public apply page. An admin approves (creating the account) or rejects it.
const applicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    referralCode: { type: String, default: '' }, // as typed / from the referral link
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Optional details
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    occupation: { type: String, default: '' },
    experience: { type: String, default: '' }, // none | a_little | some
    goals: { type: String, default: '' },
    hasLaptop: { type: String, default: '' }, // yes | no | shared
    preferredTime: { type: String, default: '' }, // morning | afternoon | evening | weekends
    timezone: { type: String, default: '' }, // from the applicant's browser
    // Review
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionNote: { type: String, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // the account created on approval
  },
  { timestamps: true }
);

applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ email: 1 });
applicationSchema.set('toJSON', { versionKey: false });

export default mongoose.model('Application', applicationSchema);
