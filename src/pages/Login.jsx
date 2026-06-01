import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  MapPin,
  Truck,
  BarChart3,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { toast } from "sonner";
import api from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import "@/components/BrandLogo.css";
import "./Login.css";

const REMEMBER_EMAIL_KEY = "youdash_admin_remember_email";

const HERO_FEATURES = [
  {
    icon: MapPin,
    title: "Real-Time Tracking",
    sub: "Track every parcel in real time",
  },
  {
    icon: Truck,
    title: "Fleet Management",
    sub: "Monitor drivers and vehicles easily",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    sub: "Insights that help you grow",
  },
];

function HeroRouteGraphic() {
  return (
    <div className="login-hero-route" aria-hidden>
      <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
        <path
          className="login-route-path"
          d="M20 120 Q 60 40, 100 70 T 180 30"
        />
        <g className="login-route-pin">
          <circle cx="168" cy="38" r="11" />
          <circle cx="168" cy="36" r="4" fill="#fff" />
        </g>
      </svg>
    </div>
  );
}

function validateForm(email, password) {
  const errors = {};
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 4) {
    errors.password = "Password must be at least 4 characters.";
  }
  return errors;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const errors = validateForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    const trimmedEmail = email.trim();

    try {
      const response = await api.post("/admin/login", {
        email: trimmedEmail,
        password,
      });
      const body = response.data;

      const token = body?.data?.token ?? body?.data?.accessToken;
      if (!body?.success || !token) {
        throw new Error(body?.message || "Login failed");
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      setAuthSession({ ...body.data, token });
      toast.success("Login successful");
      navigate(searchParams.get("next") || "/dashboard", { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Invalid email or password";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword(event) {
    event.preventDefault();
    toast.info("Contact your system administrator to reset your admin password.");
  }

  return (
    <div className="login-page" data-testid="login-page">
      <aside className="login-hero">
        <div className="login-hero-overlay" aria-hidden />
        <HeroRouteGraphic />
        <div className="login-hero-inner">
          <BrandLogo variant="hero" className="login-hero-brand" />

          <div className="login-hero-copy">
            <h1>
              <span className="login-hero-line">Smart Logistics.</span>
              <span className="login-hero-line login-hero-accent">Faster Deliveries.</span>
            </h1>
            <p>
              Manage parcels, deliveries, drivers and operations from a unified platform.
            </p>
          </div>

          <div className="login-hero-features">
            {HERO_FEATURES.map(({ icon: Icon, title, sub }) => (
              <article key={title} className="login-feature-card">
                <div className="login-feature-card__icon">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <h3 className="login-feature-card__title">{title}</h3>
                <p className="login-feature-card__sub">{sub}</p>
              </article>
            ))}
          </div>

          <p className="login-hero-footer">
            © 2026 YouDash Express. All rights reserved.
          </p>
        </div>
      </aside>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-badge" aria-hidden>
            <Lock size={24} strokeWidth={2} />
          </div>

          <header className="login-card-header">
            <h2>Welcome Back!</h2>
            <p>Sign in to your YouDash Express admin account</p>
          </header>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {formError ? (
              <p className="login-form-alert" role="alert" data-testid="login-form-error">
                {formError}
              </p>
            ) : null}

            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden>
                  <Mail size={18} />
                </span>
                <input
                  id="login-email"
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  autoComplete="email"
                  className={`login-input ${fieldErrors.email ? "login-input-error" : ""}`}
                  placeholder="admin@youdashexpress.com"
                />
              </div>
              {fieldErrors.email ? (
                <p className="login-field-error" data-testid="login-email-error">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden>
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  data-testid="login-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  autoComplete="current-password"
                  className={`login-input login-input-password ${fieldErrors.password ? "login-input-error" : ""}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  data-testid="login-toggle-password"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="login-field-error" data-testid="login-password-error">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className="login-form-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  data-testid="login-remember-me"
                />
                Remember me
              </label>
              <a
                href="#forgot"
                className="login-forgot"
                onClick={handleForgotPassword}
                data-testid="login-forgot-password"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-btn-signin"
              data-testid="login-submit-button"
            >
              {loading ? (
                <Loader2 size={18} className="login-spinner" />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
