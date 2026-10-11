import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * Middleware bảo vệ các routes cần xác thực (JWT Auth)
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';
      const decoded = jwt.verify(token, secret);

      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có token xác thực, vui lòng đăng nhập.',
    });
  }
};
