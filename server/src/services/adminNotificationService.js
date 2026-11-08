import mongoose from 'mongoose';
import AdminNotification from '../models/AdminNotification.js';
import EkycRequest from '../models/EkycRequest.js';
import OwnerEkycRequest from '../models/OwnerEkycRequest.js';
import Device from '../models/Device.js';

const events = {
  ekyc: {
    model: EkycRequest,
    title: 'New eKYC Verification Request',
    body: 'An identity verification request is waiting for review.',
    route: '/admin/ekyc-verification',
    action: 'View Request',
    pending: { status: 'pending' },
    visible: {},
  },
  'owner-verification': {
    model: OwnerEkycRequest,
    title: 'New Owner Verification Request',
    body: 'An owner verification request is waiting for review.',
    route: '/admin/owner-ekyc-verification',
    action: 'View Request',
    pending: { status: 'pending' },
    visible: {},
  },
  devices: {
    model: Device,
    title: 'New Device Pending Moderation',
    body: 'A new device listing is waiting for moderation.',
    route: '/admin/device-moderation',
    action: 'Review Device',
    pending: { moderationStatus: 'pending', isDeleted: { $ne: true } },
    visible: { isDeleted: { $ne: true } },
  },
};

// The event key is unique independently of whether MongoDB has built the listing indexes.
export async function recordAdminNotification(category, relatedId, createdAt = new Date()) {
  const event = events[category];
  if (!Object.hasOwn(events, category) || !mongoose.isObjectIdOrHexString(relatedId)) return;
  const id = category + ':' + String(relatedId).toLowerCase();
  try {
    await AdminNotification.updateOne(
      { _id: id },
      { $setOnInsert: { category, title: event.title, body: event.body, relatedId, createdAt } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) console.error('Failed to record admin notification:', category, error.name);
  }
}

export function adminNotificationReader(user) {
  // Prefer the account identity even when the admin logged in through their profile.
  const id = user?.accountDoc?._id || user?.userDoc?.accountId || user?.userDoc?._id;
  return mongoose.isObjectIdOrHexString(id) ? new mongoose.Types.ObjectId(id) : null;
}

export function countUnreadAdminNotifications(reader) {
  return AdminNotification.countDocuments({ readBy: { $ne: reader } });
}

async function pendingActions() {
  const counts = await Promise.all(Object.values(events).map(({ model, pending }) => model.countDocuments(pending)));
  return counts.reduce((total, count) => total + count, 0);
}

async function availableActions(records) {
  const relatedByCategory = new Map();
  await Promise.all(Object.entries(events).map(async ([category, { model, visible }]) => {
    const ids = records.filter((record) => record.category === category).map((record) => record.relatedId);
    if (!ids.length) return;
    const references = await model.find({ _id: { $in: ids }, ...visible }).select('_id').lean();
    relatedByCategory.set(category, new Set(references.map(({ _id }) => String(_id))));
  }));
  return relatedByCategory;
}

export async function listAdminNotifications(reader, params) {
  const query = {};
  const { category, unread, search } = params;
  if (typeof category === 'string' && category !== 'all') query.category = category;
  if (unread === 'true') query.readBy = { $ne: reader };
  if (typeof search === 'string' && search.trim()) {
    const literal = search.trim().slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(literal, 'i');
    query.$or = [{ title: pattern }, { body: pattern }];
  }

  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 15));
  const [total, unreadCount, pending, matching] = await Promise.all([
    AdminNotification.countDocuments(),
    countUnreadAdminNotifications(reader),
    pendingActions(),
    AdminNotification.countDocuments(query),
  ]);
  const totalPages = Math.max(1, Math.ceil(matching / limit));
  const page = Math.min(totalPages, Math.max(1, parseInt(params.page, 10) || 1));
  const records = await AdminNotification.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const related = await availableActions(records);

  const data = records.map(({ _id, readBy, category, relatedId, title, body, createdAt }) => {
    const event = events[category];
    const action = event && related.get(category)?.has(String(relatedId))
      ? { label: event.action, href: event.route + '?id=' + encodeURIComponent(String(relatedId)) }
      : null;
    return { _id, category, title, body, createdAt, isRead: Boolean(readBy?.some((id) => id.equals(reader))), action };
  });
  return {
    data,
    summary: { total, unread: unreadCount, pending },
    pagination: { page, limit, total: matching, totalPages },
  };
}
