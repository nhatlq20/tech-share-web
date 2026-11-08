import mongoose from 'mongoose';

export const requireOwner = (req, res, next) => {
  const allowed = ['owner', 'both', 'admin'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ chủ thiết bị (Owner) mới có quyền thực hiện thao tác này.',
    });
  }

  next();
};

/**
 * Middleware phân quyền Quản trị viên (Admin RBAC):
 * - Bắt buộc req.user đã qua xác thực (JWT Auth)
 * - Kiểm tra role token === 'admin'
 * - Xác thực trạng thái người dùng và quyền admin thực tế trong DB
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập.',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yêu cầu quyền Quản trị viên (Admin).',
      });
    }

    // Nếu có kết nối cơ sở dữ liệu MongoDB, xác minh sự tồn tại và quyền hạn thực tế
    const db = mongoose.connection.db;
    const targetUserId = req.user.userId || req.user._id || req.user.id;
    const targetAccountId = req.user.accountId;

    if (db && (targetUserId || targetAccountId)) {
      const usersCol = db.collection('users');
      const accountsCol = db.collection('accounts');
      const rolesCol = db.collection('roles');

      let userDoc = null;
      let accountDoc = null;

      // 1. Tìm thông tin trong collection users
      if (targetUserId && mongoose.isValidObjectId(targetUserId)) {
        userDoc = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(targetUserId)) });
      }
      if (!userDoc && targetAccountId && mongoose.isValidObjectId(targetAccountId)) {
        userDoc = await usersCol.findOne({ accountId: new mongoose.Types.ObjectId(String(targetAccountId)) });
      }

      // 2. Tìm thông tin trong collection accounts
      if (targetAccountId && mongoose.isValidObjectId(targetAccountId)) {
        accountDoc = await accountsCol.findOne({ _id: new mongoose.Types.ObjectId(String(targetAccountId)) });
      }
      if (!accountDoc && targetUserId && mongoose.isValidObjectId(targetUserId)) {
        const uId = new mongoose.Types.ObjectId(String(targetUserId));
        accountDoc = await accountsCol.findOne({
          $or: [{ userId: uId }, { _id: uId }],
        });
      }

      // 3. Nếu cả user và account đều không tồn tại trong DB -> Tài khoản đã bị xóa
      if (!userDoc && !accountDoc) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản người dùng không tồn tại hoặc đã bị xóa.',
        });
      }

      // 4. Kiểm tra trạng thái hoạt động (bị khóa / vô hiệu hóa)
      if ((accountDoc && accountDoc.isActive === false) || (userDoc && userDoc.isActive === false)) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa hoặc tạm khóa.',
        });
      }

      // 5. Kiểm tra quyền Admin thực tế trong cơ sở dữ liệu (phòng trường hợp đã bị thu hồi quyền)
      let currentRole = null;
      if (accountDoc?.roleId) {
        if (typeof accountDoc.roleId === 'object' && accountDoc.roleId.code) {
          currentRole = accountDoc.roleId.code;
        } else if (mongoose.isValidObjectId(accountDoc.roleId)) {
          const roleDoc = await rolesCol.findOne({ _id: new mongoose.Types.ObjectId(String(accountDoc.roleId)) });
          if (roleDoc?.code) currentRole = roleDoc.code;
        }
      }
      if (!currentRole && accountDoc?.role) {
        currentRole = accountDoc.role;
      }
      if (!currentRole && userDoc?.role) {
        currentRole = userDoc.role;
      }

      // Nếu trong DB có lưu quyền nhưng không còn là 'admin' -> Quyền admin đã bị thu hồi
      if (currentRole && currentRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Quyền Quản trị viên đã bị thu hồi.',
        });
      }

      if (userDoc) req.user.userDoc = userDoc;
      if (accountDoc) req.user.accountDoc = accountDoc;
    }

    return next();
  } catch (err) {
    console.error('Lỗi kiểm tra quyền admin:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xác thực quyền truy cập.',
    });
  }
};
