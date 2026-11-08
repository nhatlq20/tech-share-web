import mongoose from "mongoose";
import Device from "../models/Device.js";
import User from "../models/User.js";
import { uploadToCloudinary } from "../services/cloudinaryService.js";
import { resolveDeviceLocation } from "../utils/locationHelper.js";

/**
 * Helper to get MongoDB collections safely if Mongoose connection is ready
 */
const getDevicesCollection = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not initialized yet.");
  }
  return db.collection("devices");
};

const getUsersCollection = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not initialized yet.");
  }
  return db.collection("users");
};

// Các hằng số mặc định cho chức năng đề xuất Home
const RECOMMENDATION_DEFAULT_PAGE = 1;
const RECOMMENDATION_PAGE_SIZE = 24;
const HOME_RECOMMENDATION_MAX_DISTANCE_METERS = 100000; // Bán kính tối đa 100 km cho Home
const NEARBY_MAX_DISTANCE_METERS = 10000;              // Bán kính tối đa 10 km cho Nearby
const MAX_LATITUDE = 90;                                // Giới hạn vĩ độ (-90 đến +90)
const MAX_LONGITUDE = 180;                              // Giới hạn kinh độ (-180 đến +180)

/**
 * Danh sách tọa độ trung tâm các thành phố lớn tại Việt Nam
 * Thứ tự tọa độ theo chuẩn GeoJSON: [Kinh độ (Longitude), Vĩ độ (Latitude)]
 */
export const VIETNAM_CITIES = {
  can_tho: {
    key: "can_tho",
    name: "Cần Thơ",
    aliases: ["can tho", "can_tho", "cần thơ", "cantho", "tp. cần thơ", "tp cần thơ"],
    coordinates: [105.7469, 10.0452], // [lng, lat]
  },
  ha_noi: {
    key: "ha_noi",
    name: "Hà Nội",
    aliases: ["ha noi", "ha_noi", "hanoi", "hà nội", "tp. hà nội", "tp hà nội"],
    coordinates: [105.8542, 21.0285],
  },
  ho_chi_minh: {
    key: "ho_chi_minh",
    name: "TP. Hồ Chí Minh",
    aliases: ["ho chi minh", "ho_chi_minh", "hcm", "tp hcm", "tp. hcm", "tp. hồ chí minh", "saigon", "sài gòn", "tphcm"],
    coordinates: [106.7009, 10.7769],
  },
  da_nang: {
    key: "da_nang",
    name: "Đà Nẵng",
    aliases: ["da nang", "da_nang", "danang", "đà nẵng", "tp. đà nẵng", "tp đà nẵng"],
    coordinates: [108.2022, 16.0544],
  },
  hai_phong: {
    key: "hai_phong",
    name: "Hải Phòng",
    aliases: ["hai phong", "hai_phong", "haiphong", "hải phòng", "tp. hải phòng", "tp hải phòng"],
    coordinates: [106.6881, 20.8449],
  },
};

/**
 * Hàm tìm kiếm thông tin thành phố theo từ khóa người dùng nhập (hỗ trợ nhiều alias)
 * @param {string} cityInput - Tên thành phố do client gửi lên
 * @returns {object|null} - Đối tượng thông tin thành phố gồm key, name, coordinates [lng, lat]
 */
export const resolveCityCoordinates = (cityInput) => {
  if (!cityInput || typeof cityInput !== "string") {
    return null;
  }

  const normalized = cityInput.trim().toLowerCase();

  for (const city of Object.values(VIETNAM_CITIES)) {
    if (city.key === normalized || city.aliases.includes(normalized)) {
      return city;
    }
  }

  return null;
};

/**
 * Hàm kiểm tra giá trị query có phải là một số hợp lệ dạng chuỗi hay không
 * @param {any} value - Giá trị cần kiểm tra
 * @returns {boolean}
 */
const isNumericQueryValue = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }
  return Number.isFinite(Number(trimmed));
};

/**
 * Tạo stage phân trang ($facet) cho MongoDB Aggregation Pipeline
 * @param {number} page - Số trang hiện tại (bắt đầu từ 1)
 * @param {number} limit - Số lượng bản ghi trên mỗi trang
 * @returns {Array<object>}
 */
const geoPaginationStages = (page, limit) => {
  const skipCount = (page - 1) * limit;

  return [
    {
      $facet: {
        data: [{ $skip: skipCount }, { $limit: limit }],
        totals: [{ $count: "total" }],
      },
    },
  ];
};

/**
 * Hàm thoát (escape) các ký tự đặc biệt của Regular Expression
 * Giúp tìm kiếm từ khóa an toàn, tránh lỗi cú pháp Regex và Regex Injection
 * @param {string} string - Chuỗi văn bản cần escape
 * @returns {string}
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * ============================================================================
 * CHỨC NĂNG HOME: ĐỀ XUẤT THIẾT BỊ THEO VỊ TRÍ VÀ TÌM KIẾM
 * Endpoint: GET /api/devices/recommended
 * 
 * Luồng xử lý gồm 5 bước tuần tự:
 * - Bước 1: Tiếp nhận dữ liệu từ request query (lat, lng, city, category, q, page, limit)
 * - Bước 2: Kiểm tra và chuẩn hóa dữ liệu đầu vào (Validation)
 * - Bước 3: Xây dựng bộ lọc điều kiện cho User và Device (Query Filters)
 * - Bước 4: Truy vấn cơ sở dữ liệu MongoDB qua Aggregation Pipeline
 * - Bước 5: Định dạng và trả response về cho Client
 * ============================================================================
 */
export const getRecommendedDevices = async (req, res, next) => {
  try {
    // ------------------------------------------------------------------------
    // BƯỚC 1: TIẾP NHẬN DỮ LIỆU TỪ REQUEST QUERY
    // ------------------------------------------------------------------------
    const {
      lat,
      lng,
      latitude,
      longitude,
      city,
      category,
      q,
      keyword,
      page = RECOMMENDATION_DEFAULT_PAGE,
      limit,
    } = req.query;

    // ------------------------------------------------------------------------
    // BƯỚC 2: KIỂM TRA VÀ CHUẨN HÓA DỮ LIỆU ĐẦU VÀO (VALIDATION)
    // ------------------------------------------------------------------------

    // 2.1. Xác định tọa độ tìm kiếm (ưu tiên tọa độ người dùng, nếu không có thì lấy theo thành phố)
    const hasLat = lat !== undefined || latitude !== undefined;
    const hasLng = lng !== undefined || longitude !== undefined;
    const rawLat = lat !== undefined ? lat : latitude;
    const rawLng = lng !== undefined ? lng : longitude;
    const resolvedCity = resolveCityCoordinates(city);

    let userLat = NaN;
    let userLng = NaN;

    if (hasLat || hasLng) {
      // Nếu client truyền tọa độ, kiểm tra xem có phải là dạng số hợp lệ không
      if (!isNumericQueryValue(rawLat) || !isNumericQueryValue(rawLng)) {
        return res.status(400).json({
          success: false,
          message: "Valid lat, lng, page and limit are required.",
        });
      }
      userLat = Number(rawLat);
      userLng = Number(rawLng);
    } else if (resolvedCity) {
      // Nếu không truyền tọa độ nhưng truyền tên thành phố hợp lệ, lấy tọa độ trung tâm thành phố
      userLng = resolvedCity.coordinates[0]; // GeoJSON quy định: [Kinh độ (lng), Vĩ độ (lat)]
      userLat = resolvedCity.coordinates[1];
    } else {
      // Thiếu cả tọa độ lẫn tên thành phố hợp lệ
      return res.status(400).json({
        success: false,
        message: "Valid lat, lng, page and limit are required.",
      });
    }

    // 2.2. Kiểm tra giới hạn địa lý của tọa độ (-90 <= lat <= 90, -180 <= lng <= 180)
    const isValidLat = Number.isFinite(userLat) && Math.abs(userLat) <= MAX_LATITUDE;
    const isValidLng = Number.isFinite(userLng) && Math.abs(userLng) <= MAX_LONGITUDE;
    if (!isValidLat || !isValidLng) {
      return res.status(400).json({
        success: false,
        message: "Valid lat, lng, page and limit are required.",
      });
    }

    // 2.3. Kiểm tra và chuẩn hóa từ khóa tìm kiếm (hỗ trợ cả tham số 'q' và 'keyword')
    const rawKeyword = q !== undefined ? q : keyword;
    if (rawKeyword !== undefined && typeof rawKeyword !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid search keyword is required.",
      });
    }

    const cleanKeyword = rawKeyword ? rawKeyword.trim() : "";
    if (cleanKeyword.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search keyword must not exceed 100 characters.",
      });
    }

    // 2.4. Kiểm tra và tính toán phân trang (page, limit, skip)
    const pageNum = Number(page);

    // Khi có từ khóa tìm kiếm: tối đa 12 thiết bị/trang; khi duyệt bình thường: tối đa 24 thiết bị/trang
    const defaultLimit = cleanKeyword ? 12 : RECOMMENDATION_PAGE_SIZE;
    const requestedLimit = limit !== undefined ? Number(limit) : defaultLimit;
    const limitNum = Math.min(requestedLimit, cleanKeyword ? 12 : RECOMMENDATION_PAGE_SIZE);
    const skip = (pageNum - RECOMMENDATION_DEFAULT_PAGE) * limitNum;

    const isValidPagination =
      Number.isSafeInteger(pageNum) &&
      pageNum >= RECOMMENDATION_DEFAULT_PAGE &&
      Number.isSafeInteger(requestedLimit) &&
      requestedLimit >= 1 &&
      Number.isSafeInteger(skip);

    if (!isValidPagination) {
      return res.status(400).json({
        success: false,
        message: "Valid lat, lng, page and limit are required.",
      });
    }

    // 2.5. Kiểm tra danh mục thiết bị (category)
    if (category !== undefined && typeof category !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid device category is required.",
      });
    }

    const categoryFilter = category ? category.trim().toLowerCase() : "";
    const allowedCategories = Device.schema.path("category").enumValues;
    if (categoryFilter && categoryFilter !== "all" && !allowedCategories.includes(categoryFilter)) {
      return res.status(400).json({
        success: false,
        message: "Valid device category is required.",
      });
    }

    // ------------------------------------------------------------------------
    // BƯỚC 3: XÂY DỰNG BỘ LỌC ĐIỀU KIỆN (QUERY FILTERS)
    // ------------------------------------------------------------------------

    // 3.1. Bộ lọc vị trí người dùng (User Geo Filter)
    // Áp dụng cho collection 'users': chỉ chọn User đang hoạt động và có tọa độ Point GeoJSON hợp lệ
    const userGeoFilter = {
      isActive: { $ne: false },
      "location.type": "Point",
      "location.coordinates": { $size: 2 },
      "location.coordinates.0": {
        $type: "number",
        $gte: -MAX_LONGITUDE,
        $lte: MAX_LONGITUDE,
      },
      "location.coordinates.1": {
        $type: "number",
        $gte: -MAX_LATITUDE,
        $lte: MAX_LATITUDE,
      },
    };

    // 3.2. Bộ lọc thiết bị khả dụng (Device Filter)
    // Áp dụng cho collection 'devices': chỉ lấy thiết bị sẵn sàng thuê, chưa bị xóa và đã kiểm duyệt
    const deviceFilter = {
      status: "available",
      isDeleted: { $ne: true },
      $or: [
        { moderationStatus: "approved" },
        { moderationStatus: { $exists: false } },
      ],
    };

    // Lọc theo danh mục sản phẩm nếu người dùng có chọn
    if (categoryFilter && categoryFilter !== "all") {
      deviceFilter.category = categoryFilter;
    }

    // Lọc theo từ khóa tìm kiếm (so khớp không phân biệt hoa thường với tên, tiêu đề, hãng, mô tả)
    if (cleanKeyword) {
      const searchRegex = new RegExp(escapeRegex(cleanKeyword), "i");
      deviceFilter.$and = [
        {
          $or: [
            { name: searchRegex },
            { title: searchRegex },
            { brand: searchRegex },
            { description: searchRegex },
          ],
        },
      ];
    }

    // ------------------------------------------------------------------------
    // BƯỚC 4: TRUY VẤN DATABASE QUA MONGODB AGGREGATION PIPELINE
    // ------------------------------------------------------------------------
    // Kiến trúc Single Source of Truth: Vị trí tọa độ được lưu tại User.location
    // Pipeline gồm 8 giai đoạn:
    // 1. $geoNear: Tìm các Owner gần tọa độ tìm kiếm nhất trong bán kính 100km
    // 2. $lookup: Nối sang bảng devices để lấy danh sách thiết bị của từng Owner
    // 3. $unwind: Trải phẳng mảng thiết bị để mỗi thiết bị là một document riêng biệt
    // 4. $replaceRoot: Đưa thiết bị lên làm document chính, đính kèm thông tin Owner và khoảng cách
    // 5. $set: Tạo trường tạm _recommendationRating để chuẩn bị sắp xếp theo điểm đánh giá
    // 6. $sort: Sắp xếp theo thứ tự: Gần nhất -> Đánh giá cao nhất -> Mới nhất -> ID
    // 7. $unset: Loại bỏ trường tạm _recommendationRating để dữ liệu trả về sạch sẽ
    // 8. $facet: Phân trang dữ liệu và đếm tổng số lượng trong cùng một câu truy vấn
    const pipelineStages = [
      // Stage 1: Tìm User (Owner) gần nhất bằng $geoNear
      {
        $geoNear: {
          near: { type: "Point", coordinates: [userLng, userLat] },
          key: "location",
          distanceField: "distanceMeters",
          spherical: true,
          maxDistance: HOME_RECOMMENDATION_MAX_DISTANCE_METERS,
          query: userGeoFilter,
        },
      },
      // Stage 2: Nối với collection devices để lấy thiết bị thỏa mãn deviceFilter
      {
        $lookup: {
          from: "devices",
          localField: "_id",
          foreignField: "ownerId",
          pipeline: [{ $match: deviceFilter }],
          as: "deviceList",
        },
      },
      // Stage 3: Tách từng phần tử trong deviceList thành từng document
      { $unwind: "$deviceList" },
      // Stage 4: Định hình lại document: giữ nguyên các trường của device và bổ sung distance, location, owner
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$deviceList",
              {
                distanceMeters: "$distanceMeters",
                location: {
                  type: "$location.type",
                  coordinates: "$location.coordinates",
                  addressText: { $ifNull: ["$address", ""] },
                },
                owner: {
                  _id: "$_id",
                  name: "$name",
                  avatar: "$avatar",
                  address: "$address",
                  trust: "$trust",
                  rating: "$rating",
                  totalReviews: "$totalReviews",
                },
              },
            ],
          },
        },
      },
      // Stage 5: Tạo điểm rating thống nhất (_recommendationRating) với fallback an toàn
      {
        $set: {
          _recommendationRating: {
            $ifNull: [
              "$stats.ratingAvg",
              { $ifNull: ["$rating", { $ifNull: ["$ratingAvg", 0] }] },
            ],
          },
        },
      },
      // Stage 6: Sắp xếp theo khoảng cách tăng dần, điểm đánh giá giảm dần
      {
        $sort: {
          distanceMeters: 1,
          _recommendationRating: -1,
          createdAt: -1,
          _id: 1,
        },
      },
      // Stage 7: Xóa trường tạm _recommendationRating
      { $unset: "_recommendationRating" },
      // Stage 8: Phân trang (skip/limit) và đếm tổng số thiết bị
      ...geoPaginationStages(pageNum, limitNum),
    ];

    const [result] = await getUsersCollection().aggregate(pipelineStages).toArray();

    // ------------------------------------------------------------------------
    // BƯỚC 5: XỬ LÝ DỮ LIỆU VÀ TRẢ VỀ RESPONSE
    // ------------------------------------------------------------------------
    const devices = result?.data || [];
    const total = result?.totals[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const hasNextPage = pageNum * limitNum < total;

    // Log thông tin tìm kiếm khi chạy thực tế (bỏ qua khi chạy test)
    if (process.env.NODE_ENV !== "test") {
      const cityName = resolvedCity?.name || "By Coordinates";
      console.log(`[RECOMMENDATIONS] Search city: ${cityName}`);
      console.log(`[RECOMMENDATIONS] Search center [lng, lat]: [${userLng}, ${userLat}] (Radius: 100km)`);
      console.log(`[RECOMMENDATIONS] Devices returned: ${devices.length}, total eligible: ${total}`);
      if (devices.length > 0) {
        const firstDevice = devices[0];
        const distanceKm = (firstDevice.distanceMeters / 1000).toFixed(1);
        console.log(`[RECOMMENDATIONS] Sample device: ${firstDevice.name} | Owner: ${firstDevice.owner?.name} (${distanceKm} km)`);
      }
    }

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
      searchCity: resolvedCity?.name || null,
      searchCenter: [userLng, userLat],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage,
      },
    });
  } catch (error) {
    // Chuyển lỗi phát sinh cho middleware error handling xử lý tập trung
    next(error);
  }
};

/**
 * 1. GET /api/devices
 * Fetches paginated devices with search (q/keyword), category, pagination (page, limit) and sorting.
 */
export const getDevices = async (req, res, next) => {
  try {
    const { q, keyword, category, page = 1, limit = 12, sort } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {
      isDeleted: { $ne: true },
      status: "available",
      $and: [
        {
          $or: [
            { moderationStatus: "approved" },
            { moderationStatus: { $exists: false } },
          ],
        },
      ],
    };

    // Category filter (ignore 'all' or empty)
    if (
      category &&
      typeof category === "string" &&
      category.trim().toLowerCase() !== "all"
    ) {
      filter.category = category.trim().toLowerCase();
    }

    // Search query (keyword or q)
    const searchTerm = (q || keyword || "").toString().trim();
    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      filter.$and.push({
        $or: [
          { title: regex },
          { name: regex },
          { brand: regex },
          { description: regex },
        ],
      });
    }

    // Build sort options
    let sortOptions = { createdAt: -1 };
    if (sort && typeof sort === "string") {
      const trimmedSort = sort.trim();
      if (trimmedSort === "dailyRate" || trimmedSort === "pricePerDay") {
        sortOptions = { dailyRate: 1 };
      } else if (
        trimmedSort === "-dailyRate" ||
        trimmedSort === "-pricePerDay"
      ) {
        sortOptions = { dailyRate: -1 };
      } else if (trimmedSort === "rating" || trimmedSort === "ratingAvg") {
        sortOptions = { rating: -1 };
      } else if (trimmedSort === "oldest") {
        sortOptions = { createdAt: 1 };
      } else if (trimmedSort === "newest") {
        sortOptions = { createdAt: -1 };
      }
    }

    // Query using Mongoose model if connected, or direct collection
    let devices = [];
    let total = 0;

    if (mongoose.connection.readyState === 1) {
      total = await Device.countDocuments(filter);
      devices = await Device.find(filter)
        .populate("ownerId", "name email phone avatar address location trust rating totalReviews")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true });
    } else {
      // Fallback to direct collection if model is not bound
      const devicesCol = getDevicesCollection();
      total = await devicesCol.countDocuments(filter);
      devices = await devicesCol
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .toArray();

      const ownerIds = [...new Set(devices.map((d) => d.ownerId).filter(Boolean))];
      if (ownerIds.length > 0) {
        const usersCol = getUsersCollection();
        const owners = await usersCol.find({ _id: { $in: ownerIds } }).toArray();
        const ownerMap = new Map(owners.map((u) => [u._id.toString(), u]));
        devices = devices.map((d) => ({
          ...d,
          ownerId: ownerMap.get(d.ownerId?.toString()) || null,
        }));
      }
    }

    // Normalize output fields
    const normalizedDevices = devices.map((d) => {
      const loc = resolveDeviceLocation(d, d.ownerId);
      return {
        _id: d._id ? d._id.toString() : "",
        title: d.title || d.name || "Untitled Device",
        name: d.name || d.title || "Untitled Device",
        brand: d.brand || "",
        category: d.category || "other",
        condition: d.condition || "good",
        dailyRate: d.dailyRate ?? d.pricePerDay ?? 0,
        pricePerDay: d.pricePerDay ?? d.dailyRate ?? 0,
        depositValue: d.depositValue || 0,
        rating: d.stats?.ratingAvg ?? d.rating ?? d.ratingAvg ?? 0,
        ratingAvg: d.stats?.ratingAvg ?? d.ratingAvg ?? d.rating ?? 0,
        reviewCount: d.stats?.ratingCount ?? d.reviewCount ?? 0,
        images: Array.isArray(d.images) ? d.images : [],
        location: loc,
        address: loc?.addressText || (typeof d.ownerId === "object" ? d.ownerId?.address : "") || d.address || "",
        status: d.status || "available",
        createdAt: d.createdAt || new Date(),
        owner: d.ownerId && typeof d.ownerId === "object" ? {
          _id: d.ownerId._id?.toString(),
          name: d.ownerId.name,
          avatar: d.ownerId.avatar,
          address: d.ownerId.address,
        } : undefined,
      };
    });

    return res.status(200).json({
      success: true,
      count: normalizedDevices.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: normalizedDevices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/devices/nearby
 * Fetches devices within radius from lat/lng
 */
/**
 * ============================================================================
 * CHỨC NĂNG BẢN ĐỒ: TÌM KIẾM THIẾT BỊ GẦN NHẤT (MAP / NEARBY FEATURE)
 * Endpoint: GET /api/devices/nearby
 * Quyền truy cập: Public (Công khai, không yêu cầu đăng nhập)
 * 
 * Luồng xử lý tuần tự gồm 6 bước:
 * - Bước 1: Tiếp nhận dữ liệu từ request query (lat, lng, radius, category, availability, sort, page, limit)
 * - Bước 2: Kiểm tra và chuẩn hóa dữ liệu đầu vào (Validation tọa độ, bán kính, phân trang)
 * - Bước 3: Xây dựng bộ lọc điều kiện cho User và Device (Query Filters)
 * - Bước 4: Xây dựng tiêu chí sắp xếp kết quả (Sort Stage)
 * - Bước 5: Truy vấn MongoDB bằng Aggregation Pipeline ($geoNear, $lookup, $facet)
 * - Bước 6: Định dạng và trả response về cho Frontend hiển thị Marker trên bản đồ
 * ============================================================================
 */
export const getNearbyDevices = async (req, res, next) => {
  try {
    // ------------------------------------------------------------------------
    // BƯỚC 1: TIẾP NHẬN DỮ LIỆU TỪ REQUEST QUERY
    // ------------------------------------------------------------------------
    const {
      lat,
      lng,
      latitude,
      longitude,
      radius = NEARBY_MAX_DISTANCE_METERS, // Bán kính mặc định 10,000 mét (10 km)
      category,
      availability,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // ------------------------------------------------------------------------
    // BƯỚC 2: KIỂM TRA VÀ CHUẨN HÓA DỮ LIỆU ĐẦU VÀO (VALIDATION)
    // ------------------------------------------------------------------------
    // Hỗ trợ cả 2 cách đặt tên tham số tọa độ: lat/lng hoặc latitude/longitude
    const rawLatitude = lat !== undefined ? lat : latitude;
    const rawLongitude = lng !== undefined ? lng : longitude;

    // 2.1. Kiểm tra chuỗi tọa độ có phải là số hợp lệ không
    const isValidLatString = isNumericQueryValue(rawLatitude);
    const isValidLngString = isNumericQueryValue(rawLongitude);

    const userLat = Number(rawLatitude);
    const userLng = Number(rawLongitude);

    // 2.2. Kiểm tra giới hạn địa lý của vĩ độ (-90 đến +90) và kinh độ (-180 đến +180)
    const isValidLatitude = Number.isFinite(userLat) && Math.abs(userLat) <= MAX_LATITUDE;
    const isValidLongitude = Number.isFinite(userLng) && Math.abs(userLng) <= MAX_LONGITUDE;

    // 2.3. Kiểm tra bán kính tìm kiếm (bán kính phải là số dương, giới hạn tối đa 10 km)
    const requestedRadius = Number(radius);
    const maxDistance = Math.min(requestedRadius, NEARBY_MAX_DISTANCE_METERS);
    const isValidRadius = Number.isFinite(requestedRadius) && maxDistance > 0;

    // 2.4. Kiểm tra và tính toán phân trang (page, limit, skip)
    const pageNum = Number(page);
    const requestedLimit = Number(limit);
    const limitNum = Math.min(100, requestedLimit); // Giới hạn tối đa 100 sản phẩm/trang
    const skipCount = (pageNum - 1) * limitNum;

    const isValidPagination =
      Number.isSafeInteger(pageNum) &&
      pageNum >= 1 &&
      Number.isSafeInteger(requestedLimit) &&
      requestedLimit >= 1 &&
      Number.isSafeInteger(skipCount);

    // Nếu bất kỳ dữ liệu nào không hợp lệ -> trả về lỗi HTTP 400 Bad Request
    if (
      !isValidLatString ||
      !isValidLngString ||
      !isValidLatitude ||
      !isValidLongitude ||
      !isValidRadius ||
      !isValidPagination
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates, radius, page and limit are required.",
      });
    }

    // ------------------------------------------------------------------------
    // BƯỚC 3: XÂY DỰNG BỘ LỌC ĐIỀU KIỆN (QUERY FILTERS)
    // ------------------------------------------------------------------------

    // 3.1. Bộ lọc vị trí người dùng (User Geo Filter) trên collection 'users'
    // Đảm bảo chỉ tìm các Owner đang hoạt động và có tọa độ Point GeoJSON hợp lệ
    const userGeoFilter = {
      isActive: { $ne: false },
      "location.type": "Point",
      "location.coordinates": { $size: 2 },
      "location.coordinates.0": { $type: "number", $gte: -MAX_LONGITUDE, $lte: MAX_LONGITUDE },
      "location.coordinates.1": { $type: "number", $gte: -MAX_LATITUDE, $lte: MAX_LATITUDE },
    };

    // 3.2. Bộ lọc thiết bị khả dụng (Device Filter) trên collection 'devices'
    // Chỉ lấy thiết bị sẵn sàng cho thuê, chưa bị xóa mềm và đã được kiểm duyệt
    const deviceFilter = {
      status: "available",
      isDeleted: { $ne: true },
      $or: [
        { moderationStatus: "approved" },
        { moderationStatus: { $exists: false } },
      ],
    };

    // Lọc theo danh mục sản phẩm nếu người dùng có chọn
    if (category && typeof category === "string" && category.trim().toLowerCase() !== "all") {
      deviceFilter.category = category.trim().toLowerCase();
    }

    // Lọc theo trạng thái khả dụng nếu có
    if (availability && typeof availability === "string" && availability.trim().toLowerCase() !== "all") {
      deviceFilter.status = availability.trim().toLowerCase();
    }

    // ------------------------------------------------------------------------
    // BƯỚC 4: XÁC ĐỊNH TIÊU CHÍ SẮP XẾP KẾT QUẢ (SORT STAGE)
    // ------------------------------------------------------------------------
    // Mặc định: Gần người dùng nhất trước (distanceMeters tăng dần)
    let sortStage = { distanceMeters: 1, _id: 1 };

    if (sort === "lowest_price" || sort === "price_asc" || sort === "pricePerDay") {
      // Sắp xếp theo giá thuê thấp nhất
      sortStage = { pricePerDay: 1, distanceMeters: 1, _id: 1 };
    } else if (sort === "highest_rating" || sort === "rating_desc" || sort === "rating") {
      // Sắp xếp theo điểm đánh giá sao trung bình cao nhất
      sortStage = { "stats.ratingAvg": -1, distanceMeters: 1, _id: 1 };
    }

    // ------------------------------------------------------------------------
    // BƯỚC 5: TRUY VẤN MONGODB AGGREGATION PIPELINE
    // ------------------------------------------------------------------------
    // Kiến trúc Single Source of Truth: Tọa độ lưu duy nhất tại User.location
    // Pipeline gồm 6 giai đoạn:
    // 1. $geoNear: Tìm Owner gần nhất theo khoảng cách thực tế (bán kính max 10km)
    // 2. $lookup: Nối sang collection 'devices' để lấy thiết bị của các Owner này
    // 3. $unwind: Trải phẳng mảng thiết bị để mỗi thiết bị thành 1 document độc lập
    // 4. $replaceRoot: Đưa thiết bị lên làm document chính, gắn thêm owner & distance
    // 5. $sort: Sắp xếp theo tiêu chí đã chọn (gần nhất / giá thấp / rating cao)
    // 6. $facet: Phân trang (skip/limit) và đếm tổng số thiết bị trong 1 truy vấn
    const pipelineStages = [
      // Stage 1: $geoNear - Tìm Owner gần nhất. Thứ tự GeoJSON bắt buộc: [lng, lat]
      {
        $geoNear: {
          near: { type: "Point", coordinates: [userLng, userLat] },
          key: "location",
          distanceField: "distanceMeters",
          maxDistance,
          spherical: true,
          query: userGeoFilter,
        },
      },
      // Stage 2: $lookup - Nối với collection devices
      {
        $lookup: {
          from: "devices",
          localField: "_id",
          foreignField: "ownerId",
          pipeline: [{ $match: deviceFilter }],
          as: "deviceList",
        },
      },
      // Stage 3: $unwind - Trải phẳng mảng deviceList
      { $unwind: "$deviceList" },
      // Stage 4: $replaceRoot - Định hình lại cấu trúc document trả về
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$deviceList",
              {
                distanceMeters: "$distanceMeters",
                location: {
                  type: "$location.type",
                  coordinates: "$location.coordinates",
                  addressText: { $ifNull: ["$address", ""] },
                },
                owner: {
                  _id: "$_id",
                  name: "$name",
                  avatar: "$avatar",
                  address: "$address",
                  trust: "$trust",
                  rating: "$rating",
                  totalReviews: "$totalReviews",
                },
              },
            ],
          },
        },
      },
      // Stage 5: $sort - Sắp xếp kết quả
      { $sort: sortStage },
      // Stage 6: Phân trang (skip/limit) và tính tổng số bản ghi
      ...geoPaginationStages(pageNum, limitNum),
    ];

    const [result] = await getUsersCollection().aggregate(pipelineStages).toArray();

    // ------------------------------------------------------------------------
    // BƯỚC 6: ĐỊNH DẠNG VÀ TRẢ VỀ RESPONSE
    // ------------------------------------------------------------------------
    const devices = result?.data || [];
    const total = result?.totals?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const hasNextPage = pageNum * limitNum < total;

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage,
      },
    });
  } catch (error) {
    // Chuyển lỗi phát sinh cho middleware error handling xử lý tập trung
    next(error);
  }
};

/**
 * ============================================================================
 * CHỨC NĂNG XEM CHI TIẾT THIẾT BỊ (DEVICE DETAIL)
 * Endpoint: GET /api/devices/:id
 * Quyền truy cập: Public (Công khai, không yêu cầu đăng nhập)
 * 
 * Luồng xử lý tuần tự gồm 6 bước:
 * - Bước 1: Lấy ID thiết bị từ tham số URL (req.params.id)
 * - Bước 2: Kiểm tra tính hợp lệ của ID đầu vào (Validation)
 * - Bước 3: Tìm kiếm thiết bị trong MongoDB và Populate thông tin Owner
 * - Bước 4: Kiểm tra thiết bị có tồn tại hay không (Xử lý 404 Not Found)
 * - Bước 5: Xác định vị trí địa lý động từ Owner (Single Source of Truth)
 * - Bước 6: Trả về kết quả JSON cho Client (HTTP 200 OK)
 * ============================================================================
 */
export const getDeviceById = async (req, res, next) => {
  try {
    // ------------------------------------------------------------------------
    // BƯỚC 1: LẤY ID TỪ THAM SỐ ĐƯỜNG DẪN (REQ.PARAMS)
    // ------------------------------------------------------------------------
    const { id } = req.params;

    // ------------------------------------------------------------------------
    // BƯỚC 2: KIỂM TRA TÍNH HỢP LỆ CỦA ID ĐẦU VÀO (VALIDATION)
    // ------------------------------------------------------------------------
    // 2.1. Kiểm tra trường hợp ID bị rỗng hoặc trùng với các từ khóa route đặc biệt
    if (!id || id === "nearby" || id === "owner") {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID",
      });
    }

    // 2.2. Kiểm tra định dạng ID có phải là ObjectId hợp lệ của MongoDB (chuỗi 24 ký tự hex)
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID",
      });
    }

    // ------------------------------------------------------------------------
    // BƯỚC 3: TRUY VẤN DỮ LIỆU TỪ MONGODB & POPULATE THÔNG TIN LIÊN QUAN
    // ------------------------------------------------------------------------
    // - Device.findOne: Tìm 1 thiết bị theo _id và chưa bị xóa mềm (isDeleted != true)
    // - .populate("ownerId", "..."): Tự động nối bảng với collection 'users' thông qua
    //   khóa ngoại ownerId để lấy thông tin Owner (không bao giờ lấy mật khẩu password)
    // - .lean({ virtuals: true }): Trả về plain JavaScript object, kèm theo virtual fields
    const device = await Device.findOne({
      _id: id,
      isDeleted: { $ne: true },
    })
      .populate("ownerId", "name email phone avatar address location")
      .populate("owner", "name email phone avatar address location")
      .lean({ virtuals: true });

    // ------------------------------------------------------------------------
    // BƯỚC 4: KIỂM TRA DỮ LIỆU CÓ TỒN TẠI HAY KHÔNG
    // ------------------------------------------------------------------------
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // ------------------------------------------------------------------------
    // BƯỚC 5: XÁC ĐỊNH VỊ TRÍ ĐỊA LÝ ĐỘNG TỪ OWNER (SINGLE SOURCE OF TRUTH)
    // ------------------------------------------------------------------------
    // Tọa độ vị trí địa lý chỉ lưu tại User.location; thiết bị lấy vị trí động từ Owner
    device.location = resolveDeviceLocation(device);

    // Xác định địa chỉ hiển thị bằng câu lệnh if/else tuần tự, rõ ràng
    let displayAddress = "";
    if (device.location && device.location.addressText) {
      displayAddress = device.location.addressText;
    } else if (device.ownerId && typeof device.ownerId === "object" && device.ownerId.address) {
      displayAddress = device.ownerId.address;
    } else if (device.owner && typeof device.owner === "object" && device.owner.address) {
      displayAddress = device.owner.address;
    } else if (device.address) {
      displayAddress = device.address;
    }
    device.address = displayAddress;

    // ------------------------------------------------------------------------
    // BƯỚC 6: TRẢ DỮ LIỆU VỀ CHO CLIENT
    // ------------------------------------------------------------------------
    return res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    // Chuyển lỗi phát sinh cho middleware error handling xử lý tập trung
    next(error);
  }
};

export const createDevice = async (req, res) => {
  try {
    const {
      name,
      title,
      category,
      brand,
      yearOfManufacture,
      condition,
      description,
      pricePerDay,
      dailyRate,
      depositAmount,
      depositValue,
      addressText,
      address,
      location,
      latitude,
      longitude,
      specs,
      images,
    } = req.body;
    const ownerId = req.user.userId;
    const year = Number(yearOfManufacture);
    const price = Number(pricePerDay ?? dailyRate);
    const deposit = Number(depositAmount ?? depositValue);

    if (
      yearOfManufacture != null &&
      yearOfManufacture !== "" &&
      (!Number.isInteger(year) ||
        year < 1990 ||
        year > new Date().getFullYear())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year of manufacture",
      });
    }

    if (
      !title?.trim() ||
      !name?.trim() ||
      !category?.trim() ||
      !brand?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    if (price == null || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid rental price",
      });
    }

    if (!Number.isFinite(deposit) || deposit < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid deposit amount",
      });
    }

    let parsedSpecs = specs;

    if (typeof specs === "string") {
      try {
        parsedSpecs = JSON.parse(specs);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid specs JSON format",
        });
      }
    }
    if (!Array.isArray(images) || images.length < 2 || images.length > 3) {
      return res.status(400).json({
        success: false,
        message: "Please provide between 2 and 3 device images",
      });
    }

    const imageUrls = [];
    for (const image of images) {
      if (typeof image !== "string") {
        return res.status(400).json({
          success: false,
          message: "Each device image must be a data URL or an HTTPS URL",
        });
      }

      if (image.startsWith("https://")) {
        imageUrls.push(image);
        continue;
      }

      const imageMatch = image.match(
        /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/,
      );
      if (!imageMatch) {
        return res.status(400).json({
          success: false,
          message: "Device images must be JPG, PNG, or WEBP files",
        });
      }

      const imageSize = Math.ceil((imageMatch[2].length * 3) / 4);
      if (imageSize > 3 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message:
            "Each device image must be smaller than 3 MB after compression",
        });
      }

      try {
        const uploadedImage = await uploadToCloudinary(
          image,
          "techshare/devices",
        );
        imageUrls.push(uploadedImage.url);
      } catch (uploadError) {
        console.error("Device image upload error:", uploadError.message);
        return res.status(502).json({
          success: false,
          message: "Could not upload device images. Please try again.",
        });
      }
    }

    const device = await Device.create({
      owner: ownerId,
      ownerId: ownerId,
      name,
      title,
      category,
      brand,
      yearOfManufacture: yearOfManufacture ? year : undefined,
      condition,
      description,
      dailyRate: price,
      pricePerDay: price,
      depositValue: deposit,
      depositAmount: deposit,
      address: (addressText ?? address ?? "").trim(),
      specs: parsedSpecs,
      images: imageUrls,
      status: "hidden",
      moderationStatus: "pending",
      moderationReason: "",
      rejectReason: "",
      moderatedBy: null,
      reviewedBy: null,
      moderatedAt: null,
      reviewedAt: null,
    });

    const ownerDoc = await User.findById(ownerId).lean();
    const responseData = device.toObject({ virtuals: true });
    responseData.location = resolveDeviceLocation(responseData, ownerDoc);
    responseData.address = responseData.location?.addressText || ownerDoc?.address || responseData.address || "";

    return res.status(201).json({
      success: true,
      message: "Đăng thiết bị thành công! Bài đăng đang chờ Admin kiểm duyệt trước khi hiển thị công khai trên sàn.",
      data: responseData,
    });
  } catch (error) {
    console.error("Create Device Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const myDevices = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const devices = await Device.find({
      $or: [{ owner: ownerId }, { ownerId: ownerId }],
      isDeleted: { $ne: true },
    })
      .populate("ownerId", "name email phone avatar address location")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    if (devices.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Bạn chưa có thiết bị nào",
        devices: [],
      });
    }

    const formattedDevices = devices.map((d) => {
      const loc = resolveDeviceLocation(d, d.ownerId);
      return {
        ...d,
        location: loc,
        address: loc?.addressText || (typeof d.ownerId === "object" ? d.ownerId?.address : "") || d.address || "",
      };
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thiết bị thành công",
      devices: formattedDevices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    const device = await Device.findOne({
      _id: id,
      $or: [{ owner: ownerId }, { ownerId: ownerId }],
      isDeleted: { $ne: true },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị hoặc bạn không có quyền chỉnh sửa.",
      });
    }

    const {
      name,
      title,
      category,
      brand,
      condition,
      description,
      pricePerDay,
      dailyRate,
      depositAmount,
      depositValue,
      specs,
      images,
      address,
      addressText,
      yearOfManufacture,
    } = req.body;

    if (name) device.name = name;
    if (title || name) device.title = title || name;
    if (category) device.category = category;
    if (brand) device.brand = brand;
    if (condition) device.condition = condition;
    if (description !== undefined) device.description = description;

    if (pricePerDay != null || dailyRate != null) {
      const p = Number(pricePerDay ?? dailyRate);
      if (Number.isFinite(p) && p > 0) {
        device.pricePerDay = p;
        device.dailyRate = p;
      }
    }
    if (depositAmount != null || depositValue != null) {
      const d = Number(depositAmount ?? depositValue);
      if (Number.isFinite(d) && d >= 0) {
        device.depositAmount = d;
        device.depositValue = d;
      }
    }
    if (specs) {
      device.specs = typeof specs === "string" ? JSON.parse(specs) : specs;
    }
    if (Array.isArray(images) && images.length >= 2) {
      const imageUrls = [];
      for (const image of images) {
        if (typeof image === "string" && image.startsWith("http")) {
          imageUrls.push(image);
        } else if (typeof image === "string" && image.startsWith("data:image/")) {
          try {
            const uploaded = await uploadToCloudinary(image, "techshare/devices");
            imageUrls.push(uploaded.url);
          } catch (uploadErr) {
            console.error("Cloudinary upload err:", uploadErr);
          }
        }
      }
      if (imageUrls.length >= 2) {
        device.images = imageUrls;
      }
    }
    if (address || addressText) device.address = addressText ?? address;
    if (yearOfManufacture) device.yearOfManufacture = Number(yearOfManufacture);

    // Reset moderation status to pending upon update
    device.moderationStatus = "pending";
    device.status = "hidden";
    device.moderationReason = "";
    device.rejectReason = "";
    device.moderatedBy = null;
    device.reviewedBy = null;
    device.moderatedAt = null;
    device.reviewedAt = null;

    await device.save();

    const ownerDoc = await User.findById(device.ownerId || device.owner).lean();
    const responseData = device.toObject({ virtuals: true });
    responseData.location = resolveDeviceLocation(responseData, ownerDoc);
    responseData.address = responseData.location?.addressText || ownerDoc?.address || responseData.address || "";

    return res.status(200).json({
      success: true,
      message: "Cập nhật thiết bị thành công! Bài đăng đang chờ Admin kiểm duyệt lại.",
      data: responseData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi máy chủ khi cập nhật thiết bị",
    });
  }
};


export const deleteOwner = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const ownerId = req.user?.userId || req.user?.id || req.user?._id;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được tài khoản chủ thiết bị.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID",
      });
    }

    const ownerValues = mongoose.Types.ObjectId.isValid(ownerId)
      ? [new mongoose.Types.ObjectId(ownerId), ownerId.toString()]
      : [ownerId.toString()];
    const result = await Device.collection.updateOne(
      {
        _id: new mongoose.Types.ObjectId(deviceId),
        $or: [
          ...ownerValues.map((value) => ({ ownerId: value })),
          ...ownerValues.map((value) => ({ owner: value })),
        ],
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thiết bị",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa thiết bị thành công",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export default {
  getDevices,
  getNearbyDevices,
  getDeviceById,
  createDevice,
  myDevices,
  updateDevice,
  deleteOwner,
};
