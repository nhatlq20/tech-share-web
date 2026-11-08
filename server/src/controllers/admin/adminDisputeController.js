import mongoose from 'mongoose';
import Dispute from '../../models/Dispute.js';
import Booking from '../../models/Booking.js';
import User from '../../models/User.js';
import WalletTransaction from '../../models/WalletTransaction.js';
import Notification from '../../models/Notification.js';
import { logAdminAction } from '../../utils/auditLogger.js';

/**
 * MODULE 2: DISPUTE RESOLUTION CONTROLLER
 */

/**
 * 1. GET /api/admin/disputes
 * Danh sách khiếu nại tranh chấp với bộ lọc và tìm kiếm
 */
export const getAdminDisputes = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    let disputes;
    let total;

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');

      const pipeline = [
        {
          $lookup: {
            from: 'bookings',
            localField: 'bookingId',
            foreignField: '_id',
            as: 'booking',
          },
        },
        { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'raisedBy',
            foreignField: '_id',
            as: 'claimant',
          },
        },
        { $unwind: { path: '$claimant', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            ...query,
            $or: [
              { reason: regex },
              { 'booking.bookingCode': regex },
              { 'claimant.name': regex },
              { 'claimant.email': regex },
            ],
          },
        },
      ];

      const countRes = await Dispute.aggregate([...pipeline, { $count: 'total' }]);
      total = countRes[0]?.total || 0;

      disputes = await Dispute.aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
    } else {
      total = await Dispute.countDocuments(query);
      disputes = await Dispute.find(query)
        .populate({
          path: 'bookingId',
          select: 'bookingCode status paymentStatus pricing startDate endDate deviceId renterId ownerId handover',
          populate: [
            { path: 'deviceId', select: 'name images pricePerDay depositAmount' },
            { path: 'renterId', select: 'name email phone avatar' },
            { path: 'ownerId', select: 'name email phone avatar' },
          ],
        })
        .populate('raisedBy', 'name email phone avatar role')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      disputes = disputes.map((d) => ({
        ...d,
        booking: d.bookingId,
        claimant: d.raisedBy,
      }));
    }

    return res.json({
      success: true,
      data: disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/admin/disputes/:id
 * Chi tiết một khiếu nại tranh chấp
 */
export const getAdminDisputeDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID tranh chấp không hợp lệ.' });
    }

    const dispute = await Dispute.findById(id)
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'deviceId', select: 'name brand category condition images pricePerDay depositAmount' },
          { path: 'renterId', select: 'name email phone avatar wallet' },
          { path: 'ownerId', select: 'name email phone avatar wallet' },
        ],
      })
      .populate('raisedBy', 'name email phone avatar role')
      .populate('resolvedBy', 'name email')
      .lean();

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại tranh chấp.' });
    }

    return res.json({
      success: true,
      data: {
        ...dispute,
        booking: dispute.bookingId,
        claimant: dispute.raisedBy,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. PATCH /api/admin/disputes/:id/review
 * Đưa tranh chấp vào trạng thái xem xét (in_review)
 */
export const reviewAdminDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID tranh chấp không hợp lệ.' });
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại tranh chấp.' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'dismissed') {
      return res.status(400).json({
        success: false,
        message: 'Tranh chấp đã được xử lý xong, không thể đưa về trạng thái xem xét.',
      });
    }

    dispute.status = 'in_review';
    if (adminNote) {
      dispute.adminNote = (dispute.adminNote ? `${dispute.adminNote}\n` : '') + `[Xem xét]: ${adminNote.trim()}`;
    }
    await dispute.save();

    await logAdminAction({
      req,
      action: 'DISPUTE_REVIEW',
      targetType: 'dispute',
      targetId: id,
      details: { adminNote },
    });

    return res.json({
      success: true,
      message: 'Tranh chấp đã chuyển sang trạng thái đang xem xét.',
      data: dispute,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. PATCH /api/admin/disputes/:id/resolve
 * Quyết định phân xử tranh chấp tiền cọc an toàn
 */
export const resolveAdminDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, deductAmount = 0, adminNote = '' } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID tranh chấp không hợp lệ.' });
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tranh chấp.' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'dismissed') {
      return res.status(400).json({
        success: false,
        message: 'Tranh chấp này đã được phân xử trước đó, không thể phân xử lần 2.',
      });
    }

    const validDecisions = ['full_refund', 'partial_deduct', 'full_deduct'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Quyết định không hợp lệ. Cho phép: ${validDecisions.join(', ')}`,
      });
    }

    const rawBookingId = dispute.bookingId?._id || dispute.bookingId;
    const booking = await Booking.findById(rawBookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê liên quan.' });
    }

    const heldDeposit = Math.round(Number(booking.pricing?.deposit || 0));
    let finalDeduct = 0;

    if (decision === 'full_refund') {
      finalDeduct = 0;
    } else if (decision === 'full_deduct') {
      finalDeduct = heldDeposit;
    } else if (decision === 'partial_deduct') {
      finalDeduct = Math.round(Number(deductAmount));
      if (isNaN(finalDeduct) || finalDeduct < 0) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền khấu trừ không được âm.',
        });
      }
      if (finalDeduct > heldDeposit) {
        return res.status(400).json({
          success: false,
          message: `Số tiền khấu trừ (${finalDeduct.toLocaleString()}₫) vượt quá tiền cọc thực tế (${heldDeposit.toLocaleString()}₫).`,
        });
      }
    }

    const refundAmount = heldDeposit - finalDeduct;
    const renterId = booking.renterId?._id || booking.renterId;
    const ownerId = booking.ownerId?._id || booking.ownerId;
    const adminUserId = req.user.userId || req.user._id || req.user.id;

    // Cập nhật số dư ví tài khoản
    // 1. Hoàn tiền cọc dư cho người thuê (Renter)
    if (refundAmount > 0) {
      const renter = await User.findById(renterId);
      if (renter) {
        const currentBalance = renter.wallet?.balance || 0;
        const currentEscrow = renter.wallet?.escrowBalance || 0;
        const newBalance = currentBalance + refundAmount;
        const newEscrow = Math.max(0, currentEscrow - heldDeposit);

        await User.findByIdAndUpdate(renterId, {
          $set: {
            'wallet.balance': newBalance,
            'wallet.escrowBalance': newEscrow,
          },
        });

        await WalletTransaction.create({
          userId: renterId,
          type: 'deposit_refund',
          amount: refundAmount,
          balanceAfter: newBalance,
          relatedBookingId: booking._id,
          status: 'success',
        });
      }
    }

    // 2. Chuyển tiền bồi thường khấu trừ cho chủ máy (Owner)
    if (finalDeduct > 0) {
      const owner = await User.findById(ownerId);
      if (owner) {
        const currentBalance = owner.wallet?.balance || 0;
        const newBalance = currentBalance + finalDeduct;

        await User.findByIdAndUpdate(ownerId, {
          $set: {
            'wallet.balance': newBalance,
          },
        });

        await WalletTransaction.create({
          userId: ownerId,
          type: 'rental_payout',
          amount: finalDeduct,
          balanceAfter: newBalance,
          relatedBookingId: booking._id,
          status: 'success',
        });
      }
    }

    // 3. Cập nhật trạng thái Dispute
    dispute.status = 'resolved';
    dispute.adminDecision = decision;
    dispute.finalDeductAmount = finalDeduct;
    dispute.adminNote = (dispute.adminNote ? `${dispute.adminNote}\n` : '') + `[Quyết định]: ${adminNote.trim()}`;
    dispute.resolvedBy = adminUserId ? new mongoose.Types.ObjectId(String(adminUserId)) : null;
    dispute.resolvedAt = new Date();
    await dispute.save();

    // 4. Cập nhật Booking
    booking.status = 'completed';
    booking.paymentStatus = 'paid';
    booking.timeline = booking.timeline || [];
    booking.timeline.push({
      status: 'completed',
      title: 'Tranh chấp đã được xử lý bởi Quản trị viên',
      description: `Khấu trừ ${finalDeduct.toLocaleString()}₫, hoàn lại ${refundAmount.toLocaleString()}₫`,
      timestamp: new Date(),
    });
    if (typeof booking.save === 'function') {
      await booking.save();
    }

    // 5. Gửi thông báo cho hai bên
    if (renterId) {
      await Notification.create({
        userId: renterId,
        type: 'booking',
        title: `Tranh chấp đơn #${booking.bookingCode} đã có kết quả`,
        body: `Quản trị viên đã xử lý: Bạn được hoàn cọc ${refundAmount.toLocaleString()}₫ và khấu trừ bồi thường ${finalDeduct.toLocaleString()}₫.`,
        relatedId: booking._id.toString(),
        url: `/my-bookings/${booking._id}`,
      }).catch(() => {});
    }

    if (ownerId) {
      await Notification.create({
        userId: ownerId,
        type: 'booking',
        title: `Tranh chấp đơn #${booking.bookingCode} đã được phân xử`,
        body: `Bạn được bồi thường ${finalDeduct.toLocaleString()}₫ từ tiền cọc của người thuê.`,
        relatedId: booking._id.toString(),
        url: `/owner/bookings`,
      }).catch(() => {});
    }

    // 6. Ghi Audit Log
    await logAdminAction({
      req,
      action: 'DISPUTE_RESOLVE',
      targetType: 'dispute',
      targetId: id,
      details: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        decision,
        heldDeposit,
        finalDeduct,
        refundAmount,
        adminNote,
      },
    });

    return res.json({
      success: true,
      message: 'Phân xử tranh chấp thành công. Số dư ví các bên đã được cập nhật chính xác.',
      data: dispute,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. PATCH /api/admin/disputes/:id/dismiss
 * Bác bỏ yêu cầu bồi thường không hợp lệ
 */
export const dismissAdminDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNote = 'Bác bỏ khiếu nại do không đủ căn cứ bằng chứng.' } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID tranh chấp không hợp lệ.' });
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tranh chấp.' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'dismissed') {
      return res.status(400).json({
        success: false,
        message: 'Tranh chấp này đã hoàn tất, không thể thay đổi.',
      });
    }

    const rawBookingId = dispute.bookingId?._id || dispute.bookingId;
    const booking = await Booking.findById(rawBookingId);
    const adminUserId = req.user.userId || req.user._id || req.user.id;

    dispute.status = 'dismissed';
    dispute.adminDecision = 'dismiss';
    dispute.finalDeductAmount = 0;
    dispute.adminNote = (dispute.adminNote ? `${dispute.adminNote}\n` : '') + `[Bác bỏ]: ${adminNote.trim()}`;
    dispute.resolvedBy = adminUserId ? new mongoose.Types.ObjectId(String(adminUserId)) : null;
    dispute.resolvedAt = new Date();
    await dispute.save();

    // Nếu đơn chưa hoàn tất, hoàn trả cọc đầy đủ cho người thuê
    if (booking) {
      const heldDeposit = Math.round(Number(booking.pricing?.deposit || 0));
      const renterId = booking.renterId?._id || booking.renterId;
      if (heldDeposit > 0 && renterId) {
        const renter = await User.findById(renterId);
        if (renter) {
          const currentBalance = renter.wallet?.balance || 0;
          const currentEscrow = renter.wallet?.escrowBalance || 0;
          const newBalance = currentBalance + heldDeposit;
          const newEscrow = Math.max(0, currentEscrow - heldDeposit);

          await User.findByIdAndUpdate(renterId, {
            $set: {
              'wallet.balance': newBalance,
              'wallet.escrowBalance': newEscrow,
            },
          });

          await WalletTransaction.create({
            userId: renterId,
            type: 'deposit_refund',
            amount: heldDeposit,
            balanceAfter: newBalance,
            relatedBookingId: booking._id,
            status: 'success',
          });
        }
      }

      booking.status = 'completed';
      booking.paymentStatus = 'paid';
      booking.timeline = booking.timeline || [];
      booking.timeline.push({
        status: 'completed',
        title: 'Khiếu nại bị bác bỏ bởi Quản trị viên',
        description: 'Đã hoàn trả 100% tiền cọc cho người thuê.',
        timestamp: new Date(),
      });
      if (typeof booking.save === 'function') {
        await booking.save();
      }
    }

    await logAdminAction({
      req,
      action: 'DISPUTE_DISMISS',
      targetType: 'dispute',
      targetId: id,
      details: { adminNote },
    });

    return res.json({
      success: true,
      message: 'Đã bác bỏ yêu cầu khiếu nại thành công.',
      data: dispute,
    });
  } catch (err) {
    next(err);
  }
};
