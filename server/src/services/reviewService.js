import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Device from '../models/Device.js';
import User from '../models/User.js';

export const REVIEW_MAX_LENGTH = 2000;

export const reviewError = (status, message) => Object.assign(new Error(message), { status });

export function validateReviewInput(body, replyOnly = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw reviewError(400, 'A review body is required.');
  }
  if (!replyOnly && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) {
    throw reviewError(400, 'Choose a whole-number rating from 1 to 5.');
  }
  if (typeof body.comment !== 'string' || !body.comment.trim() || body.comment.trim().length > REVIEW_MAX_LENGTH) {
    throw reviewError(400, `Review text must contain 1–${REVIEW_MAX_LENGTH} characters.`);
  }
  return { ...(!replyOnly ? { rating: body.rating } : {}), comment: body.comment.trim() };
}

// Imported reviews can outlive their original booking after a database migration.
// Keep them visible, but only verify them when the completed booking still matches.
// Exclude hidden or moderated-out reviews so device rating statistics stay accurate.
export const validDeviceReviewStages = (deviceId) => [
  {
    $match: {
      deviceId: new mongoose.Types.ObjectId(deviceId),
      targetType: { $in: ['device', null] },
      rating: { $in: [1, 2, 3, 4, 5] },
      comment: { $type: 'string', $regex: '\\S' },
      isHidden: { $ne: true },
      moderationStatus: { $ne: 'hidden' },
    },
  },
  { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'verifiedBooking' } },
  {
    $set: {
      _verifiedRenter: {
        $let: {
          vars: { booking: { $arrayElemAt: ['$verifiedBooking', 0] } },
          in: {
            $and: [
              { $eq: ['$$booking.status', 'completed'] },
              {
                $or: [
                  { $eq: ['$deviceId', '$$booking.deviceId'] },
                  { $eq: ['$deviceId', '$$booking.device'] },
                ],
              },
            ],
          },
        },
      },
    },
  },
];

export const ratingSummaryStages = [
  { $group: { _id: '$rating', count: { $sum: 1 } } },
];

export function calculateRatingSummary(groups) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingCount = 0;
  let ratingSum = 0;
  for (const group of groups || []) {
    distribution[group._id] = group.count;
    ratingCount += group.count;
    ratingSum += group._id * group.count;
  }
  return { ratingAvg: ratingCount ? ratingSum / ratingCount : 0, ratingCount, distribution };
}

export async function getRatingSummary(deviceId, session = null) {
  const agg = Review.aggregate([...validDeviceReviewStages(deviceId), ...ratingSummaryStages]);
  if (session) agg.session(session);
  const groups = await agg;
  return calculateRatingSummary(groups);
}

export async function syncDeviceRating(deviceId, session = null) {
  const summary = await getRatingSummary(deviceId, session);
  const roundedAvg = Math.round(summary.ratingAvg * 10) / 10;
  const updateOpts = session ? { session } : {};
  await Device.updateOne(
    { _id: deviceId },
    {
      $set: {
        'stats.ratingAvg': summary.ratingAvg,
        'stats.ratingCount': summary.ratingCount,
        ratingAvg: roundedAvg,
        rating: roundedAvg,
      },
    },
    updateOpts
  );
  return summary;
}

export async function mutateDeviceReviews(deviceId, mutation) {
  await Review.init();
  return mongoose.connection.transaction(async (session) => {
    // Serialize review mutations for a device so concurrent summaries cannot overwrite each other.
    const device = await Device.findOneAndUpdate(
      { _id: deviceId, isDeleted: { $ne: true } },
      { $inc: { 'stats.reviewRevision': 1 } },
      { new: true, session }
    );
    if (!device) throw reviewError(404, 'Device not found.');
    const review = await mutation(session, device);
    const summary = await syncDeviceRating(deviceId, session);
    return { review, summary };
  });
}

/**
 * Tính toán và đồng bộ lại average rating, totalReviews và trustScore cho User
 * dựa trên tất cả các review/rating hợp lệ trong collection `reviews` (và `rating`/`ratings` nếu có).
 *
 * @param {string|mongoose.Types.ObjectId} userId - ID người dùng trong collection users
 * @returns {Promise<{ rating: number, totalReviews: number, trustScore: number } | null>}
 */
export async function syncUserRatingAndTrustScore(userId) {
  try {
    if (!userId) return null;
    const userStr = String(userId._id || userId);
    if (!mongoose.Types.ObjectId.isValid(userStr)) return null;
    const userObjId = new mongoose.Types.ObjectId(userStr);

    const userIds = [userObjId, userStr];

    // 1. Tìm tất cả các reviews hợp lệ của user trong collection reviews
    // Người dùng nhận review khi:
    // - Là người thuê: renterId khớp và targetType: 'renter'
    // - Là chủ máy: ownerId khớp (đánh giá thiết bị/chủ máy do người thuê để lại)
    // - Đánh giá chỉ định trực tiếp: targetUserId khớp
    const reviewFilter = {
      $or: [
        { renterId: { $in: userIds }, targetType: 'renter' },
        { ownerId: { $in: userIds }, targetType: { $in: ['owner', 'device', null] }, reviewerId: { $nin: userIds } },
        { targetUserId: { $in: userIds } },
        { userId: { $in: userIds }, reviewerId: { $nin: userIds } },
      ],
      isHidden: { $ne: true },
      moderationStatus: { $ne: 'hidden' },
    };

    const reviewDocs = await Review.find(reviewFilter).lean().catch(() => []);

    // 2. Tìm thêm từ collection `rating` hoặc `ratings` (nếu có tồn tại trong MongoDB)
    const extraRatingDocs = [];
    const db = mongoose.connection.db;
    if (db) {
      try {
        const ratingCol = db.collection('rating');
        if (ratingCol) {
          const r1 = await ratingCol.find({
            $or: [
              { userId: { $in: userIds } },
              { renterId: { $in: userIds } },
              { ownerId: { $in: userIds } },
              { targetUserId: { $in: userIds } },
            ],
          }).toArray().catch(() => []);
          if (Array.isArray(r1)) extraRatingDocs.push(...r1);
        }
      } catch {}

      try {
        const ratingsCol = db.collection('ratings');
        if (ratingsCol) {
          const r2 = await ratingsCol.find({
            $or: [
              { userId: { $in: userIds } },
              { renterId: { $in: userIds } },
              { ownerId: { $in: userIds } },
              { targetUserId: { $in: userIds } },
            ],
          }).toArray().catch(() => []);
          if (Array.isArray(r2)) extraRatingDocs.push(...r2);
        }
      } catch {}
    }

    // 3. Gom tất cả các điểm số rating (từ 1 đến 5)
    const validRatings = [];
    const seenIds = new Set();

    const processDoc = (doc) => {
      if (!doc) return;
      const idKey = doc._id ? String(doc._id) : null;
      if (idKey && seenIds.has(idKey)) return;
      if (idKey) seenIds.add(idKey);

      const val = Number(doc.rating ?? doc.stars ?? doc.score);
      if (Number.isFinite(val) && val >= 1 && val <= 5) {
        validRatings.push(val);
      }
    };

    if (Array.isArray(reviewDocs)) {
      reviewDocs.forEach(processDoc);
    }
    if (Array.isArray(extraRatingDocs)) {
      extraRatingDocs.forEach(processDoc);
    }

    const totalReviews = validRatings.length;
    let avgRating = 5.0;
    let trustScore = 100;

    if (totalReviews > 0) {
      const sum = validRatings.reduce((acc, curr) => acc + curr, 0);
      avgRating = Number((sum / totalReviews).toFixed(1));
      // Điểm trust score quy đổi theo rating (thang 100): 5 sao = 100 điểm, 4.5 sao = 90 điểm, ...
      trustScore = Math.min(100, Math.max(50, Math.round(avgRating * 20)));
    } else {
      // Nếu chưa có review nào, giữ nguyên hoặc mặc định 100 trustScore / 5.0 sao
      const existingUser = await User.findById(userObjId).select('trust rating totalReviews').lean().catch(() => null);
      avgRating = typeof existingUser?.rating === 'number' ? existingUser.rating : 5.0;
      trustScore = typeof existingUser?.trust?.score === 'number'
        ? existingUser.trust.score
        : (typeof existingUser?.trustScore === 'number' ? existingUser.trustScore : 100);
    }

    // 4. Cập nhật vào collection users
    await User.findByIdAndUpdate(userObjId, {
      $set: {
        rating: avgRating,
        totalReviews: totalReviews,
        'trust.score': trustScore,
        trustScore: trustScore,
        'reputation.ratingAvg': avgRating,
        'reputation.ratingCount': totalReviews,
      },
    }).catch((err) => console.warn('Cannot update user reputation in DB:', err.message));

    return {
      rating: avgRating,
      totalReviews,
      trustScore,
    };
  } catch (err) {
    console.warn('Lỗi trong syncUserRatingAndTrustScore:', err.message);
    return null;
  }
}
