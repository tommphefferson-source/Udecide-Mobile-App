import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validateRequired,
  validateZipCode,
} from "@/utils/validation";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleRegister() {
    const firstErr = validateName(firstName);
    const lastErr = validateName(lastName);
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirmPassword);
    const cityErr = validateRequired(city, "City");
    const zipErr = validateZipCode(zipCode);

    const newErrors: Record<string, string> = {};
    if (firstErr) newErrors.firstName = firstErr;
    if (lastErr) newErrors.lastName = lastErr;
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;
    if (confirmErr) newErrors.confirmPassword = confirmErr;
    if (cityErr) newErrors.city = cityErr;
    if (zipErr) newErrors.zipCode = zipErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await register(firstName.trim(), lastName.trim(), email.trim(), password, city.trim(), zipCode.trim());
    setLoading(false);
    if (!result.success) {
      setErrors({ general: result.error ?? "Registration failed" });
    } else {
      router.replace("/(auth)/profile-setup");
    }
  }

  function Field({
    label,
    value,
    onChangeText,
    icon,
    placeholder,
    secureTextEntry,
    keyboardType,
    errorKey,
    rightAction,
    maxLength,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    icon: string;
    placeholder: string;
    secureTextEntry?: boolean;
    keyboardType?: "email-address" | "default" | "numeric";
    errorKey: string;
    rightAction?: React.ReactNode;
    maxLength?: number;
  }) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputWrap, errors[errorKey] ? styles.inputError : null]}>
          <MaterialIcons name={icon as never} size={18} color="#6B7A8D" />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#8892A0"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType ?? "default"}
            autoCapitalize={keyboardType === "email-address" || keyboardType === "numeric" ? "none" : "words"}
            autoCorrect={false}
            maxLength={maxLength}
          />
          {rightAction}
        </View>
        {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
      </View>
    );
  }

  return (
    <LinearGradient colors={["#1F3E63", "#2A4E7A", "#355F8E"]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>

          <View style={styles.header}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join UDecide to access voter tools and political information</Text>
          </View>

          <View style={styles.card}>
            {errors.general ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={16} color="#C41E3A" />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <Field
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              icon="person"
              placeholder="Jane"
              errorKey="firstName"
            />
            <Field
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              icon="person-outline"
              placeholder="Smith"
              errorKey="lastName"
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              icon="email"
              placeholder="your@email.com"
              keyboardType="email-address"
              errorKey="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              icon="lock"
              placeholder="Min. 8 characters"
              secureTextEntry={!showPassword}
              errorKey="password"
              rightAction={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={18} color="#6B7A8D" />
                </Pressable>
              }
            />
            <Field
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon="lock-outline"
              placeholder="Re-enter password"
              secureTextEntry={!showPassword}
              errorKey="confirmPassword"
            />
            <Field
              label="City"
              value={city}
              onChangeText={setCity}
              icon="location-city"
              placeholder="Your city"
              errorKey="city"
            />
            <Field
              label="ZIP Code"
              value={zipCode}
              onChangeText={setZipCode}
              icon="markunread-mailbox"
              placeholder="12345"
              keyboardType="numeric"
              maxLength={10}
              errorKey="zipCode"
            />

            <Pressable
              style={({ pressed }) => [styles.registerBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Already have an account?</Text>
              <Pressable onPress={() => router.replace("/(auth)/login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: { padding: 24, gap: 20 },
  backBtn: {
    alignSelf: "flex-start",
    padding: 4,
  },
  header: { gap: 8, alignItems: "center" },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
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
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#1F3E63",
  },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#C41E3A" },
  registerBtn: {
    backgroundColor: "#C41E3A",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 4,
  },
  registerBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  loginPrompt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7A8D" },
  loginLink: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#C41E3A" },
});
