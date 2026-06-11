import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const TARGET_TYPES = [
  { value: "ALL_USERS", label: "All Users" },
  { value: "ALL_RIDERS", label: "All Riders" },
  { value: "CITY_USERS", label: "City — Users" },
  { value: "CITY_RIDERS", label: "City — Riders" },
  { value: "ZONE_USERS", label: "Zone — Users" },
  { value: "ZONE_RIDERS", label: "Zone — Riders" },
];

const PAGE_SIZE = 20;

export default function Notifications() {
  const [hist, setHist] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [targets, setTargets] = useState({ cities: [], zones: [], users: [], riders: [] });
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    targetType: "ALL_USERS",
    title: "",
    body: "",
    type: "PROMO",
    city: "",
    zoneId: "",
    data: "",
  });

  async function loadLogs(nextPage = 0) {
    const r = await api.get("/notifications", { params: { page: nextPage, size: PAGE_SIZE } });
    setHist(r.data.notifications);
    setPage(r.data.page ?? nextPage);
    setTotalPages(r.data.totalPages || 1);
  }
  async function loadTargets() {
    const r = await api.get("/notifications/targets", { params: { limit: 50 } });
    setTargets(r.data);
  }
  useEffect(() => { loadLogs(0); loadTargets(); }, []);

  const isCity = form.targetType === "CITY_USERS" || form.targetType === "CITY_RIDERS";
  const isZone = form.targetType === "ZONE_USERS" || form.targetType === "ZONE_RIDERS";

  function set(k, v) { setForm(current => ({ ...current, [k]: v })); }

  async function send() {
    if (!form.title.trim()) return toast.error("Title is required");
    if (isCity && !form.city) return toast.error("Select a city");
    if (isZone && !form.zoneId) return toast.error("Select a zone");
    let data = null;
    try { data = form.data ? JSON.parse(form.data) : null; } catch { toast.error("Invalid JSON in data"); return; }

    const payload = {
      targetType: form.targetType,
      title: form.title.trim(),
      body: form.body.trim(),
      notificationType: form.type,
      city: isCity ? form.city : null,
      zoneId: isZone ? Number(form.zoneId) || null : null,
      data,
      saveDraft: false,
    };
    setSending(true);
    try {
      await api.post("/notifications", payload);
      toast.success("Broadcast queued");
      setForm(current => ({ ...current, title: "", body: "", data: "" }));
      loadLogs(0);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to queue broadcast");
    } finally {
      setSending(false);
    }
  }

  return (
    <div data-testid="notifications-page">
      <PageHeader title="Notifications" subtitle="Targeted push to users & riders" />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 surface p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Compose</h3>
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Title" className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-title" />
          <textarea value={form.body} onChange={e => set("body", e.target.value)} placeholder="Message body" rows={3} className="text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2 py-2" data-testid="notif-body" />
          <select value={form.targetType} onChange={e => set("targetType", e.target.value)} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-target">
            {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {isCity && (
            <select value={form.city} onChange={e => set("city", e.target.value)} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-city">
              <option value="">Select city…</option>
              {targets.cities.map(c => {
                const value = typeof c === "string" ? c : c.name || c.city || c.value;
                return <option key={value} value={value}>{value}</option>;
              })}
            </select>
          )}
          {isZone && (
            <select value={form.zoneId} onChange={e => set("zoneId", e.target.value)} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-zone">
              <option value="">Select zone…</option>
              {targets.zones.map(z => {
                const id = typeof z === "object" ? z.id ?? z.zoneId : z;
                const label = typeof z === "object" ? (z.name || z.zoneName || `Zone #${id}`) : z;
                return <option key={id} value={id}>{label}</option>;
              })}
            </select>
          )}
          <select value={form.type} onChange={e => set("type", e.target.value)} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="notif-type">
            <option>PROMO</option><option>ALERT</option><option>INFO</option>
          </select>
          <textarea value={form.data} onChange={e => set("data", e.target.value)} placeholder='{"deep_link": "/coupons/X"}' rows={2} className="text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2 py-2 mono" data-testid="notif-data" />
          <button onClick={send} disabled={sending} className="w-full bg-zinc-900 text-white text-[13px] py-2 rounded-sm disabled:opacity-60" data-testid="notif-send">{sending ? "Sending…" : "Send"}</button>
          <div className="text-[11px] text-zinc-500 mt-3">
            {targets.cities.length} cities · {targets.zones.length} zones · {targets.users.length} users · {targets.riders.length} riders
          </div>
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
              {hist.length === 0 && <tr><td colSpan={6} className="empty">No notifications sent yet.</td></tr>}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-default)]">
              <button disabled={page <= 0} onClick={() => loadLogs(page - 1)} className="chip disabled:opacity-40" data-testid="notif-prev">Prev</button>
              <span className="text-[12px] text-zinc-500">Page {page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => loadLogs(page + 1)} className="chip disabled:opacity-40" data-testid="notif-next">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
