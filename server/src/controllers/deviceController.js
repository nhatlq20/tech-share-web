import mongoose from "mongoose";
import Device from "../models/Device.js";
import { uploadToCloudinary } from "../services/cloudinaryService.js";

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

const RECOMMENDATION_DEFAULT_PAGE = 1;
const RECOMMENDATION_PAGE_SIZE = 24;
const HOME_RECOMMENDATION_MAX_DISTANCE_METERS = 100000;
const NEARBY_MAX_DISTANCE_METERS = 10000;
const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

const isNumericQueryValue = (value) =>
  typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));

const geoPaginationStages = (page, limit) => [
  {
    $facet: {
      data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      totals: [{ $count: "total" }],
    },
  },
];

/** Home discovery: exact distance first, with stable tie-breaks and a 100 km safety cap. */
export const getRecommendedDevices = async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      category,
      page = RECOMMENDATION_DEFAULT_PAGE,
      limit = RECOMMENDATION_PAGE_SIZE,
    } = req.query;
    const userLat = Number(lat);
    const userLng = Number(lng);
    const pageNum = Number(page);
    const requestedLimit = Number(limit);
    const limitNum = Math.min(requestedLimit, RECOMMENDATION_PAGE_SIZE);
    const skip = (pageNum - RECOMMENDATION_DEFAULT_PAGE) * limitNum;
    const validCoordinates = isNumericQueryValue(lat) && isNumericQueryValue(lng) &&
      Math.abs(userLat) <= MAX_LATITUDE && Math.abs(userLng) <= MAX_LONGITUDE;
    const validPagination = Number.isSafeInteger(pageNum) && pageNum >= RECOMMENDATION_DEFAULT_PAGE &&
      Number.isSafeInteger(requestedLimit) && requestedLimit >= RECOMMENDATION_DEFAULT_PAGE &&
      Number.isSafeInteger(skip);

    if (!validCoordinates || !validPagination) {
      return res.status(400).json({
        success: false,
        message: "Valid lat, lng, page and limit are required.",
      });
    }
    if (category !== undefined && typeof category !== "string") {
      return res.status(400).json({ success: false, message: "Valid device category is required." });
    }
    const categoryFilter = category ? category.trim().toLowerCase() : "";
    const allowedCategories = Device.schema.path("category").enumValues;
    if (categoryFilter && categoryFilter !== "all" && !allowedCategories.includes(categoryFilter)) {
      return res.status(400).json({ success: false, message: "Valid device category is required." });
    }
    const deviceFilter = {
      status: "available",
      moderationStatus: "approved",
      isDeleted: { $ne: true },
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
    // Filter before sorting/pagination so totals and every page belong to this category.
    if (categoryFilter && categoryFilter !== "all") deviceFilter.category = categoryFilter;

    const [result] = await getDevicesCollection()
      .aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [userLng, userLat] },
            key: "location",
            distanceField: "distanceMeters",
            spherical: true,
            maxDistance: HOME_RECOMMENDATION_MAX_DISTANCE_METERS,
            query: deviceFilter,
          },
        },
        {
          $set: {
            _recommendationRating: {
              $ifNull: ["$stats.ratingAvg", { $ifNull: ["$rating", { $ifNull: ["$ratingAvg", 0] }] }],
            },
          },
        },
        {
          $sort: {
            distanceMeters: 1,
            _recommendationRating: -1,
            createdAt: -1,
            _id: 1,
          },
        },
        { $unset: "_recommendationRating" },
        ...geoPaginationStages(pageNum, limitNum),
      ])
      .toArray();
    const total = result.totals[0]?.total || 0;
    return res.status(200).json({
      success: true,
      count: result.data.length,
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        hasNextPage: pageNum * limitNum < total,
      },
    });
  } catch (error) {
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
      filter.$or = [
        { title: regex },
        { name: regex },
        { brand: regex },
        { description: regex },
      ];
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
    }

    // Normalize output fields
    const normalizedDevices = devices.map((d) => ({
      _id: d._id ? d._id.toString() : "",
      title: d.title || d.name || "Untitled Device",
      name: d.name || d.title || "Untitled Device",
      brand: d.brand || "",
      category: d.category || "other",
      condition: d.condition || "good",
      dailyRate: d.dailyRate ?? d.pricePerDay ?? 0,
      pricePerDay: d.pricePerDay ?? d.dailyRate ?? 0,
      depositValue: d.depositValue || 0,
      rating: d.rating ?? d.ratingAvg ?? 5.0,
      ratingAvg: d.ratingAvg ?? d.rating ?? 5.0,
      reviewCount: d.reviewCount || 0,
      images: Array.isArray(d.images) ? d.images : [],
      location: d.location || {
        type: "Point",
        coordinates: [105.7826, 21.0285],
      },
      address: d.address || "",
      status: d.status || "available",
      createdAt: d.createdAt || new Date(),
    }));

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
export const getNearbyDevices = async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      latitude,
      longitude,
      radius = 10000,
      page = 1,
      limit = 12,
    } = req.query;
    const userLat = Number(lat ?? latitude);
    const userLng = Number(lng ?? longitude);
    const requestedRadius = Number(radius);
    const maxDistance = Math.min(requestedRadius, NEARBY_MAX_DISTANCE_METERS);
    const pageNum = Number(page);
    const requestedLimit = Number(limit);
    const limitNum = Math.min(100, requestedLimit);
    if (
      !isNumericQueryValue(lat ?? latitude) ||
      !isNumericQueryValue(lng ?? longitude) ||
      !Number.isFinite(userLat) ||
      Math.abs(userLat) > 90 ||
      !Number.isFinite(userLng) ||
      Math.abs(userLng) > 180 ||
      !Number.isFinite(requestedRadius) ||
      maxDistance <= 0 ||
      !Number.isSafeInteger(pageNum) ||
      pageNum < 1 ||
      !Number.isSafeInteger(requestedLimit) ||
      requestedLimit < 1 ||
      !Number.isSafeInteger((pageNum - 1) * limitNum)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates, radius, page and limit are required.",
      });
    }
    const collection = getDevicesCollection();
    const [result] = await collection
      .aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [userLng, userLat] },
            key: "location",
            distanceField: "distanceMeters",
            maxDistance,
            spherical: true,
            query: {
              status: "available",
              isDeleted: { $ne: true },
              "location.type": "Point",
              "location.coordinates": { $size: 2 },
              "location.coordinates.0": { $type: "number", $gte: -180, $lte: 180 },
              "location.coordinates.1": { $type: "number", $gte: -90, $lte: 90 },
            },
          },
        },
        { $sort: { distanceMeters: 1, _id: 1 } },
        ...geoPaginationStages(pageNum, limitNum),
      ])
      .toArray();
    const devices = result.data;
    const total = result.totals[0]?.total || 0;
    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/devices/:id
 * Fetches a single device by ID
 */
export const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === "nearby" || id === "owner") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid device ID" });
    }

    let device = null;
    if (mongoose.isValidObjectId(id)) {
      device = await Device.findOne({ _id: id, isDeleted: { $ne: true } }).lean(
        { virtuals: true },
      );
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
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

    const coordinates = location?.coordinates;
    const hasMalformedCoordinates =
      coordinates !== undefined &&
      (!Array.isArray(coordinates) || coordinates.length !== 2);
    const longitudeValue = coordinates?.[0] ?? longitude;
    const latitudeValue = coordinates?.[1] ?? latitude;
    const parsedLongitude = Number(longitudeValue);
    const parsedLatitude = Number(latitudeValue);
    const deviceAddress = location?.addressText ?? addressText ?? address;

    if (
      (location?.type && location.type !== "Point") ||
      hasMalformedCoordinates ||
      !["number", "string"].includes(typeof longitudeValue) ||
      !["number", "string"].includes(typeof latitudeValue) ||
      longitudeValue == null ||
      longitudeValue === "" ||
      latitudeValue == null ||
      latitudeValue === "" ||
      !Number.isFinite(parsedLongitude) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180 ||
      !Number.isFinite(parsedLatitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid device location is required (longitude -180 to 180, latitude -90 to 90)",
      });
    }

    if (typeof deviceAddress !== "string" || !deviceAddress.trim()) {
      return res.status(400).json({
        success: false,
        message: "Device address is required",
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
      ownerId,
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
      location: {
        type: "Point",
        coordinates: [parsedLongitude, parsedLatitude],
        addressText: deviceAddress.trim(),
      },
      specs: parsedSpecs,
      images: imageUrls,
    });
    return res.status(201).json({
      success: true,
      message: "Device created successfully",
      data: device,
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
      owner: ownerId,
      isDeleted: { $ne: true },
    });

    if (devices.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Bạn chưa có thiết bị nào",
        devices: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thiết bị thành công",
      devices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
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
};
