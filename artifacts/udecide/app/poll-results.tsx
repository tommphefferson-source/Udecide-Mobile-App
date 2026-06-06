import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useColors } from "@/hooks/useColors";
import { getAllPollResults, type PollResultDetail } from "@/services/pollsApi";
import { formatNumber } from "@/utils/formatters";

// Shows the outcomes of every previous poll. Results come from the legacy
// backend (/poll_results) via the API Server — see getAllPollResults.
export default function PollResultsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["poll-results"],
    queryFn: getAllPollResults,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.screenTitle}>Poll Results</Text>
        <Text style={styles.screenSubtitle}>Outcomes from previous community polls</Text>
      </LinearGradient>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState message="We couldn't load poll results right now." onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.pollId}
          renderItem={({ item }) => <ResultCard result={item} colors={colors} />}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="bar-chart" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Results</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                There are no poll results to show yet.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function ResultCard({
  result,
  colors,
}: {
  result: PollResultDetail;
  colors: ReturnType<typeof useColors>;
}) {
  const leadingPct = Math.max(0, ...result.options.map((o) => o.percentage));

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Text style={[styles.votes, { color: colors.mutedForeground }]}>
          {formatNumber(result.totalVotes)} votes
        </Text>
      </View>
      <Text style={[styles.question, { color: colors.foreground }]}>{result.question}</Text>

      <View style={styles.options}>
        {result.options.map((option) => {
          const isLeading = option.percentage === leadingPct && leadingPct > 0;
          return (
            <View
              key={option.id}
              style={[
                styles.option,
                { borderColor: isLeading ? colors.accent : colors.border, backgroundColor: colors.background },
              ]}
            >
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: isLeading ? colors.accent + "30" : colors.muted,
                    width: `${Math.min(100, Math.max(0, option.percentage))}%` as never,
                  },
                ]}
              />
              <View style={styles.optionContent}>
                <Text
                  style={[styles.optionText, { color: isLeading ? colors.accent : colors.foreground }]}
                  numberOfLines={2}
                >
                  {option.label}
                </Text>
                <Text
                  style={[styles.pctText, { color: isLeading ? colors.accent : colors.mutedForeground }]}
                >
                  {Math.round(option.percentage)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  votes: { fontSize: 12, fontFamily: "Inter_400Regular" },
  question: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  options: { gap: 8 },
  option: {
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: "hidden",
    minHeight: 44,
    justifyContent: "center",
  },
  progressBar: { position: "absolute", top: 0, left: 0, bottom: 0, borderRadius: 8 },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  pctText: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
