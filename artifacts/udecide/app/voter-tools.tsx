import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAddress } from "@/context/AddressContext";
import { useColors } from "@/hooks/useColors";
import { getVoterInfo, checkRegistrationStatus, findPollingPlace } from "@/services/voterApi";
import type { VoterInfo } from "@/types/politics";
import { ELECTION_DISCLAIMER } from "@/utils/constants";

export default function VoterToolsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { effectiveAddress } = useAddress();
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>("registration");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  useEffect(() => {
    const state = effectiveAddress.state || "CA";
    getVoterInfo(state).then((info) => { setVoterInfo(info); setLoading(false); });
  }, [effectiveAddress.state]);

  async function handleCheckRegistration() {
    const { url } = await checkRegistrationStatus(effectiveAddress.state || "CA");
    router.push({
      pathname: "/web-view",
      params: { url, title: "Check Registration Status" },
    });
  }

  async function handleFindPolling() {
    const { url } = await findPollingPlace(effectiveAddress.state || "CA");
    Linking.openURL(url);
  }

  const TOOLS = [
    {
      id: "registration",
      title: "Voter Registration",
      icon: "how-to-vote",
      content: voterInfo ? [
        { label: "Registration Deadline", value: voterInfo.registrationDeadline },
        { label: "Online Registration", value: voterInfo.onlineRegistration ? "Available" : "Not available" },
        { label: "Same-Day Registration", value: voterInfo.sameDayRegistration ? "Available at polls" : "Not available" },
      ] : [],
      action: { label: "Check Registration Status", onPress: handleCheckRegistration },
    },
    {
      id: "polling",
      title: "Polling Place",
      icon: "place",
      content: [{ label: "How to Find", value: "Use the official government tool to locate your assigned polling place based on your registered address." }],
      action: { label: "Find Your Polling Place", onPress: handleFindPolling },
    },
    {
      id: "early-voting",
      title: "Early Voting",
      icon: "access-time",
      content: voterInfo ? [
        { label: "Available", value: voterInfo.earlyVotingAllowed ? "Yes" : "No" },
        ...(voterInfo.earlyVotingAllowed ? [
          { label: "Start Date", value: voterInfo.earlyVotingStart ?? "Contact election office" },
          { label: "End Date", value: voterInfo.earlyVotingEnd ?? "Contact election office" },
        ] : []),
      ] : [],
    },
    {
      id: "absentee",
      title: "Absentee / Mail Voting",
      icon: "mail",
      content: voterInfo ? [
        { label: "No-Excuse Absentee", value: voterInfo.noExcuseAbsentee ? "Any voter can request mail ballot" : "Must provide qualifying reason" },
      ] : [],
    },
    {
      id: "voter-id",
      title: "Voter ID Requirements",
      icon: "badge",
      content: voterInfo ? [
        { label: "Photo ID Required", value: voterInfo.voterIdRequired ? "Yes" : "No" },
        ...(voterInfo.voterIdTypes ? [{ label: "Accepted Forms", value: voterInfo.voterIdTypes.join(", ") }] : []),
      ] : [],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.screenTitle}>Voter Status Tools</Text>
        <Text style={styles.screenSubtitle}>
          {voterInfo?.state ?? effectiveAddress.state ?? "Your state"} voter information
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}>
          <View style={[styles.warningCard, { backgroundColor: "#C41E3A10", borderColor: "#C41E3A30" }]}>
            <MaterialIcons name="warning-amber" size={16} color="#C41E3A" />
            <Text style={[styles.warningText, { color: colors.foreground }]}>{ELECTION_DISCLAIMER}</Text>
          </View>

          {TOOLS.map((tool) => (
            <View key={tool.id} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={styles.toolHeader}
                onPress={() => setExpandedSection(expandedSection === tool.id ? null : tool.id)}
              >
                <View style={[styles.toolIcon, { backgroundColor: colors.accent + "20" }]}>
                  <MaterialIcons name={tool.icon as never} size={20} color={colors.accent} />
                </View>
                <Text style={[styles.toolTitle, { color: colors.foreground }]}>{tool.title}</Text>
                <MaterialIcons
                  name={expandedSection === tool.id ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={22}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {expandedSection === tool.id && (
                <View style={[styles.toolContent, { borderTopColor: colors.border }]}>
                  {tool.content.map((item, i) => (
                    <View key={i} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
                    </View>
                  ))}
                  {tool.action && (
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
                      onPress={tool.action.onPress}
                    >
                      <MaterialIcons name="open-in-new" size={16} color="#FFF" />
                      <Text style={styles.actionBtnText}>{tool.action.label}</Text>
                    </Pressable>
                  )}
                  <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>
                    Source: {voterInfo?.source ?? "Official state election office"}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
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
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  warningCard: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  warningText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  toolCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  toolHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  toolIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toolTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  toolContent: { borderTopWidth: 1, padding: 14, gap: 10 },
  infoRow: { paddingBottom: 8, borderBottomWidth: 1, gap: 2 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, padding: 12, justifyContent: "center", marginTop: 4 },
  actionBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sourceText: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center" },
});
