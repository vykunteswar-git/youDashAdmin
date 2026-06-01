import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { X, Save } from "lucide-react";

const empty = {
  title: "",
  image: "",
  redirect_url: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  status: "ACTIVE",
};

export default function BannerFormModal({ banner, onClose, onSaved }) {
  const isEdit = !!banner;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (banner) {
      setForm({
        ...empty,
        ...banner,
        start_date: (banner.start_date || "").slice(0, 10),
        end_date: (banner.end_date || "").slice(0, 10),
        redirect_url: banner.redirect_url || "",
      });
    } else {
      setForm(empty);
    }
  }, [banner]);

  function set(k, v) { setForm({ ...form, [k]: v }); }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.image.trim()) {
      toast.error("Title and image URL are required");
      return;
    }
    setSaving(true);
    const payload = { ...form, redirect_url: form.redirect_url.trim() || null };
    try {
      if (isEdit) {
        await api.patch(`/banners/${banner.id}`, payload);
        toast.success("Banner updated");
      } else {
        await api.post("/banners", payload);
        toast.success("Banner created");
      }
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="banner-modal">
      <form onSubmit={submit} className="surface w-[560px] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start px-5 py-3 border-b border-[var(--border-default)]">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>{isEdit ? "Edit Banner" : "Create Banner"}</h3>
            <p className="text-[12px] text-[var(--slate-600)]">Hero banner for in-app promotion</p>
          </div>
          <button type="button" onClick={onClose} data-testid="banner-close"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Monsoon Sale!" data-testid="banner-title-input" />
          </div>

          <div>
            <label className="label">Image URL</label>
            <input className="input" value={form.image} onChange={e => set("image", e.target.value)} placeholder="https://images.unsplash.com/photo-..." data-testid="banner-image-input" />
            {form.image && (
              <div className="mt-2 border border-[var(--border-default)] rounded overflow-hidden">
                <img src={form.image} alt="preview" className="w-full h-28 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              </div>
            )}
          </div>

          <div>
            <label className="label">Redirect URL (optional)</label>
            <input className="input mono" value={form.redirect_url} onChange={e => set("redirect_url", e.target.value)} placeholder="parceloop://offers/welcome" data-testid="banner-redirect-input" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input mono" value={form.start_date} onChange={e => set("start_date", e.target.value)} data-testid="banner-start-input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input mono" value={form.end_date} onChange={e => set("end_date", e.target.value)} data-testid="banner-end-input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set("status", e.target.value)} data-testid="banner-status-input">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SCHEDULED">SCHEDULED</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary" data-testid="banner-cancel">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary" data-testid="banner-save">
            <Save size={13} /> {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Banner"}
          </button>
        </div>
      </form>
    </div>
  );
}
