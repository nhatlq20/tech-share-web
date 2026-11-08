import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { User } from '../models/User.js';
import { getIO } from '../socket.js';

/**
 * Tra cứu cả Account và User tương ứng dựa vào userId hoặc accountId
 */
export const resolveUserAndAccount = async (targetId) => {
  if (!targetId) return { user: null, account: null };

  let objectId;
  try {
    objectId = new mongoose.Types.ObjectId(String(targetId));
  } catch {
    return { user: null, account: null };
  }

  // 1. Thử tìm theo User ID trước
  let user = await User.findById(objectId);
  let account = null;

  if (user) {
    if (user.accountId) {
      account = await Account.findById(user.accountId);
    }
    if (!account) {
      account = await Account.findOne({
        $or: [{ userId: user._id }, { email: user.email }, { username: user.username }],
      });
    }
  } else {
    // 2. Thử tìm theo Account ID
    account = await Account.findById(objectId);
    if (account) {
      if (account.userId) {
        user = await User.findById(account.userId);
      }
      if (!user) {
        user = await User.findOne({ accountId: account._id });
      }
      if (!user && account.username) {
        user = await User.findOne({ username: account.username });
      }
      if (!user && account.email) {
        user = await User.findOne({ email: account.email });
      }
    }
  }

  // Fallback: nếu schema chưa khớp, truy vấn raw db collections
  const db = mongoose.connection.db;
  if (db) {
    if (!user && !account) {
      const rawUser = await db.collection('users').findOne({ _id: objectId });
      if (rawUser) {
        user = rawUser;
        if (rawUser.accountId) {
          account = await db.collection('accounts').findOne({ _id: new mongoose.Types.ObjectId(String(rawUser.accountId)) });
        }
      } else {
        const rawAccount = await db.collection('accounts').findOne({ _id: objectId });
        if (rawAccount) {
          account = rawAccount;
          user = await db.collection('users').findOne({
            $or: [
              { accountId: rawAccount._id },
              { accountId: new mongoose.Types.ObjectId(String(rawAccount._id)) },
              { username: rawAccount.username },
              { email: rawAccount.email },
            ],
          });
        }
      }
    }
  }

  return { user, account };
};

/**
 * Khóa tài khoản người dùng:
 * - Cập nhật `isbanned: true`, `banReason: reason`, `isActive: false` trong collection `accounts`
 * - Đồng bộ `isActive: false`, `isbanned: true` trong collection `users`
 * - Phát tín hiệu Socket.IO thời gian thực để đá người dùng ra ngay lập tức
 */
export const banAccount = async ({ targetId, reason }) => {
  const { user, account } = await resolveUserAndAccount(targetId);

  if (!user && !account) {
    throw new Error('Không tìm thấy tài khoản người dùng tương ứng.');
  }

  const finalReason = (reason || '').trim() || 'Vi phạm điều khoản và quy định nền tảng TechShare.';
  const now = new Date();
  const db = mongoose.connection.db;

  // 1. Cập nhật trong collection accounts
  if (account && account._id) {
    await Account.updateOne(
      { _id: account._id },
      {
        $set: {
          isbanned: true,
          banReason: finalReason,
          isActive: false,
          bannedAt: now,
          updatedAt: now,
        },
      }
    );
    if (db) {
      await db.collection('accounts').updateOne(
        { _id: new mongoose.Types.ObjectId(String(account._id)) },
        {
          $set: {
            isbanned: true,
            banReason: finalReason,
            isActive: false,
            bannedAt: now,
            updatedAt: now,
          },
        }
      );
    }
  }

  // 2. Cập nhật trong collection users
  if (user && user._id) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isActive: false,
          isbanned: true,
          banReason: finalReason,
          updatedAt: now,
        },
      }
    );
    if (db) {
      await db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(String(user._id)) },
        {
          $set: {
            isActive: false,
            isbanned: true,
            banReason: finalReason,
            updatedAt: now,
          },
        }
      );
    }
  }

  // 3. Phát tín hiệu Socket.IO thời gian thực đến mọi phiên làm việc đang online của tài khoản
  try {
    const io = getIO();
    if (io) {
      const payload = {
        userId: user?._id ? String(user._id) : null,
        accountId: account?._id ? String(account._id) : null,
        isbanned: true,
        banReason: finalReason,
        message: `Tài khoản của bạn đã bị khóa. Lí do: ${finalReason}`,
        timestamp: now.toISOString(),
      };

      const roomsToEmit = new Set();
      if (user?._id) roomsToEmit.add(`user_${user._id}`);
      if (account?._id) roomsToEmit.add(`user_${account._id}`);

      roomsToEmit.forEach((room) => {
        io.to(room).emit('account_banned', payload);
        io.to(room).emit('force_logout', payload);
        console.log(`📢 [Socket.IO] Emitted account_banned & force_logout to ${room} with reason: "${finalReason}"`);
      });
    }
  } catch (socketErr) {
    console.warn('⚠️ Lỗi gửi thông báo Socket.IO khi khóa tài khoản:', socketErr.message);
  }

  return {
    userId: user?._id,
    accountId: account?._id,
    isbanned: true,
    banReason: finalReason,
    isActive: false,
    bannedAt: now,
  };
};

/**
 * Mở khóa tài khoản người dùng:
 * - Cập nhật `isbanned: false`, `banReason: ''`, `isActive: true` trong collection `accounts`
 * - Đồng bộ `isActive: true`, `isbanned: false` trong collection `users`
 */
export const unbanAccount = async ({ targetId }) => {
  const { user, account } = await resolveUserAndAccount(targetId);

  if (!user && !account) {
    throw new Error('Không tìm thấy tài khoản người dùng tương ứng.');
  }

  const now = new Date();
  const db = mongoose.connection.db;

  // 1. Cập nhật trong collection accounts
  if (account && account._id) {
    await Account.updateOne(
      { _id: account._id },
      {
        $set: {
          isbanned: false,
          banReason: '',
          isActive: true,
          bannedAt: null,
          unbannedAt: now,
          updatedAt: now,
        },
      }
    );
    if (db) {
      await db.collection('accounts').updateOne(
        { _id: new mongoose.Types.ObjectId(String(account._id)) },
        {
          $set: {
            isbanned: false,
            banReason: '',
            isActive: true,
            bannedAt: null,
            unbannedAt: now,
            updatedAt: now,
          },
        }
      );
    }
  }

  // 2. Cập nhật trong collection users
  if (user && user._id) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isActive: true,
          isbanned: false,
          banReason: '',
          updatedAt: now,
        },
      }
    );
    if (db) {
      await db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(String(user._id)) },
        {
          $set: {
            isActive: true,
            isbanned: false,
            banReason: '',
            updatedAt: now,
          },
        }
      );
    }
  }

  return {
    userId: user?._id,
    accountId: account?._id,
    isbanned: false,
    banReason: '',
    isActive: true,
  };
};

export default {
  resolveUserAndAccount,
  banAccount,
  unbanAccount,
};
