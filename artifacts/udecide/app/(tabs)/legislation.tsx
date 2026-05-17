import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BillCard } from "@/components/BillCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useColors } from "@/hooks/useColors";
import { getMasterList, searchBills } from "@/services/legiscanApi";
import type { Bill } from "@/types/politics";
import { US_STATES } from "@/utils/constants";
import { formatDate } from "@/utils/formatters";

export default function LegislationScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedState, setSelectedState] = useState("CA");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showStatePicker, setShowStatePicker] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getMasterList(selectedState);
      setBills(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedState]);

  useEffect(() => { loadBills(); }, [loadBills]);

  async function handleSearch() {
    if (!searchQuery.trim()) { loadBills(); return; }
    setLoading(true);
    try {
      const data = await searchBills(searchQuery.trim(), selectedState);
      setBills(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (selectedBill) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.navy, colors.navyLight]}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <Pressable style={styles.backBtn} onPress={() => setSelectedBill(null)}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.screenTitle} numberOfLines={2}>{selectedBill.title}</Text>
          <Text style={styles.screenSubtitle}>{selectedBill.number} · {selectedBill.state}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPad }}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Status</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{selectedBill.status}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Last Action</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{selectedBill.lastAction}</Text>
            <Text style={[styles.detailSub, { color: colors.mutedForeground }]}>{formatDate(selectedBill.lastActionDate)}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Description</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{selectedBill.description}</Text>
          </View>
          {selectedBill.sponsors.length > 0 && (
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Sponsors</Text>
              {selectedBill.sponsors.map((s, i) => (
                <Text key={i} style={[styles.detailValue, { color: colors.foreground }]}>• {s}</Text>
              ))}
            </View>
          )}
          {selectedBill.history && selectedBill.history.length > 0 && (
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Legislative History</Text>
              {selectedBill.history.map((h, i) => (
                <View key={i} style={styles.historyItem}>
                  <View style={[styles.historyDot, { backgroundColor: colors.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>{formatDate(h.date)}</Text>
                    <Text style={[styles.historyAction, { color: colors.foreground }]}>{h.action}</Text>
                    {h.chamber ? <Text style={[styles.historyChamber, { color: colors.mutedForeground }]}>{h.chamber}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
          {selectedBill.votes && selectedBill.votes.length > 0 && (
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Votes</Text>
              {selectedBill.votes.map((v, i) => (
                <View key={i} style={[styles.voteRow, { borderColor: colors.border }]}>
                  <Text style={[styles.voteDate, { color: colors.mutedForeground }]}>{formatDate(v.date)} · {v.chamber}</Text>
                  <Text style={[styles.voteResult, { color: v.result === "Passed" ? "#2E7D32" : colors.accent }]}>{v.result}</Text>
                  <Text style={[styles.voteNums, { color: colors.foreground }]}>Yea: {v.yea} · Nay: {v.nay} · Absent: {v.absent}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>Source: {selectedBill.source}</Text>
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
        <Text style={styles.screenTitle}>Legislation Tracker</Text>
        <Text style={styles.screenSubtitle}>Bills and laws from your state</Text>
      </LinearGradient>

      <View style={[styles.controls, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.statePicker, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowStatePicker(!showStatePicker)}
        >
          <MaterialIcons name="flag" size={16} color={colors.mutedForeground} />
          <Text style={[styles.statePickerText, { color: colors.foreground }]}>
            {US_STATES.find((s) => s.code === selectedState)?.name ?? selectedState}
          </Text>
          <MaterialIcons name={showStatePicker ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={18} color={colors.mutedForeground} />
        </Pressable>

        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search bills..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(""); loadBills(); }}>
              <MaterialIcons name="close" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {showStatePicker && (
        <View style={[styles.stateDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView style={{ maxHeight: 200 }}>
            {US_STATES.map((s) => (
              <Pressable
                key={s.code}
                style={({ pressed }) => [
                  styles.stateOption,
                  { backgroundColor: s.code === selectedState ? colors.accent + "20" : pressed ? colors.muted : "transparent" },
                ]}
                onPress={() => { setSelectedState(s.code); setShowStatePicker(false); }}
              >
                <Text style={[styles.stateOptionText, { color: s.code === selectedState ? colors.accent : colors.foreground }]}>
                  {s.name} ({s.code})
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message="Unable to load legislation data" onRetry={loadBills} />
      ) : bills.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="gavel" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Bills Found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different search or state.</Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <BillCard bill={item} onPress={() => setSelectedBill(item)} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
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
  controls: { padding: 12, gap: 8, borderBottomWidth: 1 },
  statePicker: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  statePickerText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  stateDropdown: {
    position: "absolute", top: 140, left: 12, right: 12,
    zIndex: 100, borderRadius: 12, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  stateOption: { padding: 12, borderRadius: 8 },
  stateOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  detailCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  detailLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  detailSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  historyDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historyAction: { fontSize: 13, fontFamily: "Inter_500Medium" },
  historyChamber: { fontSize: 11, fontFamily: "Inter_400Regular" },
  voteRow: { gap: 2, paddingTop: 8, borderTopWidth: 1, marginTop: 4 },
  voteDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  voteResult: { fontSize: 14, fontFamily: "Inter_700Bold" },
  voteNums: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sourceText: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center" },
});
