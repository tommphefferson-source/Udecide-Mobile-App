import { MaterialIcons } from "@expo/vector-icons";
import { Linking } from "react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Candidate } from "@/types/politics";
import { PARTY_COLORS } from "@/utils/constants";

interface CandidateCardProps {
  candidate: Candidate;
  office: string;
}

export function CandidateCard({ candidate, office }: CandidateCardProps) {
  const colors = useColors();
  const partyColor = PARTY_COLORS[candidate.party] ?? colors.mutedForeground;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.partyCircle, { backgroundColor: partyColor }]}>
          <Text style={styles.partyInitial}>{candidate.party.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{candidate.name}</Text>
            {candidate.incumbentFlag && (
              <View style={[styles.incumbentBadge, { backgroundColor: colors.navy + "15" }]}>
                <Text style={[styles.incumbentText, { color: colors.navy }]}>Incumbent</Text>
              </View>
            )}
          </View>
          <Text style={[styles.office, { color: colors.mutedForeground }]}>{office}</Text>
          <View style={[styles.partyTag, { backgroundColor: partyColor + "20" }]}>
            <Text style={[styles.partyText, { color: partyColor }]}>{candidate.party}</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        {candidate.website ? (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => candidate.website && Linking.openURL(candidate.website)}
          >
            <MaterialIcons name="language" size={14} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Website</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        UDecide does not endorse any candidate.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  partyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  partyInitial: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  incumbentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  incumbentText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  office: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  partyTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  partyText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
