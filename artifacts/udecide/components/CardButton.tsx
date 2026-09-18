import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface CardButtonProps {
  title: string;
  subtitle?: string;
  icon: string;
  accentColor?: string;
  onPress: () => void;
  /** Full-width, horizontally-laid-out prominent tile (e.g. the featured
   * Fact Checker tile at the bottom of the dashboard). */
  large?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CardButton({ title, subtitle, icon, accentColor, onPress, large = false }: CardButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }

  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const accent = accentColor ?? colors.accent;

  if (large) {
    return (
      <AnimatedPressable
        style={[
          styles.card,
          styles.largeCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          animStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[styles.iconContainer, styles.largeIcon, { backgroundColor: accent + "1A" }]}
        >
          <MaterialIcons name={icon as never} size={32} color={accent} />
        </View>
        <View style={styles.largeTextWrap}>
          <Text style={[styles.largeTitle, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.arrow, styles.largeArrow, { backgroundColor: accent + "20" }]}>
          <MaterialIcons name="chevron-right" size={20} color={accent} />
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, animStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={[styles.iconContainer, { backgroundColor: accent + "1A" }]}>
        <MaterialIcons name={icon as never} size={26} color={accent} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      <View style={[styles.arrow, { backgroundColor: accent + "20" }]}>
        <MaterialIcons name="chevron-right" size={16} color={accent} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  largeCard: {
    // Full width within the wrapping grid, laid out horizontally.
    width: "100%",
    flexBasis: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  largeIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  largeTextWrap: {
    flex: 1,
    gap: 2,
  },
  largeTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  largeArrow: {
    alignSelf: "center",
    marginTop: 0,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  arrow: {
    alignSelf: "flex-start",
    borderRadius: 8,
    padding: 2,
    marginTop: 4,
  },
});
