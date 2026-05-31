import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { login as apiLogin, signup as apiSignup, type AuthUser } from "@/services/authApi";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  user: UserProfile | null;
  authToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string,
    city: string,
    zipCode: string
  ) => Promise<{ success: boolean; error?: string }>;
  setupProfile: (profile: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "@udecide_user";
const AUTH_TOKEN_KEY = "@udecide_auth_token";

/** Map the legacy auth payload into the app's local UserProfile shape. */
function toUserProfile(u: AuthUser): UserProfile {
  return {
    id: u.userId,
    fullName: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email.toLowerCase(),
    address: "",
    city: u.city,
    state: u.state,
    zipCode: u.zipCode,
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const [stored, token] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
      ]);
      if (stored) setUser(JSON.parse(stored));
      if (token) setAuthToken(token);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { authToken: token, user: legacyUser } = await apiLogin(email.trim(), password);
        const userProfile = toUserProfile(legacyUser);
        setUser(userProfile);
        setAuthToken(token);
        await AsyncStorage.multiSet([
          [STORAGE_KEY, JSON.stringify(userProfile)],
          [STORAGE_KEY + "_" + userProfile.id, JSON.stringify(userProfile)],
          [AUTH_TOKEN_KEY, token],
        ]);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unable to sign in. Please try again.",
        };
      }
    },
    []
  );

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      city: string,
      zipCode: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const parts = fullName.trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ") || firstName;
        // state_id "0" is the legacy placeholder for the simplified signup path.
        const { authToken: token, user: legacyUser } = await apiSignup({
          firstName,
          lastName,
          email: email.trim(),
          password,
          stateId: "0",
          city: city.trim(),
          zipCode: zipCode.trim(),
        });
        const userProfile = toUserProfile(legacyUser);
        setUser(userProfile);
        setAuthToken(token);
        await AsyncStorage.multiSet([
          [STORAGE_KEY, JSON.stringify(userProfile)],
          [STORAGE_KEY + "_" + userProfile.id, JSON.stringify(userProfile)],
          [AUTH_TOKEN_KEY, token],
        ]);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unable to create account. Please try again.",
        };
      }
    },
    []
  );

  const setupProfile = useCallback(async (profile: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...profile };
    setUser(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(
      STORAGE_KEY + "_" + user.id,
      JSON.stringify(updated)
    );
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(
      STORAGE_KEY + "_" + user.id,
      JSON.stringify(updated)
    );
  }, [user]);

  const logout = useCallback(async () => {
    const keys = [STORAGE_KEY, AUTH_TOKEN_KEY];
    if (user) keys.push(STORAGE_KEY + "_" + user.id);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove(keys);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authToken,
        isLoading,
        isAuthenticated: !!user && !!authToken,
        login,
        register,
        setupProfile,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
