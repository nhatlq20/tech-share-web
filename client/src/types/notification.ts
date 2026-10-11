export type NotificationType = 'order' | 'reminder' | 'system' | 'review' | 'promo';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string; // ID của đơn hàng hoặc thiết bị
  isRead: boolean;
  createdAt: string;
}

export type NotificationFilter = 'all' | NotificationType;

export interface NotificationState {
  items: Notification[];
  unreadCount: number;
  filter: NotificationFilter;
  fcmToken: string | null;
  permission: NotificationPermission | 'default';
  loading: boolean;
  error: string | null;
}

