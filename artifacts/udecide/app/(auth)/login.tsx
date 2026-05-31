import { MaterialIcons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { googleStartUrl } from "@/services/authApi";
import { validateEmail, validatePassword } from "@/utils/validation";

// Completes the OAuth redirect when the auth browser returns to the app.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, signInWithGoogleCode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setErrors({});
    setGoogleLoading(true);
    try {
      // The server drives the OAuth handshake; we only open the browser and
      // wait for it to redirect back to this deep link with a one-time code.
      const returnUri = makeRedirectUri({ scheme: "udecide" });
      const result = await WebBrowser.openAuthSessionAsync(
        googleStartUrl(returnUri),
        returnUri
      );
      if (result.type !== "success" || !result.url) {
        // User dismissed/cancelled the browser, or it failed to open.
        return;
      }
      const { queryParams } = Linking.parse(result.url);
      const status = queryParams?.status;
      const code = queryParams?.code;
      if (status !== "success" || typeof code !== "string") {
        const message =
          typeof queryParams?.message === "string"
            ? "Google sign-in was not completed."
            : "Google sign-in failed. Please try again.";
        setErrors({ general: message });
        return;
      }
      const session = await signInWithGoogleCode(code);
      if (!session.success) {
        setErrors({ general: session.error });
      } else {
        router.replace("/(tabs)");
      }
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Google sign-in failed. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      setErrors({ email: emailErr ?? undefined, password: passErr ?? undefined });
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setErrors({ general: result.error });
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <LinearGradient colors={["#2A405E", "#2A405E"]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            {errors.general ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={16} color="#C41E3A" />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrap, errors.email ? styles.inputError : null]}>
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
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, errors.password ? styles.inputError : null]}>
                <MaterialIcons name="lock" size={18} color="#6B7A8D" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#8892A0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={18}
                    color="#6B7A8D"
                  />
                </Pressable>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <Pressable
              style={styles.forgotLink}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.loginBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialBtn,
                  { opacity: pressed || googleLoading ? 0.7 : 1 },
                ]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                  <>
                    <MaterialIcons name="g-mobiledata" size={22} color="#4285F4" />
                    <Text style={styles.socialText}>Google</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have an account?</Text>
              <Pressable onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.registerLink}>Create Account</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.neutralityNote}>
            UDecide is nonpartisan and does not endorse any candidate or party.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: {
    padding: 24,
    gap: 24,
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 240,
    height: 240,
    marginBottom: 4,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1F3E63",
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C41E3A15",
    borderRadius: 10,
    padding: 12,
  },
  errorBannerText: {
    color: "#C41E3A",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#1F3E63",
  },
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
  inputError: {
    borderColor: "#C41E3A",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#1F3E63",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#C41E3A",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#C41E3A",
  },
  loginBtn: {
    backgroundColor: "#C41E3A",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  loginBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDE1E7",
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B7A8D",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#DDE1E7",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "#F5F6F8",
  },
  socialText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1F3E63",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  registerPrompt: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7A8D",
  },
  registerLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#C41E3A",
  },
  neutralityNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    fontStyle: "italic",
  },
});
