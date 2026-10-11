import admin from 'firebase-admin';

let isInitialized = false;

/**
 * Khởi tạo Firebase Admin SDK an toàn, hỗ trợ Service Account hoặc Project ID
 */
export const initFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'tech-share-80539';

  try {
    // 1. Kiểm tra JSON Service Account từ biến môi trường
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
        });
        isInitialized = true;
        console.log('✅ Firebase Admin initialized with service account.');
        return admin;
      } catch (err) {
        console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
      }
    }

    // 2. Kiểm tra cặp biến FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      isInitialized = true;
      console.log('✅ Firebase Admin initialized with client email & private key.');
      return admin;
    }

    // 3. Khởi tạo mặc định với Project ID (hoặc Google Application Default Credentials)
    admin.initializeApp({
      projectId,
    });
    isInitialized = true;
    console.log(`✅ Firebase Admin initialized for project: ${projectId}`);
  } catch (error) {
    console.warn('⚠️ Firebase Admin init notice:', error.message);
  }

  return admin;
};

// Auto initialize on module load
initFirebaseAdmin();

export const getAdminMessaging = () => {
  try {
    return admin.messaging();
  } catch (err) {
    console.warn('⚠️ Firebase Admin Messaging not available:', err.message);
    return null;
  }
};

export const getAdminFirestore = () => {
  try {
    return admin.firestore();
  } catch (err) {
    console.warn('⚠️ Firebase Admin Firestore not available:', err.message);
    return null;
  }
};

export default admin;

