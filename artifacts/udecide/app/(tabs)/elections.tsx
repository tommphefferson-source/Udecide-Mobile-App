import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Linking,
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
import { useAddress } from "@/context/AddressContext";
import { useColors } from "@/hooks/useColors";
import { getElections, isElectionsMockMode } from "@/services/electionsApi";
import type { Election } from "@/types/politics";
import { ELECTION_DISCLAIMER } from "@/utils/constants";
import { formatDate } from "@/utils/formatters";

export default function ElectionsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { effectiveAddress } = useAddress();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [usingLiveData, setUsingLiveData] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 110 : insets.bottom + 120;

  async function loadElections() {
    setLoading(true);
    try {
      const state = effectiveAddress.state || "CA";
      const data = await getElections(state, effectiveAddress);
      setElections(data);
      if (data.length > 0) setSelectedElection(data[0]);
      setUsingLiveData(!isElectionsMockMode());
    } catch {
      setElections([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadElections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAddress.state, effectiveAddress.city, effectiveAddress.zipCode, effectiveAddress.address]);

  const selectedOffice = selectedElection?.offices.find((o) => o.id === selectedOfficeId);

  if (loading) return <LoadingState rows={3} />;

  // ── Candidate detail view ──────────────────────────────────────────────
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
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{ELECTION_DISCLAIMER}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Election list view ─────────────────────────────────────────────────
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
        <Text style={styles.screenTitle}>Elections & Ballots</Text>
        <Text style={styles.screenSubtitle}>
          Upcoming elections in {effectiveAddress.state || "your area"}
        </Text>
        <AddressOverrideBanner />
      </LinearGradient>

      <FlatList
        data={elections}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPad }}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <DataSourceBadge usingLiveData={usingLiveData} colors={colors} />
            <View style={[styles.infoCard, { backgroundColor: "#C41E3A10", borderColor: "#C41E3A30" }]}>
              <MaterialIcons name="warning-amber" size={16} color="#C41E3A" />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{ELECTION_DISCLAIMER}</Text>
            </View>
          </View>
        }
        renderItem={({ item: election }) => (
          <ElectionCard
            election={election}
            colors={colors}
            onSelectOffice={(officeId) => {
              setSelectedElection(election);
              setSelectedOfficeId(officeId);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="how-to-vote" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Upcoming Elections</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No elections found for {effectiveAddress.state || "your state"} at this time.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ── Election card ──────────────────────────────────────────────────────────

function ElectionCard({
  election,
  colors,
  onSelectOffice,
}: {
  election: Election;
  colors: ReturnType<typeof useColors>;
  onSelectOffice: (id: string) => void;
}) {
  // Pull extra URLs attached by the API service
  const extra = election as Election & {
    _registrationUrl?: string;
    _infoUrl?: string;
    _ballotUrl?: string;
    _locationUrl?: string;
  };

  const hasCandidates = election.offices.length > 0;
  const regUrl = extra._registrationUrl;
  const infoUrl = extra._infoUrl;
  const locationUrl = extra._locationUrl;

  return (
    <View style={[styles.electionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.electionHeader}>
        <View style={[styles.typeBadge, { backgroundColor: colors.accent + "20" }]}>
          <Text style={[styles.typeText, { color: colors.accent }]}>{election.type} Election</Text>
        </View>
        <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{election.state}</Text>
      </View>

      <Text style={[styles.electionName, { color: colors.foreground }]}>{election.name}</Text>

      {/* Key dates */}
      <View style={styles.datesGrid}>
        <DateRow icon="event" label="Election Day" value={formatDate(election.date)} colors={colors} />
        <DateRow
          icon="assignment"
          label="Registration"
          value={election.registrationDeadline}
          url={regUrl}
          colors={colors}
        />
        {election.earlyVotingStart ? (
          <DateRow
            icon="access-time"
            label="Early Voting"
            value={`${formatDate(election.earlyVotingStart)} – ${formatDate(election.earlyVotingEnd ?? "")}`}
            colors={colors}
          />
        ) : null}
        {election.absenteeDeadline ? (
          <DateRow
            icon="mail"
            label="Absentee"
            value={election.absenteeDeadline}
            colors={colors}
          />
        ) : null}
      </View>

      {/* Quick links */}
      {(infoUrl || locationUrl) ? (
        <View style={styles.linksRow}>
          {infoUrl ? (
            <LinkBtn label="Election Info" url={infoUrl} colors={colors} />
          ) : null}
          {locationUrl ? (
            <LinkBtn label="Find Polling Place" url={locationUrl} colors={colors} />
          ) : null}
        </View>
      ) : null}

      {/* Offices / candidates */}
      {hasCandidates ? (
        <>
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
              onPress={() => onSelectOffice(office.id)}
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
        </>
      ) : (
        <View style={[styles.pendingBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <MaterialIcons name="schedule" size={15} color={colors.mutedForeground} />
          <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>
            Candidate and ballot information will appear here as it becomes available closer to election day.
            {infoUrl ? " Tap 'Election Info' above for the latest details." : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Small reusable sub-components ─────────────────────────────────────────

function DateRow({
  icon,
  label,
  value,
  url,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  url?: string;
  colors: ReturnType<typeof useColors>;
}) {
  const isLink = url && (value.startsWith("Register at:") || value.startsWith("Absentee info:"));
  const displayValue = isLink ? label + " (tap to open)" : value;

  return (
    <Pressable
      style={[styles.dateItem, { borderColor: colors.border }]}
      onPress={url ? () => Linking.openURL(url) : undefined}
      disabled={!url}
    >
      <MaterialIcons name={icon as never} size={14} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text
          style={[styles.dateValue, { color: isLink ? colors.accent : colors.foreground }]}
          numberOfLines={2}
        >
          {isLink ? "Open registration page" : value}
        </Text>
      </View>
      {isLink ? <MaterialIcons name="open-in-new" size={13} color={colors.accent} /> : null}
    </Pressable>
  );
}

function LinkBtn({
  label,
  url,
  colors,
}: {
  label: string;
  url: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.linkBtn,
        { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={() => Linking.openURL(url)}
    >
      <MaterialIcons name="open-in-new" size={13} color={colors.accent} />
      <Text style={[styles.linkBtnText, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
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
          backgroundColor: usingLiveData ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
          borderColor: usingLiveData ? "rgba(34,197,94,0.35)" : "rgba(245,158,11,0.35)",
        },
      ]}
    >
      <MaterialIcons
        name={usingLiveData ? "verified" : "info-outline"}
        size={12}
        color={usingLiveData ? "#16a34a" : "#d97706"}
      />
      <Text style={[styles.sourceBadgeText, { color: usingLiveData ? "#16a34a" : "#d97706" }]}>
        {usingLiveData
          ? "Live · Google Civic Information API"
          : "Sample data · Add CIVIC_API_KEY for live elections"}
      </Text>
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
  datesGrid: { gap: 4 },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  dateLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dateValue: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  linksRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  linkBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
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
  pendingBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pendingText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  infoCard: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
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
  sourceBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
