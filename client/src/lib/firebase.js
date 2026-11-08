import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Cấu hình Firebase Web (lấy từ biến môi trường, không hardcode API key / Project ID)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || '',
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// 1. Khởi tạo Firebase App Singleton (Pure JS)
export const app = getApps().length > 0
  ? getApp()
  : (isConfigured ? initializeApp(firebaseConfig) : null);

// 2. Khởi tạo Firestore cho onSnapshot Real-time
export const db = app ? getFirestore(app) : null;

// 3. Khởi tạo Firebase Messaging (kiểm tra an toàn môi trường trình duyệt)
let messagingInstance = null;

export const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined' || !app) return null;

  try {
    const supported = await isSupported();
    if (supported) {
      if (!messagingInstance) {
        messagingInstance = getMessaging(app);
      }
      return messagingInstance;
    }
    console.warn('⚠️ Firebase Messaging is not supported in this browser environment.');
    return null;
  } catch (error) {
    console.warn('⚠️ Error initializing Firebase Messaging:', error);
    return null;
  }
};

export default app;

