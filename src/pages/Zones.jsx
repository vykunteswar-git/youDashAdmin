import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function Zones() {
  const nav = useNavigate();
  const [zs, setZs] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [deleting, setDeleting] = useState(null);

  async function load() { const r = await api.get("/zones"); setZs(r.data.zones); }
  useEffect(() => { load(); }, []);

  async function toggle(z) {
    await api.patch(`/zones/${z.id}`, { status: z.status === "SERVING" ? "PAUSED" : "SERVING" });
    toast.success("Updated"); load();
  }

  async function confirmDelete(z) {
    try {
      await api.delete(`/zones/${z.id}`);
      toast.success(`Zone "${z.name}" deleted`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
      setDeleting(null);
    }
  }

  const filtered = zs.filter(z => tab === "ALL" || z.status === tab);
  return (
    <div data-testid="zones-page">
      <PageHeader
        title="Zones"
        subtitle="Geographical service zones"
        actions={
          <button onClick={() => nav("/zones/new")} className="btn-primary" data-testid="add-zone-btn">
            <Plus size={14} /> Add Zone
          </button>
        }
      />
      <div className="tabbar mb-4">
        {["ALL", "SERVING", "PAUSED"].map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)} data-testid={`zone-tab-${t}`}>{t}</button>)}
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Name</th><th>City</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(z => (
              <tr key={z.id} data-testid={`zone-row-${z.id}`}>
                <td className="font-medium">{z.name}</td>
                <td>{z.city}</td>
                <td><span className={`pill ${z.status === "SERVING" ? "pill-green" : "pill-amber"}`}>{z.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => nav(`/zones/${z.id}/edit`)} className="chip" data-testid={`edit-zone-${z.id}`}>Edit</button>
                    <button onClick={() => toggle(z)} className="chip" data-testid={`toggle-zone-${z.id}`}>{z.status === "SERVING" ? "Pause" : "Resume"}</button>
                    <button onClick={() => setDeleting(z)} className="chip chip-danger" data-testid={`delete-zone-${z.id}`}><Trash2 size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="empty">No zones found</td></tr>}
          </tbody>
        </table>
      </div>

      {deleting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="surface w-[420px] p-6">
            <h3 className="text-[15px] font-semibold mb-2" style={{ fontFamily: "Outfit" }}>Delete zone?</h3>
            <p className="text-[13px] text-zinc-600 mb-1">
              You are about to permanently delete <span className="font-semibold">{deleting.name}</span>.
            </p>
            <p className="text-[12px] text-zinc-400 mb-5">
              This will fail if any hubs are still assigned to this zone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="chip">Cancel</button>
              <button onClick={() => confirmDelete(deleting)} className="btn-danger" data-testid="confirm-delete-zone">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
