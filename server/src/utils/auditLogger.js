import mongoose from 'mongoose';
import AdminAuditLog from '../models/AdminAuditLog.js';

/**
 * Sanitize sensitive fields before persisting to audit log
 */
const sanitizeDetails = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'jwt',
    'secret',
    'accessToken',
    'refreshToken',
    'otp',
  ];

  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = sanitizeDetails(clone[key]);
    }
  }
  return clone;
};

/**
 * Record an administrative audit log entry
 * Hỗ trợ cả 2 cách gọi:
 * 1. logAdminAction(req, { action, targetType, ... })
 * 2. logAdminAction({ req, action, targetType, ... })
 */
export const logAdminAction = async (arg1, arg2) => {
  try {
    let req, action, targetType, targetId, details, reason, status;
    if (arg1 && (arg1.headers || arg1.user !== undefined) && arg2) {
      req = arg1;
      action = arg2.action;
      targetType = arg2.targetType;
      targetId = arg2.targetId || '';
      reason = arg2.reason || '';
      details = arg2.details || arg2.metadata || {};
      status = arg2.status || 'success';
    } else {
      req = arg1?.req;
      action = arg1?.action;
      targetType = arg1?.targetType;
      targetId = arg1?.targetId || '';
      reason = arg1?.reason || '';
      details = arg1?.details || arg1?.metadata || {};
      status = arg1?.status || 'success';
    }

    const adminUser = req?.user || {};
    const adminAccountId =
      adminUser.accountId && mongoose.isValidObjectId(adminUser.accountId)
        ? new mongoose.Types.ObjectId(String(adminUser.accountId))
        : null;
    const adminUserId =
      (adminUser.userId || adminUser._id || adminUser.id) &&
      mongoose.isValidObjectId(adminUser.userId || adminUser._id || adminUser.id)
        ? new mongoose.Types.ObjectId(String(adminUser.userId || adminUser._id || adminUser.id))
        : null;

    const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await AdminAuditLog.create({
      adminAccountId,
      adminId: adminUserId,
      adminUserId,
      adminEmail: adminUser.email || '',
      adminName: adminUser.name || adminUser.username || 'Admin',
      action,
      targetType,
      targetId: String(targetId || ''),
      reason,
      metadata: sanitizeDetails(details),
      details: sanitizeDetails(details),
      ipAddress: String(ip),
      ip: String(ip),
      userAgent: String(userAgent),
      status,
    });
  } catch (err) {
    console.warn('⚠️ Lỗi khi ghi Admin Audit Log (non-blocking):', err.message);
  }
};

export default logAdminAction;
