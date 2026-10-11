import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Notification, NotificationFilter, NotificationState } from '../../types/notification';

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  filter: 'all',
  fcmToken: null,
  permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  loading: false,
  error: null,
};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
      state.loading = false;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      const exists = state.items.some((item) => item._id === action.payload._id);
      if (!exists) {
        state.items.unshift(action.payload);
        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      }
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find((n) => n._id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.items.forEach((item) => {
        item.isRead = true;
      });
      state.unreadCount = 0;
    },
    setFilter: (state, action: PayloadAction<NotificationFilter>) => {
      state.filter = action.payload;
    },
    setFcmToken: (state, action: PayloadAction<string | null>) => {
      state.fcmToken = action.payload;
    },
    setPermission: (state, action: PayloadAction<NotificationPermission | 'default'>) => {
      state.permission = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markNotificationAsRead,
  markAllAsRead,
  setFilter,
  setFcmToken,
  setPermission,
  setLoading,
  setError,
} = notificationSlice.actions;

export default notificationSlice.reducer;

