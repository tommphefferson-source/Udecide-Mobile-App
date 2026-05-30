import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/useColors";

function normalizeUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export default function WebViewScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const webRef = useRef<WebView>(null);

  const rawUrl = typeof params.url === "string" ? params.url : "";
  const title = typeof params.title === "string" ? params.title : "Website";
  const url = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);

  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);

  const isWeb = Platform.OS === "web";

  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const host = useMemo(() => {
    if (!url) return rawUrl;
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }, [url, rawUrl]);

  const openExternally = async () => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      // no-op: external open is best-effort
    }
  };

  const reload = () => {
    setFailed(false);
    setLoading(true);
    webRef.current?.reload();
  };

  const autoOpenedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isWeb || !url) return;
    if (autoOpenedFor.current === url) return;
    autoOpenedFor.current = url;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [isWeb, url]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.header, { paddingTop: topPad + 10 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.host} numberOfLines={1}>
              {host}
            </Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={openExternally}
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

      <View style={styles.webWrap}>
        {!url ? (
          <View style={styles.stateWrap}>
            <MaterialIcons
              name="link-off"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>
              Invalid link
            </Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              This website address could not be opened.
            </Text>
            <Pressable
              style={[styles.stateBtn, { backgroundColor: colors.navy }]}
              onPress={() => router.back()}
            >
              <Text style={styles.stateBtnText}>Go Back</Text>
            </Pressable>
          </View>
        ) : failed ? (
          <View style={styles.stateWrap}>
            <MaterialIcons
              name="error-outline"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>
              Couldn&apos;t load page
            </Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              This site may not allow being viewed inside the app. You can retry
              or open it in your browser.
            </Text>
            <View style={styles.stateBtnRow}>
              <Pressable
                style={[styles.stateBtn, { backgroundColor: colors.muted }]}
                onPress={reload}
              >
                <Text
                  style={[styles.stateBtnText, { color: colors.foreground }]}
                >
                  Retry
                </Text>
              </Pressable>
              <Pressable
                style={[styles.stateBtn, { backgroundColor: colors.navy }]}
                onPress={openExternally}
              >
                <Text style={styles.stateBtnText}>Open in Browser</Text>
              </Pressable>
            </View>
          </View>
        ) : isWeb ? (
          <View style={styles.stateWrap}>
            <MaterialIcons name="open-in-new" size={48} color={colors.navy} />
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>
              Opening in a new tab
            </Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              {host} doesn&apos;t allow being shown inside the app on the web,
              so it opens in a new browser tab. On the mobile app it opens right
              here in-app.
            </Text>
            <View style={styles.stateBtnRow}>
              <Pressable
                style={[styles.stateBtn, { backgroundColor: colors.muted }]}
                onPress={() => router.back()}
              >
                <Text
                  style={[styles.stateBtnText, { color: colors.foreground }]}
                >
                  Go Back
                </Text>
              </Pressable>
              <Pressable
                style={[styles.stateBtn, { backgroundColor: colors.navy }]}
                onPress={openExternally}
              >
                <Text style={styles.stateBtnText}>Open Website</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <WebView
              ref={webRef}
              source={{ uri: url }}
              style={styles.web}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              onHttpError={() => {
                setLoading(false);
                setFailed(true);
              }}
              onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
              startInLoadingState
            />
            {loading && (
              <View
                style={[
                  styles.loadingOverlay,
                  { backgroundColor: colors.background },
                ]}
              >
                <ActivityIndicator size="large" color={colors.navy} />
              </View>
            )}
          </>
        )}
      </View>

      {url && !failed && !isWeb && (
        <View
          style={[
            styles.navBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom || 12,
            },
          ]}
        >
          {!isWeb && (
            <Pressable
              style={styles.navBtn}
              onPress={() => webRef.current?.goBack()}
              disabled={!canGoBack}
              hitSlop={8}
            >
              <MaterialIcons
                name="arrow-back-ios"
                size={20}
                color={canGoBack ? colors.foreground : colors.mutedForeground}
              />
            </Pressable>
          )}
          <Pressable style={styles.navBtn} onPress={reload} hitSlop={8}>
            <MaterialIcons name="refresh" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 12, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1, alignItems: "center" },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  host: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  webWrap: { flex: 1 },
  web: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  stateTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 6 },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  stateBtnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  stateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  stateBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 48,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  navBtn: {
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
