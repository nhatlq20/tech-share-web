import mongoose from 'mongoose';
import { EkycRequest } from '../models/EkycRequest.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { createAndSendNotification } from '../services/notificationService.js';

/**
 * Controller xử lý luồng eKYC từ phía người dùng (Renter / Member)
 */

/**
 * 1. POST /api/ekyc/submit
 * Gửi hồ sơ xác thực định danh CCCD (Ảnh 2 mặt + thông tin trích xuất từ profile)
 */
export const submitEkycRequest = async (req, res, next) => {
  try {
    const rawUserId = req.user?.userId || req.user?._id || req.user?.id;
    if (!rawUserId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để gửi đơn xác thực eKYC.',
      });
    }

    const userId = new mongoose.Types.ObjectId(String(rawUserId));
    const user = await User.findById(userId).populate('account');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ người dùng trong hệ thống.',
      });
    }

    // 0. Kiểm tra trong collection accounts: Nếu trường isVerified đã là true thì không cần/không cho eKYC nữa
    const account = user.account || (user.accountId ? await Account.findById(user.accountId) : null);
    if (account && account.isVerified === true) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn đã được xác thực eKYC thành công trong hệ thống (isVerified = true).',
      });
    }

    // 1. Kiểm tra địa chỉ: Bắt buộc phải có địa chỉ trước khi eKYC
    const userAddress = (user.address || '').trim();
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        requireAddress: true,
        message: 'Bạn chưa cập nhật địa chỉ trong hồ sơ. Vui lòng cập nhật địa chỉ trước khi xác thực eKYC.',
      });
    }

    // 2. Kiểm tra nếu đã được xác thực trong user profile
    if (user.trust?.isVerified || user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn đã được xác thực eKYC thành công trước đó.',
      });
    }

    // 3. Kiểm tra xem có đơn pending nào đang chờ duyệt không
    const pendingRequest = await EkycRequest.findOne({
      userId: user._id,
      status: 'pending',
    });

    if (pendingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đang có một yêu cầu xác thực eKYC đang chờ duyệt. Vui lòng chờ quản trị viên xử lý.',
        data: pendingRequest,
      });
    }

    // 4. Validate ảnh CCCD 2 mặt
    const { idCardFrontUrl, idCardBackUrl, idCardNumber } = req.body;

    if (!idCardFrontUrl || !idCardBackUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ hình ảnh CCCD 2 mặt (mặt trước và mặt sau).',
      });
    }

    // 5. Lưu hồ sơ eKYC vào collection ekyc_requests
    const newRequest = await EkycRequest.create({
      userId: user._id,
      fullName: user.name || '',
      email: user.email || user.account?.email || req.user?.email || '',
      phone: user.phone || '',
      address: userAddress,
      idCardNumber: (idCardNumber || '').trim(),
      idCardFrontUrl: idCardFrontUrl.trim(),
      idCardBackUrl: idCardBackUrl.trim(),
      status: 'pending',
      rejectReason: '',
      reviewedBy: null,
      reviewedAt: null,
    });

    // 6. Gửi thông báo xác nhận cho người dùng
    try {
      await createAndSendNotification({
        userId: user._id,
        type: 'system',
        title: 'Hồ sơ eKYC đã được tiếp nhận',
        message: 'Yêu cầu định danh CCCD của bạn đã gửi thành công và đang được quản trị viên xét duyệt.',
        data: {
          requestId: newRequest._id,
          status: 'pending',
        },
      });
    } catch (notifErr) {
      console.warn('⚠️ Lỗi gửi thông báo eKYC:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Gửi hồ sơ xác thực eKYC thành công! Quản trị viên sẽ xét duyệt trong thời gian sớm nhất.',
      data: newRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/ekyc/status
 * Lấy trạng thái eKYC hiện tại của người dùng đang đăng nhập
 */
export const getMyEkycStatus = async (req, res, next) => {
  try {
    const rawUserId = req.user?.userId || req.user?._id || req.user?.id;
    if (!rawUserId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập.',
      });
    }

    const userId = new mongoose.Types.ObjectId(String(rawUserId));
    const user = await User.findById(userId).populate('account');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ người dùng.',
      });
    }

    // Lấy yêu cầu eKYC mới nhất
    const latestRequest = await EkycRequest.findOne({ userId: user._id })
      .sort({ createdAt: -1 });

    const account = user.account || (user.accountId ? await Account.findById(user.accountId) : null);
    const accountIsVerified = Boolean(account && account.isVerified === true);
    const isVerified = Boolean(accountIsVerified || user.trust?.isVerified || user.isVerified);
    const hasAddress = Boolean(user.address && user.address.trim().length > 0);

    return res.json({
      success: true,
      data: {
        isVerified,
        accountIsVerified,
        hasAddress,
        profile: {
          name: user.name || '',
          email: user.email || user.account?.email || '',
          phone: user.phone || '',
          address: user.address || '',
          avatar: user.avatar || '',
        },
        request: latestRequest || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
