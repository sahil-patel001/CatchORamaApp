// Purple Theme - Clean, Professional Inventory Management Design
// Inspired by modern dashboard aesthetics with purple accents on white

export const colors = {
  // Primary Purple Palette
  purple: '#8B5CF6',
  purpleDark: '#7C3AED',
  purpleLight: '#EDE9FE',
  purpleMuted: '#C4B5FD',
  purpleSubtle: '#F5F3FF',

  // Backgrounds
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceElevated: '#FFFFFF',
  
  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderFocused: '#8B5CF6',

  // Text Colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnPurple: '#FFFFFF',

  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#DC2626',

  // Neutral Grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Component Specific
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardShadow: 'rgba(0, 0, 0, 0.05)',
  
  inputBg: '#FFFFFF',
  inputBorder: '#E5E7EB',
  inputPlaceholder: '#9CA3AF',
  
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#F3F4F6',
  tabBarActive: '#8B5CF6',
  tabBarInactive: '#6B7280',

  // Overlay
  overlay: 'rgba(17, 24, 39, 0.5)',
  overlayLight: 'rgba(17, 24, 39, 0.3)',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  // Headings
  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  h4: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  
  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  
  // Small text
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  captionMuted: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
  
  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  
  // Numbers/Stats
  stat: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.textPrimary,
  },
  statLarge: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.textOnPurple,
  },
};

// Stock status helper
export const getStockStatus = (stock: number, threshold: number = 10) => {
  if (stock < 0) {
    return {
      color: colors.danger,
      bgColor: colors.dangerLight,
      label: 'Backordered',
    };
  }
  if (stock === 0) {
    return {
      color: colors.danger,
      bgColor: colors.dangerLight,
      label: 'Out of Stock',
    };
  }
  if (stock <= threshold) {
    return {
      color: colors.warning,
      bgColor: colors.warningLight,
      label: 'Low Stock',
    };
  }
  return {
    color: colors.success,
    bgColor: colors.successLight,
    label: 'In Stock',
  };
};
