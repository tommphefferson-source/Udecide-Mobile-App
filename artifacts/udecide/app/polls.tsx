import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PollCard } from "@/components/PollCard";
import { useColors } from "@/hooks/useColors";
import { getPolls, votePoll } from "@/services/pollsApi";
import type { Poll, PollTopic } from "@/types/politics";
import { POLL_TOPICS } from "@/utils/constants";

export default function PollsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<PollTopic>("All");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const loadPolls = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setPolls(await getPolls());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolls();
  }, [loadPolls]);

  async function handleVote(pollId: string, optionId: string) {
    const target = polls.find((p) => p.id === pollId);
    if (!target || target.userVoted) return;
    try {
      const results = await votePoll(pollId, optionId);
      setPolls((prev) =>
        prev.map((poll) => {
          if (poll.id !== pollId) return poll;
          const votesById = new Map(results.options.map((o) => [o.id, o.votes]));
          return {
            ...poll,
            userVoted: optionId,
            totalVotes: results.totalVotes,
            options: poll.options.map((opt) => ({
              ...opt,
              votes: votesById.get(opt.id) ?? opt.votes,
            })),
          };
        })
      );
    } catch {
      // Vote failed upstream — leave the poll unchanged so the user can retry.
    }
  }

  const filteredPolls = polls.filter(
    (p) => selectedTopic === "All" || p.topic === selectedTopic
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.screenTitle}>Political Polls</Text>
        <Text style={styles.screenSubtitle}>Community perspectives — not scientific unless stated</Text>
      </LinearGradient>

      <View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          data={POLL_TOPICS as unknown as PollTopic[]}
          keyExtractor={(t) => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}
          renderItem={({ item: topic }) => (
            <Pressable
              style={({ pressed }) => [
                styles.topicChip,
                selectedTopic === topic && { backgroundColor: colors.accent },
                { borderColor: selectedTopic === topic ? colors.accent : colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => setSelectedTopic(topic)}
            >
              <Text
                style={[
                  styles.topicChipText,
                  { color: selectedTopic === topic ? "#FFF" : colors.mutedForeground },
                ]}
              >
                {topic}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message="We couldn't load polls right now." onRetry={() => void loadPolls()} />
      ) : (
        <FlatList
          data={filteredPolls}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PollCard poll={item} onVote={handleVote} />}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="poll" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Polls</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No polls available for this topic.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  filterContainer: { paddingVertical: 10, borderBottomWidth: 1 },
  topicChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, backgroundColor: "transparent",
  },
  topicChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
