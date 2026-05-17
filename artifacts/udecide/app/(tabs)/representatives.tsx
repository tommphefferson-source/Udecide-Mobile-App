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
import { getMembers } from "@/services/congressApi";
import { MOCK_REPRESENTATIVES } from "@/services/mockData";
import type { Representative } from "@/types/politics";
import { REP_LEVELS } from "@/utils/constants";

type Level = (typeof REP_LEVELS)[number];

const HAS_CONGRESS_KEY = !!process.env.EXPO_PUBLIC_CONGRESS_GOV_API_KEY;

export default function RepresentativesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { effectiveAddress } = useAddress();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reps, setReps] = useState<Representative[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level>("All");
  const [usingLiveData, setUsingLiveData] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  async function loadReps() {
    setLoading(true);
    setError(false);
    try {
      const state = effectiveAddress.state;

      // ── Federal reps: Congress.gov API (real data when key present, mock fallback when not) ──
      const federalReps = await getMembers(state || undefined);

      // ── State / county / city: no free universal API — use curated mock data ──
      // These are clearly labelled with "(sample data)" in their source field.
      const localReps = MOCK_REPRESENTATIVES.filter((r) => r.level !== "federal");

      setReps([...federalReps, ...localReps]);
      setUsingLiveData(HAS_CONGRESS_KEY);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReps();
  }, [effectiveAddress.state]);

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

      <View
        style={[
          styles.filterRow,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
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
                {
                  color:
                    selectedLevel === level ? "#FFF" : colors.mutedForeground,
                },
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
        <ErrorState
          message="Unable to load representatives"
          onRetry={loadReps}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="people-outline"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No Representatives Found
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No representatives found for the selected level in your area.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RepresentativeCard rep={item} />}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: bottomPad,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                {filtered.length} representative
                {filtered.length !== 1 ? "s" : ""} found
              </Text>
              <DataSourceBadge
                usingLiveData={usingLiveData}
                selectedLevel={selectedLevel}
                colors={colors}
              />
            </View>
          }
          ListFooterComponent={<DataSourceNote colors={colors} selectedLevel={selectedLevel} usingLiveData={usingLiveData} />}
        />
      )}
    </View>
  );
}

function DataSourceBadge({
  usingLiveData,
  selectedLevel,
  colors,
}: {
  usingLiveData: boolean;
  selectedLevel: Level;
  colors: ReturnType<typeof useColors>;
}) {
  const isFederal = selectedLevel === "Federal" || selectedLevel === "All";
  if (!isFederal) return null;

  return (
    <View
      style={[
        styles.sourceBadge,
        {
          backgroundColor: usingLiveData
            ? "rgba(34,197,94,0.12)"
            : "rgba(245,158,11,0.12)",
          borderColor: usingLiveData
            ? "rgba(34,197,94,0.35)"
            : "rgba(245,158,11,0.35)",
        },
      ]}
    >
      <MaterialIcons
        name={usingLiveData ? "verified" : "info-outline"}
        size={12}
        color={usingLiveData ? "#16a34a" : "#d97706"}
      />
      <Text
        style={[
          styles.sourceBadgeText,
          { color: usingLiveData ? "#16a34a" : "#d97706" },
        ]}
      >
        {usingLiveData ? "Live · Congress.gov" : "Sample federal data · Add CONGRESS_GOV_API_KEY for live data"}
      </Text>
    </View>
  );
}

function DataSourceNote({
  colors,
  selectedLevel,
  usingLiveData,
}: {
  colors: ReturnType<typeof useColors>;
  selectedLevel: Level;
  usingLiveData: boolean;
}) {
  const showLocalNote =
    selectedLevel === "All" ||
    selectedLevel === "State" ||
    selectedLevel === "County" ||
    selectedLevel === "City";

  if (!showLocalNote) return null;

  return (
    <View
      style={[
        styles.footerNote,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <MaterialIcons name="info-outline" size={13} color={colors.mutedForeground} />
      <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>
        {usingLiveData
          ? "Federal reps are live from Congress.gov. "
          : "Federal reps are sample data. "}
        State, county and city reps are sample data — no free universal API covers all local officials. Contact your state legislature for accurate local data.
      </Text>
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
  listHeader: {
    gap: 8,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
