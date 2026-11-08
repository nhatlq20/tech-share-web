import mongoose from 'mongoose';

// Pre-rental conversations share Message and the existing chat API/rooms.
const schema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  renterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isInquiry: { type: Boolean, default: true },
}, { timestamps: true, collection: 'chat_inquiries' });
schema.index({ renterId: 1 });
schema.index({ ownerId: 1 });
export default mongoose.models.ChatInquiry || mongoose.model('ChatInquiry', schema);
