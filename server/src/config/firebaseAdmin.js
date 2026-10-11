import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

let appInstance = null;

/**
 * Khởi tạo Firebase Admin SDK theo chuẩn Modular ES Modules Node.js
 */
export const initFirebaseAdmin = () => {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    appInstance = getApp();
    return appInstance;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'tech-share-80539';

  try {
    // 1. Kiểm tra JSON Service Account từ biến môi trường
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        appInstance = initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
        console.log('✅ Firebase Admin initialized with service account.');
        return appInstance;
      } catch (err) {
        console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
      }
    }

    // 2. Kiểm tra cặp biến FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      appInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      console.log('✅ Firebase Admin initialized with client email & private key.');
      return appInstance;
    }

    // 3. Khởi tạo mặc định với Project ID
    appInstance = initializeApp({
      projectId,
    });
    console.log(`✅ Firebase Admin initialized for project: ${projectId}`);
  } catch (error) {
    console.warn('⚠️ Firebase Admin init notice:', error.message);
  }

  return appInstance;
};

// Tự động khởi tạo khi load module
initFirebaseAdmin();

export const getAdminMessaging = () => {
  try {
    const app = appInstance || (getApps().length > 0 ? getApp() : initFirebaseAdmin());
    return app ? getMessaging(app) : null;
  } catch (err) {
    console.warn('⚠️ Firebase Admin Messaging not available:', err.message);
    return null;
  }
};

export const getAdminFirestore = () => {
  try {
    const app = appInstance || (getApps().length > 0 ? getApp() : initFirebaseAdmin());
    return app ? getFirestore(app) : null;
  } catch (err) {
    console.warn('⚠️ Firebase Admin Firestore not available:', err.message);
    return null;
  }
};

export default {
  initFirebaseAdmin,
  getAdminMessaging,
  getAdminFirestore,
};
