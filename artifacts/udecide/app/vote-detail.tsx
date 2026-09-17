import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { t } from "@/i18n";
import type { LegislativeVote } from "@/services/votingRecordsApi";
import { VOTE_COLORS, formatVoteDate } from "./voting-record";

/**
 * Vote Detail — one roll-call vote in full: legislation, the official's
 * recorded position, the chamber tally, the actual vote question/motion
 * (not every roll call is final passage), and the source with a link to the
 * original government record.
 */

export default function VoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { vote: voteParam } = useLocalSearchParams<{ vote: string }>();

  let vote: LegislativeVote | null = null;
  try {
    vote = JSON.parse(voteParam ?? "") as LegislativeVote;
  } catch {
    vote = null;
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!vote) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.missing, { color: colors.mutedForeground }]}>
          {t("Unable to load voting records")}
        </Text>
      </View>
    );
  }

  const officialUrl = vote.officialGovernmentSourceUrl ?? vote.sourceUrl;
  const viaLegiScan = vote.sourceProvider === "LegiScan";
  const tally: { label: string; value: number | undefined }[] = [
    { label: "Yea", value: vote.yeaCount },
    { label: "Nay", value: vote.nayCount },
    { label: "Present", value: vote.presentCount },
    { label: "Absent", value: vote.absentCount },
    { label: "Not Voting", value: vote.notVotingCount },
  ];

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
        <Text style={styles.screenTitle}>{vote.billNumber ?? t("Vote Details")}</Text>
        <Text style={styles.screenSubtitle}>{formatVoteDate(vote.voteDate)}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Legislation — official text, verbatim */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {vote.billTitle ? (
            <Text style={[styles.billTitle, { color: colors.foreground }]}>{vote.billTitle}</Text>
          ) : null}
          {vote.billDescription ? (
            <Text style={[styles.billDescription, { color: colors.mutedForeground }]}>
              {vote.billDescription}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            {vote.chamber ? (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {t("Chamber")}: {t(vote.chamber)}
              </Text>
            ) : null}
            {vote.session ? (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {t("Session")}: {vote.session}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Official's vote */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t("Official's Vote")}
          </Text>
          <Text
            style={[
              styles.officialVote,
              { color: VOTE_COLORS[vote.officialVote] ?? colors.foreground },
            ]}
          >
            {t(vote.officialVote)}
          </Text>
          {vote.result ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
                {t("Vote Result")}
              </Text>
              <Text style={[styles.resultText, { color: colors.foreground }]}>{vote.result}</Text>
            </>
          ) : null}
        </View>

        {/* Chamber tally */}
        {tally.some((row) => row.value !== undefined) ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {t("Chamber Vote")}
            </Text>
            {tally
              .filter((row) => row.value !== undefined)
              .map((row) => (
                <View key={row.label} style={styles.tallyRow}>
                  <Text style={[styles.tallyLabel, { color: colors.foreground }]}>
                    {t(row.label)}
                  </Text>
                  <Text style={[styles.tallyValue, { color: colors.foreground }]}>{row.value}</Text>
                </View>
              ))}
          </View>
        ) : null}

        {/* Vote question — critical context: not every vote is final passage */}
        {vote.question ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {t("Vote Question")}
            </Text>
            <Text style={[styles.questionText, { color: colors.foreground }]}>{vote.question}</Text>
          </View>
        ) : null}

        {/* Source transparency */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("Source")}</Text>
          <Text style={[styles.sourceName, { color: colors.foreground }]}>
            {viaLegiScan && vote.officialGovernmentSourceUrl
              ? // React Native's URL lacks hostname; extract it directly.
                vote.officialGovernmentSourceUrl.replace(/^https?:\/\//, "").split("/")[0]
              : vote.sourceProvider}
          </Text>
          {viaLegiScan ? (
            <Text style={[styles.sourceNote, { color: colors.mutedForeground }]}>
              {t("Data provided through LegiScan")}
            </Text>
          ) : null}
          <Pressable
            style={[styles.sourceBtn, { backgroundColor: colors.accent }]}
            onPress={() => Linking.openURL(officialUrl)}
          >
            <MaterialIcons name="open-in-new" size={16} color="#FFF" />
            <Text style={styles.sourceBtnText}>{t("View Official Record")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { marginBottom: 8, width: 40 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  missing: { padding: 32, textAlign: "center", fontSize: 14 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  billTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  billDescription: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  officialVote: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 4 },
  resultText: { fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 2 },
  tallyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  tallyLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  tallyValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  questionText: { fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 2, lineHeight: 21 },
  sourceName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  sourceNote: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  sourceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  sourceBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
