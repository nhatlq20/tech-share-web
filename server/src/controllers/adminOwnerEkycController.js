import mongoose from 'mongoose';
import { OwnerEkycRequest } from '../models/OwnerEkycRequest.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { Role } from '../models/Role.js';
import { createAndSendNotification } from '../services/notificationService.js';

/**
 * Controller chuyên biệt xử lý xét duyệt hồ sơ eKYC nâng cấp Owner phía Quản trị viên (Admin)
 */

/**
 * 1. GET /api/admin/owner-ekyc
 * Danh sách hồ sơ xét duyệt nâng cấp Owner từ collection owner_request
 */
export const listOwnerEkycRequests = async ({ status, limit = 100, page = 1 }) => {
  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
  const skip = (pageNum - 1) * limitNum;

  const [total, rawRequests] = await Promise.all([
    OwnerEkycRequest.countDocuments(query),
    OwnerEkycRequest.find(query)
      .populate({
        path: 'userId',
        select: 'name email phone address avatar trust isVerified role',
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

  // Chuẩn hóa dữ liệu trả về cho giao diện Admin (bao gồm cả 3 ảnh)
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
      idCardHoldingUrl: r.idCardHoldingUrl || '', // 3rd image: Ảnh chân dung cầm CCCD
      status: r.status || 'pending',
      rejectReason: r.rejectReason || '',
      reviewedBy: r.reviewedBy || null,
      reviewedAt: r.reviewedAt || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      userTrust: u.trust || null,
      userRole: u.role || 'renter',
    };
  });

  return { count: formatted.length, total, data: formatted, page: pageNum, limit: limitNum };
};

export const getAdminOwnerEkycList = async (req, res, next) => {
  try {
    const { count, total, data } = await listOwnerEkycRequests(req.query);
    return res.json({ success: true, count, total, data });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PATCH /api/admin/owner-ekyc/:id/approve
 * Phê duyệt hồ sơ eKYC Owner: Chuyển quyền tài khoản từ Renter sang Owner
 */
export const approveAdminOwnerEkyc = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã hồ sơ nâng cấp Owner không hợp lệ.',
      });
    }

    const request = await OwnerEkycRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ nâng cấp Owner yêu cầu.',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Hồ sơ này đã được ${request.status === 'approved' ? 'phê duyệt' : 'từ chối'} trước đó và không thể chỉnh sửa.`,
      });
    }

    const adminId = req.user?.userId || req.user?._id;

    // 1. Cập nhật trạng thái hồ sơ Owner eKYC
    request.status = 'approved';
    request.rejectReason = '';
    request.reviewedBy = adminId ? new mongoose.Types.ObjectId(String(adminId)) : null;
    request.reviewedAt = new Date();
    await request.save();

    // 2. Tìm role 'owner' trong collection roles
    let ownerRole = await Role.findOne({ code: 'owner' });
    if (!ownerRole) {
      const roleDoc = await mongoose.connection.db.collection('roles').findOne({ code: 'owner' });
      if (roleDoc) ownerRole = roleDoc;
    }

    // 3. Cập nhật hồ sơ User và Account thành Owner
    if (request.userId) {
      const user = await User.findById(request.userId);
      if (user) {
        user.trust = user.trust || {};
        user.trust.isVerified = true;
        user.isVerified = true;

        const currentBadges = Array.isArray(user.trust.badges) ? user.trust.badges : [];
        if (!currentBadges.includes('Owner Verified')) {
          user.trust.badges = [...currentBadges, 'Owner Verified'];
        }

        // Tăng điểm tín nhiệm (+15 điểm, tối đa 100)
        user.trust.score = Math.min(100, (user.trust.score || 80) + 15);
        user.role = 'owner';
        await user.save();

        const accountUpdate = { isVerified: true };
        if (ownerRole?._id) accountUpdate.roleId = ownerRole._id;
        if (user.accountId) {
          await Account.findByIdAndUpdate(user.accountId, accountUpdate);
        } else {
          await Account.findOneAndUpdate({ userId: user._id }, accountUpdate);
        }

        try {
          const db = mongoose.connection.db;
          if (db) {
            await db.collection('users').updateOne(
              { _id: user._id },
              { $set: { role: 'owner', isVerified: true, 'trust.isVerified': true } }
            );
            const accFilter = user.accountId ? { _id: user.accountId } : { userId: user._id };
            await db.collection('accounts').updateOne(accFilter, { $set: accountUpdate });
          }
        } catch {}
      }

      // 4. Gửi thông báo chúc mừng nâng cấp thành công cho người dùng
      try {
        await createAndSendNotification({
          userId: request.userId,
          type: 'system',
          title: 'Chúc mừng! Bạn đã trở thành Chủ thiết bị (Owner) 🎉',
          message:
            'Hồ sơ xác thực CCCD kèm chân dung của bạn đã được phê duyệt! Giờ đây bạn có toàn quyền đăng thiết bị và quản lý cho thuê trên TechShare.',
          data: {
            requestId: request._id,
            type: 'owner_ekyc',
            status: 'approved',
            newRole: 'owner',
          },
        });
      } catch (notifErr) {
        console.warn('⚠️ Lỗi gửi thông báo phê duyệt nâng cấp Owner:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Đã phê duyệt hồ sơ và nâng cấp quyền thành Chủ thiết bị (Owner) thành công.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PATCH /api/admin/owner-ekyc/:id/reject
 * Từ chối hồ sơ nâng cấp Owner kèm lý do
 */
export const rejectAdminOwnerEkyc = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã hồ sơ nâng cấp Owner không hợp lệ.',
      });
    }

    const request = await OwnerEkycRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ nâng cấp Owner yêu cầu.',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Hồ sơ này đã được ${request.status === 'approved' ? 'phê duyệt' : 'từ chối'} trước đó và không thể chỉnh sửa.`,
      });
    }

    const adminId = req.user?.userId || req.user?._id;
    const finalReason =
      (reason || '').trim() ||
      'Ảnh chân dung cầm CCCD chưa rõ nét, bị che khuất hoặc thông tin không trùng khớp.';

    // 1. Cập nhật trạng thái hồ sơ Owner eKYC
    request.status = 'rejected';
    request.rejectReason = finalReason;
    request.reviewedBy = adminId ? new mongoose.Types.ObjectId(String(adminId)) : null;
    request.reviewedAt = new Date();
    await request.save();

    // 2. Gửi thông báo từ chối kèm lý do cho người dùng
    if (request.userId) {
      try {
        await createAndSendNotification({
          userId: request.userId,
          type: 'system',
          title: 'Hồ sơ nâng cấp Owner chưa được chấp thuận',
          message: `Yêu cầu nâng cấp Chủ thiết bị (Owner) của bạn chưa được duyệt. Lý do: "${finalReason}". Bạn có thể kiểm tra và gửi lại ảnh mới trong trang cá nhân.`,
          data: {
            requestId: request._id,
            type: 'owner_ekyc',
            status: 'rejected',
            rejectReason: finalReason,
          },
        });
      } catch (notifErr) {
        console.warn('⚠️ Lỗi gửi thông báo từ chối nâng cấp Owner:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Đã từ chối hồ sơ nâng cấp Owner và gửi thông báo phản hồi cho người dùng.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

