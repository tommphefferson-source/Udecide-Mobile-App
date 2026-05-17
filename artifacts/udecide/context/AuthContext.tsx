import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  setupProfile: (profile: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "@udecide_user";
const CREDENTIALS_KEY = "@udecide_credentials";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
        const credentials: Record<string, { password: string; userId: string }> = stored
          ? JSON.parse(stored)
          : {};

        const cred = credentials[email.toLowerCase()];
        if (!cred || cred.password !== password) {
          return { success: false, error: "Invalid email or password" };
        }

        const userStored = await AsyncStorage.getItem(STORAGE_KEY + "_" + cred.userId);
        if (!userStored) return { success: false, error: "Account not found" };

        const userProfile: UserProfile = JSON.parse(userStored);
        setUser(userProfile);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
        return { success: true };
      } catch {
        return { success: false, error: "An error occurred. Please try again." };
      }
    },
    []
  );

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
        const credentials: Record<string, { password: string; userId: string }> = stored
          ? JSON.parse(stored)
          : {};

        if (credentials[email.toLowerCase()]) {
          return { success: false, error: "An account with this email already exists" };
        }

        const userId =
          Date.now().toString() + Math.random().toString(36).substring(2, 9);
        const newUser: UserProfile = {
          id: userId,
          fullName,
          email: email.toLowerCase(),
          address: "",
          city: "",
          state: "",
          zipCode: "",
          createdAt: new Date().toISOString(),
        };

        credentials[email.toLowerCase()] = { password, userId };
        await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
        await AsyncStorage.setItem(
          STORAGE_KEY + "_" + userId,
          JSON.stringify(newUser)
        );
        setUser(newUser);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        return { success: true };
      } catch {
        return { success: false, error: "An error occurred. Please try again." };
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
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
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
