import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Account } from '../../models/Account.js';
import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { resolveRoleCode } from '../authController.js';
import { getAdminAnalytics } from '../adminController.js';
import { listOwnerEkycRequests } from '../adminOwnerEkycController.js';
import { calculateAnalyticsData, resolveDateRange } from './adminAdvancedAnalyticsController.js';

const CANDIDATE_JWT_SECRETS = [
  process.env.JWT_SECRET,
  'techshare_mma301_super_secret_jwt_key_2026',
  'techshare_jwt_secret_key_2026',
].filter(Boolean);

const generateAdminToken = (payload) => {
  const secret = CANDIDATE_JWT_SECRETS[0] || 'techshare_mma301_super_secret_jwt_key_2026';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

// 1. GET /admin/login
export const renderLoginPage = (req, res) => {
  const redirect = req.query.redirect || '/admin/dashboard';
  const error = req.query.error === 'forbidden' ? 'Your account does not have Administrator privileges.' : null;
  return res.render('admin/login', {
    title: 'Admin Sign In — TechShare Admin Portal',
    redirect,
    error,
  });
};

// 2. POST /admin/login
export const handleLogin = async (req, res) => {
  try {
    const { identifier, password, redirect } = req.body;
    const loginKey = (identifier || '').trim();

    if (!loginKey || !password) {
      return res.render('admin/login', {
        title: 'Admin Sign In — TechShare Admin Portal',
        redirect: redirect || '/admin/dashboard',
        error: 'Please enter your username/email and password.',
      });
    }

    const account = await Account.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${loginKey}$`, 'i') } },
        { email: { $regex: new RegExp(`^${loginKey}$`, 'i') } },
      ],
    })
      .select('+passwordHash')
      .populate('roleId');

    if (!account) {
      return res.render('admin/login', {
        title: 'Admin Sign In — TechShare Admin Portal',
        redirect: redirect || '/admin/dashboard',
        error: 'Incorrect username or password.',
      });
    }

    if (account.isActive === false) {
      return res.render('admin/login', {
        title: 'Admin Sign In — TechShare Admin Portal',
        redirect: redirect || '/admin/dashboard',
        error: 'Your account has been locked or suspended.',
      });
    }

    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) {
      return res.render('admin/login', {
        title: 'Admin Sign In — TechShare Admin Portal',
        redirect: redirect || '/admin/dashboard',
        error: 'Incorrect username or password.',
      });
    }

    let user = null;
    if (account.userId) {
      user = await User.findById(account.userId).lean();
    }
    if (!user) {
      user = await User.findOne({ accountId: account._id }).lean();
    }

    const roleCode = await resolveRoleCode(account, user);
    if (roleCode !== 'admin') {
      return res.render('admin/login', {
        title: 'Admin Sign In — TechShare Admin Portal',
        redirect: redirect || '/admin/dashboard',
        error: 'Your account does not have Administrator privileges.',
      });
    }

    const finalUserId = user?._id || account.userId || account._id;
    const token = generateAdminToken({
      accountId: account._id,
      userId: finalUserId,
      username: account.username,
      email: account.email,
      name: user?.name || account.username,
      role: 'admin',
    });

    res.cookie('techshare_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(redirect || '/admin/dashboard');
  } catch (err) {
    console.error('Error during admin EJS login:', err);
    return res.render('admin/login', {
      title: 'Admin Sign In — TechShare Admin Portal',
      redirect: '/admin/dashboard',
      error: 'An error occurred during sign in. Please try again.',
    });
  }
};

// 3. GET /admin/logout
export const handleLogout = (req, res) => {
  res.clearCookie('techshare_admin_token');
  res.clearCookie('techshare_token');
  return res.redirect('/admin/login');
};

// 4. GET /admin/dashboard & /admin
export const renderDashboardPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let kpi = {
      totalUsers: 0,
      activeUsers: 0,
      totalDevices: 0,
      availableDevices: 0,
      activeBookings: 0,
      pendingEkyc: 0,
      pendingDisputes: 0,
      totalRevenue: 0,
      revenueFormatted: '0 ₫',
    };
    let categories = [];
    let charts = {};

    if (db) {
      const usersCol = db.collection('users');
      const devicesCol = db.collection('devices');
      const bookingsCol = db.collection('bookings');
      const ekycCol = db.collection('ekycrequests');
      const disputesCol = db.collection('disputes');

      const totalUsers = await usersCol.countDocuments({});
      const activeUsers = await usersCol.countDocuments({ isActive: { $ne: false } });
      const totalDevices = await devicesCol.countDocuments({ isDeleted: { $ne: true } });
      const availableDevices = await devicesCol.countDocuments({ isDeleted: { $ne: true }, status: { $in: ['available', 'active', 'sẵn sàng'] } });
      const activeBookings = await bookingsCol.countDocuments({ status: { $in: ['pending', 'confirmed', 'in_progress', 'delivering'] } });
      const pendingEkyc = await ekycCol.countDocuments({ status: 'pending' });
      let pendingDisputes = 0;
      try {
        pendingDisputes = await disputesCol.countDocuments({ status: { $in: ['pending', 'in_review'] } });
      } catch {}

      const allBookings = await bookingsCol.find({
        status: { $nin: ['cancelled', 'rejected'] }
      }).toArray();

      let totalRev = 0;
      for (const b of allBookings) {
        const amount = Number(b.pricing?.totalAmount || b.pricing?.rentalFee || b.totalAmount || b.rentalFee || b.totalPrice || 0);
        totalRev += amount;
      }

      // Aggregation for 7d, month, year based on real MongoDB data
      const now = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const chart7d = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);

        const dayBookings = allBookings.filter(b => {
          const bDate = new Date(b.createdAt);
          return bDate >= d && bDate < nextD;
        });

        const rev = dayBookings.reduce((sum, b) => {
          return sum + Number(b.pricing?.totalAmount || b.pricing?.rentalFee || b.totalAmount || b.rentalFee || 0);
        }, 0);

        chart7d.push({
          name: dayNames[d.getDay()],
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          revenue: rev,
          orders: dayBookings.length
        });
      }

      const chartMonth = [];
      for (let w = 4; w >= 1; w--) {
        const startW = new Date(now);
        startW.setDate(startW.getDate() - w * 7);
        const endW = new Date(now);
        endW.setDate(endW.getDate() - (w - 1) * 7);

        const weekBookings = allBookings.filter(b => {
          const bDate = new Date(b.createdAt);
          return bDate >= startW && bDate < endW;
        });

        const rev = weekBookings.reduce((sum, b) => {
          return sum + Number(b.pricing?.totalAmount || b.pricing?.rentalFee || b.totalAmount || b.rentalFee || 0);
        }, 0);

        chartMonth.push({
          name: `Week ${5 - w}`,
          revenue: rev,
          orders: weekBookings.length
        });
      }

      const chartYear = [];
      const curYear = now.getFullYear();
      for (let m = 0; m < 12; m++) {
        const monthBookings = allBookings.filter(b => {
          const bDate = new Date(b.createdAt);
          return bDate.getFullYear() === curYear && bDate.getMonth() === m;
        });

        const rev = monthBookings.reduce((sum, b) => {
          return sum + Number(b.pricing?.totalAmount || b.pricing?.rentalFee || b.totalAmount || b.rentalFee || 0);
        }, 0);

        chartYear.push({
          name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m],
          revenue: rev,
          orders: monthBookings.length
        });
      }

      charts = {
        '7d': chart7d,
        month: chartMonth,
        year: chartYear
      };

      kpi = {
        totalUsers,
        activeUsers,
        totalDevices,
        availableDevices,
        activeBookings,
        pendingEkyc,
        pendingDisputes,
        totalRevenue: totalRev,
        revenueFormatted: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRev),
      };

      const categoryAgg = await devicesCol.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]).toArray();

      const colorMap = {
        smartphone: '#67BEC3',
        laptop: '#38BDF8',
        camera: '#818CF8',
        drone: '#F472B6',
        audio: '#FBBF24',
        gaming: '#34D399',
        accessory: '#14B8A6'
      };
      const nameMap = {
        smartphone: 'Smartphone & Tablet',
        laptop: 'Laptop & Workstation',
        camera: 'Máy ảnh & Ống kính',
        drone: 'Flycam & Gimbal',
        audio: 'Tai nghe & Âm thanh',
        gaming: 'Máy chơi game & VR',
        accessory: 'Phụ kiện công nghệ'
      };

      const totalCount = categoryAgg.reduce((s, c) => s + c.count, 0) || 1;
      categories = categoryAgg.map(c => ({
        id: c._id || 'other',
        name: nameMap[c._id] || c._id || 'Other',
        count: c.count,
        percent: Math.round((c.count / totalCount) * 100),
        color: colorMap[c._id] || '#67BEC3',
      }));
    }

    return res.render('admin/layouts/main', {
      title: 'Overview & KPIs — TechShare Admin Portal',
      activePage: 'overview',
      pageScript: '/js/admin/dashboard.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/dashboard', { kpi, categories, charts }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderDashboardPage:', err);
    return res.status(500).send('Lỗi máy chủ nội bộ');
  }
};

// 5. GET /admin/user-manager & /admin/users (Reference Page)
export const renderUserManagerPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let users = [];

    if (db) {
      const usersCol = db.collection('users');
      const accountsCol = db.collection('accounts');
      const rolesCol = db.collection('roles');

      const rawUsers = await usersCol.find({}).sort({ createdAt: -1 }).limit(100).toArray();

      users = await Promise.all(rawUsers.map(async (u) => {
        let role = u.role || 'renter';
        let email = u.email || 'user@techshare.vn';

        if (u.accountId) {
          try {
            const acc = await accountsCol.findOne({ _id: new mongoose.Types.ObjectId(String(u.accountId)) });
            if (acc) {
              if (acc.email) email = acc.email;
              if (acc.roleId) {
                const roleDoc = await rolesCol.findOne({ _id: new mongoose.Types.ObjectId(String(acc.roleId)) });
                if (roleDoc?.code) role = roleDoc.code;
              }
            }
          } catch {}
        }

        return {
          _id: String(u._id),
          name: u.name || 'TechShare User',
          email: email,
          phone: u.phone || '0901234567',
          avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u._id}`,
          role: role,
          isVerified: Boolean(u.isVerified),
          trustScore: typeof u.trustScore === 'number' ? u.trustScore : 88,
          walletBalance: typeof u.walletBalance === 'number' ? u.walletBalance : 2500000,
          walletEscrowBalance: typeof u.walletEscrowBalance === 'number' ? u.walletEscrowBalance : 1200000,
          isActive: u.isActive !== false,
          createdAt: u.createdAt || new Date(),
        };
      }));
    }

    return res.render('admin/layouts/main', {
      title: 'User Management & Trust Scores — TechShare Admin',
      activePage: 'users',
      pageScript: '/js/admin/user-manager.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/user-manager', { users }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderUserManagerPage:', err);
    return res.status(500).send('Lỗi máy chủ nội bộ');
  }
};

// 6. GET /admin/device-moderation & /admin/devices
export const renderDeviceModerationPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let devices = [];
    let counts = { all: 0, pending: 0, approved: 0, rejected: 0 };

    if (db) {
      const devicesCol = db.collection('devices');
      const usersCol = db.collection('users');

      const rawDevices = await devicesCol.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(100).toArray();

      devices = await Promise.all(rawDevices.map(async (d) => {
        let owner = { name: 'Device Owner', email: 'owner@techshare.vn', phone: '0901234567' };
        if (d.ownerId) {
          try {
            const u = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(d.ownerId)) });
            if (u) owner = { name: u.name || 'Chủ thiết bị', email: u.email || 'owner@techshare.vn', phone: u.phone || '0901234567' };
          } catch {}
        }
        return {
          ...d,
          _id: String(d._id),
          owner,
        };
      }));

      counts.all = devices.length;
      counts.pending = devices.filter(d => (d.moderationStatus || 'pending') === 'pending').length;
      counts.approved = devices.filter(d => d.moderationStatus === 'approved').length;
      counts.rejected = devices.filter(d => d.moderationStatus === 'rejected').length;
    }

    return res.render('admin/layouts/main', {
      title: 'Device Moderation — TechShare Admin',
      activePage: 'devices',
      pageScript: '/js/admin/device-moderation.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/device-moderation', { devices, counts }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderDeviceModerationPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 7. GET /admin/ekyc-verification & /admin/ekyc
export const renderEkycVerificationPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let requests = [];

    if (db) {
      const ekycCol = db.collection('ekycrequests');
      const usersCol = db.collection('users');
      const raw = await ekycCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();

      requests = await Promise.all(raw.map(async (r) => {
        let user = { name: r.fullName || 'TechShare User', email: 'user@techshare.vn' };
        if (r.userId) {
          try {
            const u = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(r.userId)) });
            if (u) user = { name: u.name || r.fullName, email: u.email || 'user@techshare.vn' };
          } catch {}
        }
        return { ...r, _id: String(r._id), user };
      }));
    }

    return res.render('admin/layouts/main', {
      title: 'eKYC Verification — TechShare Admin',
      activePage: 'ekyc',
      pageScript: '/js/admin/ekyc-verification.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/ekyc-verification', { requests }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderEkycVerificationPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

export const renderOwnerEkycPage = async (req, res, next) => {
  const statuses = {
    all: 'Tất cả',
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
  };
  const status = typeof req.query.status === 'string' && Object.hasOwn(statuses, req.query.status)
    ? req.query.status
    : 'all';

  try {
    const { data: requests, total, page, limit } = await listOwnerEkycRequests({
      status,
      page: req.query.page,
    });
    const body = await new Promise((resolve, reject) => {
      res.render('admin/owner-ekyc-verification', {
        requests, statuses, status, page, hasNextPage: page * limit < total,
      }, (error, html) => {
        if (error) reject(error);
        else resolve(html);
      });
    });
    return res.set('Cache-Control', 'no-store').render('admin/layouts/main', {
      title: 'Owner Verification — TechShare Admin',
      activePage: 'owner-ekyc',
      pageScript: '/js/admin/owner-ekyc-verification.js',
      body,
    });
  } catch (error) {
    next(error);
  }
};

// 8. GET /admin/booking-management & /admin/bookings
export const renderBookingManagementPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let bookings = [];

    if (db) {
      const bookingsCol = db.collection('bookings');
      const usersCol = db.collection('users');
      const devicesCol = db.collection('devices');

      const raw = await bookingsCol.find({}).sort({ createdAt: -1 }).limit(100).toArray();

      bookings = await Promise.all(raw.map(async (b) => {
        let renter = { name: 'Renter' };
        let owner = { name: 'Device Owner' };
        let device = { name: 'Thiết bị công nghệ' };

        if (b.renterId) {
          try {
            const u = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(b.renterId)) });
            if (u) renter = { name: u.name || 'Khách thuê' };
          } catch {}
        }
        if (b.ownerId) {
          try {
            const u = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(b.ownerId)) });
            if (u) owner = { name: u.name || 'Chủ thiết bị' };
          } catch {}
        }
        if (b.deviceId) {
          try {
            const d = await devicesCol.findOne({ _id: new mongoose.Types.ObjectId(String(b.deviceId)) });
            if (d) device = { name: d.name || d.title || 'Thiết bị công nghệ' };
          } catch {}
        }

        return {
          ...b,
          _id: String(b._id),
          renter,
          owner,
          device,
        };
      }));
    }

    return res.render('admin/layouts/main', {
      title: 'Rental Management — TechShare Admin',
      activePage: 'bookings',
      pageScript: '/js/admin/booking-management.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/booking-management', { bookings }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderBookingManagementPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 9. GET /admin/dispute-resolution & /admin/disputes
export const renderDisputeResolutionPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let disputes = [];

    if (db) {
      const disputesCol = db.collection('disputes');
      const usersCol = db.collection('users');

      const raw = await disputesCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();

      disputes = await Promise.all(raw.map(async (d) => {
        let raisedBy = { name: 'Complainant' };
        if (d.raisedBy) {
          try {
            const u = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(d.raisedBy)) });
            if (u) raisedBy = { name: u.name || 'Người khiếu nại' };
          } catch {}
        }
        return {
          ...d,
          _id: String(d._id),
          raisedBy,
        };
      }));
    }

    return res.render('admin/layouts/main', {
      title: 'Dispute Resolution — TechShare Admin',
      activePage: 'disputes',
      pageScript: '/js/admin/dispute-resolution.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/dispute-resolution', { disputes }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderDisputeResolutionPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 10. GET /admin/wallet
export const renderWalletPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let overview = { totalUserBalance: 142500000, totalEscrowHeld: 48500000, totalPlatformFee: 4977000 };
    let transactions = [];

    if (db) {
      const txCol = db.collection('wallettransactions');
      const usersCol = db.collection('users');

      transactions = await txCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();
      transactions = await Promise.all(transactions.map(async (tx) => {
        let user = { name: 'Member', email: 'user@techshare.vn' };
        if (tx.userId) {
          try {
            const u = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(tx.userId)) });
            if (u) user = { name: u.name || 'Thành viên', email: u.email || 'user@techshare.vn' };
          } catch {}
        }
        return { ...tx, _id: String(tx._id), user };
      }));
    }

    return res.render('admin/layouts/main', {
      title: 'Wallet & Transactions — TechShare Admin',
      activePage: 'wallet',
      body: await new Promise((resolve, reject) => {
        res.render('admin/wallet', { overview, transactions }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderWalletPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 11. GET /admin/voucher-management & /admin/vouchers
export const renderVoucherManagementPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let vouchers = [];

    if (db) {
      const vouchersCol = db.collection('vouchers');
      vouchers = await vouchersCol.find({}).sort({ createdAt: -1 }).toArray();
    }

    return res.render('admin/layouts/main', {
      title: 'Voucher Management — TechShare Admin',
      activePage: 'vouchers',
      pageScript: '/js/admin/voucher-management.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/voucher-management', { vouchers }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderVoucherManagementPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 12. GET /admin/review-moderation & /admin/reviews
export const renderReviewModerationPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let reviews = [];

    if (db) {
      const reviewsCol = db.collection('reviews');
      const usersCol = db.collection('users');
      const devicesCol = db.collection('devices');

      const raw = await reviewsCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();

      reviews = await Promise.all(raw.map(async (r) => {
        let reviewer = { name: 'Reviewer', email: 'user@techshare.vn' };
        let device = { name: 'Thiết bị công nghệ' };

        if (r.reviewerId) {
          try {
            const u = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(String(r.reviewerId)) });
            if (u) reviewer = { name: u.name || 'Người đánh giá', email: u.email || 'user@techshare.vn' };
          } catch {}
        }
        if (r.deviceId) {
          try {
            const d = await devicesCol.findOne({ _id: new mongoose.Types.ObjectId(String(r.deviceId)) });
            if (d) device = { name: d.name || d.title || 'Thiết bị công nghệ' };
          } catch {}
        }
        return { ...r, _id: String(r._id), reviewer, device };
      }));
    }

    return res.render('admin/layouts/main', {
      title: 'Review Moderation — TechShare Admin',
      activePage: 'reviews',
      pageScript: '/js/admin/review-moderation.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/review-moderation', { reviews }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderReviewModerationPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 13. GET /admin/roles-permissions & /admin/roles
export const renderRolesPermissionsPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let roles = [];
    let accounts = [];

    if (db) {
      const rolesCol = db.collection('roles');
      const accountsCol = db.collection('accounts');

      const rawRoles = await rolesCol.find({}).toArray();
      roles = await Promise.all(rawRoles.map(async (r) => {
        const count = await accountsCol.countDocuments({ roleId: r._id });
        return { ...r, _id: String(r._id), accountCount: count };
      }));

      accounts = await accountsCol.find({}).sort({ createdAt: -1 }).limit(100).toArray();
    }

    return res.render('admin/layouts/main', {
      title: 'Role Management — TechShare Admin',
      activePage: 'roles',
      pageScript: '/js/admin/roles-permissions.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/roles-permissions', { roles, accounts }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderRolesPermissionsPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 14. GET /admin/notification-management & /admin/notifications
export const renderNotificationManagementPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let notifications = [];

    if (db) {
      const notifCol = db.collection('notifications');
      notifications = await notifCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();
    }

    return res.render('admin/layouts/main', {
      title: 'Notification Management — TechShare Admin',
      activePage: 'notifications',
      pageScript: '/js/admin/notification-management.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/notification-management', { notifications }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderNotificationManagementPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 15. GET /admin/analytics
export const renderAnalyticsPage = async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const dateRange = resolveDateRange(period, req.query.startDate, req.query.endDate);
    const analyticsData = await calculateAnalyticsData({ ...dateRange, period });

    return res.render('admin/layouts/main', {
      title: 'Financial Reports & Analytics — TechShare Admin',
      activePage: 'analytics',
      pageScript: '/js/admin/analytics.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/analytics', {
          analytics: analyticsData.kpi,
          data: analyticsData,
          period,
          startDate: dateRange.filterStart.toISOString(),
          endDate: dateRange.filterEnd.toISOString(),
        }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderAnalyticsPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 16. GET /admin/settings
export const renderSettingsPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let settings = [];

    if (db) {
      const settingsCol = db.collection('system_settings');
      settings = await settingsCol.find({}).sort({ category: 1, key: 1 }).toArray();
    }

    return res.render('admin/layouts/main', {
      title: 'System Settings — TechShare Admin',
      activePage: 'settings',
      pageScript: '/js/admin/settings.js',
      body: await new Promise((resolve, reject) => {
        res.render('admin/settings', { settings }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderSettingsPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};

// 17. GET /admin/audit-logs
export const renderAuditLogsPage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let logs = [];

    if (db) {
      const auditCol = db.collection('admin_audit_logs');
      logs = await auditCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();
    }

    return res.render('admin/layouts/main', {
      title: 'Audit Logs — TechShare Admin',
      activePage: 'audit-logs',
      body: await new Promise((resolve, reject) => {
        res.render('admin/audit-logs', { logs }, (err, html) => {
          if (err) reject(err);
          else resolve(html);
        });
      }),
    });
  } catch (err) {
    console.error('Error in renderAuditLogsPage:', err);
    return res.status(500).send('Lỗi máy chủ');
  }
};
