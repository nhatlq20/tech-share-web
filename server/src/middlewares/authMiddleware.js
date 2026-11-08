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
