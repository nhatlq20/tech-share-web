import mongoose from 'mongoose';
import { verifyOrDecodeToken } from './authMiddleware.js';

export const protectAdminPage = async (req, res, next) => {
  let token = null;

  if (req.cookies?.techshare_admin_token) {
    token = req.cookies.techshare_admin_token;
  } else if (req.cookies?.techshare_token) {
    token = req.cookies.techshare_token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  const loginUrl = `/admin/login?redirect=${encodeURIComponent(req.originalUrl)}`;

  if (!token || token === 'null' || token === 'undefined') {
    return res.redirect(loginUrl);
  }

  const decoded = verifyOrDecodeToken(token);
  if (!decoded) {
    return res.redirect(loginUrl);
  }

  if (decoded.role !== 'admin') {
    return res.status(403).render('admin/forbidden', {
      title: 'Truy cập bị từ chối — TechShare Admin',
      message: 'Bạn không có quyền truy cập vào Cổng Quản trị Viên TechShare.',
      user: decoded,
    });
  }

  req.user = decoded;

  // Resolve admin user doc and badge counts for layout
  try {
    const db = mongoose.connection.db;
    let adminProfile = {
      name: decoded.name || decoded.username || 'Admin Quản trị',
      email: decoded.email || 'admin@techshare.vn',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      role: 'admin',
    };

    let pendingEkycCount = 0;
    let pendingOwnerEkycCount = 0;
    let pendingDevicesCount = 0;
    let pendingDisputesCount = 0;

    if (db) {
      const usersCol = db.collection('users');
      const accountsCol = db.collection('accounts');
      const targetUserId = decoded.userId || decoded._id || decoded.id;
      const targetAccountId = decoded.accountId;

      let userDoc = null;
      let accountDoc = null;

      if (targetUserId && mongoose.isValidObjectId(targetUserId)) {
        userDoc = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(targetUserId)) });
      }
      if (!userDoc && targetAccountId && mongoose.isValidObjectId(targetAccountId)) {
        userDoc = await usersCol.findOne({ accountId: new mongoose.Types.ObjectId(String(targetAccountId)) });
      }
      if (targetAccountId && mongoose.isValidObjectId(targetAccountId)) {
        accountDoc = await accountsCol.findOne({ _id: new mongoose.Types.ObjectId(String(targetAccountId)) });
      }

      // Check if account or user is inactive/locked
      if ((accountDoc && accountDoc.isActive === false) || (userDoc && userDoc.isActive === false)) {
        return res.status(403).render('admin/forbidden', {
          title: 'Tài khoản bị khóa',
          message: 'Tài khoản quản trị của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ ban quản trị.',
          user: decoded,
        });
      }

      if (userDoc) {
        adminProfile = {
          _id: userDoc._id,
          name: userDoc.name || decoded.name || 'Admin Quản trị',
          email: userDoc.email || accountDoc?.email || decoded.email,
          avatar: userDoc.avatar || userDoc.avatarUrl || adminProfile.avatar,
          role: 'admin',
        };
      }

      // Fetch pending badge counts
      try {
        pendingEkycCount = await db.collection('ekyc_requests').countDocuments({ status: 'pending' });
        pendingOwnerEkycCount = await db.collection('owner_request').countDocuments({ status: 'pending' });
        pendingDevicesCount = await db.collection('devices').countDocuments({ moderationStatus: 'pending', isDeleted: { $ne: true } });
        pendingDisputesCount = await db.collection('disputes').countDocuments({ status: { $in: ['pending', 'in_review'] } });
      } catch {}
    }

    res.locals.admin = adminProfile;
    res.locals.pendingCounts = {
      ekyc: pendingEkycCount,
      ownerEkyc: pendingOwnerEkycCount,
      devices: pendingDevicesCount,
      disputes: pendingDisputesCount,
    };
  } catch (err) {
    console.error('Error resolving admin profile in protectAdminPage:', err);
    res.locals.admin = {
      name: decoded.name || 'Admin Quản trị',
      email: decoded.email || 'admin@techshare.vn',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      role: 'admin',
    };
    res.locals.pendingCounts = { ekyc: 0, ownerEkyc: 0, devices: 0, disputes: 0 };
  }

  return next();
};
