import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddressOverrideBanner } from "@/components/AddressOverrideBanner";
import { CardButton } from "@/components/CardButton";
import { NewsCard } from "@/components/NewsCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const DASHBOARD_CARDS = [
  { title: "Voter Status Tools", subtitle: "Registration, polling, ID", icon: "how-to-vote", route: "/voter-tools", color: "#C41E3A" },
  { title: "Representatives", subtitle: "Your elected officials", icon: "people", route: "/(tabs)/representatives", color: "#1A4A8A" },
  { title: "Elections & Ballots", subtitle: "Candidates and ballot info", icon: "ballot", route: "/(tabs)/elections", color: "#2E7D32" },
  { title: "Political Guide", subtitle: "Government education", icon: "account-balance", route: "/political-guide", color: "#D4AF37" },
  { title: "Civics 101 Quiz", subtitle: "Test your knowledge", icon: "quiz", route: "/civics-quiz", color: "#3949AB" },
  { title: "Political Polls", subtitle: "Community insights", icon: "poll", route: "/polls", color: "#7B1FA2" },
  { title: "Legislation Tracker", subtitle: "Bills and laws", icon: "gavel", route: "/(tabs)/legislation", color: "#E65100" },
  { title: "Fact Checker", subtitle: "AI-powered analysis", icon: "fact-check", route: "/fact-checker", color: "#00695C" },
  { title: "Political Parties", subtitle: "Party information", icon: "flag", route: "/parties", color: "#C41E3A" },
] as const;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 110 : insets.bottom + 120;

  const rawFirstName = user?.firstName || "Voter";
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
    : "Voter";

  // Pick the greeting based on the device's local hour.
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.brandText}>
              <Text style={styles.greeting}>{timeGreeting}, {firstName}</Text>
              <Text style={styles.headerSubtitle}>Political & Voter App</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.profileBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push("/profile" as never)}
          >
            <MaterialIcons name="account-circle" size={36} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        <AddressOverrideBanner />

        <View style={styles.overrideRow}>
          <Pressable
            style={({ pressed }) => [
              styles.overrideChip,
              { opacity: pressed ? 0.7 : 1, backgroundColor: "rgba(255,255,255,0.12)" },
            ]}
            onPress={() => router.push("/address-override" as never)}
          >
            <MaterialIcons name="location-on" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.overrideChipText}>
              {user?.state ? `Viewing: ${user.city || user.state}` : "Set your location"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.neutralityChip,
              { opacity: pressed ? 0.7 : 1, backgroundColor: "rgba(196,30,58,0.2)" },
            ]}
            onPress={() => {}}
          >
            <MaterialIcons name="balance" size={13} color="#C41E3A" />
            <Text style={styles.neutralityChipText}>Nonpartisan</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <NewsCard />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Access</Text>

        <View style={styles.grid}>
          {DASHBOARD_CARDS.map((card) => (
            <CardButton
              key={card.title}
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
              accentColor={card.color}
              onPress={() => router.push(card.route as never)}
            />
          ))}
        </View>

        <View style={[styles.disclaimerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="info-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
            UDecide presents factual, nonpartisan information sourced from official government
            records. We do not endorse any candidate, party, or policy. Always verify election
            information with your official state election office.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 84,
    height: 84,
  },
  brandText: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.92)",
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  profileBtn: {
    marginTop: 4,
  },
  overrideRow: {
    flexDirection: "row",
    gap: 8,
  },
  overrideChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  overrideChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  neutralityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  neutralityChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#C41E3A",
  },
  scroll: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  disclaimerCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
