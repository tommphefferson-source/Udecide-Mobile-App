import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddressOverrideBanner } from "@/components/AddressOverrideBanner";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { RepresentativeCard } from "@/components/RepresentativeCard";
import { useAddress } from "@/context/AddressContext";
import { useColors } from "@/hooks/useColors";
import { MOCK_REPRESENTATIVES } from "@/services/mockData";
import type { Representative } from "@/types/politics";
import { REP_LEVELS } from "@/utils/constants";

type Level = (typeof REP_LEVELS)[number];

export default function RepresentativesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { effectiveAddress } = useAddress();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reps, setReps] = useState<Representative[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level>("All");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  async function loadReps() {
    setLoading(true);
    setError(false);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setReps(MOCK_REPRESENTATIVES);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReps(); }, [effectiveAddress.state]);

  const filtered = reps.filter((r) => {
    if (selectedLevel === "All") return true;
    return r.level === selectedLevel.toLowerCase();
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.screenTitle}>Your Representatives</Text>
        <Text style={styles.screenSubtitle}>
          {effectiveAddress.city
            ? `${effectiveAddress.city}, ${effectiveAddress.state}`
            : effectiveAddress.state || "All locations"}
        </Text>
        <AddressOverrideBanner />
      </LinearGradient>

      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {REP_LEVELS.map((level) => (
          <Pressable
            key={level}
            style={({ pressed }) => [
              styles.filterBtn,
              selectedLevel === level && { backgroundColor: colors.accent },
              { opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => setSelectedLevel(level)}
          >
            <Text
              style={[
                styles.filterText,
                { color: selectedLevel === level ? "#FFF" : colors.mutedForeground },
              ]}
            >
              {level}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message="Unable to load representatives" onRetry={loadReps} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Representatives Found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No representatives found for the selected level in your area.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RepresentativeCard rep={item} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {filtered.length} representative{filtered.length !== 1 ? "s" : ""} found
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    flexWrap: "wrap",
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  resultCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
