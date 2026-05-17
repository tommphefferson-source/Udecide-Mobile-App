import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAddress } from "@/context/AddressContext";
import { useColors } from "@/hooks/useColors";

export function AddressOverrideBanner() {
  const { isOverrideActive, override, clearOverride } = useAddress();
  const colors = useColors();

  if (!isOverrideActive) return null;

  const location = [override.city, override.state].filter(Boolean).join(", ");

  return (
    <View style={[styles.banner, { backgroundColor: colors.gold ?? "#D4AF37" }]}>
      <MaterialIcons name="location-on" size={16} color="#0D1B2A" />
      <Text style={[styles.text, { color: "#0D1B2A" }]} numberOfLines={1}>
        Viewing data for: {location || override.address}
      </Text>
      <Pressable
        onPress={clearOverride}
        hitSlop={8}
        style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <MaterialIcons name="close" size={16} color="#0D1B2A" />
      </Pressable>
      <Pressable
        onPress={() => router.push("/address-override" as never)}
        hitSlop={8}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
      >
        <MaterialIcons name="edit" size={16} color="#0D1B2A" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  clearBtn: {
    marginLeft: 4,
  },
});
