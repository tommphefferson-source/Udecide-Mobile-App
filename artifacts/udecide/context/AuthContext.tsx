import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  login as apiLogin,
  signup as apiSignup,
  updateProfile as apiUpdateProfile,
  type AuthUser,
} from "@/services/authApi";
import {
  setSessionToken,
  setUnauthorizedHandler,
} from "@/services/session";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  user: UserProfile | null;
  authToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    city: string,
    zipCode: string
  ) => Promise<{ success: boolean; error?: string }>;
  setupProfile: (profile: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "@udecide_user";
const AUTH_TOKEN_KEY = "@udecide_auth_token";

/** Map the legacy auth payload into the app's local UserProfile shape. */
function toUserProfile(u: AuthUser): UserProfile {
  return {
    id: u.userId,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email.toLowerCase(),
    address: u.address,
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
      if (token) {
        setAuthToken(token);
        // Mirror the persisted auth_token into the session store so the API
        // client can attach the AUTHTOKEN header immediately on app launch.
        setSessionToken(token);
      }
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
        // auth_token (returned by login/signup) becomes the AUTHTOKEN header
        // value for subsequent authenticated requests.
        setSessionToken(token);
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
      firstName: string,
      lastName: string,
      email: string,
      password: string,
      city: string,
      zipCode: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // state_id "0" is the legacy placeholder for the simplified signup path;
        // the real state is sent right after, from the profile-setup step.
        const { authToken: token, user: legacyUser } = await apiSignup({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          stateId: "0",
          city: city.trim(),
          zipCode: zipCode.trim(),
        });
        const userProfile = toUserProfile(legacyUser);
        setUser(userProfile);
        setAuthToken(token);
        // auth_token (returned by login/signup) becomes the AUTHTOKEN header
        // value for subsequent authenticated requests.
        setSessionToken(token);
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

  /**
   * Push a profile change to the backend (legacy /edit_profile) and persist the
   * authoritative response locally. The server returns the canonical user
   * (e.g. 2-letter state derived from the saved state id), so we store that
   * rather than the optimistic local merge.
   */
  const persistProfile = useCallback(
    async (changes: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "You must be signed in to save your profile." };
      const merged = { ...user, ...changes };
      // Optimistic update so the UI reflects the change immediately.
      setUser(merged);

      try {
        const { user: legacyUser } = await apiUpdateProfile({
          firstName: merged.firstName,
          lastName: merged.lastName,
          address: merged.address,
          city: merged.city,
          state: merged.state,
          zipCode: merged.zipCode,
        });
        // Adopt the server's canonical fields (e.g. 2-letter state derived from
        // the saved state id); preserve the original createdAt.
        const toStore = { ...toUserProfile(legacyUser), createdAt: user.createdAt };
        setUser(toStore);
        await AsyncStorage.multiSet([
          [STORAGE_KEY, JSON.stringify(toStore)],
          [STORAGE_KEY + "_" + user.id, JSON.stringify(toStore)],
        ]);
        return { success: true };
      } catch (err) {
        // The backend rejected the change: roll back the optimistic update so
        // local state never diverges from what the server actually stored.
        setUser(user);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unable to save your profile. Please try again.",
        };
      }
    },
    [user]
  );

  const setupProfile = useCallback(
    (profile: Partial<UserProfile>) => persistProfile(profile),
    [persistProfile]
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => persistProfile(updates),
    [persistProfile]
  );

  const logout = useCallback(async () => {
    const keys = [STORAGE_KEY, AUTH_TOKEN_KEY];
    if (user) keys.push(STORAGE_KEY + "_" + user.id);
    setUser(null);
    setAuthToken(null);
    setSessionToken(null);
    await AsyncStorage.multiRemove(keys);
  }, [user]);

  // Centralized session-expiry handling: when any authenticated request is
  // rejected (missing/expired/invalid AUTHTOKEN), the API client invokes this
  // handler to clear the session and route the user back to login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
      router.replace("/(auth)/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

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
