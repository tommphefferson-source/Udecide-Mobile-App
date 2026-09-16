import { t } from "@/i18n";

export function validateEmail(email: string): string | null {
  if (!email.trim()) return t("Email is required");
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return t("Please enter a valid email address");
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return t("Password is required");
  if (password.length < 8) return t("Password must be at least 8 characters");
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) return t("Please confirm your password");
  if (password !== confirmPassword) return t("Passwords do not match");
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return t("Full name is required");
  if (name.trim().length < 2) return t("Name must be at least 2 characters");
  return null;
}

export function validateZipCode(zip: string): string | null {
  if (!zip.trim()) return t("ZIP code is required");
  if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) return t("Enter a valid ZIP code");
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  // Translate the field name too (callers pass English names like "City").
  if (!value.trim()) return `${t(fieldName)} ${t("is required")}`;
  return null;
}

export function validateState(state: string): string | null {
  if (!state.trim()) return t("State is required");
  if (state.length !== 2) return t("Enter a valid state abbreviation");
  return null;
}
