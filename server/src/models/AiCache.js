import mongoose from 'mongoose';

/**
 * 13. Bảng ai_caches (Tier 3 - Bộ nhớ đệm phân tích AI)
 * Lưu trữ kết quả phân tích AI (tóm tắt đánh giá, so sánh thiết bị, tư vấn thuê)
 * Có TTL Index tự động xóa khi expiresAt đến hạn.
 */
const aiCacheSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['review_summary', 'comparison', 'consultant'],
      required: true,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
      index: true,
    },
    inputHash: {
      type: String,
      required: true,
      index: true,
    },
    resultJson: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'ai_caches',
  }
);

// TTL Index: Tự động hết hạn và dọn dẹp theo expiresAt
aiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AiCache = mongoose.models.AiCache || mongoose.model('AiCache', aiCacheSchema, 'ai_caches');
export default AiCache;

