import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

interface AmbientGlowProps {
  color: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  size?: number;
}

export default function AmbientGlow({ color, top, left, right, bottom, size = 300 }: AmbientGlowProps) {
  return (
    <View
      style={[
        styles.glow,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          right,
          bottom,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    opacity: 0.15,
    zIndex: -1,
  },
});
