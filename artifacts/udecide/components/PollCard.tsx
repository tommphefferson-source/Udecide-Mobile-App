import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Poll } from "@/types/politics";
import { formatNumber, formatPercent } from "@/utils/formatters";

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
}

export function PollCard({ poll, onVote }: PollCardProps) {
  const colors = useColors();
  const hasVoted = !!poll.userVoted;

  async function handleVote(optionId: string) {
    if (hasVoted) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVote(poll.id, optionId);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topicRow}>
        <View style={[styles.topicBadge, { backgroundColor: colors.accent + "20" }]}>
          <Text style={[styles.topicText, { color: colors.accent }]}>{poll.topic}</Text>
        </View>
        <Text style={[styles.votes, { color: colors.mutedForeground }]}>
          {formatNumber(poll.totalVotes)} votes
        </Text>
      </View>

      <Text style={[styles.question, { color: colors.foreground }]}>{poll.question}</Text>

      <View style={styles.options}>
        {poll.options.map((option) => {
          const pct = formatPercent(option.votes, poll.totalVotes);
          const numPct = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
          const isSelected = poll.userVoted === option.id;

          return (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: isSelected ? colors.accent + "10" : colors.background,
                  opacity: pressed && !hasVoted ? 0.8 : 1,
                },
              ]}
              onPress={() => handleVote(option.id)}
              disabled={hasVoted}
            >
              {hasVoted && (
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: isSelected ? colors.accent + "30" : colors.muted, width: `${numPct}%` as never },
                  ]}
                />
              )}
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? colors.accent : colors.foreground },
                  ]}
                  numberOfLines={2}
                >
                  {option.text}
                </Text>
                {hasVoted && (
                  <Text style={[styles.pctText, { color: isSelected ? colors.accent : colors.mutedForeground }]}>
                    {pct}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {!hasVoted && (
        <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
          Tap an option to vote
        </Text>
      )}

      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        {poll.disclaimer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topicText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  votes: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  question: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
  options: {
    gap: 8,
  },
  option: {
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: "hidden",
    minHeight: 44,
    justifyContent: "center",
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 8,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  pctText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginLeft: 8,
  },
  tapHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
