import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Representative } from "@/types/politics";
import { PARTY_COLORS } from "@/utils/constants";
import { formatPhoneNumber } from "@/utils/formatters";

interface RepresentativeCardProps {
  rep: Representative;
}

export function RepresentativeCard({ rep }: RepresentativeCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const partyColor = PARTY_COLORS[rep.party] ?? colors.mutedForeground;

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  }

  function handlePhone() {
    if (rep.phone) Linking.openURL(`tel:${rep.phone}`);
  }

  function handleEmail() {
    if (rep.email) Linking.openURL(`mailto:${rep.email}`);
  }

  function handleWebsite() {
    if (rep.website) Linking.openURL(rep.website);
  }

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handleToggle}
    >
      <View style={styles.header}>
        <View style={[styles.partyBadge, { backgroundColor: partyColor }]}>
          <Text style={styles.partyInitial}>{rep.party.charAt(0)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.foreground }]}>{rep.name}</Text>
          <Text style={[styles.office, { color: colors.mutedForeground }]}>{rep.office}</Text>
          <Text style={[styles.district, { color: colors.mutedForeground }]}>{rep.district}</Text>
        </View>
        <MaterialIcons
          name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={24}
          color={colors.mutedForeground}
        />
      </View>

      <View style={[styles.partyRow, { borderColor: colors.border }]}>
        <View style={[styles.partyTag, { backgroundColor: partyColor + "20" }]}>
          <Text style={[styles.partyText, { color: partyColor }]}>{rep.party}</Text>
        </View>
        <View style={[styles.levelTag, { backgroundColor: colors.muted }]}>
          <Text style={[styles.levelText, { color: colors.mutedForeground }]}>
            {rep.level.charAt(0).toUpperCase() + rep.level.slice(1)}
          </Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.details}>
          {rep.phone ? (
            <Pressable style={styles.detailRow} onPress={handlePhone}>
              <MaterialIcons name="phone" size={16} color={colors.accent} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>
                {formatPhoneNumber(rep.phone)}
              </Text>
            </Pressable>
          ) : null}

          {rep.email ? (
            <Pressable style={styles.detailRow} onPress={handleEmail}>
              <MaterialIcons name="email" size={16} color={colors.accent} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>{rep.email}</Text>
            </Pressable>
          ) : null}

          {rep.website ? (
            <Pressable style={styles.detailRow} onPress={handleWebsite}>
              <MaterialIcons name="language" size={16} color={colors.accent} />
              <Text style={[styles.detailText, { color: colors.accent }]} numberOfLines={1}>
                Official Website
              </Text>
            </Pressable>
          ) : null}

          {rep.twitter ? (
            <View style={styles.detailRow}>
              <MaterialIcons name="alternate-email" size={16} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{rep.twitter}</Text>
            </View>
          ) : null}

          {rep.recentVotes && rep.recentVotes.length > 0 ? (
            <View style={[styles.votesSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.votesTitle, { color: colors.foreground }]}>Recent Votes</Text>
              {rep.recentVotes.slice(0, 3).map((v, i) => (
                <View key={i} style={styles.voteRow}>
                  <View
                    style={[
                      styles.voteBadge,
                      {
                        backgroundColor:
                          v.vote === "Yea"
                            ? "#2E7D3220"
                            : v.vote === "Nay"
                            ? "#C41E3A20"
                            : "#6B7A8D20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteBadgeText,
                        {
                          color:
                            v.vote === "Yea"
                              ? "#2E7D32"
                              : v.vote === "Nay"
                              ? "#C41E3A"
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {v.vote}
                    </Text>
                  </View>
                  <Text style={[styles.voteBill, { color: colors.foreground }]} numberOfLines={2}>
                    {v.bill}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={[styles.source, { color: colors.mutedForeground }]}>
            Source: {rep.source}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  partyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  partyInitial: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  office: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  district: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  partyRow: {
    flexDirection: "row",
    gap: 8,
  },
  partyTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  partyText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  levelTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  levelText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  details: {
    gap: 8,
    paddingTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  votesSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
    marginTop: 4,
  },
  votesTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  voteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  voteBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  voteBill: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  source: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    fontStyle: "italic",
  },
});
