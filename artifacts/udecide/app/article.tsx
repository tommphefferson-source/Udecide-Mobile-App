import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function ArticleScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{
    title?: string;
    source?: string;
    author?: string;
    publishedAt?: string;
    content?: string;
    imageUrl?: string;
    url?: string;
  }>();

  const title = paramString(params.title) || "Article";
  const source = paramString(params.source);
  const author = paramString(params.author);
  const publishedAt = paramString(params.publishedAt);
  const content = paramString(params.content);
  const imageUrl = paramString(params.imageUrl);
  const url = paramString(params.url);

  const paragraphs = useMemo(
    () => content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [content],
  );

  const dateLabel = formatDate(publishedAt);
  const metaParts = [author, source, dateLabel].filter(Boolean);

  function openOriginal() {
    if (!url) return;
    router.push({ pathname: "/web-view", params: { url, title } });
  }

  const topPad = insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 10 }]}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {source || "Political News"}
          </Text>
          <Pressable
            style={styles.iconBtn}
            onPress={openOriginal}
            hitSlop={8}
            disabled={!url}
          >
            <MaterialIcons
              name="open-in-new"
              size={22}
              color={url ? "#FFF" : "rgba(255,255,255,0.4)"}
            />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: (insets.bottom || 16) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.hero} resizeMode="cover" />
        ) : null}

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

          {metaParts.length > 0 ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {metaParts.join("  •  ")}
            </Text>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <Text key={i} style={[styles.paragraph, { color: colors.foreground }]}>
                {p}
              </Text>
            ))
          ) : (
            <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
              The full text of this article isn&apos;t available here. Open the
              original story to read more.
            </Text>
          )}

          {url ? (
            <Pressable
              style={({ pressed }) => [
                styles.readMore,
                { backgroundColor: colors.navy, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={openOriginal}
            >
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.readMoreText}>
                Read full story{source ? ` on ${source}` : ""}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 12, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  scroll: { paddingBottom: 32 },
  hero: { width: "100%", height: 220, backgroundColor: "#00000010" },
  body: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 31 },
  meta: { fontSize: 13, fontFamily: "Inter_500Medium" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  paragraph: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26 },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  readMoreText: { color: "#FFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
