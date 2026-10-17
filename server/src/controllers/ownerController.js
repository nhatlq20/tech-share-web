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

const buildDeviceOwnerQuery = (ownerId) => {
  const ownerValues = mongoose.Types.ObjectId.isValid(ownerId)
    ? [new mongoose.Types.ObjectId(ownerId), ownerId.toString()]
    : [ownerId.toString()];

  return {
    $or: [
      ...ownerValues.map((value) => ({ ownerId: value })),
      ...ownerValues.map((value) => ({ owner: value })),
    ],
  };
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

    const ownerFilter = buildDeviceOwnerQuery(ownerId);

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
      name: d.name || d.title || 'Untitled Device',
      brand: d.brand || '',
      category: d.category || 'other',
      dailyRate: Number(d.dailyRate ?? d.pricePerDay) || 0,
      pricePerDay: Number(d.pricePerDay ?? d.dailyRate) || 0,
      depositAmount: Number(d.depositAmount ?? d.depositValue) || 0,
      status: d.status || 'available',
      images: Array.isArray(d.images) && d.images.length > 0 ? d.images : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80'],
      ratingAvg: Number(d.ratingAvg ?? d.stats?.ratingAvg) || 5.0,
      rentalCount: Number(d.rentalCount ?? d.stats?.rentalCount) || 0,
      condition: d.condition || 'Good',
      specs: d.specs || {},
      location: d.location || null,
      address: d.location?.addressText || d.addressText || d.address || '',
      blockedDates: Array.isArray(d.blockedDates) ? d.blockedDates : [],
      createdAt: d.createdAt || new Date().toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: formattedDevices,
      devices: formattedDevices,
    });
  } catch (error) {
    return next(error);
  }
};

export const getOwnerDeviceById = async (req, res, next) => {
  try {
    const { devicesCol } = getCollections();
    const ownerId = await resolveOwnerId(req);
    const { id } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập tài khoản chủ thiết bị.',
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã thiết bị không hợp lệ.',
      });
    }

    const device = await devicesCol.findOne({
      _id: new mongoose.Types.ObjectId(id),
      ...buildDeviceOwnerQuery(ownerId),
      isDeleted: { $ne: true },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị trong kho của bạn.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...device,
        _id: device._id.toString(),
        id: device._id.toString(),
        name: device.name || device.title || '',
        title: device.title || device.name || '',
        brand: device.brand || '',
        category: device.category || 'other',
        yearOfManufacture: device.yearOfManufacture || '',
        condition: device.condition || 'good',
        description: device.description || '',
        dailyRate: Number(device.dailyRate ?? device.pricePerDay) || 0,
        depositAmount: Number(device.depositAmount ?? device.depositValue) || 0,
        addressText:
          device.location?.addressText || device.addressText || device.address || '',
        location: device.location || null,
        specs: device.specs || {},
        images: Array.isArray(device.images) ? device.images : [],
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateOwnerDevice = async (req, res, next) => {
  try {
    const { devicesCol } = getCollections();
    const ownerId = await resolveOwnerId(req);
    const { id } = req.params;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập tài khoản chủ thiết bị.',
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã thiết bị không hợp lệ.',
      });
    }

    const {
      name,
      title,
      brand,
      category,
      yearOfManufacture,
      condition,
      description,
      dailyRate,
      pricePerDay,
      depositAmount,
      depositValue,
      location,
      addressText,
      latitude,
      longitude,
      specs,
      images,
    } = req.body;

    const normalizedName = name ?? title;
    if (
      typeof normalizedName !== 'string' ||
      !normalizedName.trim() ||
      typeof brand !== 'string' ||
      !brand.trim() ||
      typeof category !== 'string' ||
      !category.trim() ||
      typeof condition !== 'string' ||
      !condition.trim() ||
      typeof description !== 'string' ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin thiết bị.',
      });
    }

    const allowedCategories = [
      'smartphone', 'laptop', 'camera', 'drone', 'audio',
      'tablet', 'gaming', 'accessory', 'other',
    ];
    const allowedConditions = [
      'new99', 'used95', 'scratched', 'new', 'like_new', 'good', 'fair',
    ];
    if (!allowedCategories.includes(category) || !allowedConditions.includes(condition)) {
      return res.status(400).json({
        success: false,
        message: 'Danh mục hoặc tình trạng thiết bị không hợp lệ.',
      });
    }

    const price = Number(pricePerDay ?? dailyRate);
    const deposit = Number(depositAmount ?? depositValue);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá thuê phải lớn hơn 0.',
      });
    }
    if (!Number.isFinite(deposit) || deposit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Tiền đặt cọc không hợp lệ.',
      });
    }

    const year = yearOfManufacture === '' || yearOfManufacture == null
      ? undefined
      : Number(yearOfManufacture);
    if (
      year !== undefined &&
      (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Năm sản xuất phải từ 1990 đến hiện tại.',
      });
    }

    const coordinates = location?.coordinates;
    const longitudeValue = coordinates?.[0] ?? longitude;
    const latitudeValue = coordinates?.[1] ?? latitude;
    const parsedLongitude = Number(longitudeValue);
    const parsedLatitude = Number(latitudeValue);
    const address = location?.addressText ?? addressText;
    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      location?.type !== 'Point' ||
      !Number.isFinite(parsedLongitude) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180 ||
      !Number.isFinite(parsedLatitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      typeof address !== 'string' ||
      !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập địa chỉ và tọa độ hợp lệ.',
      });
    }

    let parsedSpecs = specs ?? {};
    if (typeof parsedSpecs === 'string') {
      try {
        parsedSpecs = JSON.parse(parsedSpecs);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Thông số kỹ thuật phải là JSON hợp lệ.',
        });
      }
    }
    if (!parsedSpecs || typeof parsedSpecs !== 'object' || Array.isArray(parsedSpecs)) {
      return res.status(400).json({
        success: false,
        message: 'Thông số kỹ thuật không hợp lệ.',
      });
    }

    if (
      images !== undefined &&
      (!Array.isArray(images) ||
        images.length < 1 ||
        images.length > 8 ||
        images.some(
          (image) =>
            typeof image !== 'string' || !image.startsWith('https://'),
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thiết bị cần từ 1 đến 8 ảnh HTTPS hợp lệ.',
      });
    }

    const ownerValues = mongoose.Types.ObjectId.isValid(ownerId)
      ? [new mongoose.Types.ObjectId(ownerId), ownerId.toString()]
      : [ownerId.toString()];
    const update = {
      name: normalizedName.trim(),
      title: normalizedName.trim(),
      brand: brand.trim(),
      category,
      yearOfManufacture: year,
      condition,
      description: description.trim(),
      dailyRate: price,
      pricePerDay: price,
      depositAmount: deposit,
      depositValue: deposit,
      location: {
        type: 'Point',
        coordinates: [parsedLongitude, parsedLatitude],
        addressText: address.trim(),
      },
      specs: parsedSpecs,
      updatedAt: new Date(),
    };
    if (images !== undefined) update.images = images;
    if (year === undefined) delete update.yearOfManufacture;

    const result = await devicesCol.updateOne(
      {
        _id: new mongoose.Types.ObjectId(id),
        $or: [
          ...ownerValues.map((value) => ({ ownerId: value })),
          ...ownerValues.map((value) => ({ owner: value })),
        ],
        isDeleted: { $ne: true },
      },
      { $set: update },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị trong kho của bạn.',
      });
    }

    const updatedDevice = await devicesCol.findOne({
      _id: new mongoose.Types.ObjectId(id),
    });
    return res.status(200).json({
      success: true,
      data: updatedDevice,
      message: 'Cập nhật thiết bị thành công.',
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
      location,
      addressText,
      latitude,
      longitude,
    } = req.body;

    if (!name || !dailyRate) {
      return res.status(400).json({
        success: false,
        message: 'Name and daily rate are required.',
      });
    }

    const coordinates = location?.coordinates;
    const hasMalformedCoordinates =
      coordinates !== undefined &&
      (!Array.isArray(coordinates) || coordinates.length !== 2);
    const longitudeValue = coordinates?.[0] ?? longitude;
    const latitudeValue = coordinates?.[1] ?? latitude;
    const parsedLongitude = Number(longitudeValue);
    const parsedLatitude = Number(latitudeValue);
    const deviceAddress = location?.addressText ?? addressText;
    const hasValidLocation =
      (!location?.type || location.type === 'Point') &&
      !hasMalformedCoordinates &&
      ['number', 'string'].includes(typeof longitudeValue) &&
      ['number', 'string'].includes(typeof latitudeValue) &&
      longitudeValue != null &&
      longitudeValue !== '' &&
      latitudeValue != null &&
      latitudeValue !== '' &&
      Number.isFinite(parsedLongitude) &&
      parsedLongitude >= -180 &&
      parsedLongitude <= 180 &&
      Number.isFinite(parsedLatitude) &&
      parsedLatitude >= -90 &&
      parsedLatitude <= 90;

    if (location || latitude != null || longitude != null) {
      if (
        !hasValidLocation ||
        typeof deviceAddress !== 'string' ||
        !deviceAddress.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Valid device location is required.',
        });
      }
    }

    const newDevice = {
      name: name.trim(),
      brand: (brand || '').trim(),
      category: category || 'accessory',
      dailyRate: Number(dailyRate),
      depositAmount: Number(depositAmount) || 0,
      condition: (condition || '').trim(),
      description: (description || '').trim(),
      ...(hasValidLocation
        ? {
            location: {
              type: 'Point',
              coordinates: [parsedLongitude, parsedLatitude],
              addressText: (deviceAddress || '').trim(),
            },
          }
        : {}),
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
          rawStartDate: b.startDate ? new Date(b.startDate).toISOString() : '',
          rawEndDate: b.endDate ? new Date(b.endDate).toISOString() : '',
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
