import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AddressProvider } from "@/context/AddressContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user } = useAuth();

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
        <Stack.Screen name="fact-checker" options={{ presentation: "card" }} />
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

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
