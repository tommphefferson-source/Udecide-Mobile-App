import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "@/components/ErrorState";
import { HorizontalScroller } from "@/components/HorizontalScroller";
import { LoadingState } from "@/components/LoadingState";
import { useColors } from "@/hooks/useColors";
import { t, uiLocale } from "@/i18n";
import {
  getVotingRecord,
  type LegislativeVote,
  type VoteCategory,
  type VotingRecordStatus,
} from "@/services/votingRecordsApi";

/**
 * Voting Record — chronological list of an official's recorded roll-call
 * votes. Strictly informational: what was voted on, how the official voted,
 * what happened, and the source. No scores, rankings, or judgments.
 */

const CATEGORY_FILTERS: { key: VoteCategory | "all"; label: string }[] = [
  { key: "all", label: "All Votes" },
  { key: "bill", label: "Bills" },
  { key: "amendment", label: "Amendments" },
  { key: "resolution", label: "Resolutions" },
  { key: "nomination", label: "Nominations" },
  { key: "procedural", label: "Procedural" },
  { key: "other", label: "Other" },
];

export const VOTE_COLORS: Record<string, string> = {
  Yea: "#2E7D32",
  Nay: "#C41E3A",
};

export function formatVoteDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(uiLocale, { year: "numeric", month: "long", day: "numeric" });
}

function emptyMessage(status: VotingRecordStatus, filtered: boolean): string {
  if (status === "MATCH_AMBIGUOUS")
    return t("We couldn't confidently match this official to legislative records.");
  if (status === "NO_VOTES_FOUND" && filtered) return t("No votes match your filters.");
  return t("Voting records are not currently available for this official.");
}

export default function VotingRecordScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name: string;
    state: string;
    level: string;
    office?: string;
    district?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<VotingRecordStatus>("NO_VOTES_FOUND");
  const [votes, setVotes] = useState<LegislativeVote[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [category, setCategory] = useState<VoteCategory | "all">("all");
  const [search, setSearch] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSearch, setActiveSearch] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 110 : insets.bottom + 40;

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      const result = await getVotingRecord({
        name: params.name ?? "",
        state: params.state ?? "",
        level: params.level ?? "federal",
        office: params.office,
        district: params.district,
        page: pageNum,
        category,
        search: activeSearch || undefined,
      });
      if (!result) {
        if (!append) setError(true);
        return;
      }
      setError(false);
      setStatus(result.status);
      setVotes((prev) => (append ? [...prev, ...result.votes] : result.votes));
      setPage(result.page);
      setHasMore(result.hasMore);
    },
    [params.name, params.state, params.level, params.office, params.district, category, activeSearch],
  );

  useEffect(() => {
    setLoading(true);
    load(1, false).finally(() => setLoading(false));
  }, [load]);

  function onSearchChange(text: string) {
    setSearch(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setActiveSearch(text.trim()), 450);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  }

  async function onEndReached() {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  }

  function openDetail(vote: LegislativeVote) {
    router.push({
      pathname: "/vote-detail",
      params: { vote: JSON.stringify(vote) },
    });
  }

  const isFiltered = category !== "all" || activeSearch.length > 0;

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
        <Text style={styles.screenTitle}>{t("Voting Record")}</Text>
        <Text style={styles.screenSubtitle}>{params.name}</Text>
      </LinearGradient>

      <View
        style={[
          styles.filterRow,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <HorizontalScroller contentContainerStyle={styles.filterRowContent}>
          {CATEGORY_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.filterBtn,
                category === f.key && { backgroundColor: colors.accent },
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => setCategory(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: category === f.key ? "#FFF" : colors.mutedForeground },
                ]}
              >
                {t(f.label)}
              </Text>
            </Pressable>
          ))}
        </HorizontalScroller>
        <View style={[styles.searchBox, { backgroundColor: colors.muted }]}>
          <MaterialIcons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={t("Search votes...")}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={onSearchChange}
            autoCorrect={false}
          />
        </View>
      </View>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState
          message={t("Unable to load voting records")}
          onRetry={() => {
            setLoading(true);
            load(1, false).finally(() => setLoading(false));
          }}
        />
      ) : votes.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="how-to-vote" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {emptyMessage(status, isFiltered)}
          </Text>
        </View>
      ) : (
        <FlatList
          data={votes}
          keyExtractor={(item) => item.id}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.voteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openDetail(item)}
            >
              {item.billNumber ? (
                <Text style={[styles.billNumber, { color: colors.accent }]}>{item.billNumber}</Text>
              ) : null}
              <Text style={[styles.billTitle, { color: colors.foreground }]} numberOfLines={2}>
                {item.billTitle ?? item.question ?? t("Vote")}
              </Text>
              <Text style={[styles.voteDate, { color: colors.mutedForeground }]}>
                {formatVoteDate(item.voteDate)}
              </Text>
              <View style={styles.voteRow}>
                <View
                  style={[
                    styles.voteBadge,
                    { backgroundColor: (VOTE_COLORS[item.officialVote] ?? "#6B7A8D") + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.voteBadgeText,
                      { color: VOTE_COLORS[item.officialVote] ?? colors.mutedForeground },
                    ]}
                  >
                    {t("Vote")}: {t(item.officialVote)}
                  </Text>
                </View>
                {item.result ? (
                  <Text
                    style={[styles.resultText, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {t("Result")}: {item.result}
                  </Text>
                ) : null}
              </View>
              <View style={styles.detailLink}>
                <Text style={[styles.detailLinkText, { color: colors.accent }]}>
                  {t("View Details")}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.accent} />
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            loadingMore ? (
              <Text style={[styles.loadingMore, { color: colors.mutedForeground }]}>
                {t("Loading more…")}
              </Text>
            ) : null
          }
        />
      )}
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
  filterRow: { borderBottomWidth: 1, paddingBottom: 10 },
  filterRowContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "web" ? 8 : 2,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  voteCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  billNumber: { fontSize: 13, fontFamily: "Inter_700Bold" },
  billTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  voteDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  voteRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  voteBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  voteBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  resultText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  detailLink: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  detailLinkText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  loadingMore: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
  },
});
