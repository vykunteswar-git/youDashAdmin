import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(null);

function readLoggedIn() {
  return Boolean(
    localStorage.getItem("token") || localStorage.getItem("adminAuthenticated")
  );
}

export function AuthProvider({ children }) {
  const [version, setVersion] = useState(0);

  const notifyAuthChanged = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const isLoggedIn = useMemo(() => {
    void version;
    return readLoggedIn();
  }, [version]);

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
