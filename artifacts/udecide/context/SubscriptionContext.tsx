import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

import {
  ENTITLEMENT_AI,
  ENTITLEMENT_APP,
  OFFERING_ID,
  SUBSCRIPTIONS_ENABLED,
  revenueCatApiKey,
} from "@/config/subscriptions";
import { useAuth } from "@/context/AuthContext";
import { setRevenueCatUserId } from "@/services/session";

/**
 * Subscription state backed by RevenueCat.
 *
 * Behavior by mode:
 *  - Feature OFF (SUBSCRIPTIONS_ENABLED=false): everything is granted, so the
 *    app works exactly as before. This is the default until store setup is done.
 *  - Feature ON, unsupported platform (web) or no SDK key: access is granted
 *    too — billing can't be enforced off-device, and iOS/Android are the only
 *    shipping targets. The paywall screen shows an explanatory note there.
 *  - Feature ON, iOS/Android with a key: real entitlements from RevenueCat gate
 *    the app (`app_access`) and the Fact Checker (`ai_access`).
 */
interface SubscriptionContextValue {
  /** True once the entitlement state is known (or immediately when OFF). */
  ready: boolean;
  /** Can use the app at all (either tier). */
  hasAppAccess: boolean;
  /** Can use the AI Fact Checker (Plus tier). */
  hasAiAccess: boolean;
  /** Whether the paywall can actually transact here (native + key + ON). */
  billingAvailable: boolean;
  offering: PurchasesOffering | null;
  purchasing: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const GRANT_ALL: Pick<SubscriptionContextValue, "hasAppAccess" | "hasAiAccess"> = {
  hasAppAccess: true,
  hasAiAccess: true,
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const apiKey = revenueCatApiKey();
  const billingAvailable = SUBSCRIPTIONS_ENABLED && apiKey !== null;

  const [ready, setReady] = useState(!SUBSCRIPTIONS_ENABLED || !billingAvailable);
  const [access, setAccess] = useState(
    !billingAvailable ? GRANT_ALL : { hasAppAccess: false, hasAiAccess: false },
  );
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const configured = useRef(false);

  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    const active = info.entitlements.active;
    setAccess({
      hasAppAccess: !!active[ENTITLEMENT_APP],
      hasAiAccess: !!active[ENTITLEMENT_AI],
    });
  }, []);

  // Configure the SDK once, when billing is available.
  useEffect(() => {
    if (!billingAvailable || !apiKey || configured.current) return;
    try {
      Purchases.configure({ apiKey });
      configured.current = true;
      Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    } catch {
      // If configuration throws, leave `ready` false; refresh() will retry.
    }
  }, [billingAvailable, apiKey, applyCustomerInfo]);

  // Identify the subscriber to RevenueCat as the app's user id, and mirror it
  // for the Fact Checker client → server entitlement check.
  useEffect(() => {
    if (!billingAvailable) {
      setRevenueCatUserId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (isAuthenticated && user?.id) {
          const { customerInfo } = await Purchases.logIn(user.id);
          if (!cancelled) {
            applyCustomerInfo(customerInfo);
            setRevenueCatUserId(user.id);
          }
        } else {
          await Purchases.logOut().catch(() => {});
          setRevenueCatUserId(null);
        }
      } catch {
        /* handled by refresh */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billingAvailable, isAuthenticated, user?.id, applyCustomerInfo]);

  // Load the offering (tiers + live localized prices) for the paywall.
  useEffect(() => {
    if (!billingAvailable) return;
    let cancelled = false;
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const chosen = offerings.all[OFFERING_ID] ?? offerings.current ?? null;
        if (!cancelled) setOffering(chosen);
      } catch {
        if (!cancelled) setOffering(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billingAvailable]);

  const refresh = useCallback(async () => {
    if (!billingAvailable) return;
    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, [billingAvailable, applyCustomerInfo]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
      if (!billingAvailable) return { success: false, error: "unavailable" };
      setPurchasing(true);
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        applyCustomerInfo(customerInfo);
        return { success: true };
      } catch (e) {
        const err = e as { userCancelled?: boolean; message?: string };
        if (err?.userCancelled) return { success: false };
        return { success: false, error: err?.message ?? "purchase_failed" };
      } finally {
        setPurchasing(false);
      }
    },
    [billingAvailable, applyCustomerInfo],
  );

  const restore = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!billingAvailable) return { success: false, error: "unavailable" };
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as { message?: string })?.message ?? "restore_failed" };
    }
  }, [billingAvailable, applyCustomerInfo]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      ready,
      hasAppAccess: access.hasAppAccess,
      hasAiAccess: access.hasAiAccess,
      billingAvailable,
      offering,
      purchasing,
      purchasePackage,
      restore,
      refresh,
    }),
    [ready, access, billingAvailable, offering, purchasing, purchasePackage, restore, refresh],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
