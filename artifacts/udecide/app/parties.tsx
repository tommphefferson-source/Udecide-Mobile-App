import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Linking, router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { MOCK_PARTIES } from "@/services/mockData";
import type { PoliticalParty } from "@/types/politics";

export default function PartiesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [selectedParty, setSelectedParty] = useState<PoliticalParty | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  if (selectedParty) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
          <Pressable style={styles.backBtn} onPress={() => setSelectedParty(null)}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.partyHeaderRow}>
            <View style={[styles.bigPartyBadge, { backgroundColor: selectedParty.color }]}>
              <Text style={styles.bigPartyInitial}>{selectedParty.icon}</Text>
            </View>
            <View>
              <Text style={styles.screenTitle}>{selectedParty.name}</Text>
              <Text style={styles.screenSubtitle}>Founded {selectedParty.founded}</Text>
            </View>
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomPad }}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>About</Text>
            <Text style={[styles.detailText, { color: colors.foreground }]}>{selectedParty.description}</Text>
          </View>
          {selectedParty.currentLeader !== "N/A" && (
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Current Leadership</Text>
              <Text style={[styles.detailText, { color: colors.foreground }]}>{selectedParty.currentLeader}</Text>
            </View>
          )}
          {selectedParty.corePositions.length > 0 && (
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Key Platform Areas</Text>
              {selectedParty.corePositions.map((pos, i) => (
                <View key={i} style={styles.positionRow}>
                  <View style={[styles.positionDot, { backgroundColor: selectedParty.color }]} />
                  <Text style={[styles.positionText, { color: colors.foreground }]}>{pos}</Text>
                </View>
              ))}
            </View>
          )}
          {selectedParty.website !== "N/A" && (
            <Pressable
              style={({ pressed }) => [styles.websiteBtn, { backgroundColor: selectedParty.color, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => Linking.openURL(selectedParty.website)}
            >
              <MaterialIcons name="language" size={18} color="#FFF" />
              <Text style={styles.websiteBtnText}>Official Website</Text>
            </Pressable>
          )}
          <View style={[styles.neutralityCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.neutralityText, { color: colors.mutedForeground }]}>
              This information is sourced from publicly available records and official party materials. UDecide does not endorse or rank any political party.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.screenTitle}>Political Parties</Text>
        <Text style={styles.screenSubtitle}>Major U.S. political parties — presented without bias</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}>
        {MOCK_PARTIES.map((party) => (
          <View key={party.id} style={[styles.partyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.partyCardHeader}>
              <View style={[styles.partyBadge, { backgroundColor: party.color }]}>
                <Text style={styles.partyInitial}>{party.icon}</Text>
              </View>
              <View style={styles.partyInfo}>
                <Text style={[styles.partyName, { color: colors.foreground }]}>{party.name}</Text>
                <Text style={[styles.partyFounded, { color: colors.mutedForeground }]}>
                  Founded {party.founded}
                </Text>
              </View>
            </View>
            <Text style={[styles.partyDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {party.description}
            </Text>
            <View style={styles.partyActions}>
              <Pressable
                style={({ pressed }) => [styles.partyBtn, { backgroundColor: party.color + "20", opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setSelectedParty(party)}
              >
                <MaterialIcons name="description" size={14} color={party.color} />
                <Text style={[styles.partyBtnText, { color: party.color }]}>Platform</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.partyBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setSelectedParty(party)}
              >
                <MaterialIcons name="person" size={14} color={colors.mutedForeground} />
                <Text style={[styles.partyBtnText, { color: colors.mutedForeground }]}>Leadership</Text>
              </Pressable>
              {party.website !== "N/A" && (
                <Pressable
                  style={({ pressed }) => [styles.partyBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => Linking.openURL(party.website)}
                >
                  <MaterialIcons name="language" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.partyBtnText, { color: colors.mutedForeground }]}>Website</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        <View style={[styles.neutralityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="balance" size={16} color={colors.mutedForeground} />
          <Text style={[styles.neutralityText, { color: colors.mutedForeground }]}>
            UDecide presents all political parties without bias, ranking, or endorsement. Information is sourced from official party materials and nonpartisan reference sources.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  partyHeaderRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  bigPartyBadge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  bigPartyInitial: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  partyCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  partyCardHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  partyBadge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  partyInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF" },
  partyInfo: { flex: 1 },
  partyName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  partyFounded: { fontSize: 12, fontFamily: "Inter_400Regular" },
  partyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  partyActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  partyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  partyBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  detailCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  detailText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  positionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  positionDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  positionText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  websiteBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", borderRadius: 12, padding: 14 },
  websiteBtnText: { color: "#FFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  neutralityCard: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  neutralityText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
