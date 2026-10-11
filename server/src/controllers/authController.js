import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { User } from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';

/**
 * Tạo JSON Web Token (JWT) cho tài khoản đã xác thực
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * 1. POST /api/auth/login
 * Đăng nhập qua collection `accounts`, sau đó lấy profile tương ứng từ collection `users`
 */
export const login = async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginKey = (identifier || email || username || '').trim();

    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu.',
      });
    }

    // Tìm tài khoản trong collection accounts (không phân biệt hoa thường)
    const account = await Account.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${loginKey}$`, 'i') } },
        { email: { $regex: new RegExp(`^${loginKey}$`, 'i') } },
      ],
    });

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập/email hoặc mật khẩu không chính xác.',
      });
    }

    if (!account.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đang bị khóa hoặc chưa được kích hoạt.',
      });
    }

    // So khớp mật khẩu với passwordHash trong account
    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập/email hoặc mật khẩu không chính xác.',
      });
    }

    // Lấy thông tin chi tiết từ collection users qua account.userId
    let user = null;
    if (account.userId) {
      user = await User.findById(account.userId).lean();
    }

    // Nếu không tìm thấy bằng userId, thử tìm bằng email trong collection users
    if (!user && account.email) {
      user = await User.findOne({ email: account.email }).lean();
    }

    const tokenPayload = {
      accountId: account._id,
      userId: user?._id || account.userId,
      username: account.username,
      email: account.email,
      role: user?.role || 'renter',
    };

    const token = generateToken(tokenPayload);

    // Không trả về passwordHash cho client
    const safeAccount = {
      _id: account._id,
      username: account.username,
      email: account.email,
      roleId: account.roleId,
      userId: account.userId,
      isActive: account.isActive,
      createdAt: account.createdAt,
    };

    let safeUser = null;
    if (user) {
      const { passwordHash, ...restUser } = user;
      safeUser = restUser;
    }

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      account: safeAccount,
      user: safeUser,
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng nhập.',
      error: error.message,
    });
  }
};

/**
 * 2. GET /api/auth/profile
 * GET /api/auth/profile/:userId
 * Load dữ liệu profile từ collection `users`
 */
export const getProfile = async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user?.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu định danh người dùng (userId).',
      });
    }

    // Truy vấn collection users
    const user = await User.findById(targetUserId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng trong hệ thống.',
      });
    }

    // Lấy thông tin tài khoản tương ứng trong collection accounts
    const account = await Account.findOne({ userId: targetUserId })
      .select('-passwordHash')
      .lean();

    const { passwordHash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      user: safeUser,
      account: account || null,
    });
  } catch (error) {
    console.error('Lỗi khi tải profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin profile người dùng.',
      error: error.message,
    });
  }
};

/**
 * 3. GET /api/auth/me
 * Trả về thông tin của tài khoản và user hiện tại từ token đã xác thực
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const accountId = req.user?.accountId;

    const [user, account] = await Promise.all([
      userId ? User.findById(userId).lean() : null,
      accountId ? Account.findById(accountId).select('-passwordHash').lean() : null,
    ]);

    if (!user && !account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tài khoản hiện tại.',
      });
    }

    let safeUser = null;
    if (user) {
      const { passwordHash, ...rest } = user;
      safeUser = rest;
    }

    return res.status(200).json({
      success: true,
      user: safeUser,
      account: account || null,
    });
  } catch (error) {
    console.error('Lỗi getCurrentUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy thông tin người dùng hiện tại.',
      error: error.message,
    });
  }
};

/**
 * 4. POST /api/users/avatar hoặc PATCH /api/users/avatar
 * Cập nhật ảnh đại diện người dùng – upload lên Cloudinary, lưu vào DB
 *
 * Body: { image: "<base64 data URI>" } hoặc { avatarUrl: "<URL công khai>" }
 */
export const updateAvatar = async (req, res) => {
  try {
    const userId = req.user?.userId || req.body?.userId;
    const { image, avatarUrl } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
      });
    }

    if (!image && !avatarUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp file ảnh đại diện (base64) hoặc URL ảnh.',
      });
    }

    // Lấy thông tin người dùng hiện tại để có avatar cũ (nếu cần xoá sau)
    const currentUser = await User.findById(userId).select('avatar').lean();
    const oldAvatarUrl = currentUser?.avatar || null;

    let finalAvatarUrl = avatarUrl;
    let newPublicId = null;

    // Nếu gửi dữ liệu ảnh dạng base64 data URI → upload lên Cloudinary
    if (image) {
      const uploadRes = await uploadToCloudinary(image, 'techshare/avatars');
      finalAvatarUrl = uploadRes.url;
      newPublicId = uploadRes.publicId;
    }

    // Cập nhật trường avatar trong collection users
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: finalAvatarUrl },
      { new: true }
    )
      .select('-passwordHash')
      .lean();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ người dùng trong hệ thống.',
      });
    }

    // Sau khi đã lưu DB thành công → xoá ảnh cũ trên Cloudinary (nếu khác ảnh mới và có publicId)
    // Chỉ xoá nếu ảnh cũ là URL Cloudinary (tránh xoá avatar placeholder bên ngoài)
    if (
      newPublicId &&
      oldAvatarUrl &&
      oldAvatarUrl !== finalAvatarUrl &&
      oldAvatarUrl.includes('cloudinary.com')
    ) {
      try {
        // Trích xuất publicId từ URL Cloudinary cũ
        const urlParts = oldAvatarUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex !== -1) {
          // Bỏ version (v1234...) nếu có
          const afterUpload = urlParts.slice(uploadIndex + 1);
          if (/^v\d+$/.test(afterUpload[0])) afterUpload.shift();
          const oldPublicId = afterUpload.join('/').replace(/\.[^.]+$/, '');
          await deleteFromCloudinary(oldPublicId);
        }
      } catch (deleteErr) {
        // Lỗi xoá ảnh cũ không làm gián đoạn phản hồi
        console.warn('[Cloudinary] Không thể xoá ảnh cũ:', deleteErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện lên Cloudinary thành công!',
      avatar: finalAvatarUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Lỗi updateAvatar:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải ảnh đại diện lên Cloudinary.',
    });
  }
};

