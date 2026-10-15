import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Device from '../models/Device.js';
import { getIO } from '../socket.js';

/**
 * Helper: Lấy userId an toàn từ req.user
 */
const getUserId = (req) => {
  return (req.user?.id || req.user?._id || req.user?.userId)?.toString();
};

/**
 * 1. GET /api/chats/conversations
 * Lấy danh sách cuộc hội thoại của user hiện tại gắn theo Booking
 */
export const getConversations = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;

    // Tìm tất cả các Booking mà user là Renter hoặc Owner
    const bookings = await Booking.find({
      $or: [
        { renterId: userObjId },
        { ownerId: userObjId },
        { renter: userObjId },
        { owner: userObjId },
      ],
    })
      .populate('deviceId', 'name title images category dailyRate pricePerDay brand')
      .populate('device', 'name title images category dailyRate pricePerDay brand')
      .populate('renterId', 'name avatar role isVerified email phone')
      .populate('renter', 'name avatar role isVerified email phone')
      .populate('ownerId', 'name avatar role isVerified email phone')
      .populate('owner', 'name avatar role isVerified email phone')
      .sort({ updatedAt: -1 })
      .lean();

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const bookingIds = bookings.map((b) => b._id);

    // 1. Tối ưu: Lấy tin nhắn cuối cùng của toàn bộ booking chỉ bằng 1 Aggregation
    const latestMessagesAgg = await Message.aggregate([
      { $match: { bookingId: { $in: bookingIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$bookingId',
          lastMessage: { $first: '$$ROOT' },
        },
      },
    ]);
    const latestMessageMap = new Map(
      latestMessagesAgg.map((item) => [item._id.toString(), item.lastMessage])
    );

    // 2. Tối ưu: Đếm số tin nhắn chưa đọc của toàn bộ booking chỉ bằng 1 Aggregation
    const unreadCountsAgg = await Message.aggregate([
      {
        $match: {
          bookingId: { $in: bookingIds },
          receiverId: userObjId,
          status: { $ne: 'read' },
        },
      },
      {
        $group: {
          _id: '$bookingId',
          unreadCount: { $sum: 1 },
        },
      },
    ]);
    const unreadMap = new Map(
      unreadCountsAgg.map((item) => [item._id.toString(), item.unreadCount])
    );

    // Gom nhóm các booking theo từng đối tác duy nhất (partnerId)
    const partnerMap = new Map();

    for (const booking of bookings) {
      const bookingId = booking._id.toString();

      // Xác định đối phương
      const renterObj = booking.renterId || booking.renter;
      const ownerObj = booking.ownerId || booking.owner;

      const isUserRenter =
        renterObj && (renterObj._id?.toString() === currentUserId || renterObj.id === currentUserId);

      const partner = isUserRenter ? ownerObj : renterObj;
      const partnerId = partner?._id?.toString() || partner?.id || 'unknown';
      const roleInChat = isUserRenter ? 'renter' : 'owner';

      // Lấy từ cache aggregation cực nhanh
      const lastMessage = latestMessageMap.get(bookingId) || null;
      const unreadCount = unreadMap.get(bookingId) || 0;

      // Chuẩn hóa thông tin thiết bị
      const deviceObj = booking.deviceId || booking.device;
      const deviceData = deviceObj
        ? {
          _id: deviceObj._id?.toString(),
          name: deviceObj.name || deviceObj.title || 'Thiết bị công nghệ',
          image: Array.isArray(deviceObj.images) && deviceObj.images[0] ? deviceObj.images[0] : '',
          dailyRate: deviceObj.dailyRate || deviceObj.pricePerDay || 0,
          category: deviceObj.category || 'tech',
        }
        : {
          _id: '',
          name: 'Thiết bị công nghệ',
          image: '',
          dailyRate: 0,
          category: 'tech',
        };

      const bookingItem = {
        bookingId,
        bookingCode: booking.bookingCode || `B${bookingId.substring(0, 8).toUpperCase()}`,
        status: booking.status || 'pending',
        roleInChat,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalAmount: booking.totalAmount || booking.pricing?.totalPrice || 0,
        deposit: booking.depositValue || booking.depositFee || booking.deposit || 0,
        device: deviceData,
        lastMessage: lastMessage
          ? {
            _id: lastMessage._id.toString(),
            content: lastMessage.content,
            type: lastMessage.type,
            senderId: lastMessage.senderId.toString(),
            status: lastMessage.status,
            createdAt: lastMessage.createdAt,
          }
          : null,
        unreadCount,
        updatedAt: lastMessage?.createdAt || booking.updatedAt || booking.createdAt,
      };

      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          partnerId,
          partner: partner
            ? {
              _id: partner._id?.toString() || partner.id,
              name: partner.name || 'Người dùng TechShare',
              avatar: partner.avatar || '',
              role: partner.role || (isUserRenter ? 'owner' : 'renter'),
              isVerified: Boolean(partner.isVerified),
            }
            : {
              _id: partnerId,
              name: isUserRenter ? 'Chủ thiết bị' : 'Người thuê',
              avatar: '',
              role: isUserRenter ? 'owner' : 'renter',
              isVerified: false,
            },
          bookings: [bookingItem],
        });
      } else {
        partnerMap.get(partnerId).bookings.push(bookingItem);
      }
    }

    // Thứ tự ưu tiên trạng thái đơn hàng khi gộp
    const STATUS_PRIORITY = {
      active: 4,
      approved: 3,
      pending: 2,
      completed: 1,
      cancelled: 0,
      rejected: 0,
    };

    // Tạo danh sách hội thoại duy nhất cho mỗi đối tác
    const uniqueConversations = Array.from(partnerMap.values()).map((group) => {
      // Sắp xếp các đơn thuê của đối tác này:
      // Ưu tiên đơn có tin nhắn mới nhất, sau đó đến đơn đang hoạt động (active > approved > pending > completed)
      group.bookings.sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        if (a.lastMessage && b.lastMessage) return timeB - timeA;
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        const pA = STATUS_PRIORITY[a.status] || 0;
        const pB = STATUS_PRIORITY[b.status] || 0;
        if (pA !== pB) return pB - pA;
        return timeB - timeA;
      });

      const primaryBooking = group.bookings[0];

      // Cộng dồn toàn bộ tin nhắn chưa đọc từ mọi đơn thuê của đối tác này
      const totalUnreadCount = group.bookings.reduce((sum, b) => sum + (b.unreadCount || 0), 0);

      // Tìm tin nhắn mới nhất xuyên suốt mọi đơn thuê của đối tác này
      let latestMessage = primaryBooking.lastMessage;
      let latestTime = primaryBooking.updatedAt;

      for (const b of group.bookings) {
        if (b.lastMessage) {
          if (
            !latestMessage ||
            new Date(b.lastMessage.createdAt).getTime() > new Date(latestMessage.createdAt).getTime()
          ) {
            latestMessage = b.lastMessage;
            latestTime = b.lastMessage.createdAt;
          }
        }
      }

      return {
        partnerId: group.partnerId,
        partner: group.partner,
        bookingId: primaryBooking.bookingId,
        bookingCode: primaryBooking.bookingCode,
        status: primaryBooking.status,
        roleInChat: primaryBooking.roleInChat,
        startDate: primaryBooking.startDate,
        endDate: primaryBooking.endDate,
        totalAmount: primaryBooking.totalAmount,
        deposit: primaryBooking.deposit,
        device: primaryBooking.device,
        lastMessage: latestMessage,
        unreadCount: totalUnreadCount,
        updatedAt: latestTime,
        bookings: group.bookings, // Danh sách toàn bộ các đơn thuê của đối tác này
      };
    });

    // Sắp xếp các hội thoại theo thời gian tin nhắn mới nhất lên đầu
    uniqueConversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return res.status(200).json({
      success: true,
      data: uniqueConversations,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 2. GET /api/chats/:bookingId
 * Tải lịch sử tin nhắn của một booking cụ thể kèm ngữ cảnh đơn thuê
 */
export const getMessages = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;

    const booking = await Booking.findById(bookingId)
      .populate('deviceId', 'name title images category dailyRate pricePerDay brand')
      .populate('device', 'name title images category dailyRate pricePerDay brand')
      .populate('renterId', 'name avatar role isVerified email phone')
      .populate('renter', 'name avatar role isVerified email phone')
      .populate('ownerId', 'name avatar role isVerified email phone')
      .populate('owner', 'name avatar role isVerified email phone')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Kiểm tra quyền: chỉ Renter hoặc Owner (hoặc Admin) mới được xem chat
    const renterObj = booking.renterId || booking.renter;
    const ownerObj = booking.ownerId || booking.owner;
    const renterIdStr = renterObj?._id?.toString() || renterObj?.toString();
    const ownerIdStr = ownerObj?._id?.toString() || ownerObj?.toString();
    const isAdmin = req.user?.role === 'admin';

    if (currentUserId !== renterIdStr && currentUserId !== ownerIdStr && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const isUserRenter = currentUserId === renterIdStr;
    const partner = isUserRenter ? ownerObj : renterObj;
    const deviceObj = booking.deviceId || booking.device;

    const deviceData = deviceObj
      ? {
        _id: deviceObj._id?.toString(),
        name: deviceObj.name || deviceObj.title || 'Thiết bị công nghệ',
        image: Array.isArray(deviceObj.images) && deviceObj.images[0] ? deviceObj.images[0] : '',
        dailyRate: deviceObj.dailyRate || deviceObj.pricePerDay || 0,
        category: deviceObj.category || 'tech',
      }
      : {
        _id: '',
        name: 'Thiết bị công nghệ',
        image: '',
        dailyRate: 0,
        category: 'tech',
      };

    // Lấy thêm toàn bộ các đơn thuê khác giữa 2 người này để phục vụ Multi-Booking Switcher
    const partnerIdStr = partner?._id?.toString() || partner?.id;
    let allPartnerBookings = [];
    if (partnerIdStr && mongoose.Types.ObjectId.isValid(partnerIdStr)) {
      const partnerObjId = new mongoose.Types.ObjectId(partnerIdStr);
      const partnerBookings = await Booking.find({
        $or: [
          { renterId: userObjId, ownerId: partnerObjId },
          { renterId: partnerObjId, ownerId: userObjId },
          { renter: userObjId, owner: partnerObjId },
          { renter: partnerObjId, owner: userObjId },
        ],
      })
        .populate('deviceId', 'name title images category dailyRate pricePerDay brand')
        .populate('device', 'name title images category dailyRate pricePerDay brand')
        .sort({ updatedAt: -1 })
        .lean();

      allPartnerBookings = partnerBookings.map((b) => {
        const dObj = b.deviceId || b.device;
        return {
          bookingId: b._id.toString(),
          bookingCode: b.bookingCode || `B${b._id.toString().substring(0, 8).toUpperCase()}`,
          status: b.status || 'pending',
          startDate: b.startDate,
          endDate: b.endDate,
          totalAmount: b.totalAmount || b.pricing?.totalPrice || 0,
          deposit: b.depositValue || b.depositFee || b.deposit || 0,
          device: dObj
            ? {
              _id: dObj._id?.toString(),
              name: dObj.name || dObj.title || 'Thiết bị công nghệ',
              image: Array.isArray(dObj.images) && dObj.images[0] ? dObj.images[0] : '',
              dailyRate: dObj.dailyRate || dObj.pricePerDay || 0,
              category: dObj.category || 'tech',
            }
            : { _id: '', name: 'Thiết bị', image: '', dailyRate: 0, category: 'tech' },
        };
      });
    }

    const bookingContext = {
      bookingId,
      bookingCode: booking.bookingCode || `B${bookingId.substring(0, 8).toUpperCase()}`,
      status: booking.status || 'pending',
      roleInChat: isUserRenter ? 'renter' : 'owner',
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalAmount: booking.totalAmount || booking.pricing?.totalPrice || 0,
      deposit: booking.depositValue || booking.depositFee || booking.deposit || 0,
      device: deviceData,
      bookings: allPartnerBookings.length > 0 ? allPartnerBookings : [
        {
          bookingId,
          bookingCode: booking.bookingCode || `B${bookingId.substring(0, 8).toUpperCase()}`,
          status: booking.status || 'pending',
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalAmount: booking.totalAmount || 0,
          deposit: booking.depositValue || booking.depositFee || 0,
          device: deviceData,
        }
      ],
      partner: partner
        ? {
          _id: partner._id?.toString() || partner.id,
          name: partner.name || 'Người dùng TechShare',
          avatar: partner.avatar || '',
          role: partner.role || (isUserRenter ? 'owner' : 'renter'),
          isVerified: Boolean(partner.isVerified),
        }
        : {
          _id: '',
          name: isUserRenter ? 'Chủ thiết bị' : 'Người thuê',
          avatar: '',
          role: isUserRenter ? 'owner' : 'renter',
          isVerified: false,
        },
    };

    const messages = await Message.find({ bookingId })
      .populate('senderId', 'name avatar role isVerified')
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: messages,
      booking: bookingContext,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 3. POST /api/chats/upload-image
 * Upload ảnh cho chat (Cloudinary / Base64 fallback)
 */
export const uploadImage = async (req, res, next) => {
  try {
    const { image, file } = req.body;
    const base64Data = image || file;

    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'No image data provided.' });
    }

    // Nếu đã có Cloudinary cấu hình trong .env, upload trực tiếp lên Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'techshare_avatar';

    if (cloudName && base64Data.startsWith('data:image/')) {
      try {
        const formData = new URLSearchParams();
        formData.append('file', base64Data);
        formData.append('upload_preset', uploadPreset);

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          return res.status(200).json({
            success: true,
            mediaUrl: cloudData.secure_url || cloudData.url,
          });
        }
      } catch (cloudErr) {
        console.warn('⚠️ Cloudinary direct upload fallback to data URI:', cloudErr.message);
      }
    }

    // Fallback: trả về chính base64 data URI
    return res.status(200).json({
      success: true,
      mediaUrl: base64Data,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 4. POST /api/chats/:bookingId/messages
 * Gửi tin nhắn mới, lưu MongoDB và truyền phát Socket.IO Real-time
 */
export const sendMessage = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { bookingId } = req.params;
    const { type = 'text', content = '', mediaUrl = '', location = null } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const renterIdStr = (booking.renterId || booking.renter)?._id?.toString() || (booking.renterId || booking.renter)?.toString();
    const ownerIdStr = (booking.ownerId || booking.owner)?._id?.toString() || (booking.ownerId || booking.owner)?.toString();

    // Kiểm tra quyền
    if (currentUserId !== renterIdStr && currentUserId !== ownerIdStr && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    // Xác định người nhận
    const receiverIdStr = currentUserId === renterIdStr ? ownerIdStr : renterIdStr;
    if (!receiverIdStr) {
      return res.status(400).json({ success: false, message: 'Could not determine receiver for booking.' });
    }

    // Tạo bản ghi tin nhắn mới
    const messageDoc = await Message.create({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      senderId: new mongoose.Types.ObjectId(currentUserId),
      receiverId: new mongoose.Types.ObjectId(receiverIdStr),
      type,
      content: content.trim(),
      mediaUrl: mediaUrl || '',
      location: location && location.latitude && location.longitude ? location : null,
      status: 'sent',
    });

    const populatedMessage = await Message.findById(messageDoc._id)
      .populate('senderId', 'name avatar role isVerified')
      .lean();

    // Lấy thông tin người gửi để gắn vào In-App Notification
    const senderUser = await User.findById(currentUserId).select('name avatar').lean();

    // Truyền phát thời gian thực qua Socket.IO
    const io = getIO();
    if (io) {
      const chatRoom = `chat_${bookingId}`;
      const receiverRoom = `user_${receiverIdStr}`;

      // 1. Gửi vào phòng chat cho cả 2 người đang mở
      io.to(chatRoom).emit('new_message', populatedMessage);

      // 2. Gửi vào room riêng của người nhận để cập nhật danh sách hội thoại
      io.to(receiverRoom).emit('new_message', populatedMessage);

      // 3. Bắn In-App Notification Banner cho người nhận nếu đang ở trang khác
      io.to(receiverRoom).emit('new_notification', {
        type: 'chat',
        bookingId,
        messageId: populatedMessage._id.toString(),
        sender: {
          id: currentUserId,
          name: senderUser?.name || 'Đối tác TechShare',
          avatar: senderUser?.avatar || '',
        },
        content:
          type === 'image'
            ? '[Hình ảnh]'
            : type === 'location'
              ? '[Chia sẻ vị trí]'
              : populatedMessage.content || 'Bạn có tin nhắn mới',
        createdAt: populatedMessage.createdAt,
      });

      // Tính tổng số tin nhắn chưa đọc của người nhận và emit socket
      const receiverUnreadCount = await Message.countDocuments({
        receiverId: new mongoose.Types.ObjectId(receiverId),
        status: { $ne: 'read' },
      });
      io.to(receiverRoom).emit('unread_messages_count', {
        count: receiverUnreadCount,
      });
    }

    return res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 5. PATCH /api/chats/:bookingId/read
 * Đánh dấu đã đọc các tin nhắn gửi đến người dùng hiện tại
 */
export const markAsRead = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;

    // Cập nhật tất cả tin nhắn gửi cho user hiện tại trong booking này
    const result = await Message.updateMany(
      {
        bookingId: new mongoose.Types.ObjectId(bookingId),
        receiverId: userObjId,
        status: { $ne: 'read' },
      },
      {
        $set: { status: 'read' },
      }
    );

    // Tính tổng số tin nhắn chưa đọc còn lại của user
    const remainingUnreadCount = await Message.countDocuments({
      receiverId: userObjId,
      status: { $ne: 'read' },
    });

    // Phát sự kiện Socket thông báo tin nhắn đã được đọc
    const io = getIO();
    if (io) {
      io.to(`chat_${bookingId}`).emit('messages_read', {
        bookingId,
        readBy: currentUserId,
      });
      io.to(`user_${currentUserId}`).emit('conversations_updated', {
        bookingId,
      });
      io.to(`user_${currentUserId}`).emit('unread_messages_count', {
        count: remainingUnreadCount,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read.',
      modifiedCount: result.modifiedCount,
      unreadCount: remainingUnreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 6. GET /api/chats/unread-count
 * Lấy tổng số tin nhắn chưa đọc của người dùng hiện tại
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const count = await Message.countDocuments({
      receiverId: new mongoose.Types.ObjectId(currentUserId),
      status: { $ne: 'read' },
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getConversations,
  getMessages,
  uploadImage,
  sendMessage,
  markAsRead,
  getUnreadCount,
};

