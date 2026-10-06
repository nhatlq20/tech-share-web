import mongoose from 'mongoose';
import Device from '../models/Device.js';

/**
 * Helper to get MongoDB collections safely if Mongoose connection is ready
 */
const getDevicesCollection = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not initialized yet.');
  }
  return db.collection('devices');
};

/**
 * 1. GET /api/devices
 * Fetches paginated devices with search (q/keyword), category, pagination (page, limit) and sorting.
 */
export const getDevices = async (req, res, next) => {
  try {
    const { q, keyword, category, page = 1, limit = 12, sort } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {
      isDeleted: { $ne: true },
    };

    // Category filter (ignore 'all' or empty)
    if (category && typeof category === 'string' && category.trim().toLowerCase() !== 'all') {
      filter.category = category.trim().toLowerCase();
    }

    // Search query (keyword or q)
    const searchTerm = (q || keyword || '').toString().trim();
    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i');
      filter.$or = [
        { title: regex },
        { name: regex },
        { brand: regex },
        { description: regex },
      ];
    }

    // Build sort options
    let sortOptions = { createdAt: -1 };
    if (sort && typeof sort === 'string') {
      const trimmedSort = sort.trim();
      if (trimmedSort === 'dailyRate' || trimmedSort === 'pricePerDay') {
        sortOptions = { dailyRate: 1 };
      } else if (trimmedSort === '-dailyRate' || trimmedSort === '-pricePerDay') {
        sortOptions = { dailyRate: -1 };
      } else if (trimmedSort === 'rating' || trimmedSort === 'ratingAvg') {
        sortOptions = { rating: -1 };
      } else if (trimmedSort === 'oldest') {
        sortOptions = { createdAt: 1 };
      } else if (trimmedSort === 'newest') {
        sortOptions = { createdAt: -1 };
      }
    }

    // Query using Mongoose model if connected, or direct collection
    let devices = [];
    let total = 0;

    if (mongoose.connection.readyState === 1) {
      total = await Device.countDocuments(filter);
      devices = await Device.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true });
    } else {
      // Fallback to direct collection if model is not bound
      const devicesCol = getDevicesCollection();
      total = await devicesCol.countDocuments(filter);
      devices = await devicesCol
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .toArray();
    }

    // Normalize output fields
    const normalizedDevices = devices.map((d) => ({
      _id: d._id ? d._id.toString() : '',
      title: d.title || d.name || 'Untitled Device',
      name: d.name || d.title || 'Untitled Device',
      brand: d.brand || '',
      category: d.category || 'other',
      condition: d.condition || 'good',
      dailyRate: d.dailyRate ?? d.pricePerDay ?? 0,
      pricePerDay: d.pricePerDay ?? d.dailyRate ?? 0,
      depositValue: d.depositValue || 0,
      rating: d.rating ?? d.ratingAvg ?? 5.0,
      ratingAvg: d.ratingAvg ?? d.rating ?? 5.0,
      reviewCount: d.reviewCount || 0,
      images: Array.isArray(d.images) ? d.images : [],
      location: d.location || { type: 'Point', coordinates: [105.7826, 21.0285] },
      address: d.address || '',
      status: d.status || 'available',
      createdAt: d.createdAt || new Date(),
    }));

    return res.status(200).json({
      success: true,
      count: normalizedDevices.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: normalizedDevices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/devices/nearby
 * Fetches devices within radius from lat/lng
 */
export const getNearbyDevices = async (req, res, next) => {
  try {
    const { lat, lng, latitude, longitude, radius = 10000 } = req.query;

    const userLat = parseFloat(lat ?? latitude);
    const userLng = parseFloat(lng ?? longitude);
    const maxDistance = parseFloat(radius) || 10000;

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message: 'Valid coordinates (lat, lng) are required.',
      });
    }

    const query = {
      isDeleted: { $ne: true },
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat],
          },
          $maxDistance: maxDistance,
        },
      },
    };

    let devices = [];
    if (mongoose.connection.readyState === 1) {
      devices = await Device.find(query).limit(50).lean({ virtuals: true });
    } else {
      const devicesCol = getDevicesCollection();
      devices = await devicesCol.find(query).limit(50).toArray();
    }

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    // If geospatial index is not created yet, fallback to find without $nearSphere
    try {
      const devices = await Device.find({ isDeleted: { $ne: true } }).limit(20).lean({ virtuals: true });
      return res.status(200).json({
        success: true,
        count: devices.length,
        data: devices,
      });
    } catch (fallbackError) {
      next(error);
    }
  }
};

/**
 * 3. GET /api/devices/:id
 * Fetches a single device by ID
 */
export const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === 'nearby' || id === 'owner') {
      return res.status(400).json({ success: false, message: 'Invalid device ID' });
    }

    let device = null;
    if (mongoose.isValidObjectId(id)) {
      device = await Device.findOne({ _id: id, isDeleted: { $ne: true } }).lean({ virtuals: true });
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDevices,
  getNearbyDevices,
  getDeviceById,
};
