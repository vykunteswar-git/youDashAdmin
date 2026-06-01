import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function Notifications() {
  const [hist, setHist] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", target: "all_users", type: "PROMO", data: "" });
  async function load() { const r = await api.get("/notifications"); setHist(r.data.notifications); }
  useEffect(() => { load(); }, []);
  async function send() {
    let data = null;
    try { data = form.data ? JSON.parse(form.data) : null; } catch { toast.error("Invalid JSON in data"); return; }
    await api.post("/notifications", { ...form, data });
    toast.success("Notification sent");
    setForm({ ...form, title: "", body: "" });
    load();
  }
  return (
    <div data-testid="notifications-page">
      <PageHeader title="Notifications" subtitle="Targeted push to users & riders" />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 surface p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Compose</h3>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-title" />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Message body" rows={3} className="text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2 py-2" data-testid="notif-body" />
          <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-target">
            <option value="all_users">All Users</option>
            <option value="all_riders">All Riders</option>
            <option value="city:Hyderabad:users">Hyderabad — Users</option>
            <option value="city:Bangalore:users">Bangalore — Users</option>
            <option value="city:Hyderabad:riders">Hyderabad — Riders</option>
          </select>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-type">
            <option>PROMO</option><option>ALERT</option><option>INFO</option>
          </select>
          <textarea value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} placeholder='{"deep_link": "/coupons/X"}' rows={2} className="text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2 py-2 mono" data-testid="notif-data" />
          <button onClick={send} className="w-full bg-zinc-900 text-white text-[13px] py-2 rounded-sm" data-testid="notif-send">Send</button>
        </div>
        <div className="col-span-2 surface overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Title</th><th>Target</th><th>Sent</th><th>Success</th><th>Failed</th><th>Time</th></tr></thead>
            <tbody>
              {hist.map(n => (
                <tr key={n.id}>
                  <td className="font-medium">{n.title}</td>
                  <td className="text-[12px]">{n.target}</td>
                  <td className="mono">{n.sent}</td>
                  <td className="mono text-emerald-700">{n.success}</td>
                  <td className="mono text-rose-700">{n.failed}</td>
                  <td className="text-[11px] text-zinc-500">{new Date(n.ts).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
