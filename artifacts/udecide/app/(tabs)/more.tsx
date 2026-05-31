import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const MORE_SECTIONS = [
  {
    title: "Voter Tools",
    items: [
      { label: "Voter Status Tools", icon: "how-to-vote", route: "/voter-tools", color: "#C41E3A" },
      { label: "Address Override", icon: "location-on", route: "/address-override", color: "#E65100" },
    ],
  },
  {
    title: "Political Information",
    items: [
      { label: "Political Parties", icon: "flag", route: "/parties", color: "#1A4A8A" },
      { label: "Political System Guide", icon: "account-balance", route: "/political-guide", color: "#D4AF37" },
      { label: "Issue Questionnaire", icon: "ballot", route: "/issue-questionnaire", color: "#5E35B1" },
      { label: "Political Polls", icon: "poll", route: "/polls", color: "#7B1FA2" },
    ],
  },
  {
    title: "AI & Fact Checking",
    items: [
      { label: "Gemini Fact Checker", icon: "fact-check", route: "/fact-checker", color: "#00695C" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", icon: "account-circle", route: "/profile", color: "#1F3E63" },
    ],
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { logout } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.screenTitle}>More</Text>
        <Text style={styles.screenSubtitle}>Tools, guides, and settings</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {MORE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title.toUpperCase()}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.menuItem,
                    idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    { backgroundColor: pressed ? colors.muted : "transparent" },
                  ]}
                  onPress={() => router.push(item.route as never)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + "20" }]}>
                    <MaterialIcons name={item.icon as never} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: pressed ? "#C41E3A10" : "transparent" },
            ]}
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#C41E3A20" }]}>
              <MaterialIcons name="logout" size={20} color="#C41E3A" />
            </View>
            <Text style={[styles.menuLabel, { color: "#C41E3A" }]}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={[styles.neutralityCard, { backgroundColor: colors.navy + "10", borderColor: colors.border }]}>
          <MaterialIcons name="balance" size={20} color={colors.navy} />
          <Text style={[styles.neutralityText, { color: colors.mutedForeground }]}>
            UDecide is committed to political neutrality. We do not endorse or rank any candidate, party, or policy. Information is sourced from official government records and labeled by source.
          </Text>
        </View>

        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>UDecide v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  section: { gap: 6 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  neutralityCard: {
    flexDirection: "row", gap: 10, padding: 14,
    borderRadius: 14, borderWidth: 1, alignItems: "flex-start",
  },
  neutralityText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  versionText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
