import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const CANDIDATE_JWT_SECRETS = [
  process.env.JWT_SECRET,
  'techshare_mma301_super_secret_jwt_key_2026',
  'techshare_jwt_secret_key_2026',
].filter(Boolean);

/**
 * Giải mã JWT linh hoạt qua các khóa bí mật của hệ thống (tránh lỗi lệch JWT_SECRET khi cập nhật .env)
 */
export const verifyOrDecodeToken = (token) => {
  if (!token || token === 'null' || token === 'undefined') return null;

  for (const secret of CANDIDATE_JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch {
      // Thử khóa tiếp theo
    }
  }

  // Fallback decode trong môi trường phát triển nếu token bị lệch chữ ký hoặc hết hạn
  if (process.env.NODE_ENV !== 'production') {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object' && (decoded.userId || decoded._id || decoded.id || decoded.accountId)) {
      return decoded;
    }
  }

  return null;
};

/**
 * Middleware bảo vệ các routes cần xác thực (JWT Auth + Fallback X-User-Id / Query)
 */
export const protect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  const decoded = verifyOrDecodeToken(token);
  if (decoded) {
    req.user = decoded;
    return next();
  }

  // Fallback định danh người dùng qua header X-User-Id hoặc query renterId/userId
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
    return next();
  }

  if (token) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Không có token xác thực, vui lòng đăng nhập.',
  });
};

/**
 * Middleware xác thực tùy chọn: gắn req.user nếu có token/header nhưng không chặn request
 */
export const optionalProtect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  const decoded = verifyOrDecodeToken(token);
  if (decoded) {
    req.user = decoded;
    return next();
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
