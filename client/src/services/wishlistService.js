/**
 * wishlistService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Quản lý Danh sách Yêu thích (Wishlist / Favorites):
 *   - Đồng bộ 2 chiều giữa MongoDB (`users.wishlist`) và `localStorage` (`techshare:favorite-devices`)
 *   - Phát sự kiện realtime `'techshare:wishlist-updated'` để Header (Navbar),
 *     DeviceCard, DeviceDetailPage và WishlistPage cập nhật tức thì khi thả tim.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { api } from './api.js';
import { STORAGE_KEYS } from '../constants/config.js';

export const FAVORITES_STORAGE_KEY = 'techshare:favorite-devices';
export const WISHLIST_UPDATED_EVENT = 'techshare:wishlist-updated';

const getStoredUserId = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const id = parsed?._id || parsed?.id || parsed?.userId;
      if (id) return String(id);
    }
    const rawAcc = localStorage.getItem('techshare_account');
    if (rawAcc) {
      const parsedAcc = JSON.parse(rawAcc);
      const id = parsedAcc?.userId || parsedAcc?._id || parsedAcc?.id;
      if (id) return String(id);
    }
  } catch {
    // ignore
  }
  return undefined;
};

/**
 * Đọc danh sách ID thiết bị đã thả tim từ localStorage
 * @returns {string[]}
 */
export const readLocalWishlistIds = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean))
    );
  } catch {
    return [];
  }
};

/**
 * Ghi danh sách ID thiết bị yêu thích vào localStorage và bắn event toàn cục
 * @param {string[]} ids
 */
export const writeLocalWishlistIds = (ids = []) => {
  if (typeof window === 'undefined') return [];
  const cleanIds = Array.from(
    new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || '').trim()).filter(Boolean))
  );
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(cleanIds));
  } catch {
    // ignore quota errors
  }
  window.dispatchEvent(
    new CustomEvent(WISHLIST_UPDATED_EVENT, {
      detail: { wishlistIds: cleanIds, count: cleanIds.length },
    })
  );
  return cleanIds;
};

/**
 * Kiểm tra 1 thiết bị có đang được thả tim hay không
 * @param {string} deviceId
 * @returns {boolean}
 */
export const isDeviceInWishlist = (deviceId) => {
  if (!deviceId) return false;
  return readLocalWishlistIds().includes(String(deviceId));
};

/**
 * Lấy danh sách thiết bị yêu thích từ MongoDB (`GET /api/users/wishlist`)
 * kết hợp đồng bộ với bộ đệm localStorage.
 */
export const fetchWishlist = async ({ mergeLocal = true, signal } = {}) => {
  const localIds = readLocalWishlistIds();
  const userId = getStoredUserId();

  const res = await api.get('/users/wishlist', {
    params: {
      userId,
      ids: localIds.length > 0 ? localIds.join(',') : undefined,
      merge: mergeLocal ? 'true' : undefined,
    },
    signal,
  });

  const serverDevices = Array.isArray(res?.data) ? res.data : [];
  const serverIds = Array.isArray(res?.wishlistIds)
    ? res.wishlistIds.map(String)
    : serverDevices.map((d) => String(d._id || d.id));

  writeLocalWishlistIds(serverIds);

  return {
    wishlistIds: serverIds,
    devices: serverDevices,
    count: serverDevices.length,
  };
};

/**
 * Thả tim / Bỏ tim một thiết bị (`POST /api/users/favorites/:deviceId`)
 * Optimistic UI: cập nhật localStorage + Header ngay lập tức, sau đó lưu vào MongoDB.
 */
export const toggleWishlist = async (deviceId, explicitAction) => {
  if (!deviceId) return { isFavorite: false, wishlistIds: readLocalWishlistIds() };
  const idStr = String(deviceId);
  const currentIds = readLocalWishlistIds();
  const currentlyFav = currentIds.includes(idStr);

  const nextFav =
    explicitAction === 'add'
      ? true
      : explicitAction === 'remove'
      ? false
      : !currentlyFav;

  const optimisticIds = nextFav
    ? Array.from(new Set([idStr, ...currentIds]))
    : currentIds.filter((id) => id !== idStr);

  writeLocalWishlistIds(optimisticIds);

  const userId = getStoredUserId();
  if (!userId && !localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)) {
    return {
      isFavorite: nextFav,
      wishlistIds: optimisticIds,
      devices: null,
    };
  }

  try {
    const res = await api.post(`/users/favorites/${encodeURIComponent(idStr)}`, {
      action: nextFav ? 'add' : 'remove',
      userId,
    });

    if (Array.isArray(res?.wishlistIds)) {
      writeLocalWishlistIds(res.wishlistIds);
    }

    return {
      isFavorite: res?.isFavorite ?? nextFav,
      wishlistIds: res?.wishlistIds || optimisticIds,
      devices: Array.isArray(res?.data) ? res.data : null,
    };
  } catch (err) {
    // Giữ nguyên trạng thái localStorage nếu mạng chập chờn (theo đặc tả H-07)
    console.warn('[Wishlist] Lỗi đồng bộ CSDL, đã lưu vào bộ đệm LocalStorage:', err?.message);
    return {
      isFavorite: nextFav,
      wishlistIds: optimisticIds,
      devices: null,
    };
  }
};

/**
 * Xóa toàn bộ danh sách yêu thích (`DELETE /api/users/wishlist`)
 */
export const clearAllWishlist = async () => {
  writeLocalWishlistIds([]);
  const userId = getStoredUserId();
  if (userId || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)) {
    try {
      await api.delete('/users/wishlist');
    } catch (err) {
      console.warn('[Wishlist] Không thể xóa trên server:', err?.message);
    }
  }
  return { wishlistIds: [], devices: [] };
};

const wishlistService = {
  readLocalWishlistIds,
  writeLocalWishlistIds,
  isDeviceInWishlist,
  fetchWishlist,
  toggleWishlist,
  clearAllWishlist,
};

export default wishlistService;

