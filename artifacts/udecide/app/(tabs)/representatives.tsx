import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { HorizontalScroller } from "@/components/HorizontalScroller";
import { LoadingState } from "@/components/LoadingState";
import { RepresentativeCard } from "@/components/RepresentativeCard";
import { useAddress } from "@/context/AddressContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getRepresentatives } from "@/services/civicApi";
import type { Representative } from "@/types/politics";
import { REP_LEVELS } from "@/utils/constants";

type Level = (typeof REP_LEVELS)[number];

export default function RepresentativesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { effectiveAddress } = useAddress();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reps, setReps] = useState<Representative[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<Level>("All");
  const [usingLiveData, setUsingLiveData] = useState(false);

  // Representatives prioritize the signed-in account's location. The address
  // override is only used as a fallback when the account has no state on file.
  const hasAccountState = !!user?.state?.trim();
  const repAddress = hasAccountState
    ? {
        address: user?.address?.trim() ?? "",
        city: user?.city?.trim() ?? "",
        state: user?.state?.trim() ?? "",
        zipCode: user?.zipCode?.trim() ?? "",
      }
    : effectiveAddress;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 110 : insets.bottom + 120;

  async function loadReps() {
    setLoading(true);
    setError(false);
    try {
      const result = await getRepresentatives(repAddress);
      setReps(result.reps);
      setUsingLiveData(result.live);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReps();
  }, [
    repAddress.address,
    repAddress.city,
    repAddress.state,
    repAddress.zipCode,
  ]);

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
        {router.canGoBack() && (
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
        )}
        <Text style={styles.screenTitle}>Your Representatives</Text>
        <Text style={styles.screenSubtitle}>
          {repAddress.city
            ? `${repAddress.city}, ${repAddress.state}`
            : repAddress.state || "All locations"}
        </Text>
        {!hasAccountState && <AddressOverrideBanner />}
      </LinearGradient>

      <View
        style={[
          styles.filterRow,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <HorizontalScroller contentContainerStyle={styles.filterRowContent}>
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
        </HorizontalScroller>
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
            {getEmptyMessage(
              usingLiveData,
              selectedLevel,
              repAddress.address,
            )}
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
              <Text
                style={[styles.resultCount, { color: colors.mutedForeground }]}
              >
                {filtered.length} representative
                {filtered.length !== 1 ? "s" : ""} found
              </Text>
              <DataSourceBadge usingLiveData={usingLiveData} colors={colors} />
            </View>
          }
          ListFooterComponent={
            !usingLiveData ? <DataSourceNote colors={colors} /> : null
          }
        />
      )}
    </View>
  );
}

function getEmptyMessage(
  usingLiveData: boolean,
  level: Level,
  street: string,
): string {
  if (!usingLiveData) {
    return "No representatives found for the selected level in your area.";
  }
  if (!street) {
    return "Enter a full street address (with house number) in Address Settings to load your local representatives.";
  }
  if (level === "County" || level === "City") {
    return `Our data provider doesn't have ${level.toLowerCase()}-level officials mapped for this address. Coverage of local offices varies by town — federal and state officials are still available under those tabs.`;
  }
  return "No representatives found for the selected level at this address.";
}

function DataSourceBadge({
  usingLiveData,
  colors,
}: {
  usingLiveData: boolean;
  colors: ReturnType<typeof useColors>;
}) {
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
        {usingLiveData ? "Live data · Cicero API" : "Sample data"}
      </Text>
    </View>
  );
}

function DataSourceNote({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View
      style={[
        styles.footerNote,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <MaterialIcons
        name="info-outline"
        size={13}
        color={colors.mutedForeground}
      />
      <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>
        Showing sample representatives. Add a Cicero API key and set your full
        address to see live federal, state, county, and city officials.
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
  backBtn: { marginBottom: 8 },
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
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
