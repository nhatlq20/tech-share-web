/**
 * TechShare Design System - Colors & Theme Constants
 * 
 * Centralized color palette for the entire TechShare application.
 * All components should import colors from here instead of hardcoding hex values.
 */

export const COLORS = {
  // Brand Primary (Soft Teal / Cyan)
  primary: {
    DEFAULT: '#67BEC3',
    main: '#67BEC3',
    hover: '#4CA6AC',
    dark: '#286E74',
    darker: '#1F565B',
    light: '#EEF8F8',
    surface: '#E8F6F7',
    badge: '#E0F4F5',
    border: '#B2E2E4',
  },

  // Status & Alerts
  status: {
    success: {
      DEFAULT: '#10B981',
      text: '#15803D',
      bg: '#ECFDF5',
      badgeBg: '#DCFCE7',
      border: '#BBF7D0',
    },
    warning: {
      DEFAULT: '#F59E0B',
      text: '#A16207',
      bg: '#FEFCE8',
      badgeBg: '#FEF3C7',
      border: '#FDE68A',
    },
    danger: {
      DEFAULT: '#EF4444',
      text: '#B91C1C',
      bg: '#FEF2F2',
      badgeBg: '#FEE2E2',
      border: '#FECACA',
    },
    info: {
      DEFAULT: '#0284C7',
      text: '#0369A1',
      bg: '#F0F9FF',
      badgeBg: '#E0F2FE',
      border: '#BAE6FD',
    },
  },

  // Neutrals (Slate / Grayscale)
  neutral: {
    white: '#FFFFFF',
    50: '#F8FAFC',  // Page Background
    100: '#F1F5F9', // Card / Element subtle background
    200: '#E2E8F0', // Border light
    300: '#CBD5E1', // Border hover
    400: '#94A3B8', // Icons / Placeholders
    500: '#64748B', // Muted text / Labels
    600: '#475569', // Secondary body text
    700: '#334155', // Primary body text
    800: '#1E293B', // Headings / Subtitles
    900: '#0F172A', // High-contrast text / Dark headers
  },

  // Category palette (for charts, category badges, graphs)
  categories: {
    smartphone: '#67BEC3',
    laptop: '#38BDF8',
    camera: '#F59E0B',
    drone: '#818CF8',
    audio: '#A78BFA',
    gaming: '#F472B6',
    accessory: '#A78BFA',
    default: '#67BEC3',
  },
} as const;

// Convenient flat shorthands for rapid styling
export const PRIMARY = COLORS.primary.DEFAULT;
export const PRIMARY_HOVER = COLORS.primary.hover;
export const PRIMARY_DARK = COLORS.primary.dark;
export const PRIMARY_LIGHT = COLORS.primary.light;
export const PRIMARY_SURFACE = COLORS.primary.surface;
export const PRIMARY_BADGE = COLORS.primary.badge;

// Status shorthands
export const SUCCESS = COLORS.status.success.DEFAULT;
export const WARNING = COLORS.status.warning.DEFAULT;
export const DANGER = COLORS.status.danger.DEFAULT;
export const INFO = COLORS.status.info.DEFAULT;

// Category colors map
export const CATEGORY_COLORS: Record<string, string> = {
  smartphone: COLORS.categories.smartphone,
  laptop: COLORS.categories.laptop,
  camera: COLORS.categories.camera,
  drone: COLORS.categories.drone,
  audio: COLORS.categories.audio,
  gaming: COLORS.categories.gaming,
  accessory: COLORS.categories.accessory,
  default: COLORS.categories.default,
};

export default COLORS;
