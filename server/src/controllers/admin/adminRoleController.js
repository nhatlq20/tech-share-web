import mongoose from 'mongoose';
import Role from '../../models/Role.js';
import Account from '../../models/Account.js';
import User from '../../models/User.js';
import { logAdminAction } from '../../utils/auditLogger.js';

/**
 * 1. GET /api/admin/roles
 * Danh sách vai trò và phân quyền trong hệ thống cùng số lượng tài khoản liên kết
 */
export const getAdminRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 }).lean();

    // Đếm số lượng tài khoản thuộc từng vai trò
    const rolesWithCounts = await Promise.all(
      roles.map(async (r) => {
        let accountCount = 0;
        try {
          accountCount = await Account.countDocuments({
            $or: [{ roleId: r._id }, { role: r.code }],
          });
        } catch {}
        return {
          ...r,
          accountCount,
        };
      })
    );

    return res.json({
      success: true,
      data: rolesWithCounts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/admin/roles/:id
 * Chi tiết vai trò và danh sách quyền hạn (permissions)
 */
export const getAdminRoleDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID vai trò không hợp lệ.' });
    }

    const role = await Role.findById(id).lean();
    if (!role) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò.' });
    }

    let accountCount = 0;
    try {
      accountCount = await Account.countDocuments({
        $or: [{ roleId: role._id }, { role: role.code }],
      });
    } catch {}

    return res.json({
      success: true,
      data: {
        ...role,
        accountCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/admin/roles/:id/accounts
 * Danh sách tài khoản được gán vai trò tương ứng (hỗ trợ tìm kiếm và phân trang)
 */
export const getAdminRoleAccounts = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID vai trò không hợp lệ.' });
    }

    const role = await Role.findById(id).lean();
    if (!role) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const { search, status } = req.query;
    const query = {
      $or: [{ roleId: new mongoose.Types.ObjectId(id) }, { role: role.code }],
    };

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [{ username: regex }, { email: regex }];
    }

    const total = await Account.countDocuments(query);
    const accounts = await Account.find(query)
      .populate('userId', 'name email avatar phone address isVerified trustScore')
      .populate('roleId', 'code name permissions')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: accounts,
      role,
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
 * 4. PATCH /api/admin/accounts/:id/role
 * Gán vai trò cho tài khoản (Ràng buộc bảo mật: Ngăn chặn xóa / hạ quyền Admin cuối cùng)
 */
export const updateAdminAccountRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID tài khoản không hợp lệ.' });
    }

    const { roleId, reason } = req.body;
    if (!roleId || !mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp roleId hợp lệ.' });
    }

    const targetRole = await Role.findById(roleId);
    if (!targetRole) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò chỉ định.' });
    }

    const account = await Account.findById(id).populate('roleId');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng.' });
    }

    // Xác định vai trò hiện tại của tài khoản
    let currentRoleCode = account.roleId?.code || account.role;
    if (!currentRoleCode && account.roleId && mongoose.isValidObjectId(account.roleId)) {
      const currentRoleDoc = await Role.findById(account.roleId);
      currentRoleCode = currentRoleDoc?.code;
    }

    // KIỂM TRA BẢO MẬT P0: NGĂN CHẶN XÓA / HẠ QUYỀN ADMIN CUỐI CÙNG
    if (currentRoleCode === 'admin' && targetRole.code !== 'admin') {
      const adminRole = await Role.findOne({ code: 'admin' });
      const adminRoleId = adminRole?._id;

      let activeAdminCount = 0;
      if (adminRoleId) {
        activeAdminCount = await Account.countDocuments({
          $or: [{ roleId: adminRoleId }, { role: 'admin' }],
          isActive: true,
        });
      } else {
        activeAdminCount = await Account.countDocuments({
          role: 'admin',
          isActive: true,
        });
      }

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message:
            'Bảo mật từ chối: Không thể thu hồi quyền của Quản trị viên (Admin) duy nhất còn hoạt động trong hệ thống.',
        });
      }
    }

    const oldRoleId = account.roleId?._id || account.roleId;
    account.roleId = targetRole._id;
    account.role = targetRole.code;
    await account.save();

    // Đồng bộ sang bảng User nếu tài khoản có liên kết userId
    if (account.userId) {
      try {
        await User.updateOne(
          { _id: account.userId },
          { $set: { role: targetRole.code } }
        );
      } catch (userSyncErr) {
        console.warn('Lỗi đồng bộ role sang User:', userSyncErr.message);
      }
    }

    // Ghi nhật ký kiểm toán bảo mật
    await logAdminAction(req, {
      action: 'account_role_change',
      targetType: 'Account',
      targetId: account._id,
      reason: reason || `Thay đổi vai trò từ ${currentRoleCode || 'N/A'} sang ${targetRole.code}`,
      metadata: {
        oldRoleId,
        oldRoleCode: currentRoleCode,
        newRoleId: targetRole._id,
        newRoleCode: targetRole.code,
        accountId: account._id,
        username: account.username,
        email: account.email,
      },
      status: 'success',
    });

    return res.json({
      success: true,
      data: account,
      message: `Đã phân quyền tài khoản thành công sang vai trò '${targetRole.name}'.`,
    });
  } catch (err) {
    next(err);
  }
};
