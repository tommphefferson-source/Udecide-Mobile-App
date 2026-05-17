import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddressOverrideBanner } from "@/components/AddressOverrideBanner";
import { CandidateCard } from "@/components/CandidateCard";
import { LoadingState } from "@/components/LoadingState";
import { useColors } from "@/hooks/useColors";
import { MOCK_ELECTIONS } from "@/services/mockData";
import type { Election } from "@/types/politics";
import { ELECTION_DISCLAIMER } from "@/utils/constants";
import { formatDate } from "@/utils/formatters";

export default function ElectionsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  useEffect(() => {
    setTimeout(() => {
      setElections(MOCK_ELECTIONS);
      setSelectedElection(MOCK_ELECTIONS[0] ?? null);
      setLoading(false);
    }, 600);
  }, []);

  const selectedOffice = selectedElection?.offices.find((o) => o.id === selectedOfficeId);

  if (loading) return <LoadingState rows={3} />;

  if (selectedOffice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.navy, colors.navyLight]}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <Pressable style={styles.backBtn} onPress={() => setSelectedOfficeId(null)}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.screenTitle}>{selectedOffice.title}</Text>
          {selectedOffice.district ? (
            <Text style={styles.screenSubtitle}>{selectedOffice.district}</Text>
          ) : null}
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {selectedOffice.candidates.length} candidate{selectedOffice.candidates.length !== 1 ? "s" : ""}
          </Text>
          {selectedOffice.candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} office={selectedOffice.title} />
          ))}
          <View style={[styles.disclaimerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>{ELECTION_DISCLAIMER}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.screenTitle}>Elections & Ballots</Text>
        <Text style={styles.screenSubtitle}>Upcoming elections in your area</Text>
        <AddressOverrideBanner />
      </LinearGradient>

      <FlatList
        data={elections}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPad }}
        ListHeaderComponent={
          <View style={[styles.disclaimerCard, { backgroundColor: "#C41E3A10", borderColor: "#C41E3A30" }]}>
            <MaterialIcons name="warning-amber" size={16} color="#C41E3A" />
            <Text style={[styles.disclaimerText, { color: colors.foreground }]}>{ELECTION_DISCLAIMER}</Text>
          </View>
        }
        renderItem={({ item: election }) => (
          <View style={[styles.electionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.electionHeader}>
              <View style={[styles.typeBadge, { backgroundColor: colors.accent + "20" }]}>
                <Text style={[styles.typeText, { color: colors.accent }]}>{election.type} Election</Text>
              </View>
              <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{election.state}</Text>
            </View>

            <Text style={[styles.electionName, { color: colors.foreground }]}>{election.name}</Text>

            <View style={styles.datesGrid}>
              {[
                { label: "Election Day", value: formatDate(election.date), icon: "event" },
                { label: "Reg. Deadline", value: election.registrationDeadline, icon: "assignment" },
                election.earlyVotingStart
                  ? { label: "Early Voting", value: `${formatDate(election.earlyVotingStart)} – ${formatDate(election.earlyVotingEnd ?? "")}`, icon: "access-time" }
                  : null,
                election.absenteeDeadline
                  ? { label: "Absentee Due", value: formatDate(election.absenteeDeadline), icon: "mail" }
                  : null,
              ]
                .filter(Boolean)
                .map((d, i) => (
                  <View key={i} style={[styles.dateItem, { borderColor: colors.border }]}>
                    <MaterialIcons name={(d as {icon: string}).icon as never} size={14} color={colors.mutedForeground} />
                    <View>
                      <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>{(d as {label: string}).label}</Text>
                      <Text style={[styles.dateValue, { color: colors.foreground }]} numberOfLines={2}>{(d as {value: string}).value}</Text>
                    </View>
                  </View>
                ))}
            </View>

            <Text style={[styles.officesTitle, { color: colors.foreground }]}>
              Offices on the Ballot ({election.offices.length})
            </Text>
            {election.offices.map((office) => (
              <Pressable
                key={office.id}
                style={({ pressed }) => [
                  styles.officeRow,
                  { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.background },
                ]}
                onPress={() => {
                  setSelectedElection(election);
                  setSelectedOfficeId(office.id);
                }}
              >
                <View style={styles.officeInfo}>
                  <Text style={[styles.officeName, { color: colors.foreground }]}>{office.title}</Text>
                  {office.district ? (
                    <Text style={[styles.officeDistrict, { color: colors.mutedForeground }]}>{office.district}</Text>
                  ) : null}
                  <Text style={[styles.candidateCount, { color: colors.mutedForeground }]}>
                    {office.candidates.length} candidate{office.candidates.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  electionCard: {
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
  electionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stateText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  electionName: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  datesGrid: { gap: 8 },
  dateItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4, borderBottomWidth: 1 },
  dateLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dateValue: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  officesTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  officeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  officeInfo: { flex: 1, gap: 2 },
  officeName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  officeDistrict: { fontSize: 12, fontFamily: "Inter_400Regular" },
  candidateCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  disclaimerCard: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
