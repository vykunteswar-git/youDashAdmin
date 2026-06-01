export const AUTH_TOKEN_KEY = "youdash_admin_token";
export const AUTH_USER_KEY = "youdash_admin_user";

/** zone_setup stored JWT under these keys — migrate on read. */
const LEGACY_TOKEN_KEYS = ["token", "accessToken", "admin_token"];

function readLegacyToken() {
  for (const key of LEGACY_TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value && value.trim()) {
      localStorage.setItem(AUTH_TOKEN_KEY, value.trim());
      localStorage.removeItem(key);
      return value.trim();
    }
  }
  return null;
}

export function getAuthToken() {
  const stored = localStorage.getItem(AUTH_TOKEN_KEY);
  if (stored && stored.trim()) return stored.trim();
  return readLegacyToken();
}

export function getAuthUser() {
  const value = localStorage.getItem(AUTH_USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function setAuthSession(admin) {
  const token = admin?.token ?? admin?.accessToken;
  if (!token) return;

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      id: admin.id,
      email: admin.email,
    }),
  );
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

/** Bearer header for axios + custom adapters (zone_setup-style). */
export function withAuthHeaders(headers) {
  const token = getAuthToken();
  const base =
    headers && typeof headers.toJSON === "function"
      ? headers.toJSON()
      : { ...(headers || {}) };
  if (token) {
    base.Authorization = `Bearer ${token}`;
  }
  return base;
}
