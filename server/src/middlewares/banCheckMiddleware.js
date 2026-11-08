import mongoose from 'mongoose';
import { Account } from '../models/Account.js';

/**
 * Middleware kiểm tra trạng thái khóa tài khoản (`isbanned: true`)
 * Nếu tài khoản đang bị khóa, lập tức chặn request với mã 403 kèm lý do khóa
 */
export const checkAccountNotBanned = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Lấy accountId hoặc userId từ token decoded
    const accountId = req.user.accountId;
    const userId = req.user.userId || req.user._id || req.user.id;

    let account = null;
    if (accountId && mongoose.isValidObjectId(accountId)) {
      account = await Account.findById(accountId).select('isbanned banReason isActive');
    }
    if (!account && userId && mongoose.isValidObjectId(userId)) {
      account = await Account.findOne({
        $or: [{ userId: new mongoose.Types.ObjectId(String(userId)) }, { _id: new mongoose.Types.ObjectId(String(userId)) }],
      }).select('isbanned banReason isActive');
    }

    if (account && (account.isbanned || account.isActive === false)) {
      const banReason = account.banReason || 'Vi phạm điều khoản sử dụng nền tảng.';
      return res.status(403).json({
        success: false,
        isbanned: true,
        banReason,
        message: `Tài khoản của bạn đã bị khóa. Lí do: ${banReason}`,
      });
    }

    return next();
  } catch (err) {
    console.warn('⚠️ Lỗi kiểm tra ban status trong middleware:', err.message);
    return next();
  }
};

export default checkAccountNotBanned;

