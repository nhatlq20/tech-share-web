import express from 'express';
import {
  login,
  getProfile,
  getCurrentUser,
  updateAvatar,
  updateProfile,
  registerInit,
  registerVerifyOtp,
  resendRegisterOtp,
  forgotPasswordInit,
  forgotPasswordVerifyOtp,
  forgotPasswordReset,
  resendForgotPasswordOtp,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Đăng nhập
router.post('/login', login);

// Đăng ký tài khoản (Luồng xác thực OTP Email)
router.post('/register-init', registerInit);
router.post('/register-verify-otp', registerVerifyOtp);
router.post('/resend-otp', resendRegisterOtp);

// Quên mật khẩu (Luồng xác thực OTP Email qua Google App Password)
router.post('/forgot-password-init', forgotPasswordInit);
router.post('/forgot-password-verify-otp', forgotPasswordVerifyOtp);
router.post('/forgot-password-reset', forgotPasswordReset);
router.post('/forgot-password-resend-otp', resendForgotPasswordOtp);

// Lấy thông tin user hiện tại (cần Token)
router.get('/me', protect, getCurrentUser);

// Cập nhật thông tin Profile (địa chỉ, tên, sđt)
router.patch('/profile', protect, updateProfile);
router.put('/profile', protect, updateProfile);

// Cập nhật ảnh đại diện lên Cloudinary
router.post('/avatar', protect, updateAvatar);
router.patch('/avatar', protect, updateAvatar);

// Lấy thông tin Profile theo userId (hoặc của chính mình qua token)
router.get('/profile', protect, getProfile);
router.get('/profile/:userId', getProfile);

export default router;
