import mongoose from 'mongoose';

/**
 * 12. Bảng admin_audit_logs (Tier 3 - Nhật ký Quản trị & Tuân thủ Hệ thống)
 * Ghi lại đầy đủ mọi hành động can thiệp của Quản trị viên phục vụ truy vết và đối soát an toàn.
 */
const adminAuditLogSchema = new mongoose.Schema(
  {
    adminAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    adminEmail: {
      type: String,
      default: '',
      trim: true,
    },
    adminName: {
      type: String,
      default: '',
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'admin_audit_logs',
  }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1 });

export const AdminAuditLog =
  mongoose.models.AdminAuditLog ||
  mongoose.model('AdminAuditLog', adminAuditLogSchema, 'admin_audit_logs');

export default AdminAuditLog;
