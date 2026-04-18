import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    (typeof data.data === "string" && data.data.trim() ? data.data.trim() : null) ??
    pick(data.result) ??
    null
  );
}

function getErrorMessage(error) {
  const d = error?.response?.data;
  if (typeof d === "string") return d;
  if (d && typeof d === "object") {
    if (d.success === false && typeof d.message === "string" && d.message.trim()) {
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
          "Sign-in succeeded but no auth token was found in the response. Protected APIs will return 401 until the server returns a JWT."
        );
      }
      notifyAuthChanged();
      // Defer navigation so useSyncExternalStore + route guards see updated localStorage
      // before /dashboard is evaluated (avoids bounce back to /login).
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
    <div
      className="position-relative d-flex justify-content-center align-items-center min-vh-100 py-4 px-3"
      style={{
        background: "linear-gradient(135deg, #071b3f 0%, #0f4c81 100%)",
      }}
    >
      <div
        className="card shadow-lg border-0 overflow-hidden w-100"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          maxWidth: "980px",
        }}
      >
        <div className="row g-0">
          <div
            className="col-12 col-lg-6 d-none d-lg-flex position-relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(7,27,63,1) 0%, rgba(15,76,129,1) 70%, rgba(0,180,216,0.9) 140%)",
              minHeight: "560px",
            }}
          >
            <div className="p-5 text-white w-100">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <img
                    src={logo}
                    alt="YouDash Express"
                    style={{
                      width: "28px",
                      height: "28px",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div>
                  <div className="fw-bold" style={{ letterSpacing: "0.3px" }}>
                    YouDash Express
                  </div>
                  <div style={{ opacity: 0.85, fontSize: "0.95rem" }}>
                    Admin Console
                  </div>
                </div>
              </div>

              <h2 className="fw-bold mb-3" style={{ lineHeight: 1.15 }}>
                Manage deliveries, riders, and payments—securely.
              </h2>
              <p className="mb-4" style={{ opacity: 0.9 }}>
                Sign in to access operations dashboards, order monitoring, and
                reporting.
              </p>

              <div
                className="rounded-4 p-4"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <svg
                  viewBox="0 0 520 280"
                  width="100%"
                  height="220"
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="ydWave" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
                    </linearGradient>
                    <linearGradient id="ydAccent" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgba(0,180,216,0.95)" />
                      <stop offset="100%" stopColor="rgba(0,123,255,0.90)" />
                    </linearGradient>
                    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow
                        dx="0"
                        dy="12"
                        stdDeviation="14"
                        floodColor="rgba(0,0,0,0.28)"
                      />
                    </filter>
                  </defs>

                  <path
                    d="M0,175 C70,120 140,210 210,165 C280,120 350,210 420,165 C470,132 495,140 520,150 L520,280 L0,280 Z"
                    fill="rgba(255,255,255,0.10)"
                  />
                  <path
                    d="M0,150 C80,95 160,195 240,145 C320,95 400,190 520,120 L520,280 L0,280 Z"
                    fill="rgba(255,255,255,0.08)"
                  />

                  <g filter="url(#softShadow)">
                    <rect
                      x="56"
                      y="48"
                      width="408"
                      height="156"
                      rx="18"
                      fill="rgba(255,255,255,0.16)"
                      stroke="rgba(255,255,255,0.22)"
                    />
                    <rect
                      x="84"
                      y="78"
                      width="240"
                      height="10"
                      rx="5"
                      fill="url(#ydWave)"
                      opacity="0.85"
                    />
                    <rect
                      x="84"
                      y="104"
                      width="320"
                      height="10"
                      rx="5"
                      fill="rgba(255,255,255,0.55)"
                      opacity="0.55"
                    />
                    <rect
                      x="84"
                      y="130"
                      width="288"
                      height="10"
                      rx="5"
                      fill="rgba(255,255,255,0.55)"
                      opacity="0.45"
                    />
                    <rect
                      x="84"
                      y="156"
                      width="210"
                      height="10"
                      rx="5"
                      fill="rgba(255,255,255,0.55)"
                      opacity="0.35"
                    />
                    <circle cx="418" cy="104" r="20" fill="url(#ydAccent)" opacity="0.95" />
                    <circle cx="448" cy="144" r="10" fill="rgba(255,255,255,0.75)" opacity="0.6" />
                  </g>
                </svg>

                <div className="d-flex gap-3 flex-wrap">
                  <span
                    className="badge rounded-pill"
                    style={{
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "10px 12px",
                    }}
                  >
                    Real-time tracking
                  </span>
                  <span
                    className="badge rounded-pill"
                    style={{
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "10px 12px",
                    }}
                  >
                    Role-based access
                  </span>
                  <span
                    className="badge rounded-pill"
                    style={{
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "10px 12px",
                    }}
                  >
                    Reports & analytics
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="p-4 p-sm-5">
              <div className="d-flex align-items-center gap-3 mb-4 d-lg-none">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(7,27,63,0.08)",
                    border: "1px solid rgba(7,27,63,0.10)",
                  }}
                >
                  <img
                    src={logo}
                    alt="YouDash Express"
                    style={{ width: "28px", height: "28px", objectFit: "contain" }}
                  />
                </div>
                <div>
                  <div className="fw-bold text-dark">YouDash Express</div>
                  <div className="text-muted">Admin Console</div>
                </div>
              </div>

              <h3 className="fw-bold text-dark mb-1">Sign in</h3>
              <p className="text-muted mb-4">
                Enter your email and password to continue.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    name="email"
                    value={credentials.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    style={{
                      borderRadius: "12px",
                      border: "2px solid #e9ecef",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d6efd";
                      e.target.style.boxShadow = "0 0 0 0.25rem rgba(13,110,253,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e9ecef";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Password</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    style={{
                      borderRadius: "12px",
                      border: "2px solid #e9ecef",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0d6efd";
                      e.target.style.boxShadow = "0 0 0 0.25rem rgba(13,110,253,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e9ecef";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 btn-lg fw-bold mt-2"
                  disabled={submitting}
                  style={{
                    borderRadius: "12px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    boxShadow: "0 10px 24px rgba(13,110,253,0.22)",
                  }}
                  onMouseEnter={(e) => {
                    if (submitting) return;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 14px 30px rgba(13,110,253,0.28)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 10px 24px rgba(13,110,253,0.22)";
                  }}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </button>

                <div className="text-center mt-4">
                  <small className="text-muted">
                    By continuing, you agree to keep your credentials secure.
                  </small>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {snackbar.open ? (
        <div
          className="position-fixed start-50 translate-middle-x px-3"
          style={{
            bottom: "24px",
            zIndex: 1080,
            maxWidth: "min(420px, calc(100% - 24px))",
          }}
          aria-live="assertive"
        >
          <div
            role="alert"
            className="rounded-3 shadow-lg border-0 px-4 py-3 text-white"
            style={{
              background: "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
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
                  if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
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
