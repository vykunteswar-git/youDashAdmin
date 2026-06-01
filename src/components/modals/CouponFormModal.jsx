import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { X, Save } from "lucide-react";

const empty = {
  code: "",
  title: "",
  discount_type: "FLAT",
  discount_value: 100,
  max_discount: "",
  min_order: 0,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  max_redemptions: 100,
  max_per_user: 1,
  service_mode: "BOTH",
  status: "ACTIVE",
};

export default function CouponFormModal({ coupon, onClose, onSaved }) {
  const isEdit = !!coupon;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coupon) {
      setForm({
        ...empty,
        ...coupon,
        max_discount: coupon.max_discount ?? "",
        valid_from: (coupon.valid_from || "").slice(0, 10),
        valid_to: (coupon.valid_to || "").slice(0, 10),
      });
    } else {
      setForm(empty);
    }
  }, [coupon]);

  function set(k, v) { setForm({ ...form, [k]: v }); }

  async function submit(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      toast.error("Code and title are required");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      code: form.code.toUpperCase().trim(),
      discount_value: parseFloat(form.discount_value || 0),
      max_discount: form.max_discount === "" ? null : parseFloat(form.max_discount),
      min_order: parseFloat(form.min_order || 0),
      max_redemptions: parseInt(form.max_redemptions || 100),
      max_per_user: parseInt(form.max_per_user || 1),
    };
    try {
      if (isEdit) {
        await api.patch(`/coupons/${coupon.id}`, payload);
        toast.success(`Coupon ${payload.code} updated`);
      } else {
        await api.post("/coupons", payload);
        toast.success(`Coupon ${payload.code} created`);
      }
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="coupon-modal">
      <form onSubmit={submit} className="surface w-[640px] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start px-5 py-3 border-b border-[var(--border-default)]">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>{isEdit ? "Edit Coupon" : "Create Coupon"}</h3>
            <p className="text-[12px] text-[var(--slate-600)]">{isEdit ? `Editing ${coupon.code}` : "Add a new promotional offer"}</p>
          </div>
          <button type="button" onClick={onClose} data-testid="coupon-close"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Code</label>
              <input className="input mono uppercase" value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="WELCOME50" data-testid="coupon-code-input" disabled={isEdit} />
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Welcome discount" data-testid="coupon-title-input" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Discount Type</label>
              <select className="input" value={form.discount_type} onChange={e => set("discount_type", e.target.value)} data-testid="coupon-type-input">
                <option value="FLAT">FLAT (₹)</option>
                <option value="PERCENT">PERCENT (%)</option>
              </select>
            </div>
            <div>
              <label className="label">Value</label>
              <input type="number" className="input mono" value={form.discount_value} onChange={e => set("discount_value", e.target.value)} data-testid="coupon-value-input" />
            </div>
            <div>
              <label className="label">Max Discount (₹)</label>
              <input type="number" className="input mono" value={form.max_discount} onChange={e => set("max_discount", e.target.value)} placeholder="optional" data-testid="coupon-max-input" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Min Order (₹)</label>
              <input type="number" className="input mono" value={form.min_order} onChange={e => set("min_order", e.target.value)} data-testid="coupon-minorder-input" />
            </div>
            <div>
              <label className="label">Max Redemptions</label>
              <input type="number" className="input mono" value={form.max_redemptions} onChange={e => set("max_redemptions", e.target.value)} data-testid="coupon-maxredeem-input" />
            </div>
            <div>
              <label className="label">Max Per User</label>
              <input type="number" className="input mono" value={form.max_per_user} onChange={e => set("max_per_user", e.target.value)} data-testid="coupon-peruser-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valid From</label>
              <input type="date" className="input mono" value={form.valid_from} onChange={e => set("valid_from", e.target.value)} data-testid="coupon-from-input" />
            </div>
            <div>
              <label className="label">Valid To</label>
              <input type="date" className="input mono" value={form.valid_to} onChange={e => set("valid_to", e.target.value)} data-testid="coupon-to-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Service Mode</label>
              <select className="input" value={form.service_mode} onChange={e => set("service_mode", e.target.value)} data-testid="coupon-mode-input">
                <option value="BOTH">BOTH</option>
                <option value="INCITY">INCITY</option>
                <option value="OUTSTATION">OUTSTATION</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set("status", e.target.value)} data-testid="coupon-status-input">
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary" data-testid="coupon-cancel">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary" data-testid="coupon-save">
            <Save size={13} /> {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Coupon"}
          </button>
        </div>
      </form>
    </div>
  );
}
