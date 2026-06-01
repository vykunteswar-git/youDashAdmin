import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import BannerFormModal from "@/components/modals/BannerFormModal";

export default function CMS() {
  const [bs, setBs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() { const r = await api.get("/banners"); setBs(r.data.banners); }
  useEffect(() => { load(); }, []);

  async function toggle(b) {
    const ns = b.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await api.patch(`/banners/${b.id}`, { status: ns });
    toast.success("Updated"); load();
  }
  async function del(b) {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return;
    await api.delete(`/banners/${b.id}`);
    toast.success("Deleted"); load();
  }
  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(b) { setEditing(b); setModalOpen(true); }
  function onSaved() { setModalOpen(false); load(); }

  return (
    <div data-testid="cms-page">
      <PageHeader
        title="CMS"
        subtitle="Hero banners & promo content"
        actions={
          <button onClick={openCreate} className="btn-primary" data-testid="add-banner-btn">
            <Plus size={14} /> Add Banner
          </button>
        }
      />
      <div className="grid grid-cols-3 gap-4">
        {bs.map(b => (
          <div key={b.id} className="surface overflow-hidden" data-testid={`banner-${b.id}`}>
            <img src={b.image} alt="" className="w-full h-32 object-cover" />
            <div className="p-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-[13px]">{b.title}</h3>
                <span className={`pill ${b.status === "ACTIVE" ? "pill-green" : b.status === "SCHEDULED" ? "pill-blue" : "pill-slate"}`}>{b.status}</span>
              </div>
              <div className="text-[11px] text-[var(--slate-500)] mt-2">
                {new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()}
              </div>
              {b.redirect_url && <div className="text-[11px] mono text-[var(--slate-500)] mt-1">→ {b.redirect_url}</div>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(b)} className="chip" data-testid={`edit-banner-${b.id}`}><Pencil size={11} /> Edit</button>
                <button onClick={() => toggle(b)} className="chip" data-testid={`toggle-banner-${b.id}`}>{b.status === "ACTIVE" ? "Deactivate" : "Activate"}</button>
                <button onClick={() => del(b)} className="chip" style={{ color: "var(--brand-red)" }} data-testid={`del-banner-${b.id}`}><Trash2 size={11} /> Delete</button>
              </div>
            </div>
          </div>
        ))}
        {bs.length === 0 && <div className="empty col-span-3">No banners yet — click "Add Banner" to create one.</div>}
      </div>

      {modalOpen && (
        <BannerFormModal banner={editing} onClose={() => setModalOpen(false)} onSaved={onSaved} />
      )}
    </div>
  );
}
