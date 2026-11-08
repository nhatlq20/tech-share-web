import mongoose from 'mongoose';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import ChatInquiry from '../models/ChatInquiry.js';

export async function resolveChatUser(identity) {
  let user;
  if (identity?.accountId && mongoose.isObjectIdOrHexString(identity.accountId)) {
    user = await User.findOne({ accountId: identity.accountId }).select('_id accountId name avatar isActive').lean();
  } else {
    const id = identity?.userId || identity?._id || identity?.id;
    user = mongoose.isObjectIdOrHexString(id)
      ? await User.findById(id).select('_id accountId name avatar isActive').lean() : null;
  }
  if (user?.accountId) {
    const account = await mongoose.connection.db.collection('accounts').findOne({ _id: user.accountId });
    if (!account || account.isActive === false || account.isbanned) return null;
  }
  return user;
}

export async function findChat(id, populate = false) {
  for (const model of [Booking, ChatInquiry]) {
    let query = model.findById(id);
    if (populate) {
      query = query.populate('deviceId', 'name title images category dailyRate pricePerDay brand')
        .populate('renterId', 'name avatar role isVerified')
        .populate('ownerId', 'name avatar role isVerified');
      if (model === Booking) query = query.populate('device', 'name title images category dailyRate pricePerDay brand')
        .populate('renter', 'name avatar role isVerified').populate('owner', 'name avatar role isVerified');
    }
    const chat = await query.lean();
    if (chat) return chat;
  }
  return null;
}
