import mongoose from 'mongoose';
import { EkycRequest } from '../models/EkycRequest.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { createAndSendNotification } from '../services/notificationService.js';

/**
 * Controller chuyên biệt xử lý xét duyệt hồ sơ eKYC phía Quản trị viên (Admin)
 */

/**
 * 1. GET /api/admin/ekyc hoặc /api/admin/ekyc-requests
 * Danh sách hồ sơ xét duyệt định danh eKYC từ collection ekyc_requests
 */
export const getAdminEkycList = async (req, res, next) => {
  try {
    const { status, limit = 100, page = 1 } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [total, rawRequests] = await Promise.all([
      EkycRequest.countDocuments(query),
      EkycRequest.find(query)
        .populate({
          path: 'userId',
          select: 'name email phone address avatar trust isVerified',
        })
        .populate({
          path: 'reviewedBy',
          select: 'name email',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    // Chuẩn hóa dữ liệu trả về cho giao diện Admin
    const formatted = rawRequests.map((r) => {
      const u = r.userId && typeof r.userId === 'object' ? r.userId : {};
      return {
        _id: r._id,
        id: r._id,
        userId: u._id || r.userId,
        fullName: r.fullName || u.name || 'Người dùng TechShare',
        name: r.fullName || u.name || 'Người dùng TechShare',
        email: r.email || u.email || '',
        phone: r.phone || u.phone || '',
        address: r.address || u.address || 'Chưa cập nhật',
        avatar: u.avatar || '',
        idCardNumber: r.idCardNumber || '',
        idCardFrontUrl: r.idCardFrontUrl || '',
        idCardBackUrl: r.idCardBackUrl || '',
        status: r.status || 'pending',
        rejectReason: r.rejectReason || '',
        reviewedBy: r.reviewedBy || null,
        reviewedAt: r.reviewedAt || null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        userTrust: u.trust || null,
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      total,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PATCH /api/admin/ekyc/:id/approve
 * Phê duyệt hồ sơ eKYC: Cấp Tích xanh & tăng Trust Score cho User
 */
export const approveAdminEkyc = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã hồ sơ eKYC không hợp lệ.',
      });
    }

    const request = await EkycRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ eKYC yêu cầu.',
      });
    }

    const adminId = req.user?.userId || req.user?._id;

    // 1. Cập nhật trạng thái hồ sơ eKYC
    request.status = 'approved';
    request.rejectReason = '';
    request.reviewedBy = adminId ? new mongoose.Types.ObjectId(String(adminId)) : null;
    request.reviewedAt = new Date();
    await request.save();

    // 2. Cập nhật hồ sơ người dùng (Cấp tích xanh, tăng điểm tín nhiệm)
    if (request.userId) {
      const user = await User.findById(request.userId);
      if (user) {
        user.trust = user.trust || {};
        user.trust.isVerified = true;
        user.isVerified = true;

        const currentBadges = Array.isArray(user.trust.badges) ? user.trust.badges : [];
        if (!currentBadges.includes('eKYC Verified')) {
          user.trust.badges = [...currentBadges, 'eKYC Verified'];
        }

        // Tăng điểm tín nhiệm (+20 điểm, tối đa 100)
        user.trust.score = Math.min(100, (user.trust.score || 80) + 20);
        await user.save();

        // Cập nhật trường isVerified = true trong collection accounts
        if (user.accountId) {
          await Account.findByIdAndUpdate(user.accountId, { isVerified: true });
        }
      }

      // 3. Gửi thông báo thông báo cho người dùng
      try {
        await createAndSendNotification({
          userId: request.userId,
          type: 'system',
          title: 'Hồ sơ eKYC đã được phê duyệt! 🎉',
          message: 'Chúc mừng bạn! Hồ sơ xác thực định danh CCCD đã được phê duyệt. Bạn đã nhận Tích Xanh eKYC và có thể thuê mọi thiết bị trên TechShare.',
          data: {
            requestId: request._id,
            status: 'approved',
          },
        });
      } catch (notifErr) {
        console.warn('⚠️ Lỗi gửi thông báo phê duyệt eKYC:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Đã phê duyệt hồ sơ eKYC thành công và cấp tích xanh cho người dùng.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PATCH /api/admin/ekyc/:id/reject
 * Từ chối hồ sơ eKYC kèm lý do
 */
export const rejectAdminEkyc = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã hồ sơ eKYC không hợp lệ.',
      });
    }

    const request = await EkycRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ eKYC yêu cầu.',
      });
    }

    const adminId = req.user?.userId || req.user?._id;
    const finalReason = (reason || '').trim() || 'Hình ảnh CCCD không rõ nét hoặc thông tin không trùng khớp.';

    // 1. Cập nhật hồ sơ eKYC
    request.status = 'rejected';
    request.rejectReason = finalReason;
    request.reviewedBy = adminId ? new mongoose.Types.ObjectId(String(adminId)) : null;
    request.reviewedAt = new Date();
    await request.save();

    // 2. Cập nhật hồ sơ User
    if (request.userId) {
      const user = await User.findById(request.userId);
      if (user) {
        user.trust = user.trust || {};
        user.trust.isVerified = false;
        user.isVerified = false;
        await user.save();

        if (user.accountId) {
          await Account.findByIdAndUpdate(user.accountId, { isVerified: false });
        }
      }

      // 3. Gửi thông báo lý do từ chối cho người dùng
      try {
        await createAndSendNotification({
          userId: request.userId,
          type: 'system',
          title: 'Hồ sơ eKYC chưa được chấp thuận',
          message: `Hồ sơ xác thực CCCD của bạn chưa được duyệt. Lý do: "${finalReason}". Vui lòng kiểm tra và gửi lại ảnh mới trong trang cá nhân.`,
          data: {
            requestId: request._id,
            status: 'rejected',
            rejectReason: finalReason,
          },
        });
      } catch (notifErr) {
        console.warn('⚠️ Lỗi gửi thông báo từ chối eKYC:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Đã từ chối hồ sơ eKYC và gửi phản hồi cho người dùng.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};
