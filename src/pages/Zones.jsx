import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function Zones() {
  const nav = useNavigate();
  const [zs, setZs] = useState([]);
  const [tab, setTab] = useState("ALL");
  async function load() { const r = await api.get("/zones"); setZs(r.data.zones); }
  useEffect(() => { load(); }, []);
  async function toggle(z) {
    await api.patch(`/zones/${z.id}`, { status: z.status === "SERVING" ? "PAUSED" : "SERVING" });
    toast.success("Updated"); load();
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
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="empty">No zones found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
