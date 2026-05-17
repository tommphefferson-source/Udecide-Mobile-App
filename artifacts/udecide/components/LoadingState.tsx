import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface LoadingStateProps {
  rows?: number;
}

function SkeletonRow({ width, height = 16 }: { width: string | number; height?: number }) {
  const colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as number, height, backgroundColor: colors.muted },
        animStyle,
      ]}
    />
  );
}

export function LoadingState({ rows = 3 }: LoadingStateProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <SkeletonRow width={40} height={40} />
            <View style={styles.lines}>
              <SkeletonRow width="70%" height={16} />
              <SkeletonRow width="50%" height={12} />
            </View>
          </View>
          <SkeletonRow width="90%" height={14} />
          <SkeletonRow width="60%" height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  lines: {
    flex: 1,
    gap: 6,
  },
  skeleton: {
    borderRadius: 8,
  },
});
