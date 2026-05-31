import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useColors } from "@/hooks/useColors";
import { US_STATES } from "@/utils/constants";
import { validateName, validateRequired, validateState, validateZipCode } from "@/utils/validation";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, updateProfile, uploadProfilePhoto, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [zipCode, setZipCode] = useState(user?.zipCode ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    const firstErr = validateName(firstName);
    const lastErr = validateName(lastName);
    const addrErr = validateRequired(address, "Address");
    const cityErr = validateRequired(city, "City");
    const stateErr = validateState(state);
    const zipErr = validateZipCode(zipCode);
    if (firstErr) newErrors.firstName = firstErr;
    if (lastErr) newErrors.lastName = lastErr;
    if (addrErr) newErrors.address = addrErr;
    if (cityErr) newErrors.city = cityErr;
    if (stateErr) newErrors.state = stateErr;
    if (zipErr) newErrors.zipCode = zipErr;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSaving(true);
    const result = await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address,
      city,
      state: state.toUpperCase(),
      zipCode,
    });
    setSaving(false);
    if (!result.success) {
      setErrors({ general: result.error ?? "Unable to save your profile. Please try again." });
      return;
    }
    setEditing(false);
  }

  async function handlePickPhoto() {
    if (photoUploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrors({ general: "Photo library access is needed to choose a profile photo." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setErrors({});
    setLocalPhotoUri(asset.uri);
    setPhotoUploading(true);
    const name = asset.fileName ?? asset.uri.split("/").pop() ?? "profile.jpg";
    const type = asset.mimeType ?? "image/jpeg";
    const res = await uploadProfilePhoto({ uri: asset.uri, name, type });
    setPhotoUploading(false);
    if (!res.success) {
      setLocalPhotoUri(null);
      setErrors({ general: res.error ?? "Unable to upload your photo. Please try again." });
    }
  }

  const displayPhoto = localPhotoUri ?? (user?.profileImage || null);
  const stateName = US_STATES.find((s) => s.code === user?.state)?.name ?? user?.state ?? "Not set";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.navy, colors.navyLight]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrap} onPress={handlePickPhoto} disabled={photoUploading}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>{user?.firstName?.charAt(0)?.toUpperCase() ?? "U"}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {photoUploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <MaterialIcons name="photo-camera" size={16} color="#FFF" />
              )}
            </View>
          </Pressable>
          <Text style={styles.userName}>{`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ""}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPad }}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account Information</Text>
            {!editing && (
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => setEditing(true)}>
                <MaterialIcons name="edit" size={20} color={colors.accent} />
              </Pressable>
            )}
          </View>

          {editing ? (
            <View style={styles.editForm}>
              {errors.general ? (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={16} color="#C41E3A" />
                  <Text style={styles.errorBannerText}>{errors.general}</Text>
                </View>
              ) : null}
              {[
                { label: "First Name", key: "firstName", value: firstName, onChangeText: setFirstName, icon: "person" },
                { label: "Last Name", key: "lastName", value: lastName, onChangeText: setLastName, icon: "person-outline" },
                { label: "Street Address", key: "address", value: address, onChangeText: setAddress, icon: "home" },
                { label: "City", key: "city", value: city, onChangeText: setCity, icon: "location-city" },
                { label: "State (2-letter)", key: "state", value: state, onChangeText: (v: string) => setState(v.toUpperCase()), icon: "flag", maxLength: 2 },
                { label: "ZIP Code", key: "zipCode", value: zipCode, onChangeText: setZipCode, icon: "markunread-mailbox", keyboardType: "numeric" as const },
              ].map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                  <View style={[styles.inputWrap, errors[f.key] ? styles.inputError : { borderColor: colors.border }]}>
                    <MaterialIcons name={f.icon as never} size={16} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
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
              <View style={styles.editActions}>
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => { setEditing(false); setErrors({}); }}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.accent, opacity: pressed || saving ? 0.85 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.profileFields}>
              {[
                { label: "First Name", value: user?.firstName || "Not set", icon: "person" },
                { label: "Last Name", value: user?.lastName || "Not set", icon: "person-outline" },
                { label: "Email", value: user?.email, icon: "email" },
                { label: "Address", value: user?.address || "Not set", icon: "home" },
                { label: "City", value: user?.city || "Not set", icon: "location-city" },
                { label: "State", value: stateName, icon: "flag" },
                { label: "ZIP Code", value: user?.zipCode || "Not set", icon: "markunread-mailbox" },
              ].map((f, i, arr) => (
                <View
                  key={f.label}
                  style={[
                    styles.profileField,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <MaterialIcons name={f.icon as never} size={16} color={colors.mutedForeground} />
                  <View style={styles.profileFieldText}>
                    <Text style={[styles.profileFieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                    <Text style={[styles.profileFieldValue, { color: colors.foreground }]}>{f.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.overrideBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push("/address-override" as never)}
        >
          <View style={[styles.overrideBtnIcon, { backgroundColor: colors.accent + "20" }]}>
            <MaterialIcons name="location-on" size={20} color={colors.accent} />
          </View>
          <View style={styles.overrideBtnText}>
            <Text style={[styles.overrideBtnTitle, { color: colors.foreground }]}>Address Override</Text>
            <Text style={[styles.overrideBtnSubtitle, { color: colors.mutedForeground }]}>View political data for another location</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, { backgroundColor: "#C41E3A10", borderColor: "#C41E3A30", opacity: pressed ? 0.8 : 1 }]}
          onPress={async () => { await logout(); router.replace("/(auth)/login"); }}
        >
          <MaterialIcons name="logout" size={20} color="#C41E3A" />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  backBtn: { alignSelf: "flex-start" },
  avatarSection: { alignItems: "center", gap: 8 },
  avatarWrap: { position: "relative" },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFF" },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileFields: {},
  profileField: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14 },
  profileFieldText: { flex: 1 },
  profileFieldLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  profileFieldValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  editForm: { padding: 16, gap: 12, paddingTop: 0 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  inputError: { borderColor: "#C41E3A" },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#C41E3A" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C41E3A15",
    borderRadius: 10,
    padding: 12,
  },
  errorBannerText: { color: "#C41E3A", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  overrideBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  overrideBtnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  overrideBtnText: { flex: 1 },
  overrideBtnTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  overrideBtnSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, padding: 14,
  },
  logoutBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#C41E3A" },
});
