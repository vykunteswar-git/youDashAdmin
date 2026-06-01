import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { X, ShieldAlert } from "lucide-react";

export default function OtpModal({ open, onOpenChange, orderId, action, targetStatus, requiresCod = false, onDone }) {
  const [otp, setOtp] = useState("");
  const [codMode, setCodMode] = useState("CASH");
  const [override, setOverride] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;
  async function submit() {
    setLoading(true);
    try {
      const payload = { status: targetStatus, emergency_override: override };
      if (!override) payload.otp = otp;
      if (requiresCod) payload.cod_mode = codMode;
      await api.post(`/orders/${orderId}/status`, payload);
      toast.success(`${action} confirmed`);
      onDone?.();
      onOpenChange(false);
      setOtp(""); setOverride(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/60 z-50 flex items-center justify-center" data-testid="otp-modal">
      <div className="surface w-[440px] p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>{action}</h3>
            <p className="text-[12px] text-zinc-500 mt-1">Enter the 6-digit OTP shown on the customer's app</p>
          </div>
          <button onClick={() => onOpenChange(false)} data-testid="otp-close"><X size={16} /></button>
        </div>

        {!override && (
          <input data-testid="otp-input" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full text-center mono text-2xl tracking-[0.4em] py-3 border border-[var(--border-default)] rounded-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
        )}

        {requiresCod && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">COD collection mode</div>
            <div className="flex gap-2">
              {["CASH", "QR"].map(m => (
                <button key={m} onClick={() => setCodMode(m)} data-testid={`cod-${m.toLowerCase()}`}
                  className={`flex-1 py-2 text-[13px] border rounded-sm ${codMode === m ? "bg-zinc-900 text-white border-zinc-900" : "border-[var(--border-default)] bg-white"}`}>{m}</button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 mt-4 text-[12px] cursor-pointer" data-testid="override-toggle">
          <input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} />
          <ShieldAlert size={13} className="text-rose-600" />
          Emergency override — skip OTP (audit-logged)
        </label>

        <div className="flex gap-2 mt-5">
          <button onClick={() => onOpenChange(false)} className="flex-1 chip" data-testid="otp-cancel">Cancel</button>
          <button onClick={submit} disabled={loading || (!override && otp.length !== 6)}
            data-testid="otp-submit"
            className="flex-1 bg-zinc-900 text-white text-[13px] py-2 rounded-sm disabled:opacity-40">
            {loading ? "..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
