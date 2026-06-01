export const AUTH_TOKEN_KEY = "youdash_admin_token";
export const AUTH_USER_KEY = "youdash_admin_user";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
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
  if (!admin?.token) return;

  localStorage.setItem(AUTH_TOKEN_KEY, admin.token);
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
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
