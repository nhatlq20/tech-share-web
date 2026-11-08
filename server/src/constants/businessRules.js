/**
 * TechShare Authoritative Business Rules & Logic Constants (Backend)
 */

export const BUSINESS_RULES = {
  // Tỷ lệ phí nền tảng (Service fee rate on rental revenue)
  PLATFORM_FEE_RATE: Number(process.env.PLATFORM_FEE_RATE) || 0.1, // 10%

  // Tỷ lệ tiền cọc thiết bị mặc định (nếu thiết bị không cấu hình cụ thể)
  DEFAULT_DEPOSIT_RATIO: 0.7, // 70%

  // Chiết khấu thuê dài hạn
  LONG_RENTAL_DISCOUNTS: {
    TIER_1: {
      MIN_DAYS: 3,
      DISCOUNT_PERCENT: 10,
      DISCOUNT_RATE: 0.1,
    },
    TIER_2: {
      MIN_DAYS: 7,
      DISCOUNT_PERCENT: 20,
      DISCOUNT_RATE: 0.2,
    },
  },

  // Phân trang mặc định
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 12,
    MAX_LIMIT: 50,
  },

  // Ngưỡng điểm tín nhiệm
  TRUST_SCORE: {
    MAX: 100,
    EXCELLENT_THRESHOLD: 85,
    GOOD_THRESHOLD: 70,
    DEFAULT: 85,
    MIN: 0,
  },
};

export default BUSINESS_RULES;
