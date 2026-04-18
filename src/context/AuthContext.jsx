import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

const AuthContext = createContext(null);

/** Matches apiService: token, accessToken, or legacy adminAuthenticated flag */
export function readLoggedIn() {
  return Boolean(
    localStorage.getItem("token")?.trim() ||
      localStorage.getItem("accessToken")?.trim() ||
      localStorage.getItem("adminAuthenticated")
  );
}

const authListeners = new Set();

function subscribeAuth(onStoreChange) {
  authListeners.add(onStoreChange);
  return () => {
    authListeners.delete(onStoreChange);
  };
}

/** Notify all `useSyncExternalStore` subscribers (synchronous with React’s rules). */
function emitAuthChange() {
  for (const fn of authListeners) {
    fn();
  }
}

export function AuthProvider({ children }) {
  const isLoggedIn = useSyncExternalStore(
    subscribeAuth,
    readLoggedIn,
    readLoggedIn
  );

  const notifyAuthChanged = useCallback(() => {
    emitAuthChange();
  }, []);

  const value = useMemo(
    () => ({ isLoggedIn, notifyAuthChanged }),
    [isLoggedIn, notifyAuthChanged]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
