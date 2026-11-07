import mongoose from 'mongoose';

// Mongoose defines the shape of a stored meme and protects the database from
// accidentally receiving arbitrary request fields.
const memeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    caption: { type: String, required: true, trim: true, maxlength: 280 },
    templateId: { type: String, required: true, trim: true, maxlength: 60 },
    imageData: { type: String, required: true, maxlength: 1_600_000 },
    tags: { type: [String], default: [], maxlength: 8 },
    authorName: { type: String, default: 'Studio creator', maxlength: 30 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
  },
  { timestamps: true, versionKey: false },
);

memeSchema.index({ title: 'text', caption: 'text', tags: 'text' });

export const Meme = mongoose.models.Meme || mongoose.model('Meme', memeSchema);

