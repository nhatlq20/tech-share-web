import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Device from '../models/Device.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 12 Curated Development Devices for TechShare Web
 * Covering all 7 primary categories with realistic specs, pricing, and locations.
 */
const DEVELOPMENT_DEVICES = [
  {
    title: 'iPhone 15 Pro Max 256GB Natural Titanium',
    name: 'iPhone 15 Pro Max 256GB Natural Titanium',
    brand: 'Apple',
    category: 'smartphone',
    condition: 'like_new',
    dailyRate: 180000,
    pricePerDay: 180000,
    depositValue: 15000000,
    rating: 4.9,
    ratingAvg: 4.9,
    reviewCount: 24,
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800'],
    specs: {
      Screen: '6.7 inch OLED Super Retina XDR 120Hz',
      Chip: 'Apple A17 Pro 3nm',
      Storage: '256GB NVMe',
      Camera: '48MP Main + 12MP 5x Telephoto',
    },
    description: 'Flagship iPhone 15 Pro Max với khung viền Titan siêu nhẹ, camera zoom quang học 5x sắc nét, quay phim Log chuẩn ProRes cho nhà sáng tạo nội dung.',
    address: 'Quận Cầu Giấy, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.7826, 21.0285], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    name: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    brand: 'Samsung',
    category: 'smartphone',
    condition: 'new',
    dailyRate: 170000,
    pricePerDay: 170000,
    depositValue: 14000000,
    rating: 4.8,
    ratingAvg: 4.8,
    reviewCount: 19,
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
    specs: {
      Screen: '6.8 inch Dynamic AMOLED 2X 120Hz',
      Chip: 'Snapdragon 8 Gen 3 for Galaxy',
      Storage: '512GB UFS 4.0',
      Stylus: 'Bút S-Pen tích hợp trong thân máy',
    },
    description: 'Samsung Galaxy S24 Ultra tích hợp bộ công cụ Galaxy AI, camera tiềm vọng 50MP zoom 100x và màn hình phẳng Corning Gorilla Armor chống chói đỉnh cao.',
    address: 'Quận Ninh Kiều, Cần Thơ',
    location: {
      type: 'Point',
      coordinates: [105.7845, 10.0342], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'MacBook Pro 16 M3 Max 36GB RAM 1TB SSD',
    name: 'MacBook Pro 16 M3 Max 36GB RAM 1TB SSD',
    brand: 'Apple',
    category: 'laptop',
    condition: 'like_new',
    dailyRate: 450000,
    pricePerDay: 450000,
    depositValue: 40000000,
    rating: 5.0,
    ratingAvg: 5.0,
    reviewCount: 32,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'],
    specs: {
      Chip: 'Apple M3 Max 14-core CPU, 30-core GPU',
      RAM: '36GB Unified Memory',
      SSD: '1TB NVMe siêu tốc',
      Screen: '16.2 inch Liquid Retina XDR 120Hz ProMotion',
    },
    description: 'Cỗ máy dựng phim 8K, render 3D chuyên nghiệp. Pin bền bỉ tới 18 tiếng, màn hình XDR màu chuẩn 100% DCI-P3 đáp ứng khắt khe các dự án điện ảnh.',
    address: 'Quận Ba Đình, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8194, 21.0333], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Dell XPS 16 9640 Core Ultra 7 RTX 4060',
    name: 'Dell XPS 16 9640 Core Ultra 7 RTX 4060',
    brand: 'Dell',
    category: 'laptop',
    condition: 'good',
    dailyRate: 320000,
    pricePerDay: 320000,
    depositValue: 28000000,
    rating: 4.7,
    ratingAvg: 4.7,
    reviewCount: 11,
    images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
    specs: {
      CPU: 'Intel Core Ultra 7 155H 16 nhân',
      GPU: 'NVIDIA GeForce RTX 4060 8GB GDDR6',
      RAM: '32GB LPDDR5x 7467MHz',
      Display: '16.3 inch 4K+ OLED cảm ứng',
    },
    description: 'Thiết kế tối giản nguyên khối nhôm phay CNC, hàng phím chức năng cảm ứng vô cực sang trọng, xử lý đồ họa mượt mà và màn hình OLED siêu rực rỡ.',
    address: 'Quận Cái Răng, Cần Thơ',
    location: {
      type: 'Point',
      coordinates: [105.7538, 10.0089], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Sony Alpha A7 IV Body Full-Frame Mirrorless',
    name: 'Sony Alpha A7 IV Body Full-Frame Mirrorless',
    brand: 'Sony',
    category: 'camera',
    condition: 'like_new',
    dailyRate: 380000,
    pricePerDay: 380000,
    depositValue: 30000000,
    rating: 4.9,
    ratingAvg: 4.9,
    reviewCount: 45,
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
    specs: {
      Sensor: '33MP Full-Frame Exmor R BSI CMOS',
      Video: '4K 60p 10-bit 4:2:2 All-Intra',
      Autofocus: '759 điểm lấy nét theo pha với Real-time Eye AF',
      Stabilization: 'Chống rung 5 trục SteadyShot 5.5 stops',
    },
    description: 'Máy ảnh hybrid toàn năng cho nhiếp ảnh gia và nhà làm phim độc lập. Lấy nét mắt người, động vật, chim chóc theo thời gian thực chuẩn xác.',
    address: 'Quận Hoàn Kiếm, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8544, 21.0285], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Canon EOS R6 Mark II Body Full-Frame',
    name: 'Canon EOS R6 Mark II Body Full-Frame',
    brand: 'Canon',
    category: 'camera',
    condition: 'like_new',
    dailyRate: 420000,
    pricePerDay: 420000,
    depositValue: 35000000,
    rating: 4.9,
    ratingAvg: 4.9,
    reviewCount: 28,
    images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'],
    specs: {
      Sensor: '24.2MP Full-frame CMOS',
      Burst: '40 fps màn trập điện tử với AF/AE tracking',
      Video: '6K oversampled 4K 60p không crop',
      Autofocus: 'Dual Pixel CMOS AF II với công nghệ Deep Learning',
    },
    description: 'Tốc độ chụp thể thao và sự kiện đỉnh cao với 40 hình/giây. Chống rung phối hợp thân máy và ống kính lên tới 8 stops.',
    address: 'Quận Đống Đa, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8286, 21.018], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'DJI Mini 4 Pro Fly More Combo Plus',
    name: 'DJI Mini 4 Pro Fly More Combo Plus',
    brand: 'DJI',
    category: 'drone',
    condition: 'new',
    dailyRate: 290000,
    pricePerDay: 290000,
    depositValue: 16000000,
    rating: 4.8,
    ratingAvg: 4.8,
    reviewCount: 35,
    images: ['https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800'],
    specs: {
      Weight: '< 249g tiêu chuẩn bay tự do',
      FlightTime: '45 phút (Pin thông minh Plus)',
      Video: '4K 60fps HDR quay xoay dọc True Vertical',
      Sensors: 'Cảm biến chướng ngại vật đa hướng 360 độ',
    },
    description: 'Flycam mini siêu nhẹ dưới 249g, truyền sóng O4 FHD xa tới 20km, tích hợp tính năng ActiveTrack 360 độ theo dõi chủ thể thông minh.',
    address: 'Quận Ninh Kiều, Cần Thơ',
    location: {
      type: 'Point',
      coordinates: [105.7712, 10.0452], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Tai nghe chống ồn Sony WH-1000XM5 Silver',
    name: 'Tai nghe chống ồn Sony WH-1000XM5 Silver',
    brand: 'Sony',
    category: 'audio',
    condition: 'like_new',
    dailyRate: 90000,
    pricePerDay: 90000,
    depositValue: 5500000,
    rating: 4.9,
    ratingAvg: 4.9,
    reviewCount: 52,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
    specs: {
      Driver: '30mm màng carbon tổng hợp cao cấp',
      Battery: '30 giờ nghe liên tục khi bật ANC',
      Codecs: 'LDAC, AAC, SBC chuẩn Hi-Res Audio Wireless',
      Micro: '8 micro beamforming khử ồn và lọc gió AI',
    },
    description: 'Tai nghe over-ear chống ồn chủ động tốt nhất phân khúc, trọng lượng siêu nhẹ 250g êm ái khi đeo làm việc và đi máy bay đường dài.',
    address: 'Quận Thanh Xuân, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.8058, 20.9937], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Apple iPad Pro M4 13-inch 256GB Wi-Fi',
    name: 'Apple iPad Pro M4 13-inch 256GB Wi-Fi',
    brand: 'Apple',
    category: 'tablet',
    condition: 'new',
    dailyRate: 260000,
    pricePerDay: 260000,
    depositValue: 25000000,
    rating: 5.0,
    ratingAvg: 5.0,
    reviewCount: 17,
    images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'],
    specs: {
      Chip: 'Apple M4 kiến trúc 3nm thế hệ mới',
      Display: '13-inch Ultra Retina XDR Tandem OLED',
      Thickness: '5.1mm mỏng nhất lịch sử Apple',
      Accessories: 'Tương thích Apple Pencil Pro và Magic Keyboard',
    },
    description: 'Đỉnh cao máy tính bảng với màn hình OLED kép Tandem siêu sáng 1600 nits, chip M4 xử lý AI đồ họa cực mạnh, lý tưởng cho thiết kế đồ họa.',
    address: 'Quận Tây Hồ, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.819, 21.0718], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Apple Watch Ultra 2 Titanium 49mm Ocean Band',
    name: 'Apple Watch Ultra 2 Titanium 49mm Ocean Band',
    brand: 'Apple',
    category: 'accessory',
    condition: 'like_new',
    dailyRate: 150000,
    pricePerDay: 150000,
    depositValue: 16000000,
    rating: 4.8,
    ratingAvg: 4.8,
    reviewCount: 22,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    specs: {
      Case: 'Titanium cấp hàng không vũ trụ 49mm',
      Screen: 'OLED Retina 3000 nits chống trầy Sapphire',
      Battery: '36 giờ chế độ tiêu chuẩn, 72 giờ tiết kiệm pin',
      WaterResistance: 'Chuẩn chống nước 100m, lặn biển EN13319',
    },
    description: 'Đồng hồ thông minh thể thao chuyên nghiệp với GPS băng tần kép L1 và L5, còi báo động khẩn cấp 86dB nghe thấy trong phạm vi 180m.',
    address: 'Quận Bình Thủy, Cần Thơ',
    location: {
      type: 'Point',
      coordinates: [105.7489, 10.0652], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'DJI Osmo Pocket 3 Creator Combo 4K 120fps',
    name: 'DJI Osmo Pocket 3 Creator Combo 4K 120fps',
    brand: 'DJI',
    category: 'camera',
    condition: 'new',
    dailyRate: 190000,
    pricePerDay: 190000,
    depositValue: 12000000,
    rating: 4.9,
    ratingAvg: 4.9,
    reviewCount: 41,
    images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'],
    specs: {
      Sensor: '1 inch CMOS quay 4K 120fps slow-motion',
      Screen: '2 inch OLED cảm ứng xoay ngang dọc linh hoạt',
      Gimbal: 'Chống rung cơ học 3 trục độc quyền DJI',
      Audio: 'Kèm mic thu âm không dây DJI Mic 2 Transmitter',
    },
    description: 'Camera vlog bỏ túi cảm biến 1 inch quay thiếu sáng ấn tượng, màn hình xoay thông minh tự chuyển chế độ quay dọc TikTok/Reels trong 1 giây.',
    address: 'Quận Hai Bà Trưng, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.85, 21.0069], // [lng, lat]
    },
    status: 'available',
  },
  {
    title: 'Bộ Micro thu âm Rode Wireless PRO Kit 32-bit Float',
    name: 'Bộ Micro thu âm Rode Wireless PRO Kit 32-bit Float',
    brand: 'Rode',
    category: 'audio',
    condition: 'like_new',
    dailyRate: 140000,
    pricePerDay: 140000,
    depositValue: 8500000,
    rating: 4.8,
    ratingAvg: 4.8,
    reviewCount: 29,
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800'],
    specs: {
      Recording: 'Ghi âm 32-bit float onboard chống vỡ tiếng',
      Range: 'Khoảng cách truyền tín hiệu số Series IV 260m',
      Timecode: 'Đồng bộ mã thời gian Timecode chuẩn xác',
      Memory: 'Bộ nhớ trong 32GB trên mỗi bộ phát lưu hơn 40 giờ âm thanh',
    },
    description: 'Hệ thống micro thu âm không dây 2 kênh đỉnh cao cho các đoàn làm phim. Công nghệ 32-bit float giúp bạn thu được mọi âm thanh từ tiếng thì thầm đến tiếng nổ mà không bị méo tiếng.',
    address: 'Quận Nam Từ Liêm, Hà Nội',
    location: {
      type: 'Point',
      coordinates: [105.7652, 21.0142], // [lng, lat]
    },
    status: 'available',
  },
];

/**
 * Main seeding function with strict environment guard
 */
export const seedDevelopmentDevices = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/techshare';

  console.log('----------------------------------------------------');
  console.log('⚡ TechShare Web — Development Device Seeder');
  console.log(`Connecting to: ${mongoUri}`);

  // Safety guard: only allow local MongoDB execution
  const isLocalHost =
    mongoUri.includes('localhost') ||
    mongoUri.includes('127.0.0.1') ||
    mongoUri.startsWith('mongodb://localhost') ||
    mongoUri.startsWith('mongodb://127.0.0.1');

  if (!isLocalHost) {
    console.error('❌ SAFETY ABORT: Seeder can only run on local MongoDB instances (localhost / 127.0.0.1).');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ Connected successfully to: ${conn.connection.name}`);

    // Ensure geospatial 2dsphere index exists on Device collection
    await Device.collection.createIndex({ location: '2dsphere' });
    console.log('✅ Created 2dsphere index on location field');

    // Clean existing dev devices to prevent duplicate accumulation (Idempotent)
    const deleteResult = await Device.deleteMany({});
    console.log(`🧹 Cleaned ${deleteResult.deletedCount} existing devices from development database.`);

    // Insert curated devices
    const inserted = await Device.insertMany(DEVELOPMENT_DEVICES);
    console.log(`🎉 Successfully inserted ${inserted.length} development devices!`);

    // Verify summary by category
    const categoryCounts = await Device.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log('\n📊 Devices by category in MongoDB:');
    categoryCounts.forEach((c) => {
      console.log(`  - ${c._id}: ${c.count}`);
    });

    const totalCount = await Device.countDocuments();
    console.log(`\n📦 Total devices in collection: ${totalCount}`);
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    console.log('🔒 Closed MongoDB connection cleanly.');
    return { success: true, count: inserted.length };
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    await mongoose.disconnect();
    throw error;
  }
};

// Execute if run directly from CLI
const isDirectExecution = process.argv[1] && process.argv[1].endsWith('seedDevices.js');
if (isDirectExecution) {
  seedDevelopmentDevices()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDevelopmentDevices;
