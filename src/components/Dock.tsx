// Dock Navigation Bar with Gaussian Magnification and Spring Physics
import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { useTheme } from '../theme';

export type TabKey = 'today' | 'wardrobe' | 'add' | 'history' | 'settings';

interface DockItemDef {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isAction?: boolean;
}

const DOCK_ITEMS: DockItemDef[] = [
  { key: 'today', label: 'Today', icon: 'sparkles-outline' },
  { key: 'wardrobe', label: 'Wardrobe', icon: 'shirt-outline' },
  { key: 'add', label: 'Add', icon: 'add', isAction: true },
  { key: 'history', label: 'History', icon: 'time-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

const SPRING_CONFIG = {
  stiffness: 400,
  damping: 25,
  mass: 0.4,
};

const SIGMA = 38;
const MAX_MAGNIFICATION = 0.65; // Scale up to 1.65x
const ITEM_WIDTH = 54;

interface DockProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenAddModal: () => void;
}

export const Dock: React.FC<DockProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const touchX = useSharedValue<number>(-999);
  const isGestureActive = useSharedValue<boolean>(false);

  const handleSelect = (key: TabKey) => {
    if (key === 'add') {
      onOpenAddModal();
    } else {
      onSelectTab(key);
    }
  };

  const updateHovered = (index: number | null, label: string | null) => {
    setHoveredIndex(index);
    setHoveredLabel(label);
  };

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    'worklet';
    const x = event.nativeEvent.x;
    touchX.value = x;
    isGestureActive.value = true;

    const idx = Math.floor(x / ITEM_WIDTH);
    if (idx >= 0 && idx < DOCK_ITEMS.length) {
      runOnJS(updateHovered)(idx, DOCK_ITEMS[idx].label);
    } else {
      runOnJS(updateHovered)(null, null);
    }
  };

  const onGestureEnd = (event: any) => {
    'worklet';
    const x = event.nativeEvent.x;
    const idx = Math.floor(x / ITEM_WIDTH);

    touchX.value = withSpring(-999, SPRING_CONFIG);
    isGestureActive.value = false;

    if (idx >= 0 && idx < DOCK_ITEMS.length) {
      runOnJS(handleSelect)(DOCK_ITEMS[idx].key);
    }
    runOnJS(updateHovered)(null, null);
  };

  return (
    <View style={[styles.outerContainer, { bottom: Math.max(insets.bottom, 14) }]}>
      {/* Floating Hover Label Tooltip */}
      {hoveredLabel && (
        <View style={[styles.tooltipContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.tooltipText, { color: colors.foreground }]}>{hoveredLabel}</Text>
        </View>
      )}

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onEnded={onGestureEnd}
        onCancelled={onGestureEnd}
      >
        <Animated.View style={styles.panWrapper}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.dockPill,
              {
                backgroundColor: colors.dockBackground,
                borderColor: colors.dockBorder,
              },
            ]}
          >
            {DOCK_ITEMS.map((item, index) => {
              const isSelected = activeTab === item.key;
              return (
                <React.Fragment key={item.key}>
                  {item.isAction && (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                      ]}
                    />
                  )}
                  <DockItem
                    item={item}
                    index={index}
                    isSelected={isSelected}
                    colors={colors}
                    touchX={touchX}
                    isGestureActive={isGestureActive}
                    onPress={() => handleSelect(item.key)}
                  />
                  {item.isAction && (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </BlurView>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

interface DockItemProps {
  item: DockItemDef;
  index: number;
  isSelected: boolean;
  colors: any;
  touchX: SharedValue<number>;
  isGestureActive: SharedValue<boolean>;
  onPress: () => void;
}

const DockItem: React.FC<DockItemProps> = ({
  item,
  index,
  isSelected,
  colors,
  touchX,
  isGestureActive,
  onPress,
}) => {
  const reducedMotion = useReducedMotion();

  const animatedIconStyle = useAnimatedStyle(() => {
    if (reducedMotion || !isGestureActive.value || touchX.value < 0) {
      return {
        transform: [{ scale: 1 }],
      };
    }

    const itemCenter = index * ITEM_WIDTH + ITEM_WIDTH / 2;
    const dist = Math.abs(touchX.value - itemCenter);
    const gaussian = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA));
    const targetScale = 1 + gaussian * MAX_MAGNIFICATION;

    return {
      transform: [{ scale: withSpring(targetScale, SPRING_CONFIG) }],
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.itemTouchArea}
    >
      <Animated.View
        style={[
          styles.iconWrapper,
          item.isAction && styles.actionIconWrapper,
          item.isAction && { backgroundColor: colors.accent },
          isSelected && !item.isAction && styles.selectedIconWrapper,
          animatedIconStyle,
        ]}
      >
        <Ionicons
          name={item.icon}
          size={item.isAction ? 24 : 21}
          color={
            item.isAction
              ? '#ffffff'
              : isSelected
              ? colors.accent
              : colors.foregroundMuted
          }
        />
        {isSelected && !item.isAction && (
          <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  panWrapper: {
    borderRadius: 36,
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 36,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  itemTouchArea: {
    width: ITEM_WIDTH,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  selectedIconWrapper: {},
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: 3,
  },
  tooltipContainer: {
    position: 'absolute',
    top: -38,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
