import mongoose from 'mongoose';

/**
 * 1. Bảng roles (Tier 1 - Phân quyền Web & App)
 * Hỗ trợ đầy đủ 4 mã vai trò: renter, owner, both và admin
 */
const roleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      enum: ['renter', 'owner', 'both', 'admin'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    permissions: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'roles',
  }
);

export const Role = mongoose.models.Role || mongoose.model('Role', roleSchema, 'roles');
export default Role;

