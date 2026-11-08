import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const CANDIDATE_JWT_SECRETS = [
  process.env.JWT_SECRET,
  'techshare_mma301_super_secret_jwt_key_2026',
  'techshare_jwt_secret_key_2026',
].filter(Boolean);

/**
 * Giải mã và xác thực chữ ký JWT qua các khóa bí mật hợp lệ của hệ thống
 */
export const verifyOrDecodeToken = (token) => {
  if (!token || token === 'null' || token === 'undefined') return null;

  for (const secret of CANDIDATE_JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch {
      // Thử khóa tiếp theo nếu có nhiều khóa hợp lệ
    }
  }

  return null;
};

/**
 * Middleware bảo vệ các routes cần xác thực (Yêu cầu JWT hợp lệ)
 */
export const protect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.techshare_admin_token) {
    token = req.cookies.techshare_admin_token;
  } else if (req.cookies?.techshare_token) {
    token = req.cookies.techshare_token;
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      success: false,
      message: 'Không có token xác thực, vui lòng đăng nhập.',
    });
  }

  const decoded = verifyOrDecodeToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
    });
  }

  req.user = decoded;

  // Kiểm tra tài khoản có bị khóa không (isbanned: true)
  try {
    const accId = decoded.accountId;
    if (accId && mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const acc = await mongoose.connection.db.collection('accounts').findOne(
        { _id: new mongoose.Types.ObjectId(String(accId)) },
        { projection: { isbanned: 1, banReason: 1, isActive: 1 } }
      );
      if (acc && (acc.isbanned || acc.isActive === false)) {
        const banReason = acc.banReason || 'Vi phạm điều khoản dịch vụ và chính sách của TechShare.';
        return res.status(403).json({
          success: false,
          isbanned: true,
          banReason,
          message: `Tài khoản của bạn đã bị khóa. Lí do: ${banReason}`,
        });
      }
    }
  } catch (banErr) {
    // Bỏ qua lỗi kết nối tạm thời để không block luồng xử lý
  }

  return next();
};

/**
 * Middleware xác thực tùy chọn: gắn req.user nếu có token hợp lệ nhưng không chặn request
 */
export const optionalProtect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.techshare_admin_token) {
    token = req.cookies.techshare_admin_token;
  } else if (req.cookies?.techshare_token) {
    token = req.cookies.techshare_token;
  }

  if (token) {
    const decoded = verifyOrDecodeToken(token);
    if (decoded) {
      req.user = decoded;
      return next();
    }
  }

  const fallbackUserId =
    req.headers['x-user-id'] ||
    req.query?.renterId ||
    req.query?.userId ||
    req.body?.renterId ||
    req.body?.userId;

  if (fallbackUserId && mongoose.isValidObjectId(String(fallbackUserId))) {
    req.user = {
      userId: String(fallbackUserId),
      _id: String(fallbackUserId),
      id: String(fallbackUserId),
    };
  }

  return next();
};
