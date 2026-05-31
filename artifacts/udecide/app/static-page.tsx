import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getStaticPage } from "@/services/pagesApi";

/**
 * Decode the common named/numeric HTML entities that appear in the legacy CMS
 * content. Kept small and dependency-free on purpose.
 */
function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&hellip;/gi, "\u2026")
    .replace(/&rsquo;/gi, "\u2019")
    .replace(/&lsquo;/gi, "\u2018")
    .replace(/&ldquo;/gi, "\u201C")
    .replace(/&rdquo;/gi, "\u201D")
    .replace(/&#(\d+);/g, (match, code: string) => {
      const n = Number(code);
      // Guard against out-of-range code points, which throw a RangeError.
      if (!Number.isInteger(n) || n < 0 || n > 0x10ffff) return match;
      try {
        return String.fromCodePoint(n);
      } catch {
        return match;
      }
    });
}

interface Block {
  type: "heading" | "bullet" | "paragraph";
  text: string;
}

/**
 * Convert the legacy HTML page into an ordered list of simple text blocks
 * (headings, bullets, paragraphs). This avoids pulling in an HTML renderer
 * (which would need a Metro restart) and renders identically on web + native.
 */
function htmlToBlocks(html: string): Block[] {
  if (!html) return [];
  // Normalize line breaks and list items into block delimiters.
  let s = html
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*(br)\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n\u2022 ")
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|ul|ol|tr|table|section|header)\s*>/gi, "\n\n");

  // Mark headings so we can style them after stripping tags.
  s = s.replace(/<\s*h[1-6][^>]*>/gi, "\n\n\u0001");

  // Drop all remaining tags.
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);

  return s
    .split(/\n{2,}/)
    .map((chunk) => chunk.replace(/[ \t]+/g, " ").trim())
    .filter((chunk) => chunk.length > 0)
    .map<Block>((chunk) => {
      if (chunk.startsWith("\u0001")) {
        return { type: "heading", text: chunk.slice(1).trim() };
      }
      if (chunk.startsWith("\u2022")) {
        return { type: "bullet", text: chunk.replace(/^\u2022\s*/, "").trim() };
      }
      return { type: "paragraph", text: chunk };
    });
}

export default function StaticPageScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ code?: string; title?: string }>();

  const code = typeof params.code === "string" ? params.code : "";
  const fallbackTitle = typeof params.title === "string" ? params.title : "";

  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["static-page", code],
    queryFn: () => getStaticPage(code),
    enabled: code.length > 0,
  });

  const blocks = useMemo(
    () => htmlToBlocks(data?.contentHtml ?? ""),
    [data?.contentHtml]
  );
  const headerTitle = data?.title || fallbackTitle || "Information";

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
          <Text style={styles.title} numberOfLines={1}>
            {headerTitle}
          </Text>
          <View style={styles.iconBtn} />
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      ) : isError || !code ? (
        <View style={styles.stateWrap}>
          <MaterialIcons name="error-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>
            Couldn&apos;t load this page
          </Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            Please check your connection and try again.
          </Text>
          {code ? (
            <Pressable
              style={[styles.stateBtn, { backgroundColor: colors.navy }]}
              onPress={() => refetch()}
            >
              <Text style={styles.stateBtnText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomPad, gap: 12 }}>
          {blocks.map((block, i) => {
            if (block.type === "heading") {
              return (
                <Text key={i} style={[styles.heading, { color: colors.foreground }]}>
                  {block.text}
                </Text>
              );
            }
            if (block.type === "bullet") {
              return (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: colors.accent }]}>{"\u2022"}</Text>
                  <Text style={[styles.body, { color: colors.foreground, flex: 1 }]}>
                    {block.text}
                  </Text>
                </View>
              );
            }
            return (
              <Text key={i} style={[styles.body, { color: colors.foreground }]}>
                {block.text}
              </Text>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 12, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  heading: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 8 },
  body: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  bulletRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  bulletDot: { fontSize: 15, lineHeight: 23 },
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 6 },
  stateText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  stateBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  stateBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
