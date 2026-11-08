import mongoose from 'mongoose';
import User from '../models/User.js';
import Device from '../models/Device.js';
import Wishlist from '../models/Wishlist.js';

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
 * Build candidate ObjectIds for querying the `wishlists` collection
 * across both `user._id` and `user.accountId` (ensuring App and Web share 100% of items).
 */
const getUserCandidateObjectIds = (user, req) => {
  const raw = [
    user?._id,
    user?.accountId,
    req?.user?.userId,
    req?.user?._id,
    req?.user?.id,
    req?.user?.accountId,
  ].filter(Boolean);

  const ids = [];
  const seen = new Set();
  for (const val of raw) {
    const str = String(val._id || val).trim();
    if (mongoose.isValidObjectId(str) && !seen.has(str)) {
      seen.add(str);
      ids.push(new mongoose.Types.ObjectId(str));
    }
  }
  return ids;
};

/**
 * Migrate any legacy `user.wishlist` array items into the `wishlists` collection
 * (matching `tech-share-app/server/src/controllers/profileController.js`).
 */
const syncLegacyUserWishlistToCollection = async (user) => {
  if (!user || !Array.isArray(user.wishlist) || user.wishlist.length === 0) {
    return;
  }
  const primaryUserId = user._id;
  for (const devId of user.wishlist) {
    const str = String(devId || '').trim();
    if (mongoose.isValidObjectId(str)) {
      await Wishlist.findOneAndUpdate(
        { userId: primaryUserId, deviceId: new mongoose.Types.ObjectId(str) },
        { userId: primaryUserId, deviceId: new mongoose.Types.ObjectId(str) },
        { upsert: true, new: true }
      );
    }
  }
};

/**
 * Normalize a Device document for frontend cards & WishlistPage (synced with App & Web)
 */
const normalizeWishlistDevice = (device) => {
  if (!device) return null;
  const dailyRate = device.dailyRate ?? device.pricePerDay ?? 0;
  const depositValue = device.depositValue ?? device.depositAmount ?? 0;
  const ratingAvg = device.rating ?? device.stats?.ratingAvg ?? 5.0;
  const reviewCount = device.reviewCount ?? device.stats?.reviewCount ?? 0;
  return {
    ...device,
    _id: String(device._id),
    id: String(device._id),
    title: device.title || device.name || 'Tech Device',
    name: device.name || device.title || 'Tech Device',
    brand: device.brand || 'TECH',
    dailyRate,
    pricePerDay: dailyRate,
    depositValue,
    depositAmount: depositValue,
    rating: ratingAvg,
    reviewCount,
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
 * 1. GET /api/users/wishlist (or /api/profile/wishlist)
 * Reads the user's wishlist from the shared MongoDB `wishlists` collection
 * (and migrates any legacy `users.wishlist` items).
 */
export const getWishlist = async (req, res, next) => {
  try {
    const user = await findCurrentUserDoc(req);

    const rawQueryIds =
      typeof req.query?.ids === 'string' && req.query.ids.trim()
        ? req.query.ids
            .split(',')
            .map((s) => s.trim())
            .filter((id) => mongoose.isValidObjectId(id))
        : [];

    let finalIdStrings = [];

    if (user) {
      await syncLegacyUserWishlistToCollection(user);

      const candidateUserIds = getUserCandidateObjectIds(user, req);
      const primaryUserId = user._id;

      // Read from the shared `wishlists` collection sorted newest first
      const wishlistDocs = await Wishlist.find({
        userId: { $in: candidateUserIds },
      })
        .sort({ createdAt: -1 })
        .lean();

      const dbIds = [];
      const seenDb = new Set();
      for (const doc of wishlistDocs) {
        const dStr = String(doc.deviceId || '');
        if (mongoose.isValidObjectId(dStr) && !seenDb.has(dStr)) {
          seenDb.add(dStr);
          dbIds.push(dStr);
        }
      }

      // If client explicitly requests merging local IDs on initial load (`merge=true`)
      if (req.query?.merge === 'true' && rawQueryIds.length > 0) {
        for (const qId of rawQueryIds) {
          if (!seenDb.has(qId)) {
            seenDb.add(qId);
            dbIds.push(qId);
            await Wishlist.findOneAndUpdate(
              { userId: primaryUserId, deviceId: new mongoose.Types.ObjectId(qId) },
              { userId: primaryUserId, deviceId: new mongoose.Types.ObjectId(qId) },
              { upsert: true, new: true }
            );
          }
        }
      }

      finalIdStrings = dbIds;
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
      wishlist: devices,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. POST /api/users/favorites/:deviceId (or POST /api/profile/wishlist/toggle/:deviceId)
 * Toggles (or explicitly adds/removes) a device in the shared MongoDB `wishlists` collection.
 */
export const toggleWishlistDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId || !mongoose.isValidObjectId(deviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID.',
      });
    }

    const user = await findCurrentUserDoc(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Please sign in to save devices to your wishlist.',
      });
    }

    await syncLegacyUserWishlistToCollection(user);

    const candidateUserIds = getUserCandidateObjectIds(user, req);
    const primaryUserId = user._id;
    const deviceObjId = new mongoose.Types.ObjectId(String(deviceId));

    const existing = await Wishlist.findOne({
      userId: { $in: candidateUserIds },
      deviceId: deviceObjId,
    });

    const explicitAction = req.body?.action; // optional: 'add' | 'remove' | undefined (toggle)
    let isFavorite;

    if (explicitAction === 'add' || (!explicitAction && !existing)) {
      if (!existing) {
        await Wishlist.findOneAndUpdate(
          { userId: primaryUserId, deviceId: deviceObjId },
          { userId: primaryUserId, deviceId: deviceObjId },
          { upsert: true, new: true }
        );
      }
      isFavorite = true;
    } else {
      await Wishlist.deleteMany({
        userId: { $in: candidateUserIds },
        deviceId: deviceObjId,
      });
      isFavorite = false;
    }

    // Keep user.wishlist in sync for any legacy queries
    const updatedDocs = await Wishlist.find({
      userId: { $in: candidateUserIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const nextIds = Array.from(
      new Set(updatedDocs.map((doc) => String(doc.deviceId)))
    );

    user.wishlist = nextIds.map((id) => new mongoose.Types.ObjectId(id));
    await user.save();

    const devices = await fetchDevicesByIds(nextIds);
    const validIds = devices.map((d) => String(d._id));

    return res.status(200).json({
      success: true,
      isFavorite,
      isInWishlist: isFavorite,
      message: isFavorite
        ? 'Added device to wishlist'
        : 'Removed device from wishlist',
      wishlistIds: validIds,
      data: devices,
      wishlist: devices,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. DELETE /api/users/wishlist/:deviceId
 * Explicitly removes a device from the shared `wishlists` collection.
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
        message: 'Please sign in to perform this action.',
      });
    }

    const candidateUserIds = getUserCandidateObjectIds(user, req);
    await Wishlist.deleteMany({ userId: { $in: candidateUserIds } });

    user.wishlist = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cleared wishlist.',
      wishlistIds: [],
      data: [],
      wishlist: [],
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
