import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { sendOtpEmail } from '../services/emailService.js';
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
    }).select('+passwordHash');

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

    // Lấy thông tin chi tiết từ collection users qua accountId hoặc account.userId
    let user = null;
    if (account.userId) {
      user = await User.findById(account.userId).lean();
    }
    if (!user) {
      user = await User.findOne({ accountId: account._id }).lean();
    }
    if (!user && account.username) {
      user = await User.findOne({ username: account.username }).lean();
    }
    if (!user && account.email) {
      user = await User.findOne({ email: account.email }).lean();
    }

    // Tra cứu mã quyền thực tế từ collection roles nếu có
    let roleCode = user?.role;
    if (!roleCode && account.roleId) {
      try {
        const roleDoc = await mongoose.connection.db
          .collection('roles')
          .findOne({ _id: account.roleId });
        if (roleDoc) roleCode = roleDoc.code;
      } catch (err) {
        console.warn('Lỗi khi tra cứu role:', err.message);
      }
    }
    if (!roleCode) roleCode = 'renter';

    const finalUserId = user?._id || account.userId;

    const tokenPayload = {
      accountId: account._id,
      userId: finalUserId,
      username: account.username,
      email: account.email,
      role: roleCode,
    };

    const token = generateToken(tokenPayload);

    // Không trả về passwordHash cho client
    const safeAccount = {
      _id: account._id,
      username: account.username,
      email: account.email,
      roleId: account.roleId,
      userId: finalUserId,
      role: roleCode,
      isActive: account.isActive,
      createdAt: account.createdAt,
    };

    let safeUser = null;
    if (user) {
      const { passwordHash: _, ...restUser } = user;
      safeUser = {
        ...restUser,
        role: roleCode,
        email: account.email,
      };
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
    let account = null;
    if (user.accountId) {
      account = await Account.findById(user.accountId).select('-passwordHash').lean();
    }
    if (!account) {
      account = await Account.findOne({ userId: targetUserId })
        .select('-passwordHash')
        .lean();
    }

    const { passwordHash, ...safeUser } = user;
    if (account?.email && !safeUser.email) safeUser.email = account.email;

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

    let [user, account] = await Promise.all([
      userId ? User.findById(userId).lean() : null,
      accountId ? Account.findById(accountId).select('-passwordHash').lean() : null,
    ]);

    if (!user && account) {
      user = await User.findOne({ accountId: account._id }).lean();
    }
    if (!account && user?.accountId) {
      account = await Account.findById(user.accountId).select('-passwordHash').lean();
    }

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
      if (account?.email && !safeUser.email) safeUser.email = account.email;
      if (req.user?.role && !safeUser.role) safeUser.role = req.user.role;
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

/**
 * 5. POST /api/auth/register-init
 * Tiếp nhận thông tin đăng ký: username, name, phone, email, password
 * Kiểm tra trùng lặp trong DB và gửi mã OTP 6 số qua Gmail App Password
 */
export const registerInit = async (req, res) => {
  try {
    const { username, name, phone, email, password } = req.body;

    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Check required fields
    if (!cleanUsername || !cleanName || !cleanPhone || !cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields: username, full name, phone number, email, and password.',
      });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // 2. Check duplicates in accounts collection
    const existingAccount = await Account.findOne({
      $or: [
        { username: cleanUsername },
        { email: cleanEmail },
      ],
    }).lean();

    if (existingAccount) {
      if (existingAccount.username.toLowerCase() === cleanUsername) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another one.',
        });
      }
      if (existingAccount.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered. Please use another email or sign in.',
        });
      }
    }

    // 3. Check duplicates in users collection (email or phone)
    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        { phone: cleanPhone },
      ],
    }).lean();

    if (existingUser) {
      if (existingUser.email && existingUser.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered.',
        });
      }
      if (existingUser.phone && existingUser.phone === cleanPhone) {
        return res.status(400).json({
          success: false,
          message: 'This phone number is already registered to another account.',
        });
      }
    }

    // 4. Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Save or update OTP in otps collection (5-minute expiry)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await Otp.findOneAndUpdate(
      { email: cleanEmail, type: 'register' },
      {
        email: cleanEmail,
        otp: otpCode,
        type: 'register',
        payload: {
          username: cleanUsername,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          passwordHash,
        },
        expiresAt,
      },
      { upsert: true, new: true }
    );

    // 7. Send OTP via Gmail App Password
    await sendOtpEmail(cleanEmail, otpCode, cleanName);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      email: cleanEmail,
    });
  } catch (error) {
    console.error('Error in registerInit:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to send OTP verification code. Please check your email or try again later.',
      error: error.message,
    });
  }
};

/**
 * 6. POST /api/auth/register-verify-otp
 * Verify OTP code, create account in accounts collection first,
 * then create full profile in users collection with role 'renter'
 */
export const registerVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and 6-digit OTP code.',
      });
    }

    // 1. Verify OTP record in otps collection
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      type: 'register',
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Verification code does not exist or has expired. Please register again.',
      });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP code has expired (exceeded 5 minutes). Please request a new code.',
      });
    }

    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP code. Please check and try again.',
      });
    }

    const payload = otpRecord.payload;
    if (!payload || !payload.username || !payload.email || !payload.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration payload. Please start over.',
      });
    }

    // 2. Final duplicate check
    const doubleCheck = await Account.findOne({
      $or: [{ username: payload.username }, { email: payload.email }],
    });
    if (doubleCheck) {
      return res.status(400).json({
        success: false,
        message: 'This account has already been created. Please log in.',
      });
    }

    // 3. Find roleId for role 'renter'
    let roleId = null;
    try {
      const renterRole = await mongoose.connection.db
        .collection('roles')
        .findOne({ code: 'renter' });
      if (renterRole) {
        roleId = renterRole._id;
      }
    } catch (e) {
      console.warn('Cannot find renter role in roles collection:', e.message);
    }

    if (!roleId) {
      roleId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a888883');
    }

    // 4. Create ObjectIds for both collections
    const accountId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    // 5. Save to accounts collection
    const newAccount = new Account({
      _id: accountId,
      username: payload.username,
      email: payload.email,
      passwordHash: payload.passwordHash,
      roleId: roleId,
      userId: userId,
      isActive: true,
    });
    await newAccount.save();

    // 6. Save to users collection
    const newUser = new User({
      _id: userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: null,
      avatar: null,
      role: 'renter',
      isVerified: true,
      trustScore: 100,
      badges: [],
      referralCode: '',
      referredBy: null,
      wishlist: [],
      walletBalance: 0,
      walletEscrowBalance: 0,
      expoPushToken: '',
      pushTokens: [],
      fcmTokens: [],
      biometricEnabled: false,
      location: null,
      rating: 5,
      totalReviews: 0,
      isActive: true,
      accountId: accountId,
    });
    await newUser.save();

    // 7. Delete verified OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // 8. Generate JWT Token
    const token = generateToken({
      accountId: newAccount._id,
      userId: newUser._id,
      username: newAccount.username,
      email: newAccount.email,
      role: 'renter',
    });

    const safeAccount = {
      _id: newAccount._id,
      username: newAccount.username,
      email: newAccount.email,
      roleId: newAccount.roleId,
      userId: newAccount.userId,
      isActive: newAccount.isActive,
      createdAt: newAccount.createdAt,
    };

    const { passwordHash: _, ...safeUser } = newUser.toObject();

    return res.status(201).json({
      success: true,
      message: 'Congratulations! Your TechShare account has been successfully created.',
      token,
      account: safeAccount,
      user: safeUser,
    });
  } catch (error) {
    console.error('Error in registerVerifyOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'A server error occurred while activating your account.',
      error: error.message,
    });
  }
};

/**
 * 7. POST /api/auth/resend-otp
 * Resend a new OTP verification code
 */
export const resendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const otpRecord = await Otp.findOne({ email: cleanEmail, type: 'register' });
    if (!otpRecord || !otpRecord.payload) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email. Please fill out the registration form again.',
      });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpRecord.otp = newOtp;
    otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await otpRecord.save();

    await sendOtpEmail(cleanEmail, newOtp, otpRecord.payload.name || '');

    return res.status(200).json({
      success: true,
      message: `A new OTP code has been sent to ${cleanEmail}.`,
    });
  } catch (error) {
    console.error('Error in resendRegisterOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to resend OTP code. Please try again later.',
      error: error.message,
    });
  }
};

/**
 * 8. PATCH/PUT /api/users/profile or /api/auth/profile
 * Cập nhật thông tin profile của người dùng (địa chỉ, họ tên, số điện thoại)
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.',
      });
    }

    const { name, phone, address } = req.body;

    const updateFields = {};
    if (address !== undefined) {
      updateFields.address = (address || '').trim();
    }
    if (name !== undefined && name.trim()) {
      updateFields.name = name.trim();
    }
    if (phone !== undefined) {
      updateFields.phone = (phone || '').trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .select('-passwordHash')
      .lean();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating profile.',
      error: error.message,
    });
  }
};



