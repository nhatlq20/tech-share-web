import mongoose from 'mongoose';
import { OwnerEkycRequest } from '../models/OwnerEkycRequest.js';
import { EkycRequest } from '../models/EkycRequest.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { Role } from '../models/Role.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { recordAdminNotification } from '../services/adminNotificationService.js';

/**
 * Controller xử lý luồng eKYC Nâng cấp từ Renter lên Owner
 * Yêu cầu: Đã hoàn tất eKYC thuê thiết bị (CCCD 2 mặt) trước đó,
 * sau đó nộp hồ sơ gồm 3 ảnh: CCCD Mặt trước, Mặt sau và Ảnh chân dung cầm CCCD.
 */

/**
 * Helper kiểm tra role hiện tại của user/account
 */
const checkIsOwner = async (account, user) => {
  if (user?.role === 'owner' || user?.role === 'both') return true;
  if (account?.roleId) {
    if (typeof account.roleId === 'object' && account.roleId?.code) {
      return account.roleId.code === 'owner' || account.roleId.code === 'both';
    }
    try {
      const rawRoleId = account.roleId._id || account.roleId;
      const roleDoc =
        (await Role.findById(rawRoleId).lean()) ||
        (await mongoose.connection.db.collection('roles').findOne({
          _id: mongoose.Types.ObjectId.isValid(rawRoleId)
            ? new mongoose.Types.ObjectId(rawRoleId)
            : rawRoleId,
        }));
      if (roleDoc?.code === 'owner' || roleDoc?.code === 'both') return true;
    } catch {
      // ignore
    }
  }
  return false;
};

/**
 * 1. POST /api/owner-ekyc/submit
 * Gửi hồ sơ nâng cấp thành Owner (3 ảnh: CCCD 2 mặt + Ảnh chân dung cầm CCCD)
 */
export const submitOwnerEkycRequest = async (req, res, next) => {
  try {
    const rawUserId = req.user?.userId || req.user?._id || req.user?.id;
    if (!rawUserId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để gửi đơn nâng cấp Owner.',
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

    const account = user.account || (user.accountId ? await Account.findById(user.accountId) : null);

    // 1. Kiểm tra điều kiện tiên quyết: Phải đã xác thực eKYC người thuê (Tier 3)
    const isAccountVerified = Boolean(account && account.isVerified === true);
    const isUserVerified = Boolean(user.trust?.isVerified || user.isVerified);
    const hasCompletedRenterEkyc = isAccountVerified || isUserVerified;

    if (!hasCompletedRenterEkyc) {
      return res.status(400).json({
        success: false,
        requireRenterEkyc: true,
        message:
          'Bạn cần hoàn tất xác thực eKYC người thuê (CCCD 2 mặt) trước khi đăng ký nâng cấp thành Chủ thiết bị (Owner).',
      });
    }

    // 2. Kiểm tra nếu đã là Owner
    const isAlreadyOwner = await checkIsOwner(account, user);
    if (isAlreadyOwner) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn đã là Chủ thiết bị (Owner) trong hệ thống.',
      });
    }

    // 3. Kiểm tra địa chỉ: Bắt buộc phải có địa chỉ
    const userAddress = (user.address || '').trim();
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        requireAddress: true,
        message: 'Bạn chưa cập nhật địa chỉ trong hồ sơ. Vui lòng cập nhật địa chỉ trước khi xác thực nâng cấp Owner.',
      });
    }

    // 4. Kiểm tra xem có đơn pending nào đang chờ duyệt không
    const pendingRequest = await OwnerEkycRequest.findOne({
      userId: user._id,
      status: 'pending',
    });

    if (pendingRequest) {
      return res.status(400).json({
        success: false,
        message:
          'Bạn đang có một yêu cầu nâng cấp Owner đang chờ duyệt. Vui lòng chờ quản trị viên xử lý.',
        data: pendingRequest,
      });
    }

    // 5. Validate 3 ảnh bắt buộc: Mặt trước, Mặt sau, Chân dung cầm CCCD
    const { idCardFrontUrl, idCardBackUrl, idCardHoldingUrl, idCardNumber } = req.body;

    if (!idCardFrontUrl || !idCardBackUrl || !idCardHoldingUrl) {
      return res.status(400).json({
        success: false,
        message:
          'Vui lòng cung cấp đầy đủ 3 ảnh: CCCD mặt trước, CCCD mặt sau và ảnh chân dung cầm CCCD rõ nét.',
      });
    }

    // 6. Lưu hồ sơ eKYC nâng cấp Owner vào collection owner_request
    const newRequest = await OwnerEkycRequest.create({
      userId: user._id,
      fullName: user.name || '',
      email: user.email || user.account?.email || req.user?.email || '',
      phone: user.phone || '',
      address: userAddress,
      idCardNumber: (idCardNumber || '').trim(),
      idCardFrontUrl: idCardFrontUrl.trim(),
      idCardBackUrl: idCardBackUrl.trim(),
      idCardHoldingUrl: idCardHoldingUrl.trim(),
      status: 'pending',
      rejectReason: '',
      reviewedBy: null,
      reviewedAt: null,
    });

    await recordAdminNotification('owner-verification', newRequest._id, newRequest.createdAt);

    // 7. Gửi thông báo xác nhận cho người dùng
    try {
      await createAndSendNotification({
        userId: user._id,
        type: 'system',
        title: 'Hồ sơ nâng cấp Owner đã được tiếp nhận',
        message:
          'Yêu cầu nâng cấp thành Chủ thiết bị (Owner) của bạn đã được gửi thành công và đang được quản trị viên xét duyệt.',
        data: {
          requestId: newRequest._id,
          type: 'owner_ekyc',
          status: 'pending',
        },
      });
    } catch (notifErr) {
      console.warn('⚠️ Lỗi gửi thông báo owner eKYC:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message:
        'Gửi hồ sơ nâng cấp Chủ thiết bị (Owner) thành công! Quản trị viên sẽ xét duyệt trong thời gian sớm nhất.',
      data: newRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/owner-ekyc/status
 * Lấy trạng thái eKYC nâng cấp Owner hiện tại của người dùng đang đăng nhập
 */
export const getMyOwnerEkycStatus = async (req, res, next) => {
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

    const account = user.account || (user.accountId ? await Account.findById(user.accountId) : null);
    const isAccountVerified = Boolean(account && account.isVerified === true);
    const isRenterVerified = Boolean(isAccountVerified || user.trust?.isVerified || user.isVerified);
    const isOwner = await checkIsOwner(account, user);
    const hasAddress = Boolean(user.address && user.address.trim().length > 0);

    // Lấy yêu cầu nâng cấp Owner mới nhất
    const latestOwnerRequest = await OwnerEkycRequest.findOne({ userId: user._id }).sort({
      createdAt: -1,
    });

    // Lấy thông tin eKYC người thuê cũ (nếu có) để tiện điền trước số CCCD & 2 mặt
    const latestRenterEkyc = await EkycRequest.findOne({
      userId: user._id,
      status: 'approved',
    }).sort({ createdAt: -1 });

    const canUpgradeToOwner = isRenterVerified && !isOwner;

    return res.json({
      success: true,
      data: {
        isRenterVerified,
        isOwner,
        hasAddress,
        canUpgradeToOwner,
        profile: {
          name: user.name || '',
          email: user.email || user.account?.email || '',
          phone: user.phone || '',
          address: user.address || '',
          avatar: user.avatar || '',
        },
        request: latestOwnerRequest || null,
        renterEkyc: latestRenterEkyc
          ? {
              idCardFrontUrl: latestRenterEkyc.idCardFrontUrl,
              idCardBackUrl: latestRenterEkyc.idCardBackUrl,
              idCardNumber: latestRenterEkyc.idCardNumber,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

