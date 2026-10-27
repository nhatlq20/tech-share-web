import mongoose from 'mongoose';
import User from '../models/User.js';
import Device from '../models/Device.js';

/**
 * Resolve the current user document from JWT token, X-User-Id header, or query/body userId.
 * Matches against both User._id and User.accountId so all auth token shapes work seamlessly.
 */
const findCurrentUserDoc = async (req) => {
  const rawCandidates = [
    req.user?.userId,
    req.user?._id,
    req.user?.id,
    req.user?.accountId,
    req.headers?.['x-user-id'],
    req.query?.userId,
    req.body?.userId,
  ].filter(Boolean);

  const validObjIds = [];
  const seen = new Set();
  for (const val of rawCandidates) {
    const str = String(val._id || val).trim();
    if (mongoose.isValidObjectId(str) && !seen.has(str)) {
      seen.add(str);
      validObjIds.push(new mongoose.Types.ObjectId(str));
    }
  }

  if (validObjIds.length > 0) {
    const user = await User.findOne({
      $or: [
        { _id: { $in: validObjIds } },
        { accountId: { $in: validObjIds } },
      ],
    });
    if (user) return user;
  }

  if (req.user?.username || req.user?.email) {
    const orConds = [];
    if (req.user.username) orConds.push({ username: req.user.username });
    if (req.user.email) orConds.push({ email: req.user.email });
    const user = await User.findOne({ $or: orConds });
    if (user) return user;
  }

  return null;
};

/**
 * Normalize a Device document for frontend cards & WishlistPage
 */
const normalizeWishlistDevice = (device) => {
  if (!device) return null;
  const dailyRate = device.dailyRate ?? device.pricePerDay ?? 0;
  const depositValue = device.depositValue ?? device.depositAmount ?? 0;
  return {
    ...device,
    _id: String(device._id),
    id: String(device._id),
    title: device.title || device.name || 'Thiết bị công nghệ',
    name: device.name || device.title || 'Thiết bị công nghệ',
    dailyRate,
    pricePerDay: dailyRate,
    depositValue,
    depositAmount: depositValue,
    address: device.address || device.location?.addressText || '',
  };
};

/**
 * Fetch populated Device documents preserving the order of deviceIds
 */
const fetchDevicesByIds = async (deviceIds = []) => {
  const validIds = [];
  const seen = new Set();
  for (const rawId of deviceIds) {
    const str = String(rawId || '').trim();
    if (mongoose.isValidObjectId(str) && !seen.has(str)) {
      seen.add(str);
      validIds.push(new mongoose.Types.ObjectId(str));
    }
  }

  if (validIds.length === 0) return [];

  const docs = await Device.find({
    _id: { $in: validIds },
    isDeleted: { $ne: true },
  })
    .populate('ownerId', 'name email avatar trust rating isVerified')
    .populate('owner', 'name email avatar trust rating isVerified')
    .lean();

  const docMap = new Map(docs.map((d) => [String(d._id), normalizeWishlistDevice(d)]));
  return validIds.map((id) => docMap.get(String(id))).filter(Boolean);
};

/**
 * 1. GET /api/users/wishlist (or /api/users/favorites)
 * Reads the user's wishlist from MongoDB `users.wishlist` (and merges any optional `?ids=` from localStorage).
 */
export const getWishlist = async (req, res, next) => {
  try {
    const user = await findCurrentUserDoc(req);

    // Parse optional comma-separated IDs passed from client localStorage
    const rawQueryIds = typeof req.query?.ids === 'string' && req.query.ids.trim()
      ? req.query.ids.split(',').map((s) => s.trim()).filter((id) => mongoose.isValidObjectId(id))
      : [];

    let finalIdStrings = [];

    if (user) {
      const dbIds = Array.isArray(user.wishlist)
        ? user.wishlist.map((id) => String(id)).filter((id) => mongoose.isValidObjectId(id))
        : [];

      // If client explicitly requests merging local IDs on initial load (`merge=true`)
      if (req.query?.merge === 'true' && rawQueryIds.length > 0) {
        const mergedSet = new Set([...dbIds, ...rawQueryIds]);
        finalIdStrings = Array.from(mergedSet);
        if (finalIdStrings.length !== dbIds.length) {
          user.wishlist = finalIdStrings.map((id) => new mongoose.Types.ObjectId(id));
          await user.save();
        }
      } else {
        finalIdStrings = dbIds;
      }
    } else {
      finalIdStrings = rawQueryIds;
    }

    const devices = await fetchDevicesByIds(finalIdStrings);
    const validExistingIds = devices.map((d) => String(d._id));

    return res.status(200).json({
      success: true,
      count: devices.length,
      wishlistIds: validExistingIds,
      data: devices,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. POST /api/users/favorites/:deviceId (or POST /api/users/wishlist/:deviceId)
 * Toggles (or explicitly adds/removes) a device in `users.wishlist` in MongoDB.
 */
export const toggleWishlistDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId || !mongoose.isValidObjectId(deviceId)) {
      return res.status(400).json({
        success: false,
        message: 'ID thiết bị không hợp lệ.',
      });
    }

    const user = await findCurrentUserDoc(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để đồng bộ danh sách yêu thích.',
      });
    }

    const targetStr = String(deviceId);
    const currentIds = Array.isArray(user.wishlist)
      ? user.wishlist.map((id) => String(id)).filter((id) => mongoose.isValidObjectId(id))
      : [];

    const exists = currentIds.includes(targetStr);
    const explicitAction = req.body?.action; // optional: 'add' | 'remove' | undefined (toggle)

    let isFavorite;
    let nextIds;

    if (explicitAction === 'add' || (!explicitAction && !exists)) {
      nextIds = exists ? currentIds : [targetStr, ...currentIds];
      isFavorite = true;
    } else {
      nextIds = currentIds.filter((id) => id !== targetStr);
      isFavorite = false;
    }

    user.wishlist = nextIds.map((id) => new mongoose.Types.ObjectId(id));
    await user.save();

    const devices = await fetchDevicesByIds(nextIds);

    return res.status(200).json({
      success: true,
      isFavorite,
      message: isFavorite
        ? 'Đã thêm thiết bị vào danh sách yêu thích!'
        : 'Đã xóa thiết bị khỏi danh sách yêu thích.',
      wishlistIds: devices.map((d) => String(d._id)),
      data: devices,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. DELETE /api/users/wishlist/:deviceId
 * Explicitly removes a device from `users.wishlist` in MongoDB.
 */
export const removeWishlistDevice = async (req, res, next) => {
  req.body = { ...req.body, action: 'remove' };
  return toggleWishlistDevice(req, res, next);
};

/**
 * 4. DELETE /api/users/wishlist
 * Clears all devices from the authenticated user's wishlist in MongoDB.
 */
export const clearWishlist = async (req, res, next) => {
  try {
    const user = await findCurrentUserDoc(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để thực hiện thao tác này.',
      });
    }

    user.wishlist = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Đã xóa toàn bộ danh sách yêu thích.',
      wishlistIds: [],
      data: [],
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getWishlist,
  toggleWishlistDevice,
  removeWishlistDevice,
  clearWishlist,
};

