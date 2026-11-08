import { resolveUserAndAccount, banAccount, unbanAccount } from '../../services/banService.js';

/**
 * Controller xử lý Khóa hoặc Mở khóa tài khoản người dùng
 * Endpoint: PATCH /api/admin/users/:id/ban hoặc PATCH /api/admin/users/:id/status
 */
export const toggleUserBanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, isbanned, reason } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu định danh người dùng cần xử lý.',
      });
    }

    // Tra cứu thông tin hiện tại
    const { user, account } = await resolveUserAndAccount(id);
    if (!user && !account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng tương ứng.',
      });
    }

    // Xác định hành động là khóa (ban) hay mở khóa (unban)
    let shouldBan = false;
    if (typeof isbanned === 'boolean') {
      shouldBan = isbanned;
    } else if (typeof isActive === 'boolean') {
      shouldBan = !isActive;
    } else {
      // Đảo ngược trạng thái hiện tại
      const currentActive = account?.isActive ?? user?.isActive ?? true;
      const currentBanned = account?.isbanned ?? false;
      shouldBan = !currentBanned && currentActive;
    }

    if (shouldBan) {
      const banReason = (reason || req.body.banReason || '').trim() || 'Vi phạm điều khoản sử dụng và quy định TechShare.';
      const result = await banAccount({
        targetId: id,
        reason: banReason,
      });

      return res.json({
        success: true,
        message: 'Đã khóa tài khoản người dùng thành công.',
        data: {
          userId: result.userId,
          accountId: result.accountId,
          isActive: false,
          isbanned: true,
          banReason: result.banReason,
          bannedAt: result.bannedAt,
        },
      });
    } else {
      const result = await unbanAccount({
        targetId: id,
      });

      return res.json({
        success: true,
        message: 'Đã mở khóa tài khoản người dùng thành công.',
        data: {
          userId: result.userId,
          accountId: result.accountId,
          isActive: true,
          isbanned: false,
          banReason: '',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy thông tin chi tiết trạng thái khóa của tài khoản
 * Endpoint: GET /api/admin/users/:id/ban-info
 */
export const getUserBanInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user, account } = await resolveUserAndAccount(id);

    if (!user && !account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng.',
      });
    }

    const isbanned = Boolean(account?.isbanned || (user && user.isActive === false));
    const banReason = account?.banReason || user?.banReason || '';

    return res.json({
      success: true,
      data: {
        userId: user?._id,
        accountId: account?._id,
        username: account?.username || user?.username,
        email: account?.email || user?.email,
        isActive: account?.isActive ?? user?.isActive ?? true,
        isbanned,
        banReason,
        bannedAt: account?.bannedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  toggleUserBanStatus,
  getUserBanInfo,
};

