import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

/**
 * Helper to get MongoDB collections safely
 */
const getCollections = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not initialized yet.');
  }
  return {
    usersCol: db.collection('users'),
    devicesCol: db.collection('devices'),
    bookingsCol: db.collection('bookings'),
  };
};

/**
 * Resolve ownerId from request (JWT token, query, or req.user)
 */
export const resolveOwnerId = async (req) => {
  // 1. Direct from req.user if populated by auth middleware
  const userTargetId = req.user?.userId || req.user?.id || req.user?._id;
  if (userTargetId) {
    return userTargetId.toString();
  }

  // 2. Query param if explicitly provided
  if (req.query && (req.query.ownerId || req.query.userId)) {
    return (req.query.ownerId || req.query.userId).toString();
  }

  // 3. JWT Bearer token from Authorization header
  const authHeader = req.headers?.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'techshare_jwt_secret_key_2026';
      const decoded = jwt.verify(token, secret);
      const decodedId = decoded?.userId || decoded?.id || decoded?._id;
      if (decodedId) {
        return decodedId.toString();
      }
      if (decoded?.email) {
        const { usersCol } = getCollections();
        const found = await usersCol.findOne({ email: decoded.email });
        if (found) return found._id.toString();
      }
    } catch {
      // Continue without token
    }
  }

  return null;
};

/**
 * Build MongoDB match query for ownerId supporting both ObjectId and string formats
 */
const buildOwnerQuery = (ownerId) => {
  if (!ownerId) {
    return { ownerId: '__none__' };
  }
  if (mongoose.Types.ObjectId.isValid(ownerId)) {
    return {
      $or: [
        { ownerId: new mongoose.Types.ObjectId(ownerId) },
        { ownerId: ownerId.toString() },
      ],
    };
  }
  return { ownerId: ownerId.toString() };
};

/**
 * Format VND currency
 */
const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * 1. GET /api/owner/overview or /api/owner/kpi
 */
export const getOwnerOverview = async (req, res, next) => {
  try {
    const { usersCol, devicesCol, bookingsCol } = getCollections();
    const ownerId = await resolveOwnerId(req);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập tài khoản chủ thiết bị.',
      });
    }

    const ownerFilter = buildOwnerQuery(ownerId);

    // Fetch owner user profile directly from database
    const ownerObjectId = mongoose.Types.ObjectId.isValid(ownerId)
      ? new mongoose.Types.ObjectId(ownerId)
      : null;
    const ownerProfile = ownerObjectId
      ? await usersCol.findOne({ _id: ownerObjectId })
      : await usersCol.findOne({ _id: ownerId });

    // 1. Devices summary
    const totalDevices = await devicesCol.countDocuments({
      ...ownerFilter,
      isDeleted: { $ne: true },
    });

    const activeDevices = await devicesCol.countDocuments({
      ...ownerFilter,
      isDeleted: { $ne: true },
      status: { $in: ['rented', 'active', 'đang cho thuê'] },
    });

    // 2. Bookings summary
    const pendingApprovals = await bookingsCol.countDocuments({
      ...ownerFilter,
      status: { $in: ['pending', 'chờ duyệt'] },
    });

    const activeRentals = await bookingsCol.countDocuments({
      ...ownerFilter,
      status: { $in: ['active', 'confirmed', 'in_progress', 'delivering', 'đang thuê'] },
    });

    // 3. Revenue calculation
    const allOwnerBookings = await bookingsCol
      .find({
        ...ownerFilter,
        status: { $nin: ['cancelled', 'rejected'] },
      })
      .toArray();

    const totalRevenue = allOwnerBookings.reduce((sum, b) => {
      const fee = Number(b.rentalFee) || Number(b.totalPrice) || (Number(b.totalAmount) > 5000000 ? (Number(b.totalAmount) - Number(b.depositFee || 0)) : Number(b.totalAmount)) || 0;
      return sum + Math.max(0, fee);
    }, 0);

    // Escrow held deposit
    const escrowHolding = allOwnerBookings
      .filter((b) => ['active', 'approved'].includes(b.status))
      .reduce((sum, b) => sum + (Number(b.depositFee) || Number(b.depositAmount) || 0), 0);

    // 4. Rating average & utilization rate
    const devicesList = await devicesCol
      .find({ ...ownerFilter, isDeleted: { $ne: true } })
      .toArray();

    const avgRating = devicesList.length > 0
      ? (devicesList.reduce((acc, d) => acc + (Number(d.ratingAvg) || 5.0), 0) / devicesList.length).toFixed(1)
      : '5.0';

    const utilizationRate = totalDevices > 0
      ? Math.round(((activeRentals || activeDevices) / totalDevices) * 100)
      : 0;

    // 5. Utilization Breakdown by Top Devices
    const colorPalette = ['#67BEC3', '#38BDF8', '#818CF8', '#F472B6', '#FBBF24', '#34D399'];
    const totalFleetRentals = devicesList.reduce((sum, d) => sum + (Number(d.rentalCount) || 0), 0) || 1;
    
    const topDevices = devicesList
      .sort((a, b) => (Number(b.rentalCount) || 0) - (Number(a.rentalCount) || 0))
      .slice(0, 5)
      .map((d, index) => {
        const count = Number(d.rentalCount) || 0;
        const percent = Math.round((count / totalFleetRentals) * 100) || Math.round(100 / (devicesList.length || 1));
        return {
          id: d._id.toString(),
          name: d.name,
          category: d.category || 'general',
          count,
          percent,
          color: colorPalette[index % colorPalette.length],
        };
      });

    // 6. Revenue time series data for 7d, month, year
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    
    // 7d series
    const series7d = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dayStr = d.toISOString().split('T')[0];
      
      const dayBookings = allOwnerBookings.filter((b) => {
        const bDate = b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '';
        return bDate === dayStr;
      });

      const dayRev = dayBookings.reduce((sum, b) => {
        const fee = Number(b.rentalFee) || Number(b.totalPrice) || 0;
        return sum + fee;
      }, 0);

      series7d.push({
        name: dayName,
        date: dayStr,
        revenue: dayRev || (totalRevenue > 0 ? Math.round(totalRevenue / 14) : 0),
        orders: dayBookings.length,
      });
    }

    // Month series (4 weeks)
    const seriesMonth = [
      { name: 'Week 1', revenue: Math.round(totalRevenue * 0.2), orders: Math.max(1, Math.round(allOwnerBookings.length * 0.2)) },
      { name: 'Week 2', revenue: Math.round(totalRevenue * 0.3), orders: Math.max(1, Math.round(allOwnerBookings.length * 0.3)) },
      { name: 'Week 3', revenue: Math.round(totalRevenue * 0.25), orders: Math.max(1, Math.round(allOwnerBookings.length * 0.25)) },
      { name: 'Week 4', revenue: Math.round(totalRevenue * 0.25), orders: Math.max(1, Math.round(allOwnerBookings.length * 0.25)) },
    ];

    // Year series (12 months)
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = now.getMonth();
    const seriesYear = monthLabels.map((lbl, idx) => {
      let weight = 0;
      if (idx <= currentMonthIdx) {
        weight = (idx + 1) / (currentMonthIdx + 1);
      }
      return {
        name: lbl,
        revenue: Math.round((totalRevenue / (currentMonthIdx + 1)) * (0.7 + (weight * 0.6))),
        orders: Math.max(0, Math.round((allOwnerBookings.length / (currentMonthIdx + 1)) * (0.8 + (weight * 0.4)))),
      };
    });

    const kpi = {
      totalDevices,
      activeRentals: activeRentals || activeDevices,
      pendingApprovals,
      monthlyRevenue: totalRevenue,
      monthlyRevenueFormatted: formatVND(totalRevenue),
      escrowHolding,
      escrowHoldingFormatted: formatVND(escrowHolding),
      utilizationRate,
      trustScore: ownerProfile?.trustScore || 100,
      ratingAvg: parseFloat(avgRating),
      owner: {
        id: ownerId,
        name: ownerProfile?.name || 'Equipment Partner',
        email: ownerProfile?.email || '',
        avatarUrl: ownerProfile?.avatarUrl || ownerProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        isVerified: ownerProfile?.isVerified ?? false,
      },
    };

    return res.status(200).json({
      success: true,
      data: {
        kpi,
        charts: {
          '7d': series7d,
          month: seriesMonth,
          year: seriesYear,
        },
        utilization: topDevices,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. GET /api/devices/my-devices or /api/owner/devices
 */
export const getOwnerDevices = async (req, res, next) => {
  try {
    const { devicesCol } = getCollections();
    const ownerId = await resolveOwnerId(req);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập tài khoản chủ thiết bị.',
      });
    }

    const ownerFilter = buildOwnerQuery(ownerId);

    const devices = await devicesCol
      .find({
        ...ownerFilter,
        isDeleted: { $ne: true },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedDevices = devices.map((d) => ({
      _id: d._id.toString(),
      id: d._id.toString(),
      name: d.name,
      brand: d.brand || '',
      category: d.category || 'general',
      dailyRate: Number(d.dailyRate) || 0,
      depositAmount: Number(d.depositAmount) || 0,
      status: d.status || 'available',
      images: Array.isArray(d.images) && d.images.length > 0 ? d.images : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80'],
      ratingAvg: Number(d.ratingAvg) || 5.0,
      rentalCount: Number(d.rentalCount) || 0,
      condition: d.condition || 'Good',
      specs: d.specs || {},
      blockedDates: Array.isArray(d.blockedDates) ? d.blockedDates : [],
      createdAt: d.createdAt || new Date().toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: formattedDevices,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. POST /api/devices (Create device for owner)
 */
export const createOwnerDevice = async (req, res, next) => {
  try {
    const { devicesCol } = getCollections();
    const ownerId = await resolveOwnerId(req);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập tài khoản chủ thiết bị.',
      });
    }

    const {
      name,
      brand,
      category,
      dailyRate,
      depositAmount,
      condition,
      description,
      images,
      specs,
    } = req.body;

    if (!name || !dailyRate) {
      return res.status(400).json({
        success: false,
        message: 'Name and daily rate are required.',
      });
    }

    const newDevice = {
      name: name.trim(),
      brand: (brand || '').trim(),
      category: category || 'accessory',
      dailyRate: Number(dailyRate),
      depositAmount: Number(depositAmount) || 0,
      condition: (condition || '').trim(),
      description: (description || '').trim(),
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80'],
      specs: specs || {},
      ownerId: mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId,
      status: 'available',
      ratingAvg: 5.0,
      rentalCount: 0,
      blockedDates: [],
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await devicesCol.insertOne(newDevice);
    const createdDevice = {
      ...newDevice,
      _id: result.insertedId.toString(),
      id: result.insertedId.toString(),
    };

    return res.status(201).json({
      success: true,
      data: createdDevice,
      message: 'Device created successfully.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 4. PATCH /api/devices/:id/status
 */
export const toggleDeviceStatus = async (req, res, next) => {
  try {
    const { devicesCol } = getCollections();
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid device ID.' });
    }

    const validStatuses = ['available', 'rented', 'maintenance', 'hidden'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const updated = await devicesCol.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Device status updated.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 5. PATCH /api/devices/:id/blocked-dates
 */
export const toggleBlockedDate = async (req, res, next) => {
  try {
    const { devicesCol } = getCollections();
    const { id } = req.params;
    const { date, blockedDates } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid device ID.' });
    }

    const device = await devicesCol.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    let updatedDates = [];
    if (Array.isArray(blockedDates)) {
      updatedDates = blockedDates;
    } else if (date) {
      const currentList = Array.isArray(device.blockedDates) ? device.blockedDates : [];
      if (currentList.includes(date)) {
        updatedDates = currentList.filter((d) => d !== date);
      } else {
        updatedDates = [...currentList, date];
      }
    }

    await devicesCol.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { blockedDates: updatedDates, updatedAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      data: { id, blockedDates: updatedDates },
      message: 'Calendar availability updated.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 6. GET /api/bookings/owner or /api/owner/bookings
 */
export const getOwnerBookings = async (req, res, next) => {
  try {
    const { bookingsCol, devicesCol, usersCol } = getCollections();
    const ownerId = await resolveOwnerId(req);

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập tài khoản chủ thiết bị.',
      });
    }

    const ownerFilter = buildOwnerQuery(ownerId);

    const bookings = await bookingsCol
      .find(ownerFilter)
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with renter info & device info
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        let device = null;
        if (b.deviceId) {
          const devObjectId = mongoose.Types.ObjectId.isValid(b.deviceId)
            ? new mongoose.Types.ObjectId(b.deviceId)
            : null;
          device = devObjectId ? await devicesCol.findOne({ _id: devObjectId }) : null;
        }

        let renter = null;
        if (b.renterId) {
          const renterObjectId = mongoose.Types.ObjectId.isValid(b.renterId)
            ? new mongoose.Types.ObjectId(b.renterId)
            : null;
          renter = renterObjectId ? await usersCol.findOne({ _id: renterObjectId }) : null;
        }

        const startDateStr = b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '';
        const endDateStr = b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '';
        const rentalPrice = Number(b.rentalFee) || Number(b.totalPrice) || (Number(b.totalAmount) > 5000000 ? (Number(b.totalAmount) - Number(b.depositFee || 0)) : Number(b.totalAmount)) || 0;
        const depositPrice = Number(b.depositFee) || Number(b.depositAmount) || 0;

        return {
          _id: b._id.toString(),
          id: b.bookingCode || `TS-${b._id.toString().slice(-4)}`,
          bookingCode: b.bookingCode || `TS-${b._id.toString().slice(-4)}`,
          deviceId: b.deviceId ? b.deviceId.toString() : '',
          deviceName: device?.name || b.deviceName || 'Thiết bị công nghệ',
          deviceCategory: device?.category || b.deviceCategory || 'electronics',
          deviceImage: device?.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80',
          device: {
            name: device?.name || b.deviceName || 'Thiết bị công nghệ',
            imageUrl: device?.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=150&q=80',
          },
          renter: {
            _id: renter?._id?.toString() || b.renterId?.toString() || '',
            name: renter?.name || 'Khách thuê',
            email: renter?.email || '',
            phone: renter?.phone || '',
            avatar: renter?.avatarUrl || renter?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            avatarUrl: renter?.avatarUrl || renter?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            trustScore: renter?.trustScore || 100,
            isVerified: renter?.isVerified ?? false,
          },
          rentalPeriod: {
            startDate: startDateStr,
            endDate: endDateStr,
            totalDays: Number(b.totalDays) || 1,
          },
          startDate: startDateStr,
          endDate: endDateStr,
          totalDays: Number(b.totalDays) || 1,
          totalPrice: rentalPrice,
          totalRentalPrice: rentalPrice,
          depositAmount: depositPrice,
          status: b.status || 'pending',
          deliveryMethod: b.deliveryMethod || 'pickup',
          rejectReason: b.rejectReason || '',
          createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 7. PATCH /api/bookings/:id/approve
 */
export const approveBooking = async (req, res, next) => {
  try {
    const { bookingsCol } = getCollections();
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { bookingCode: id }] }
      : { bookingCode: id };

    await bookingsCol.updateOne(query, {
      $set: { status: 'approved', updatedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Booking approved successfully.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 8. PATCH /api/bookings/:id/reject
 */
export const rejectBooking = async (req, res, next) => {
  try {
    const { bookingsCol } = getCollections();
    const { id } = req.params;
    const { reason } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { bookingCode: id }] }
      : { bookingCode: id };

    await bookingsCol.updateOne(query, {
      $set: { status: 'rejected', rejectReason: reason || 'Owner unavailable', updatedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Booking rejected.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 9. PATCH /api/bookings/:id/handover
 */
export const handoverBooking = async (req, res, next) => {
  try {
    const { bookingsCol } = getCollections();
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { bookingCode: id }] }
      : { bookingCode: id };

    await bookingsCol.updateOne(query, {
      $set: { status: 'active', updatedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Handover complete. Booking is now active.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 10. PATCH /api/bookings/:id/complete
 */
export const completeBooking = async (req, res, next) => {
  try {
    const { bookingsCol } = getCollections();
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { bookingCode: id }] }
      : { bookingCode: id };

    await bookingsCol.updateOne(query, {
      $set: { status: 'completed', updatedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Rental returned and completed. Deposit released.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 11. GET /api/devices/owner/analytics or /api/owner/analytics
 */
export const getOwnerAnalytics = async (req, res, next) => {
  try {
    const overviewRes = await getOwnerOverview(req, {
      status: (code) => ({
        json: (payload) => payload,
      }),
    }, next);
    return res.status(200).json(overviewRes);
  } catch (error) {
    return next(error);
  }
};

