import mongoose from 'mongoose';

/**
 * 13. Bảng system_settings (Tier 3 - Cấu hình Nền tảng)
 * Lưu trữ các thiết lập động của hệ thống (phí sàn, chế độ bảo trì, hạn mức, v.v.)
 */
const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['general', 'booking', 'finance', 'notification'],
      default: 'general',
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'system_settings',
  }
);

export const SystemSetting =
  mongoose.models.SystemSetting ||
  mongoose.model('SystemSetting', systemSettingSchema, 'system_settings');

export default SystemSetting;
