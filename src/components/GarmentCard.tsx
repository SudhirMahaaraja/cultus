// GarmentCard with Full-Bleed Photo, Soft Ring, Bottom Gradient and Wear Stats
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Garment } from '../lib/api';
import { useTheme } from '../theme';

interface GarmentCardProps {
  garment: Garment;
  onPress?: () => void;
  style?: ViewStyle;
  aspectRatio?: number;
  showCategoryBadge?: boolean;
}

// Map color names to hex codes for the color dot
const COLOR_HEX_MAP: Record<string, string> = {
  black: '#111111',
  white: '#f8fafc',
  navy: '#1e293b',
  grey: '#64748b',
  charcoal: '#334155',
  beige: '#d6c7b2',
  brown: '#78350f',
  tan: '#b45309',
  olive: '#556b2f',
  khaki: '#c3b091',
  burgundy: '#800020',
  forest_green: '#1b4332',
  sky_blue: '#7dd3fc',
  light_blue: '#93c5fd',
  cream: '#fef3c7',
  camel: '#c19a6b',
  rust: '#b7410e',
  mustard: '#d97706',
  lavender: '#c084fc',
  pink: '#f472b6',
  sage: '#9ca3af',
  teal: '#0d9488',
  denim_blue: '#2563eb',
  indigo: '#4338ca',
  maroon: '#881337',
  other: '#94a3b8',
};

export const GarmentCard: React.FC<GarmentCardProps> = ({
  garment,
  onPress,
  style,
  aspectRatio = 3 / 4,
  showCategoryBadge = false,
}) => {
  const { colors, isDark } = useTheme();

  const colorDotHex = garment.color ? (COLOR_HEX_MAP[garment.color] || '#94a3b8') : null;

  // Format last worn string
  let lastWornText = 'Never worn';
  if (garment.last_worn_at) {
    const diffMs = Date.now() - new Date(garment.last_worn_at).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      lastWornText = 'last today';
    } else if (diffDays === 1) {
      lastWornText = 'last 1d ago';
    } else {
      lastWornText = `last ${diffDays}d ago`;
    }
  }

  const wearCountText = `worn ${garment.wear_count || 0}x`;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.88 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.cardContainer,
        {
          aspectRatio,
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        },
        style,
      ]}
    >
      {/* Garment Image */}
      {garment.signed_url ? (
        <Image
          source={{ uri: garment.signed_url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.muted }]}>
          <Text style={[styles.placeholderText, { color: colors.foregroundMuted }]}>
            {garment.name}
          </Text>
        </View>
      )}

      {/* Optional Top Category Badge */}
      {showCategoryBadge && (
        <View style={styles.topBadgeContainer}>
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.85)' }]}>
            <Text style={[styles.categoryBadgeText, { color: colors.foreground }]}>
              {garment.category.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Gradient with Information */}
      <LinearGradient
        colors={[
          'transparent',
          isDark ? 'rgba(9, 10, 15, 0.65)' : 'rgba(15, 23, 42, 0.55)',
          isDark ? 'rgba(9, 10, 15, 0.95)' : 'rgba(15, 23, 42, 0.9)',
        ]}
        locations={[0, 0.45, 1]}
        style={styles.gradientOverlay}
      >
        <View style={styles.infoRow}>
          {colorDotHex && (
            <View
              style={[
                styles.colorDot,
                {
                  backgroundColor: colorDotHex,
                  borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
                },
              ]}
            />
          )}
          <Text style={styles.garmentType} numberOfLines={1}>
            {garment.garment_type}
          </Text>
        </View>

        <Text style={styles.garmentName} numberOfLines={1}>
          {garment.name}
        </Text>

        <Text style={styles.wearStats} numberOfLines={1}>
          {wearCountText} • {lastWornText}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  topBadgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 36,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  garmentType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  garmentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  wearStats: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
});
