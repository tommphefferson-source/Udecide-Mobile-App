import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SUBSCRIPTIONS_ENABLED } from "@/config/subscriptions";
import { AddressProvider } from "@/context/AddressContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SubscriptionProvider, useSubscription } from "@/context/SubscriptionContext";
import { completeGoogleWebPopupIfNeeded } from "@/utils/googleWebAuth";

// On web, when this window is the Google OAuth popup returning with a result,
// forward it to the opener and close before booting the rest of the app.
const isGoogleOAuthPopup = completeGoogleWebPopupIfNeeded();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * When subscriptions are enabled, redirect an authenticated user who has no
 * active subscription to the paywall. No-op while the feature is off (access is
 * granted) or before the entitlement state is known, so nothing breaks today.
 */
function useSubscriptionGate() {
  const { isAuthenticated } = useAuth();
  const { ready, hasAppAccess } = useSubscription();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!SUBSCRIPTIONS_ENABLED || !ready || !isAuthenticated) return;
    const top = segments[0] as string | undefined;
    // Don't fight the auth flow or loop on the paywall itself.
    if (top === "(auth)" || top === "paywall") return;
    if (!hasAppAccess) router.replace("/paywall");
  }, [isAuthenticated, ready, hasAppAccess, segments, router]);
}

function RootLayoutNav() {
  const { user } = useAuth();
  useSubscriptionGate();

  return (
    <AddressProvider
      userAddress={
        user
          ? {
              address: user.address,
              city: user.city,
              state: user.state,
              zipCode: user.zipCode,
            }
          : undefined
      }
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="voter-tools" options={{ presentation: "card" }} />
        <Stack.Screen name="parties" options={{ presentation: "card" }} />
        <Stack.Screen name="political-guide" options={{ presentation: "card" }} />
        <Stack.Screen name="civics-quiz" options={{ presentation: "card" }} />
        <Stack.Screen name="issue-questionnaire" options={{ presentation: "card" }} />
        <Stack.Screen name="polls" options={{ presentation: "card" }} />
        <Stack.Screen name="poll-results" options={{ presentation: "card" }} />
        <Stack.Screen name="fact-checker" options={{ presentation: "card" }} />
        <Stack.Screen name="paywall" options={{ presentation: "card", gestureEnabled: false }} />
        <Stack.Screen name="profile" options={{ presentation: "card" }} />
        <Stack.Screen name="address-override" options={{ presentation: "card" }} />
        <Stack.Screen name="article" options={{ presentation: "card" }} />
        <Stack.Screen name="web-view" options={{ presentation: "modal" }} />
        <Stack.Screen name="static-page" options={{ presentation: "card" }} />
      </Stack>
    </AddressProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // This window is the OAuth popup; it has posted its result and is closing.
  if (isGoogleOAuthPopup) return null;

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <RootLayoutNav />
                </SubscriptionProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
