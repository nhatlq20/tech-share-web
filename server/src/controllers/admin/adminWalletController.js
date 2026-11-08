import mongoose from 'mongoose';
import WalletTransaction from '../../models/WalletTransaction.js';
import User from '../../models/User.js';
import Booking from '../../models/Booking.js';
import { logAdminAction } from '../../utils/auditLogger.js';

/**
 * MODULE 3: WALLET & TRANSACTION MANAGEMENT CONTROLLER
 */

/**
 * 1. GET /api/admin/wallet/overview
 * Tổng quan số dư ví người dùng, ký quỹ Escrow và tổng lượng giao dịch
 */
export const getAdminWalletOverview = async (req, res, next) => {
  try {
    // 1. Tổng số dư ví và ký quỹ của toàn bộ người dùng
    const userWalletAgg = await User.aggregate([
      {
        $group: {
          _id: null,
          totalWalletBalance: { $sum: { $ifNull: ['$wallet.balance', 0] } },
          totalEscrowBalance: { $sum: { $ifNull: ['$wallet.escrowBalance', 0] } },
          totalUsersWithWallet: { $sum: 1 },
        },
      },
    ]);

    const walletTotals = userWalletAgg[0] || {
      totalWalletBalance: 0,
      totalEscrowBalance: 0,
      totalUsersWithWallet: 0,
    };

    // 2. Thống kê theo loại giao dịch
    const txTypeAgg = await WalletTransaction.aggregate([
      {
        $match: {
          status: { $in: ['success', 'completed'] },
        },
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const txTypeMap = {};
    txTypeAgg.forEach((item) => {
      txTypeMap[item._id] = {
        totalAmount: item.totalAmount,
        count: item.count,
      };
    });

    const totalPayouts =
      (txTypeMap['rental_payout']?.totalAmount || 0) +
      (txTypeMap['rental_income']?.totalAmount || 0);

    const totalRefunds =
      (txTypeMap['deposit_refund']?.totalAmount || 0) +
      (txTypeMap['deposit_release']?.totalAmount || 0);

    const totalTopups = txTypeMap['topup']?.totalAmount || 0;
    const totalWithdrawals =
      (txTypeMap['withdrawal']?.totalAmount || 0) +
      (txTypeMap['withdraw']?.totalAmount || 0);

    const totalTransactions = await WalletTransaction.countDocuments({});
    const failedTransactions = await WalletTransaction.countDocuments({ status: 'failed' });

    // 3. Giao dịch gần đây nhất
    const recentTransactions = await WalletTransaction.find({})
      .populate('userId', 'name email avatar phone')
      .populate('relatedBookingId', 'bookingCode status')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      data: {
        totalWalletBalance: walletTotals.totalWalletBalance,
        totalEscrowBalance: walletTotals.totalEscrowBalance,
        totalPayouts,
        totalRefunds,
        totalTopups,
        totalWithdrawals,
        totalTransactions,
        failedTransactions,
        recentTransactions: recentTransactions.map((tx) => ({
          ...tx,
          user: tx.userId,
          booking: tx.relatedBookingId,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/admin/wallet/transactions
 * Danh sách giao dịch ví có phân trang, bộ lọc và tìm kiếm
 */
export const getAdminWalletTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { type, status, userId, startDate, endDate, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    if (type && type !== 'all') {
      // Map alias types
      if (type === 'deposit_lock') query.type = { $in: ['deposit_lock', 'deposit_hold'] };
      else if (type === 'deposit_refund') query.type = { $in: ['deposit_refund', 'deposit_release'] };
      else if (type === 'rental_payout') query.type = { $in: ['rental_payout', 'rental_income'] };
      else if (type === 'withdraw') query.type = { $in: ['withdrawal', 'withdraw'] };
      else query.type = type;
    }

    if (status && status !== 'all') {
      if (status === 'completed') query.status = { $in: ['success', 'completed'] };
      else query.status = status;
    }

    if (userId && mongoose.isValidObjectId(userId)) {
      query.userId = new mongoose.Types.ObjectId(String(userId));
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    let transactions;
    let total;

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');

      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'bookings',
            localField: 'relatedBookingId',
            foreignField: '_id',
            as: 'booking',
          },
        },
        { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            ...query,
            $or: [
              { 'user.name': regex },
              { 'user.email': regex },
              { 'user.phone': regex },
              { 'booking.bookingCode': regex },
            ],
          },
        },
      ];

      const countRes = await WalletTransaction.aggregate([...pipeline, { $count: 'total' }]);
      total = countRes[0]?.total || 0;

      const sortDir = sortOrder === 'asc' ? 1 : -1;
      transactions = await WalletTransaction.aggregate([
        ...pipeline,
        { $sort: { [sortBy]: sortDir } },
        { $skip: skip },
        { $limit: limit },
      ]);
    } else {
      total = await WalletTransaction.countDocuments(query);
      const sortDir = sortOrder === 'asc' ? 1 : -1;

      transactions = await WalletTransaction.find(query)
        .populate('userId', 'name email avatar phone')
        .populate('relatedBookingId', 'bookingCode status')
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean();

      transactions = transactions.map((t) => ({
        ...t,
        user: t.userId,
        booking: t.relatedBookingId,
      }));
    }

    return res.json({
      success: true,
      data: transactions,
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
 * 3. GET /api/admin/wallet/transactions/:id
 * Chi tiết một giao dịch ví
 */
export const getAdminWalletTransactionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID giao dịch không hợp lệ.' });
    }

    const transaction = await WalletTransaction.findById(id)
      .populate('userId', 'name email phone avatar wallet')
      .populate({
        path: 'relatedBookingId',
        select: 'bookingCode status paymentStatus pricing startDate endDate deviceId',
        populate: { path: 'deviceId', select: 'name brand images' },
      })
      .lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
    }

    return res.json({
      success: true,
      data: {
        ...transaction,
        user: transaction.userId,
        booking: transaction.relatedBookingId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. GET /api/admin/wallet/users/:userId
 * Lấy thông tin ví và lịch sử giao dịch của một người dùng cụ thể
 */
export const getAdminUserWalletProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ.' });
    }

    const user = await User.findById(userId).select('name email phone avatar wallet trust role isActive').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const transactions = await WalletTransaction.find({ userId })
      .populate('relatedBookingId', 'bookingCode status')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      data: {
        user,
        wallet: user.wallet || { balance: 0, escrowBalance: 0 },
        transactions: transactions.map((t) => ({ ...t, booking: t.relatedBookingId })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. GET /api/admin/wallet/export
 * Xuất dữ liệu giao dịch ví ra file CSV
 */
export const exportAdminWalletTransactions = async (req, res, next) => {
  try {
    const { type, status, startDate, endDate } = req.query;
    const query = {};

    if (type && type !== 'all') {
      if (type === 'deposit_lock') query.type = { $in: ['deposit_lock', 'deposit_hold'] };
      else if (type === 'deposit_refund') query.type = { $in: ['deposit_refund', 'deposit_release'] };
      else if (type === 'rental_payout') query.type = { $in: ['rental_payout', 'rental_income'] };
      else if (type === 'withdraw') query.type = { $in: ['withdrawal', 'withdraw'] };
      else query.type = type;
    }

    if (status && status !== 'all') {
      if (status === 'completed') query.status = { $in: ['success', 'completed'] };
      else query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const transactions = await WalletTransaction.find(query)
      .populate('userId', 'name email phone')
      .populate('relatedBookingId', 'bookingCode')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const headers = [
      'Mã giao dịch',
      'Người dùng',
      'Email',
      'SĐT',
      'Loại giao dịch',
      'Số tiền (VND)',
      'Số dư sau GD (VND)',
      'Mã đơn thuê',
      'Trạng thái',
      'Thời gian',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = transactions.map((t) => [
      escapeCsv(t._id),
      escapeCsv(t.userId?.name || 'N/A'),
      escapeCsv(t.userId?.email || 'N/A'),
      escapeCsv(t.userId?.phone || 'N/A'),
      escapeCsv(t.type),
      t.amount || 0,
      t.balanceAfter || 0,
      escapeCsv(t.relatedBookingId?.bookingCode || ''),
      escapeCsv(t.status),
      escapeCsv(t.createdAt ? new Date(t.createdAt).toISOString() : ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="TechShare_Wallet_Transactions_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
