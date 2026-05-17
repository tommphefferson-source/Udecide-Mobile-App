import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { MOCK_POLITICAL_GUIDE } from "@/services/mockData";
import type { PoliticalGuideItem } from "@/types/politics";

export default function PoliticalGuideScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [selectedItem, setSelectedItem] = useState<PoliticalGuideItem | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  if (selectedItem) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
          <Pressable style={styles.backBtn} onPress={() => setSelectedItem(null)}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.screenTitle}>{selectedItem.title}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomPad }}>
          <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.contentText, { color: colors.foreground }]}>{selectedItem.content}</Text>
          </View>
          <View style={[styles.sourceCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>
              This educational content is based on official U.S. government sources and nonpartisan civic education materials.
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
        <Text style={styles.screenTitle}>Political System Guide</Text>
        <Text style={styles.screenSubtitle}>Nonpartisan civic education</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}>
        {MOCK_POLITICAL_GUIDE.map((section) => (
          <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <View style={[styles.sectionIcon, { backgroundColor: colors.navy + "20" }]}>
                <MaterialIcons name={section.icon as never} size={22} color={colors.navy} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
              <MaterialIcons
                name={expandedSection === section.id ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={22}
                color={colors.mutedForeground}
              />
            </Pressable>

            {expandedSection === section.id && (
              <View style={[styles.itemsList, { borderTopColor: colors.border }]}>
                {section.items.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.itemRow,
                      { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : "transparent" },
                    ]}
                    onPress={() => setSelectedItem(item)}
                  >
                    <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <MaterialIcons name="chevron-right" size={18} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  itemsList: { borderTopWidth: 1 },
  itemRow: {
    flexDirection: "row", alignItems: "center",
    padding: 14, paddingLeft: 20,
    borderBottomWidth: 1,
  },
  itemTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  contentCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  contentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  sourceCard: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  sourceText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
