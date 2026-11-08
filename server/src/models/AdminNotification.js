import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  category: { type: String, enum: ['ekyc', 'owner-verification', 'devices'], required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, required: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId }],
}, { collection: 'admin_notifications' });

adminNotificationSchema.index({ createdAt: -1, _id: -1 });
adminNotificationSchema.index({ category: 1, createdAt: -1, _id: -1 });

export default mongoose.models.AdminNotification ||
  mongoose.model('AdminNotification', adminNotificationSchema);
