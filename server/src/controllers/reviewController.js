import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Device from '../models/Device.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import {
  reviewError, validateReviewInput, validDeviceReviewStages, ratingSummaryStages,
  calculateRatingSummary, getRatingSummary, mutateDeviceReviews,
} from '../services/reviewService.js';

const matchesAnyId = (target, objIds) => {
  if (!target || !Array.isArray(objIds)) return false;
  const targetStr = String(target._id || target);
  return objIds.some((id) => String(id) === targetStr);
};
const deviceReviewFilter = deviceId => ({ deviceId, targetType: { $in: ['device', null] } });

async function resolveReviewUserContext(req) {
  const rawCandidates = [
    req.user?.userId,
    req.user?._id,
    req.user?.id,
    req.user?.accountId,
    req.headers?.['x-user-id'],
  ].filter(Boolean);

  const objectIdMap = new Map();
  const addId = (val) => {
    if (val && mongoose.isObjectIdOrHexString(String(val._id || val))) {
      const str = String(val._id || val);
      objectIdMap.set(str, new mongoose.Types.ObjectId(str));
    }
  };

  rawCandidates.forEach(addId);
  let primaryUserId = objectIdMap.values().next().value || null;

  try {
    const initialIds = Array.from(objectIdMap.values());
    if (initialIds.length > 0) {
      const matchedUsers = await User.find({
        $or: [
          { _id: { $in: initialIds } },
          { accountId: { $in: initialIds } },
        ],
      })
        .select('_id accountId')
        .lean();

      if (matchedUsers.length > 0) {
        primaryUserId = new mongoose.Types.ObjectId(String(matchedUsers[0]._id));
      }
      matchedUsers.forEach((u) => {
        addId(u._id);
        addId(u.accountId);
      });
    }
  } catch {
    // Fallback to initial IDs
  }

  const userObjIds = Array.from(objectIdMap.values());
  const allValues = [...userObjIds, ...userObjIds.map((id) => String(id))];
  return {
    primaryUserId: primaryUserId || userObjIds[0] || null,
    userObjIds,
    allValues,
  };
}

// Keep request validation and HTTP errors at the controller boundary.
const handleReviewErrors = handler => async (req, res) => {
  try {
    for (const id of [req.params.id, req.params.reviewId].filter(value => value !== undefined)) {
      if (!mongoose.isObjectIdOrHexString(id)) throw reviewError(400, 'Invalid device or review ID.');
    }
    if (req.user) {
      const rawUserId = req.user.userId || req.user._id || req.user.id || req.headers?.['x-user-id'];
      if (!rawUserId || !mongoose.isObjectIdOrHexString(String(rawUserId))) {
        throw reviewError(401, 'Please sign in again.');
      }
      req.user.userId = String(rawUserId);
    }
    await handler(req, res);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'This booking already has a review.' });
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Review API error:', error.name, error.message);
    return res.status(500).json({ success: false, message: 'Unable to process the review request.' });
  }
};

async function findDevice(deviceId) {
  const device = await Device.findOne({ _id: deviceId, isDeleted: { $ne: true } }).lean();
  if (!device) throw reviewError(404, 'Device not found.');
  return device;
}

export const getDeviceReviews = handleReviewErrors(async (req, res) => {
  await findDevice(req.params.id);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 5);
  const sort = req.query.sort ?? 'newest';
  const reviewSortOptions = {
    newest: { createdAt: -1, _id: -1 },
    highest: { rating: -1, createdAt: -1, _id: -1 },
    lowest: { rating: 1, createdAt: -1, _id: -1 },
  };
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 20 ||
      !Number.isSafeInteger((page - 1) * limit) || !Object.hasOwn(reviewSortOptions, sort)) {
    throw reviewError(400, 'Invalid review page, limit or sort order.');
  }
  const [result] = await Review.aggregate([
    ...validDeviceReviewStages(req.params.id),
    { $facet: {
      summary: ratingSummaryStages,
      reviews: [
        { $sort: reviewSortOptions[sort] }, { $skip: (page - 1) * limit }, { $limit: limit },
        {
          $lookup: {
            from: 'users',
            let: { rId: '$renterId', revId: '$reviewerId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$_id', '$$rId'] },
                      { $eq: ['$accountId', '$$rId'] },
                      { $eq: ['$_id', '$$revId'] },
                      { $eq: ['$accountId', '$$revId'] },
                    ],
                  },
                },
              },
              { $project: { name: 1, username: 1, avatar: 1 } },
            ],
            as: 'author',
          },
        },
        { $project: { _id: 1, bookingId: 1, rating: 1, comment: 1, images: 1, createdAt: 1, updatedAt: 1, ownerReply: 1,
          reviewerId: { $ifNull: ['$reviewerId', '$renterId'] },
          author: { $arrayElemAt: ['$author', 0] }, verifiedRenter: '$_verifiedRenter' } },
      ],
    } },
  ]);
  const summary = calculateRatingSummary(result.summary);
  res.json({ success: true, data: result.reviews, summary,
    pagination: { page, limit, total: summary.ratingCount, totalPages: Math.max(1, Math.ceil(summary.ratingCount / limit)) } });
});

export const getDeviceRatingSummary = handleReviewErrors(async (req, res) => {
  await findDevice(req.params.id);
  res.json({ success: true, data: await getRatingSummary(req.params.id) });
});

export const getReviewEligibility = handleReviewErrors(async (req, res) => {
  const device = await findDevice(req.params.id);
  const { userObjIds, allValues } = await resolveReviewUserContext(req);
  const deviceOwner = device.ownerId || device.owner;

  if (matchesAnyId(deviceOwner, userObjIds)) {
    return res.json({ success: true, data: { canReview: false, bookings: [], reason: 'Owners cannot review their own devices.' } });
  }

  const reviewedBookings = await Review.distinct('bookingId', deviceReviewFilter(req.params.id));
  const deviceObjId = new mongoose.Types.ObjectId(String(req.params.id));

  const bookings = await Booking.find({
    $and: [
      { $or: [{ deviceId: deviceObjId }, { device: deviceObjId }, { deviceId: String(req.params.id) }, { device: String(req.params.id) }] },
      { $or: [{ renterId: { $in: allValues } }, { renter: { $in: allValues } }] },
      { status: 'completed' },
      { _id: { $nin: reviewedBookings } },
    ],
  })
    .select('_id bookingCode startDate endDate')
    .sort({ endDate: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      canReview: bookings.length > 0,
      bookings,
      reason: bookings.length ? '' : 'Complete a rental to review this device. Each booking can be reviewed once.',
    },
  });
});

export const createReview = handleReviewErrors(async (req, res) => {
  const input = validateReviewInput(req.body);
  if (!mongoose.isObjectIdOrHexString(req.body.bookingId)) throw reviewError(400, 'A valid booking is required.');
  const { primaryUserId, userObjIds, allValues } = await resolveReviewUserContext(req);

  const result = await mutateDeviceReviews(req.params.id, async (session, device) => {
    const deviceOwner = device.ownerId || device.owner;
    if (matchesAnyId(deviceOwner, userObjIds)) throw reviewError(403, 'Owners cannot review their own devices.');

    const booking = await Booking.findOne({
      _id: req.body.bookingId,
      $and: [
        { $or: [{ deviceId: device._id }, { device: device._id }, { deviceId: String(device._id) }, { device: String(device._id) }] },
        { $or: [{ renterId: { $in: allValues } }, { renter: { $in: allValues } }] },
      ],
      status: 'completed',
    }).session(session);

    const bookingOwner = booking?.ownerId || booking?.owner || deviceOwner;
    if (!booking || matchesAnyId(bookingOwner, userObjIds)) {
      throw reviewError(403, 'Only the renter of a completed booking can review this device.');
    }

    const existing = await Review.exists({ ...deviceReviewFilter(device._id), bookingId: booking._id }).session(session);
    if (existing) throw reviewError(409, 'This booking already has a review.');

    const effectiveRenterId = primaryUserId || booking.renterId || booking.renter;
    const effectiveOwnerId = bookingOwner;

    const [review] = await Review.create([{
      ...input,
      deviceId: device._id,
      bookingId: booking._id,
      reviewerId: effectiveRenterId,
      renterId: effectiveRenterId,
      ownerId: effectiveOwnerId,
      targetType: 'device',
    }], { session });

    await Booking.updateOne({ _id: booking._id }, { $set: { isReviewed: true } }, { session });
    return review;
  });
  res.status(201).json({ success: true, ...result });
});

async function findOwnReview(req, session) {
  const { userObjIds } = await resolveReviewUserContext(req);
  const review = await Review.findOne({ _id: req.params.reviewId, ...deviceReviewFilter(req.params.id) }).session(session);
  if (!review) throw reviewError(404, 'Review not found.');
  const isAuthor = matchesAnyId(review.reviewerId, userObjIds) || matchesAnyId(review.renterId, userObjIds);
  if (!isAuthor) throw reviewError(403, 'You can only change your own review.');
  return review;
}

export const updateReview = handleReviewErrors(async (req, res) => {
  const input = validateReviewInput(req.body);
  const result = await mutateDeviceReviews(req.params.id, async session => {
    const review = await findOwnReview(req, session);
    review.rating = input.rating;
    review.comment = input.comment;
    return review.save({ session });
  });
  res.json({ success: true, ...result });
});

export const deleteReview = handleReviewErrors(async (req, res) => {
  const result = await mutateDeviceReviews(req.params.id, async session => {
    const review = await findOwnReview(req, session);
    const bookingId = review.bookingId;
    await review.deleteOne({ session });
    if (bookingId) {
      await Booking.updateOne({ _id: bookingId }, { $set: { isReviewed: false } }, { session });
    }
    return null;
  });
  res.json({ success: true, ...result });
});

export const replyToReview = handleReviewErrors(async (req, res) => {
  const input = validateReviewInput(req.body, true);
  const { primaryUserId, userObjIds } = await resolveReviewUserContext(req);
  const result = await mutateDeviceReviews(req.params.id, async (session, device) => {
    const deviceOwner = device.ownerId || device.owner;
    if (!matchesAnyId(deviceOwner, userObjIds)) throw reviewError(403, 'Only the device owner can reply.');
    const review = await Review.findOne({ _id: req.params.reviewId, ...deviceReviewFilter(device._id) }).session(session);
    if (!review) throw reviewError(404, 'Review not found.');
    review.ownerReply = { ownerId: primaryUserId || req.user.userId, comment: input.comment, updatedAt: new Date() };
    return review.save({ session });
  });
  res.json({ success: true, ...result });
});
