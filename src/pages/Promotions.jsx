import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import CouponFormModal from "@/components/modals/CouponFormModal";

export default function Promotions() {
  const [tab, setTab] = useState("ALL");
  const [cps, setCps] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() { const r = await api.get("/coupons"); setCps(r.data.coupons); }
  useEffect(() => { load(); }, []);
  const filtered = cps.filter(c => tab === "ALL" || c.status === tab);

  async function togglePause(c) {
    await api.patch(`/coupons/${c.id}`, { status: c.status === "ACTIVE" ? "PAUSED" : "ACTIVE" });
    toast.success("Updated"); load();
  }
  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(c) { setEditing(c); setModalOpen(true); }
  function onSaved() { setModalOpen(false); load(); }

  return (
    <div data-testid="promotions-page">
      <PageHeader
        title="Promotions"
        subtitle="Discount codes & offers"
        actions={
          <button onClick={openCreate} className="btn-primary" data-testid="add-coupon-btn">
            <Plus size={14} /> Add Coupon
          </button>
        }
      />
      <div className="tabbar mb-4">
        {["ALL", "ACTIVE", "PAUSED", "EXPIRED"].map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)} data-testid={`promo-tab-${t}`}>{t}</button>)}
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Code</th><th>Title</th><th>Discount</th><th>Usage</th><th>Mode</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(c => {
              const pct = Math.min(100, Math.round((c.used / c.max_redemptions) * 100));
              return (
                <tr key={c.id} data-testid={`promo-row-${c.code}`}>
                  <td className="mono font-semibold">{c.code}</td>
                  <td>{c.title}</td>
                  <td className="mono text-[12px]">{c.discount_type === "FLAT" ? `₹${c.discount_value}` : `${c.discount_value}%`}{c.max_discount ? ` (max ₹${c.max_discount})` : ""}</td>
                  <td className="w-44">
                    <div className="flex justify-between text-[11px] mono"><span>{c.used} / {c.max_redemptions}</span><span>{pct}%</span></div>
                    <div className="h-1 bg-[var(--slate-100)] rounded-sm mt-1"><div className="h-1 rounded-sm" style={{ width: `${pct}%`, background: "var(--brand-red)" }} /></div>
                  </td>
                  <td className="text-[11px]">{c.service_mode}</td>
                  <td><span className={`pill ${c.status === "ACTIVE" ? "pill-green" : c.status === "PAUSED" ? "pill-amber" : "pill-slate"}`}>{c.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="chip" data-testid={`edit-promo-${c.code}`}><Pencil size={11} /> Edit</button>
                      <button onClick={() => togglePause(c)} className="chip" data-testid={`toggle-promo-${c.code}`}>{c.status === "ACTIVE" ? "Pause" : "Resume"}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">No coupons in this state</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CouponFormModal coupon={editing} onClose={() => setModalOpen(false)} onSaved={onSaved} />
      )}
    </div>
  );
}
