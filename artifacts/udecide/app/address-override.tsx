import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

import { useAddress } from "@/context/AddressContext";
import { useColors } from "@/hooks/useColors";
import { validateRequired, validateState, validateZipCode } from "@/utils/validation";

export default function AddressOverrideScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { override, setOverride, clearOverride, isOverrideActive } = useAddress();

  const [address, setAddress] = useState(override.address);
  const [city, setCity] = useState(override.city);
  const [state, setState] = useState(override.state);
  const [zipCode, setZipCode] = useState(override.zipCode);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  async function handleApply() {
    const newErrors: Record<string, string> = {};
    const addrErr = validateRequired(address, "Address");
    const cityErr = validateRequired(city, "City");
    const stateErr = validateState(state);
    const zipErr = validateZipCode(zipCode);
    if (addrErr) newErrors.address = addrErr;
    if (cityErr) newErrors.city = cityErr;
    if (stateErr) newErrors.state = stateErr;
    if (zipErr) newErrors.zipCode = zipErr;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    await setOverride({ address, city, state: state.toUpperCase(), zipCode });
    router.back();
  }

  async function handleClear() {
    await clearOverride();
    router.back();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.screenTitle}>Address Override</Text>
        <Text style={styles.screenSubtitle}>
          View political data for a different location without changing your profile
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPad }}>
          {isOverrideActive && (
            <View style={[styles.activeCard, { backgroundColor: colors.gold + "20", borderColor: colors.gold + "50" }]}>
              <MaterialIcons name="location-on" size={18} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeTitle, { color: colors.foreground }]}>Override Active</Text>
                <Text style={[styles.activeText, { color: colors.mutedForeground }]}>
                  Currently viewing: {[override.city, override.state].filter(Boolean).join(", ")}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.clearBtn, { backgroundColor: "#C41E3A20", opacity: pressed ? 0.7 : 1 }]}
                onPress={handleClear}
              >
                <Text style={styles.clearBtnText}>Reset</Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Use address override to explore representatives, elections, and legislation from any U.S. location.
              A banner will display while override is active. Your profile address is unchanged.
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Set Override Location</Text>
            {[
              { label: "Street Address", key: "address", value: address, onChangeText: setAddress, icon: "home", placeholder: "123 Main Street" },
              { label: "City", key: "city", value: city, onChangeText: setCity, icon: "location-city", placeholder: "Washington" },
              { label: "State (2-letter)", key: "state", value: state, onChangeText: (v: string) => setState(v.toUpperCase()), icon: "flag", placeholder: "DC", maxLength: 2 },
              { label: "ZIP Code", key: "zipCode", value: zipCode, onChangeText: setZipCode, icon: "markunread-mailbox", placeholder: "20001", keyboardType: "numeric" as const },
            ].map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{f.label}</Text>
                <View style={[styles.inputWrap, errors[f.key] ? styles.inputError : { borderColor: colors.border }]}>
                  <MaterialIcons name={f.icon as never} size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={f.value}
                    onChangeText={f.onChangeText}
                    maxLength={f.maxLength}
                    autoCapitalize={f.key === "state" ? "characters" : "words"}
                    keyboardType={f.keyboardType ?? "default"}
                  />
                </View>
                {errors[f.key] ? <Text style={styles.errorText}>{errors[f.key]}</Text> : null}
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [styles.applyBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleApply}
            >
              <MaterialIcons name="location-on" size={18} color="#FFF" />
              <Text style={styles.applyBtnText}>Apply Override</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  backBtn: { marginBottom: 8 },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  activeCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  activeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  activeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#C41E3A" },
  infoCard: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  formTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  field: { gap: 4 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  inputError: { borderColor: "#C41E3A" },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#C41E3A" },
  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, padding: 14, marginTop: 4,
  },
  applyBtnText: { color: "#FFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
