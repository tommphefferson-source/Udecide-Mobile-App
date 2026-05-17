import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { AddressOverride } from "@/types/user";

interface AddressContextValue {
  override: AddressOverride;
  effectiveAddress: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  setOverride: (override: Omit<AddressOverride, "active">) => Promise<void>;
  clearOverride: () => Promise<void>;
  isOverrideActive: boolean;
}

const AddressContext = createContext<AddressContextValue | null>(null);
const OVERRIDE_KEY = "@udecide_address_override";

const DEFAULT_OVERRIDE: AddressOverride = {
  active: false,
  address: "",
  city: "",
  state: "",
  zipCode: "",
};

interface AddressProviderProps {
  children: React.ReactNode;
  userAddress?: { address: string; city: string; state: string; zipCode: string };
}

export function AddressProvider({ children, userAddress }: AddressProviderProps) {
  const [override, setOverrideState] = useState<AddressOverride>(DEFAULT_OVERRIDE);

  useEffect(() => {
    loadOverride();
  }, []);

  async function loadOverride() {
    try {
      const stored = await AsyncStorage.getItem(OVERRIDE_KEY);
      if (stored) setOverrideState(JSON.parse(stored));
    } catch {
      // ignore
    }
  }

  const setOverride = useCallback(async (data: Omit<AddressOverride, "active">) => {
    const newOverride: AddressOverride = { ...data, active: true };
    setOverrideState(newOverride);
    await AsyncStorage.setItem(OVERRIDE_KEY, JSON.stringify(newOverride));
  }, []);

  const clearOverride = useCallback(async () => {
    setOverrideState(DEFAULT_OVERRIDE);
    await AsyncStorage.removeItem(OVERRIDE_KEY);
  }, []);

  const effectiveAddress = override.active
    ? { address: override.address, city: override.city, state: override.state, zipCode: override.zipCode }
    : {
        address: userAddress?.address ?? "",
        city: userAddress?.city ?? "",
        state: userAddress?.state ?? "CA",
        zipCode: userAddress?.zipCode ?? "",
      };

  return (
    <AddressContext.Provider
      value={{
        override,
        effectiveAddress,
        setOverride,
        clearOverride,
        isOverrideActive: override.active,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddress must be used within AddressProvider");
  return ctx;
}
