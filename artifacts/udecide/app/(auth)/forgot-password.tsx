import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { validateEmail } from "@/utils/validation";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    const err = validateEmail(email);
    if (err) { setError(err); return; }
    setError("");
    setSubmitted(true);
  }

  return (
    <LinearGradient colors={["#1F3E63", "#2A4E7A", "#355F8E"]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send instructions to reset your password.
            </Text>
          </View>

          <View style={styles.card}>
            {submitted ? (
              <View style={styles.successState}>
                <View style={styles.successIcon}>
                  <MaterialIcons name="check-circle" size={48} color="#2E7D32" />
                </View>
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successText}>
                  If an account exists for {email}, you'll receive password reset instructions shortly.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.backToLoginBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => router.replace("/(auth)/login")}
                >
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={[styles.inputWrap, error ? styles.inputError : null]}>
                    <MaterialIcons name="email" size={18} color="#6B7A8D" />
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#8892A0"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitText}>Send Reset Instructions</Text>
                </Pressable>

                <Pressable style={styles.backLink} onPress={() => router.back()}>
                  <Text style={styles.backLinkText}>Back to Sign In</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: { padding: 24, gap: 24 },
  backBtn: { alignSelf: "flex-start", padding: 4 },
  header: { gap: 6 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", lineHeight: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, gap: 16 },
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
  submitBtn: {
    backgroundColor: "#C41E3A",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  backLink: { alignItems: "center" },
  backLinkText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7A8D" },
  successState: { alignItems: "center", gap: 12, paddingVertical: 16 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#2E7D3215",
    alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1F3E63" },
  successText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7A8D", textAlign: "center", lineHeight: 20 },
  backToLoginBtn: {
    backgroundColor: "#C41E3A",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  backToLoginText: { color: "#FFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
