// 3D Vertical Card Stack with Perspective, Spring Physics and Gesture Transitions
import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
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
import { Garment } from '../lib/api';
import { GarmentCard } from './GarmentCard';
import { useTheme } from '../theme';

interface CardStackProps {
  garments: Garment[];
  onSelectGarment?: (garment: Garment) => void;
  emptyMessage?: string;
}

const { width } = Dimensions.get('window');
const STACK_CARD_WIDTH = Math.min(width - 48, 340);
const STACK_CARD_HEIGHT = STACK_CARD_WIDTH * (4 / 3);

const SPRING_CONFIG = {
  stiffness: 300,
  damping: 30,
  mass: 1,
};

const DRAG_THRESHOLD = 50;
const COOLDOWN_MS = 400;

export const CardStack: React.FC<CardStackProps> = ({
  garments,
  onSelectGarment,
  emptyMessage = 'No garments in stack',
}) => {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const lastTransitionTime = useRef(0);

  const translateY = useSharedValue(0);

  if (!garments || garments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.foregroundMuted }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const changeCard = (direction: 'next' | 'prev') => {
    const now = Date.now();
    if (now - lastTransitionTime.current < COOLDOWN_MS) return;
    lastTransitionTime.current = now;

    if (direction === 'next') {
      setActiveIndex((prev) => (prev + 1 < garments.length ? prev + 1 : 0));
    } else {
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : garments.length - 1));
    }
  };

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    'worklet';
    translateY.value = event.nativeEvent.translationY;
  };

  const onGestureEnd = (event: any) => {
    'worklet';
    const deltaY = event.nativeEvent.translationY;

    if (deltaY < -DRAG_THRESHOLD) {
      runOnJS(changeCard)('next');
    } else if (deltaY > DRAG_THRESHOLD) {
      runOnJS(changeCard)('prev');
    }

    translateY.value = withSpring(0, SPRING_CONFIG);
  };

  // Build the list of up to 5 visible cards starting at activeIndex
  const visibleCards: Array<{ garment: Garment; stackPos: number; originalIndex: number }> = [];
  for (let i = 0; i < Math.min(5, garments.length); i++) {
    const originalIndex = (activeIndex + i) % garments.length;
    visibleCards.push({
      garment: garments[originalIndex],
      stackPos: i,
      originalIndex,
    });
  }

  // Reverse so top card is rendered last (on top in React Native z-stack)
  const renderedCards = [...visibleCards].reverse();

  return (
    <View style={styles.container}>
      {/* Counter */}
      <View style={styles.headerRow}>
        <Text style={[styles.counterText, { color: colors.foregroundMuted }]}>
          {activeIndex + 1} / {garments.length}
        </Text>
      </View>

      {/* 3D Stack Stage */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onEnded={onGestureEnd}
        onCancelled={onGestureEnd}
      >
        <Animated.View style={styles.stackStage}>
          {renderedCards.map(({ garment, stackPos, originalIndex }) => (
            <StackCardItem
              key={`${garment.id}_${originalIndex}`}
              garment={garment}
              stackPos={stackPos}
              translateY={translateY}
              onPress={
                stackPos === 0 && onSelectGarment
                  ? () => onSelectGarment(garment)
                  : undefined
              }
            />
          ))}
        </Animated.View>
      </PanGestureHandler>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {garments.slice(0, Math.min(garments.length, 10)).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setActiveIndex(i)}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex ? colors.accent : colors.cardBorder,
                width: i === activeIndex ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

interface StackCardItemProps {
  garment: Garment;
  stackPos: number; // 0 (front) to 4 (back)
  translateY: SharedValue<number>;
  onPress?: () => void;
}

const StackCardItem: React.FC<StackCardItemProps> = ({
  garment,
  stackPos,
  translateY,
  onPress,
}) => {
  const reducedMotion = useReducedMotion();

  // Preset stack styles according to spec:
  // Offsets: 0, 160, 280
  // Scales: 1.0, 0.82, 0.70
  // Opacity: 1.0, 0.60, 0.30
  // RotateX: 0deg, 8deg, 15deg
  const targetOffsetY = stackPos === 0 ? 0 : stackPos === 1 ? 160 : 280 + (stackPos - 2) * 40;
  const targetScale = stackPos === 0 ? 1 : stackPos === 1 ? 0.82 : 0.70;
  const targetOpacity = stackPos === 0 ? 1 : stackPos === 1 ? 0.60 : 0.30;
  const targetRotateX = stackPos === 0 ? '0deg' : stackPos === 1 ? '8deg' : '15deg';

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return {
        transform: [
          { translateY: stackPos === 0 ? translateY.value : targetOffsetY },
          { scale: targetScale },
        ],
        opacity: targetOpacity,
      };
    }

    if (stackPos === 0) {
      return {
        transform: [
          { perspective: 1200 },
          { translateY: translateY.value },
          { scale: 1 },
          { rotateX: '0deg' },
        ],
        opacity: 1,
      };
    }

    return {
      transform: [
        { perspective: 1200 },
        { translateY: targetOffsetY },
        { scale: targetScale },
        { rotateX: targetRotateX },
      ],
      opacity: targetOpacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.cardAbsolute,
        {
          zIndex: 10 - stackPos,
        },
        animatedStyle,
      ]}
    >
      <GarmentCard
        garment={garment}
        aspectRatio={3 / 4}
        onPress={onPress}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 90,
  },
  headerRow: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stackStage: {
    width: STACK_CARD_WIDTH,
    height: STACK_CARD_HEIGHT + 240,
    alignItems: 'center',
    position: 'relative',
    marginTop: 10,
  },
  cardAbsolute: {
    position: 'absolute',
    top: 0,
    width: STACK_CARD_WIDTH,
    height: STACK_CARD_HEIGHT,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    height: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
