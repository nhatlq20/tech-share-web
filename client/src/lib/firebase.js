import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Cấu hình Firebase Web
const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    'AIzaSyAI9YZWIn1zSGy1-WndSNDrz_RB003RE6k',
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    'tech-share-80539.firebaseapp.com',
  projectId:
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    'tech-share-80539',
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    'tech-share-80539.firebasestorage.app',
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ||
    '215197206890',
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    '1:215197206890:web:645a4a4fe0136ff6f4bd13',
  measurementId:
    process.env.REACT_APP_FIREBASE_MEASUREMENT_ID ||
    'G-WEJH0576JW',
};

// 1. Khởi tạo Firebase App Singleton (Pure JS)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. Khởi tạo Firestore cho onSnapshot Real-time
export const db = getFirestore(app);

// 3. Khởi tạo Firebase Messaging (kiểm tra an toàn môi trường trình duyệt)
let messagingInstance = null;

export const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined') return null;

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

