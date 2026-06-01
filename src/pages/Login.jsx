import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/login`, {
        email,
        password,
      });
      const body = response.data;

      if (!body?.success || !body?.data?.token) {
        throw new Error(body?.message || "Login failed");
      }

      setAuthSession(body.data);
      toast.success("Login successful");
      navigate(searchParams.get("next") || "/dashboard", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center px-4">
      <section className="w-full max-w-md surface p-8 shadow-sm" data-testid="login-page">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-sm bg-[var(--brand-red)] text-white flex items-center justify-center">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Admin Login</h1>
            <p className="text-sm text-[var(--text-secondary)]">Sign in to YouDash Express admin</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--slate-600)] mb-2">
              Email
            </span>
            <input
              data-testid="login-email-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="h-11 w-full px-3 border border-[var(--border-default)] rounded-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-red)]"
              placeholder="admin@youdashexpress.com"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--slate-600)] mb-2">
              Password
            </span>
            <input
              data-testid="login-password-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="h-11 w-full px-3 border border-[var(--border-default)] rounded-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-red)]"
              placeholder="Enter password"
            />
          </label>

          <button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full h-11 btn-primary justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
