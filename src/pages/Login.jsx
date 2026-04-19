import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Lock,
  Mail,
  Shield,
  Truck,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/apiService";
import logo from "../assets/logo.png";

function getTokenFromLoginResponse(data) {
  if (data == null) return null;
  if (typeof data === "string") {
    const s = data.trim();
    return s.length > 0 ? s : null;
  }
  if (typeof data !== "object") return null;

  const pick = (obj) => {
    if (obj == null || typeof obj !== "object") return null;
    const v =
      obj.token ??
      obj.accessToken ??
      obj.access_token ??
      obj.jwt ??
      obj.bearerToken ??
      obj.authorization;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  return (
    pick(data) ??
    pick(data.data) ??
    (typeof data.data === "string" && data.data.trim()
      ? data.data.trim()
      : null) ??
    pick(data.result) ??
    null
  );
}

function getErrorMessage(error) {
  const d = error?.response?.data;
  if (typeof d === "string") return d;
  if (d && typeof d === "object") {
    if (
      d.success === false &&
      typeof d.message === "string" &&
      d.message.trim()
    ) {
      return d.message.trim();
    }
    return (
      d.message ??
      d.error ??
      d.detail ??
      (Array.isArray(d.errors) ? d.errors.join(", ") : null) ??
      error.message
    );
  }
  return error?.message || "Sign in failed. Please try again.";
}

function getApiFailureMessage(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.success !== false) return null;
  const msg = payload.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return "Sign in failed. Please try again.";
}

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const snackbarTimerRef = useRef(null);
  const navigate = useNavigate();
  const { notifyAuthChanged } = useAuth();

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    };
  }, []);

  const showSnackbar = (message) => {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar({ open: true, message });
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbar({ open: false, message: "" });
      snackbarTimerRef.current = null;
    }, 5000);
  };

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await authService.login({
        email: credentials.email.trim(),
        password: credentials.password,
      });
      const payload = response.data;
      const failureMsg = getApiFailureMessage(payload);
      if (failureMsg) {
        showSnackbar(failureMsg);
        return;
      }
      const token = getTokenFromLoginResponse(payload);
      if (token) {
        localStorage.setItem("token", token);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("adminAuthenticated");
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.setItem("adminAuthenticated", "1");
        showSnackbar(
          "Sign-in succeeded but no auth token was found in the response. Protected APIs will return 401 until the server returns a JWT.",
        );
      }
      notifyAuthChanged();
      window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 0);
    } catch (error) {
      showSnackbar(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column flex-lg-row overflow-hidden">
      {/* Brand column — desktop */}
      <aside
        className="d-none d-lg-flex flex-column justify-content-between position-relative text-white px-5 py-5"
        style={{
          flex: "0 0 44%",
          maxWidth: 560,
          minHeight: "100vh",
          background:
            "linear-gradient(165deg, #0f172a 0%, #1e293b 42%, #0c1222 100%)",
        }}
      >
        <div
          className="position-absolute inset-0 opacity-25"
          style={{
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            pointerEvents: "none",
          }}
          aria-hidden
        />
        <div
          className="position-absolute rounded-circle opacity-40"
          style={{
            width: 320,
            height: 320,
            background: "#E51818",
            filter: "blur(80px)",
            top: "-10%",
            right: "-20%",
            pointerEvents: "none",
          }}
          aria-hidden
        />

        <div className="position-relative" style={{ zIndex: 1 }}>
          <div className="d-flex align-items-center gap-3 mb-5">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center shadow-lg"
              style={{
                width: 56,
                height: 56,
                background: "linear-gradient(135deg, #E51818 0%, #b91212 100%)",
                boxShadow: "0 12px 32px rgba(229, 24, 24, 0.45)",
              }}
            >
              <Package className="text-white" size={28} strokeWidth={2} />
            </div>
            <div>
              <div className="fw-bold fs-3 tracking-tight">YouDash</div>
              <div className="small text-white opacity-75 d-flex align-items-center gap-1">
                <Sparkles size={14} className="text-warning" />
                Admin console
              </div>
            </div>
          </div>

          <h2
            className="fw-bold display-6 mb-3"
            style={{ lineHeight: 1.15, letterSpacing: "-0.02em" }}
          >
            Run operations with clarity.
          </h2>
          <p
            className="text-white opacity-75 lead mb-5"
            style={{ fontSize: "1.05rem" }}
          >
            Live orders, fleet, payouts, and promos — one secure workspace for
            your team.
          </p>

          <div className="d-flex flex-column gap-3">
            <div
              className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 small fw-semibold text-white opacity-90"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Truck
                size={18}
                className="flex-shrink-0"
                style={{ color: "#fb7185" }}
              />
              Dispatch &amp; rider coverage
            </div>
            <div
              className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 small fw-semibold text-white opacity-90"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <BarChart3
                size={18}
                className="flex-shrink-0"
                style={{ color: "#38bdf8" }}
              />
              Revenue, SLAs, and reports
            </div>
            <div
              className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 small fw-semibold text-white opacity-90"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Shield
                size={18}
                className="flex-shrink-0"
                style={{ color: "#4ade80" }}
              />
              Role-based access &amp; audit-ready
            </div>
          </div>
        </div>

        <div
          className="position-relative small text-white opacity-75"
          style={{ zIndex: 1 }}
        >
          <div className="d-flex align-items-center gap-2 mb-2">
            <img
              src={logo}
              alt="YouDash Express"
              style={{ height: 28, opacity: 0.9 }}
            />
            <span>YouDash Express</span>
          </div>
          <span className="opacity-75">
            © {new Date().getFullYear()} · Internal use only
          </span>
        </div>
      </aside>

      {/* Form area — slate + red wash (ties to left panel, softer than flat white) */}
      <main
        className="yd-login-shell flex-grow-1 d-flex flex-column min-vh-100 position-relative"
        style={{
          background:
            "radial-gradient(ellipse 100% 85% at 0% 25%, rgba(229, 24, 24, 0.14), transparent 52%), radial-gradient(ellipse 90% 75% at 100% 0%, rgba(15, 23, 42, 0.11), transparent 50%), radial-gradient(ellipse 75% 55% at 70% 100%, rgba(30, 41, 59, 0.09), transparent 50%), linear-gradient(158deg, #e2e8f0 0%, #e8edf4 28%, #f1f5f9 58%, #f8fafc 100%)",
        }}
      >
        {/* Mobile brand strip */}
        <div
          className="d-lg-none d-flex align-items-center gap-3 px-4 py-3 border-bottom shadow-sm"
          style={{ backgroundColor: "#0f172a" }}
        >
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "#E51818", width: 40, height: 40 }}
          >
            <Package className="text-white" size={20} />
          </div>
          <div className="text-white">
            <div className="fw-bold">YouDash</div>
            <div className="small text-white opacity-75">Admin</div>
          </div>
        </div>

        <div className="flex-grow-1 d-flex align-items-center justify-content-center p-3 p-md-4 py-lg-5">
          <div className="w-100" style={{ maxWidth: 420 }}>
            <div
              className="rounded-4 position-relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, #ffffff 45%, #f8fafc 100%)",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                boxShadow:
                  "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 24px 48px -12px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
              }}
            >
              <div
                className="position-absolute top-0 start-0 end-0"
                style={{
                  height: 4,
                  background: "linear-gradient(90deg, #E51818, #f97316)",
                }}
                aria-hidden
              />
              <div className="p-4 p-md-5 pt-4">
                <p
                  className="text-uppercase small fw-bold text-danger mb-1 letter-spacing-wide"
                  style={{ fontSize: "11px", letterSpacing: "0.12em" }}
                >
                  Welcome back
                </p>
                <h1 className="fw-bold text-dark mb-2 h2">
                  Sign in to continue
                </h1>
                <p className="text-muted mb-4 pb-2 border-bottom small">
                  Enter the credentials You will land on the dashboard.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary mb-1">
                      Work email
                    </label>
                    <div className="position-relative">
                      <Mail
                        size={18}
                        className="position-absolute text-muted"
                        style={{
                          left: 16,
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="email"
                        name="email"
                        value={credentials.email}
                        onChange={handleChange}
                        placeholder="name@company.com"
                        required
                        autoComplete="email"
                        className="form-control py-3 ps-5 rounded-3 yd-login-input"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold small text-secondary mb-1">
                      Password
                    </label>
                    <div className="position-relative">
                      <Lock
                        size={18}
                        className="position-absolute text-muted"
                        style={{
                          left: 16,
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="password"
                        name="password"
                        value={credentials.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className="form-control py-3 ps-5 rounded-3 yd-login-input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn w-100 fw-bold text-white border-0 rounded-3 py-3 position-relative overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, #E51818 0%, #c41414 100%)",
                      boxShadow: "0 10px 28px rgba(229, 24, 24, 0.35)",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    disabled={submitting}
                    onMouseEnter={(e) => {
                      if (submitting) return;
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 14px 36px rgba(229, 24, 24, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow =
                        "0 10px 28px rgba(229, 24, 24, 0.35)";
                    }}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />
                        Signing in…
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>

                  <p className="text-center text-muted small mt-4 mb-0 px-1">
                    Protected session · JWT from your Spring admin API ·{" "}
                    <span className="text-secondary">
                      keep this device trusted
                    </span>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {snackbar.open ? (
        <div
          className="position-fixed start-50 translate-middle-x px-3"
          style={{
            bottom: "24px",
            zIndex: 13000,
            maxWidth: "min(420px, calc(100% - 24px))",
          }}
          aria-live="assertive"
        >
          <div
            role="alert"
            className="rounded-3 shadow-lg border-0 px-4 py-3 text-white"
            style={{
              background: "linear-gradient(135deg, #b91c1c 0%, #E51818 100%)",
            }}
          >
            <div className="d-flex align-items-start gap-2">
              <span className="fw-semibold flex-shrink-0" aria-hidden="true">
                !
              </span>
              <span className="small">{snackbar.message}</span>
              <button
                type="button"
                className="btn btn-link btn-sm text-white text-decoration-none p-0 ms-auto flex-shrink-0"
                style={{ lineHeight: 1 }}
                onClick={() => {
                  if (snackbarTimerRef.current)
                    clearTimeout(snackbarTimerRef.current);
                  setSnackbar({ open: false, message: "" });
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Login;
