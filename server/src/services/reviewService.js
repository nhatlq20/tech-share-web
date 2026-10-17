import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Device from '../models/Device.js';

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
export const validDeviceReviewStages = deviceId => [
  { $match: { deviceId: new mongoose.Types.ObjectId(deviceId), targetType: { $in: ['device', null] },
    rating: { $in: [1, 2, 3, 4, 5] }, comment: { $type: 'string', $regex: '\\S' } } },
  { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'verifiedBooking' } },
  { $set: { _verifiedRenter: { $let: {
    vars: { booking: { $arrayElemAt: ['$verifiedBooking', 0] } },
    in: { $and: [
      { $eq: ['$$booking.status', 'completed'] },
      { $eq: ['$deviceId', '$$booking.deviceId'] },
      { $eq: ['$renterId', '$$booking.renterId'] },
      { $eq: [{ $ifNull: ['$reviewerId', '$renterId'] }, '$$booking.renterId'] },
      { $eq: ['$ownerId', '$$booking.ownerId'] },
      { $ne: ['$$booking.renterId', '$$booking.ownerId'] },
    ] },
  } } } },
];

export const ratingSummaryStages = [
  { $group: { _id: '$rating', count: { $sum: 1 } } },
];

export function calculateRatingSummary(groups) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingCount = 0;
  let ratingSum = 0;
  for (const group of groups) {
    distribution[group._id] = group.count;
    ratingCount += group.count;
    ratingSum += group._id * group.count;
  }
  return { ratingAvg: ratingCount ? ratingSum / ratingCount : 0, ratingCount, distribution };
}

export async function getRatingSummary(deviceId, session = null) {
  const groups = await Review.aggregate([...validDeviceReviewStages(deviceId), ...ratingSummaryStages]).session(session);
  return calculateRatingSummary(groups);
}

export async function syncDeviceRating(deviceId, session) {
  const summary = await getRatingSummary(deviceId, session);
  await Device.updateOne({ _id: deviceId }, { $set: {
    'stats.ratingAvg': summary.ratingAvg, 'stats.ratingCount': summary.ratingCount,
  } }, { session });
  return summary;
}

export async function mutateDeviceReviews(deviceId, mutation) {
  await Review.init();
  return mongoose.connection.transaction(async session => {
    // Serialize review mutations for a device so concurrent summaries cannot overwrite each other.
    const device = await Device.findOneAndUpdate({ _id: deviceId, isDeleted: { $ne: true } },
      { $inc: { 'stats.reviewRevision': 1 } }, { new: true, session });
    if (!device) throw reviewError(404, 'Device not found.');
    const review = await mutation(session, device);
    const summary = await syncDeviceRating(deviceId, session);
    return { review, summary };
  });
}
