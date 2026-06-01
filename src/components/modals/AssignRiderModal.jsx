import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { X, ShieldAlert } from "lucide-react";

export default function AssignRiderModal({ open, onOpenChange, orderId, role = "pickup", onAssigned }) {
  const [riders, setRiders] = useState([]);
  const [selectedRole, setSelectedRole] = useState(role);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (orderId) {
      api.get("/riders/eligible", { params: { order_id: orderId, role: selectedRole } }).then(r => setRiders(r.data.riders));
    }
  }, [open, orderId, selectedRole]);

  async function assign(riderId) {
    setLoading(true);
    try {
      await api.post(`/orders/${orderId}/assign-rider`, { rider_id: riderId, role: selectedRole });
      toast.success(`Rider assigned`);
      onAssigned?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to assign");
    } finally { setLoading(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="assign-rider-modal">
      <div className="surface w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-3 border-b border-[var(--border-default)]">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>Assign Rider</h3>
            <p className="text-[11px] text-zinc-500">Eligible riders sorted by proximity</p>
          </div>
          <button onClick={() => onOpenChange(false)} data-testid="assign-close"><X size={16} /></button>
        </div>
        <div className="px-5 py-3 border-b border-[var(--border-default)] flex gap-2">
          {["pickup", "delivery", "both"].map(r => (
            <button key={r} onClick={() => setSelectedRole(r)} data-testid={`role-${r}`}
              className={`chip ${selectedRole === r ? "chip-active" : ""}`}>{r === "both" ? "Both roles" : r}</button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1">
          {riders.length === 0 && <div className="empty">No eligible riders. Try a different role or check rider availability.</div>}
          {riders.map(r => (
            <div key={r.id} className="px-5 py-3 border-b border-[var(--border-default)] hover:bg-zinc-50 flex items-center justify-between"
              data-testid={`rider-row-${r.id}`}>
              <div className="flex items-center gap-3">
                <img src={r.avatar} className="w-9 h-9 rounded-full border" alt="" />
                <div>
                  <div className="text-[13px] font-medium">{r.name}</div>
                  <div className="text-[11px] text-zinc-500">{r.vehicle_type} · {r.city} · ★ {r.rating}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`pill ${r.availability === "ONLINE" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-600 border-zinc-300"}`}>{r.availability}</span>
                {r.blocked ? (
                  <span className="pill bg-rose-50 text-rose-800 border-rose-300" data-testid={`rider-blocked-${r.id}`}><ShieldAlert size={11} /> Blocked</span>
                ) : (
                  <button onClick={() => assign(r.id)} disabled={loading}
                    data-testid={`assign-${r.id}`}
                    className="text-[12px] bg-zinc-900 text-white px-3 py-1.5 rounded-sm">Assign</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
