const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export function stripPhoneDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

/** Normalize optional +91 / 91 prefix to a 10-digit Indian mobile string. */
export function normalizeIndianMobile(value = "") {
  const digits = stripPhoneDigits(value);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isValidIndianMobile(value = "") {
  return INDIAN_MOBILE_RE.test(normalizeIndianMobile(value));
}

export function indianMobileError(value = "", { required = false } = {}) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return required ? "Phone number is required" : "";
  }
  if (!isValidIndianMobile(trimmed)) {
    return "Enter a valid 10-digit Indian mobile number (starts with 6–9)";
  }
  return "";
}
