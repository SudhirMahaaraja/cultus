// Themed Background: Mesh Gradient Ramp and Ambient Glow
// Supports bundled background images assets/bg-dark.jpg & assets/bg-light.jpg when available
import React from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

const { width, height } = Dimensions.get('window');

// Optional bundled background images (falls back gracefully to pure gradient)
let darkBgImage: any = null;
let lightBgImage: any = null;
try {
  // @ts-ignore
  darkBgImage = require('../../assets/bg-dark.jpg');
} catch {
  darkBgImage = null;
}
try {
  // @ts-ignore
  lightBgImage = require('../../assets/bg-light.jpg');
} catch {
  lightBgImage = null;
}

export const ThemedBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useTheme();
  const bgImage = isDark ? darkBgImage : lightBgImage;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Bundled image if present */}
      {bgImage ? (
        <Image
          source={bgImage}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        /* Gradient Ramp Layer without SVG grid */
        <LinearGradient
          colors={colors.meshRamp as [string, string, ...string[]]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}

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
