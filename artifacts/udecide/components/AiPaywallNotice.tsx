import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { t } from "@/i18n";

/**
 * Shown in place of the Fact Checker chat when the user is on the Standard
 * tier (no `ai_access`). Routes to the paywall pre-focused on the Plus tier.
 */
export function AiPaywallNotice() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        {router.canGoBack() ? (
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
        ) : null}
        <Text style={styles.screenTitle}>{t("Fact Checker")}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + "1A" }]}>
          <MaterialIcons name="auto-awesome" size={40} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("Unlock the AI Fact Checker")}
        </Text>
        <Text style={[styles.text, { color: colors.mutedForeground }]}>
          {t("The nonpartisan AI Fact Checker is part of UDecide Plus. Upgrade to ask questions, fact-check claims, and summarize legislation.")}
        </Text>
        <Pressable
          style={[styles.cta, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/paywall?focus=ai")}
        >
          <Text style={styles.ctaText}>{t("Upgrade to Plus")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { marginBottom: 8, width: 40 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  text: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  cta: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  ctaText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
