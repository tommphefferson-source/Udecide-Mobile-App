import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getNews, type NewsArticle, type NewsFeed } from "@/services/newsApi";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NewsCard() {
  const colors = useColors();
  const { authToken } = useAuth();
  const [feed, setFeed] = useState<NewsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setFeed(await getNews(authToken));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function openArticle(article: Pick<NewsArticle, "url" | "title">) {
    router.push({
      pathname: "/web-view",
      params: { url: article.url, title: article.title },
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: "#1A4A8A20" }]}>
          <MaterialIcons name="newspaper" size={18} color="#1A4A8A" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>Political News</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {feed?.source ? `Nonpartisan • ${feed.source}` : "Nonpartisan updates"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <Pressable style={styles.stateBox} onPress={() => void load()}>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            Couldn&apos;t load news. Tap to retry.
          </Text>
        </Pressable>
      ) : feed && feed.articles.length === 0 && feed.newsUrl ? (
        <Pressable
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => openArticle({ url: feed.newsUrl, title: "Political News" })}
        >
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>
              Read the latest political news
            </Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
              {feed.source || "Open in app"}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      ) : !feed || feed.articles.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            No news available right now.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {feed.articles.slice(0, 3).map((article, i) => (
            <Pressable
              key={article.id}
              style={({ pressed }) => [
                styles.row,
                {
                  borderTopColor: colors.border,
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
              onPress={() => openArticle(article)}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {article.title}
                </Text>
                <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                  {article.source}
                  {formatDate(article.publishedAt) ? ` • ${formatDate(article.publishedAt)}` : ""}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stateBox: { paddingVertical: 20, alignItems: "center", justifyContent: "center" },
  stateText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  list: { gap: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  rowMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
