import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import { validateRequired, validateState, validateZipCode } from "@/utils/validation";

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { setupProfile } = useAuth();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSave() {
    const addrErr = validateRequired(address, "Address");
    const cityErr = validateRequired(city, "City");
    const stateErr = validateState(state);
    const zipErr = validateZipCode(zipCode);
    const newErrors: Record<string, string> = {};
    if (addrErr) newErrors.address = addrErr;
    if (cityErr) newErrors.city = cityErr;
    if (stateErr) newErrors.state = stateErr;
    if (zipErr) newErrors.zipCode = zipErr;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    await setupProfile({ address, city, state: state.toUpperCase(), zipCode });
    setLoading(false);
    router.replace("/(tabs)");
  }

  async function handleSkip() {
    await setupProfile({ address: "", city: "", state: "CA", zipCode: "" });
    router.replace("/(tabs)");
  }

  return (
    <LinearGradient colors={["#0D1B2A", "#1B2D45", "#243A56"]} style={styles.gradient}>
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
              <MaterialIcons name="location-on" size={28} color="#C41E3A" />
            </View>
            <Text style={styles.title}>Your Location</Text>
            <Text style={styles.subtitle}>
              Set your address to see local representatives, elections, and voting information. You can change this anytime.
            </Text>
          </View>

          <View style={styles.card}>
            {[
              { label: "Street Address", key: "address", value: address, onChangeText: setAddress, placeholder: "123 Main Street", icon: "home" },
              { label: "City", key: "city", value: city, onChangeText: setCity, placeholder: "Your city", icon: "location-city" },
              { label: "State (2-letter code)", key: "state", value: state, onChangeText: (v: string) => setState(v.toUpperCase()), placeholder: "CA", icon: "flag" },
              { label: "ZIP Code", key: "zipCode", value: zipCode, onChangeText: setZipCode, placeholder: "90210", icon: "markunread-mailbox", keyboardType: "numeric" as const },
            ].map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <View style={[styles.inputWrap, errors[f.key] ? styles.inputError : null]}>
                  <MaterialIcons name={f.icon as never} size={18} color="#6B7A8D" />
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor="#8892A0"
                    value={f.value}
                    onChangeText={f.onChangeText}
                    autoCapitalize={f.key === "state" ? "characters" : "words"}
                    maxLength={f.key === "state" ? 2 : f.key === "zipCode" ? 5 : undefined}
                    keyboardType={f.keyboardType ?? "default"}
                  />
                </View>
                {errors[f.key] ? <Text style={styles.errorText}>{errors[f.key]}</Text> : null}
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save & Continue</Text>}
            </Pressable>

            <Pressable style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          <Text style={styles.privacyNote}>
            Your address is stored locally on your device and is used only to provide relevant political information.
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
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(196,30,58,0.15)",
    alignItems: "center", justifyContent: "center", borderWidth: 1,
    borderColor: "rgba(196,30,58,0.3)",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 20 },
  card: { width: "100%", backgroundColor: "#FFF", borderRadius: 24, padding: 24, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0D1B2A" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: "#DDE1E7", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#F5F6F8",
  },
  inputError: { borderColor: "#C41E3A" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#0D1B2A" },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#C41E3A" },
  saveBtn: { backgroundColor: "#C41E3A", borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", minHeight: 50, marginTop: 4 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  skipBtn: { alignItems: "center", paddingVertical: 4 },
  skipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7A8D" },
  privacyNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", textAlign: "center", fontStyle: "italic" },
});
