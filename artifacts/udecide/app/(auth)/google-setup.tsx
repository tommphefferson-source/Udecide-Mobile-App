import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { validateRequired, validateZipCode } from "@/utils/validation";

/**
 * Second step of Google sign-in for a verified identity that isn't linked to an
 * account yet. The OAuth callback hands back a single-use registration ticket
 * (`code`); here we collect the minimum the legacy backend requires (city + ZIP)
 * to create the account, then route into profile setup to finish the address —
 * mirroring the email/password signup flow.
 */
export default function GoogleSetupScreen() {
  const insets = useSafeAreaInsets();
  const { registerWithGoogleCode } = useAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleContinue() {
    if (!code) {
      setErrors({ general: "This sign-in link has expired. Please try signing in again." });
      return;
    }
    const cityErr = validateRequired(city, "City");
    const zipErr = validateZipCode(zipCode);
    const newErrors: Record<string, string> = {};
    if (cityErr) newErrors.city = cityErr;
    if (zipErr) newErrors.zipCode = zipErr;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await registerWithGoogleCode(code, city, zipCode);
    setLoading(false);
    if (!result.success) {
      setErrors({ general: result.error ?? "Unable to create account. Please try again." });
      return;
    }
    // Account created and signed in; finish collecting the full address.
    router.replace("/(auth)/profile-setup");
  }

  return (
    <LinearGradient colors={["#1F3E63", "#2A4E7A", "#355F8E"]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.stepIcon}>
              <MaterialIcons name="person-add" size={28} color="#C41E3A" />
            </View>
            <Text style={styles.title}>Almost There</Text>
            <Text style={styles.subtitle}>
              We just need a couple of details to finish setting up your account.
            </Text>
          </View>

          <View style={styles.card}>
            {errors.general ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={18} color="#C41E3A" />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>City</Text>
              <View style={[styles.inputWrap, errors.city ? styles.inputError : null]}>
                <MaterialIcons name="location-city" size={18} color="#6B7A8D" />
                <TextInput
                  style={styles.input}
                  placeholder="Your city"
                  placeholderTextColor="#8892A0"
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                />
              </View>
              {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ZIP Code</Text>
              <View style={[styles.inputWrap, errors.zipCode ? styles.inputError : null]}>
                <MaterialIcons name="markunread-mailbox" size={18} color="#6B7A8D" />
                <TextInput
                  style={styles.input}
                  placeholder="90210"
                  placeholderTextColor="#8892A0"
                  value={zipCode}
                  onChangeText={setZipCode}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              {errors.zipCode ? <Text style={styles.errorText}>{errors.zipCode}</Text> : null}
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Continue</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <Text style={styles.privacyNote}>
            Account creation can take a few seconds. Your information is used only to provide
            relevant political information.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: { padding: 24, gap: 24, alignItems: "center" },
  header: { alignItems: "center", gap: 8 },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(196,30,58,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196,30,58,0.3)",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
  card: { width: "100%", backgroundColor: "#FFF", borderRadius: 24, padding: 24, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1F3E63" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#DDE1E7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F5F6F8",
  },
  inputError: { borderColor: "#C41E3A" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1F3E63" },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#C41E3A" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C41E3A15",
    borderRadius: 10,
    padding: 12,
  },
  errorBannerText: { color: "#C41E3A", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  saveBtn: {
    backgroundColor: "#C41E3A",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 4,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  cancelBtn: { alignItems: "center", paddingVertical: 4 },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7A8D" },
  privacyNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    fontStyle: "italic",
  },
});
