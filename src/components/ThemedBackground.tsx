// Mesh Gradient & Grid Background with Light and Dark Ramps
import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg';
import { useTheme } from '../theme';

const { width, height } = Dimensions.get('window');

export const ThemedBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 5-Color Ramp Gradient Layer */}
      <LinearGradient
        colors={colors.meshRamp as [string, string, ...string[]]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle Grid Pattern Overlay */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id="sartorial-grid"
              width="36"
              height="36"
              patternUnits="userSpaceOnUse"
            >
              <Line
                x1="0"
                y1="0"
                x2="36"
                y2="0"
                stroke={isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'}
                strokeWidth="1"
              />
              <Line
                x1="0"
                y1="0"
                x2="0"
                y2="36"
                stroke={isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'}
                strokeWidth="1"
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#sartorial-grid)" />
        </Svg>
      </View>

      {/* Ambient Radial Soft Glow */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(99, 102, 241, 0.08)', 'transparent']
            : ['rgba(79, 70, 229, 0.05)', 'transparent']
        }
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 0.8 }}
        style={styles.ambientGlow}
        pointerEvents="none"
      />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
});
