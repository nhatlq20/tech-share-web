import express from 'express';
import { getProfile, getCurrentUser, updateAvatar, updateProfile } from '../controllers/authController.js';
import {
  getWishlist,
  toggleWishlistDevice,
  removeWishlistDevice,
  clearWishlist,
} from '../controllers/wishlistController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Routes cho phân hệ người dùng chung (Users - phân theo roles: renter, owner, admin)
 */
// Lấy profile của người dùng hiện tại từ token
router.get('/me', protect, getCurrentUser);
router.get('/profile', protect, getProfile);

// Cập nhật thông tin profile (địa chỉ, tên, sđt)
router.patch('/profile', protect, updateProfile);
router.put('/profile', protect, updateProfile);

// Cập nhật ảnh đại diện (Upload Cloudinary)
router.post('/avatar', protect, updateAvatar);
router.patch('/avatar', protect, updateAvatar);

// Danh sách yêu thích (Wishlist / Favorites) - đọc & đồng bộ trường `wishlist` trong collection `users`
router.get('/wishlist', optionalProtect, getWishlist);
router.get('/favorites', optionalProtect, getWishlist);
router.post('/wishlist/:deviceId', protect, toggleWishlistDevice);
router.post('/favorites/:deviceId', protect, toggleWishlistDevice);
router.patch('/wishlist/:deviceId', protect, toggleWishlistDevice);
router.patch('/favorites/:deviceId', protect, toggleWishlistDevice);
router.delete('/wishlist/:deviceId', protect, removeWishlistDevice);
router.delete('/favorites/:deviceId', protect, removeWishlistDevice);
router.delete('/wishlist', protect, clearWishlist);
router.delete('/favorites', protect, clearWishlist);

// Lấy thông tin profile người dùng theo userId từ collection users (phải đặt cuối cùng)
router.get('/:userId', getProfile);

export default router;
