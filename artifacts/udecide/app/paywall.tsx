import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import {
  PACKAGE_PLUS,
  PACKAGE_STANDARD,
  PRIVACY_URL,
  TERMS_URL,
  TIERS,
} from "@/config/subscriptions";
import { useSubscription } from "@/context/SubscriptionContext";
import { useColors } from "@/hooks/useColors";
import { t } from "@/i18n";

/**
 * Two-tier subscription paywall (Standard $1.99 / Plus $3.99 with AI).
 *
 * Reached automatically when an authenticated user has no active subscription
 * (see the gate in app/_layout.tsx), and opened directly with `?focus=ai` from
 * the Fact Checker to steer toward the Plus tier. Prices are shown live from
 * the store via RevenueCat, falling back to the static labels if the offering
 * hasn't loaded.
 */
export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { offering, purchasePackage, restore, purchasing, billingAvailable, hasAppAccess } =
    useSubscription();

  const [selected, setSelected] = useState<string>(
    focus === "ai" ? PACKAGE_PLUS : PACKAGE_STANDARD,
  );

  function priceFor(packageId: string): string | null {
    const pkg = offering?.availablePackages.find((p) => p.identifier === packageId);
    return pkg?.product.priceString ?? null;
  }

  function packageFor(packageId: string): PurchasesPackage | undefined {
    return offering?.availablePackages.find((p) => p.identifier === packageId);
  }

  async function handleSubscribe() {
    const pkg = packageFor(selected);
    if (!pkg) {
      Alert.alert(t("Subscription unavailable"), t("Please try again in a moment."));
      return;
    }
    const res = await purchasePackage(pkg);
    if (res.success) {
      router.replace("/(tabs)");
    } else if (res.error) {
      Alert.alert(t("Purchase failed"), t("Your purchase could not be completed. Please try again."));
    }
  }

  async function handleRestore() {
    const res = await restore();
    if (res.success) {
      Alert.alert(t("Purchases restored"), t("Your subscription has been restored."));
      if (hasAppAccess) router.replace("/(tabs)");
    } else if (res.error) {
      Alert.alert(t("Nothing to restore"), t("We couldn't find an active subscription to restore."));
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {router.canGoBack() && hasAppAccess ? (
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
        ) : null}
        <Text style={styles.screenTitle}>{t("Choose your plan")}</Text>
        <Text style={styles.screenSubtitle}>
          {t("Support nonpartisan civic information and unlock the tools you want.")}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {!billingAvailable ? (
          <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              {t("Subscriptions are managed on the iOS and Android apps.")}
            </Text>
          </View>
        ) : null}

        {TIERS.map((tier) => {
          const isSelected = selected === tier.packageId;
          const price = priceFor(tier.packageId) ?? tier.fallbackPrice;
          return (
            <Pressable
              key={tier.packageId}
              onPress={() => setSelected(tier.packageId)}
              style={[
                styles.tier,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? colors.accent : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <View style={styles.tierHeader}>
                <View style={styles.tierTitleWrap}>
                  <Text style={[styles.tierName, { color: colors.foreground }]}>
                    {t(tier.name)}
                  </Text>
                  {tier.includesAI ? (
                    <View style={[styles.aiBadge, { backgroundColor: colors.accent + "1A" }]}>
                      <MaterialIcons name="auto-awesome" size={12} color={colors.accent} />
                      <Text style={[styles.aiBadgeText, { color: colors.accent }]}>
                        {t("Includes AI")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.priceWrap}>
                  <Text style={[styles.price, { color: colors.foreground }]}>{price}</Text>
                  <Text style={[styles.priceCadence, { color: colors.mutedForeground }]}>
                    {t("/month")}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tierTagline, { color: colors.mutedForeground }]}>
                {t(tier.tagline)}
              </Text>
              <View style={styles.featureList}>
                <Feature label={t("Representatives, elections & legislation")} colors={colors} on />
                <Feature label={t("Voter tools, polls & civic guides")} colors={colors} on />
                <Feature label={t("AI Fact Checker")} colors={colors} on={tier.includesAI} />
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: isSelected ? colors.accent : colors.border },
                ]}
              >
                {isSelected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.cta, { backgroundColor: colors.accent, opacity: purchasing ? 0.7 : 1 }]}
          onPress={handleSubscribe}
          disabled={purchasing || !billingAvailable}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaText}>{t("Subscribe")}</Text>
          )}
        </Pressable>

        <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
          <Text style={[styles.restoreText, { color: colors.accent }]}>
            {t("Restore Purchases")}
          </Text>
        </Pressable>

        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
          {t("Auto-renewing subscription. Payment is charged to your store account and renews monthly until canceled in your account settings. Cancel anytime.")}
        </Text>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[styles.legalLink, { color: colors.accent }]}>{t("Terms of Use")}</Text>
          </Pressable>
          <Text style={{ color: colors.mutedForeground }}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[styles.legalLink, { color: colors.accent }]}>{t("Privacy Policy")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Feature({
  label,
  on,
  colors,
}: {
  label: string;
  on: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.featureRow}>
      <MaterialIcons
        name={on ? "check-circle" : "remove-circle-outline"}
        size={16}
        color={on ? "#2E7D32" : colors.mutedForeground}
      />
      <Text
        style={[
          styles.featureText,
          { color: on ? colors.foreground : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  backBtn: { marginBottom: 8, width: 40 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
  },
  notice: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  tier: { borderRadius: 16, padding: 18, gap: 8 },
  tierHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tierTitleWrap: { gap: 6, flex: 1 },
  tierName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  aiBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  priceWrap: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  price: { fontSize: 22, fontFamily: "Inter_700Bold" },
  priceCadence: { fontSize: 13, fontFamily: "Inter_400Regular" },
  tierTagline: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  featureList: { gap: 6, marginTop: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  radio: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  cta: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ctaText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  restoreBtn: { alignItems: "center", paddingVertical: 8 },
  restoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  legalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    textAlign: "center",
  },
  legalLinks: { flexDirection: "row", justifyContent: "center", gap: 10, alignItems: "center" },
  legalLink: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
