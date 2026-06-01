import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, ArrowRight, GitBranch } from "lucide-react";

export default function Pricing() {
  const [tab, setTab] = useState("ZONE");
  return (
    <div data-testid="pricing-page">
      <PageHeader
        title="Pricing Routes"
        subtitle="Zone-level corridor rates and hub-pair overrides"
      />

      <div className="surface p-3 mb-4 flex items-start gap-3 bg-zinc-50/60" data-testid="priority-banner">
        <GitBranch size={18} className="text-zinc-700 mt-0.5" />
        <div className="text-[12px] text-zinc-700">
          <div className="font-semibold" style={{ fontFamily: "Outfit" }}>Resolution priority</div>
          <div className="mono mt-1">Hub-pair override <ArrowRight size={11} className="inline mx-1" /> Zone route rate <ArrowRight size={11} className="inline mx-1" /> Default (₹9/km)</div>
        </div>
      </div>

      <div className="tabbar mb-4">
        <button className={tab === "ZONE" ? "active" : ""} onClick={() => setTab("ZONE")} data-testid="pricing-tab-zone">Zone Routes</button>
        <button className={tab === "HUB" ? "active" : ""} onClick={() => setTab("HUB")} data-testid="pricing-tab-hub">Hub-pair Overrides</button>
        <button className={tab === "RESOLVE" ? "active" : ""} onClick={() => setTab("RESOLVE")} data-testid="pricing-tab-resolve">Resolver</button>
      </div>

      {tab === "ZONE" && <ZoneRoutes />}
      {tab === "HUB" && <HubRoutes />}
      {tab === "RESOLVE" && <Resolver />}
    </div>
  );
}

function ZoneRoutes() {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ origin_zone_id: "", destination_zone_id: "", rate_per_km: "" });
  const zoneName = (id) => zones.find(z => String(z.id) === String(id))?.name || `Zone #${id || "—"}`;
  async function load() {
    const [r, z] = await Promise.all([api.get("/zone-routes"), api.get("/zones")]);
    setRows(r.data.routes);
    setZones(z.data.zones);
  }
  useEffect(() => { load(); }, []);
  async function create() {
    if (!form.origin_zone_id || !form.destination_zone_id || !form.rate_per_km) return toast.error("Fill all fields");
    if (form.origin_zone_id === form.destination_zone_id) return toast.error("Origin and destination must differ");
    await api.post("/zone-routes", { ...form, rate_per_km: parseFloat(form.rate_per_km) });
    toast.success("Zone route added");
    setForm({ origin_zone_id: "", destination_zone_id: "", rate_per_km: "" });
    load();
  }
  async function toggle(r) {
    await api.patch(`/zone-routes/${r.id}`, { active: !r.active });
    load();
  }
  async function setRate(r, v) {
    await api.patch(`/zone-routes/${r.id}`, { rate_per_km: parseFloat(v) });
    toast.success("Rate updated");
    load();
  }
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 surface overflow-hidden">
        <table className="tbl" data-testid="zone-routes-table">
          <thead><tr><th>Origin</th><th>Destination</th><th>Rate (₹/km)</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} data-testid={`zr-row-${r.id}`}>
                <td className="font-medium">{zoneName(r.origin_zone_id)}</td>
                <td>{zoneName(r.destination_zone_id)}</td>
                <td>
                  <input type="number" defaultValue={r.rate_per_km}
                    onBlur={e => e.target.value != r.rate_per_km && setRate(r, e.target.value)}
                    className="h-7 w-20 mono text-[12px] border border-[var(--border-default)] rounded-sm px-1.5" data-testid={`zr-rate-${r.id}`} />
                </td>
                <td><button onClick={() => toggle(r)} className={`pill ${r.active ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-600 border-zinc-300"}`} data-testid={`zr-toggle-${r.id}`}>{r.active ? "ACTIVE" : "OFF"}</button></td>
                <td></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No zone routes configured.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="surface p-4">
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Add zone route</h3>
        <select value={form.origin_zone_id} onChange={e => setForm({ ...form, origin_zone_id: e.target.value })} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="zr-origin">
          <option value="">Origin zone...</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={form.destination_zone_id} onChange={e => setForm({ ...form, destination_zone_id: e.target.value })} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="zr-destination">
          <option value="">Destination zone...</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <input type="number" value={form.rate_per_km} onChange={e => setForm({ ...form, rate_per_km: e.target.value })} placeholder="Rate ₹/km" className="h-9 text-sm w-full mb-3 border border-[var(--border-default)] rounded-sm px-2 mono" data-testid="zr-rate" />
        <button onClick={create} className="w-full bg-zinc-900 text-white text-[13px] py-2 rounded-sm flex items-center justify-center gap-2" data-testid="zr-create"><Plus size={14} /> Create</button>
      </div>
    </div>
  );
}

function HubRoutes() {
  const [rows, setRows] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [form, setForm] = useState({ origin_hub_id: "", destination_hub_id: "", rate_per_km: "" });
  const hubById = (id) => hubs.find(h => String(h.id) === String(id));
  async function load() {
    const [r, h] = await Promise.all([api.get("/hub-routes"), api.get("/hubs")]);
    setRows(r.data.routes); setHubs(h.data.hubs);
  }
  useEffect(() => { load(); }, []);
  async function create() {
    if (!form.origin_hub_id || !form.destination_hub_id || !form.rate_per_km) return toast.error("Fill all fields");
    await api.post("/hub-routes", { ...form, rate_per_km: parseFloat(form.rate_per_km) });
    toast.success("Hub-pair override added");
    setForm({ origin_hub_id: "", destination_hub_id: "", rate_per_km: "" });
    load();
  }
  async function toggle(r) { await api.patch(`/hub-routes/${r.id}`, { active: !r.active }); load(); }
  async function setRate(r, v) { await api.patch(`/hub-routes/${r.id}`, { rate_per_km: parseFloat(v) }); toast.success("Rate updated"); load(); }
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 surface overflow-hidden">
        <table className="tbl" data-testid="hub-routes-table">
          <thead><tr><th>Origin hub</th><th>Destination hub</th><th>Rate (₹/km)</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} data-testid={`hr-row-${r.id}`}>
                <td>
                  <div className="font-medium">{hubById(r.origin_hub_id)?.name || r.origin_hub_name}</div>
                  <div className="text-[11px] text-zinc-500">{hubById(r.origin_hub_id)?.city || r.origin_city}</div>
                </td>
                <td>
                  <div className="font-medium">{hubById(r.destination_hub_id)?.name || r.destination_hub_name}</div>
                  <div className="text-[11px] text-zinc-500">{hubById(r.destination_hub_id)?.city || r.destination_city}</div>
                </td>
                <td>
                  <input type="number" defaultValue={r.rate_per_km}
                    onBlur={e => e.target.value != r.rate_per_km && setRate(r, e.target.value)}
                    className="h-7 w-20 mono text-[12px] border border-[var(--border-default)] rounded-sm px-1.5" data-testid={`hr-rate-${r.id}`} />
                </td>
                <td><button onClick={() => toggle(r)} className={`pill ${r.active ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-600 border-zinc-300"}`} data-testid={`hr-toggle-${r.id}`}>{r.active ? "ACTIVE" : "OFF"}</button></td>
                <td></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No hub-pair overrides.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="surface p-4">
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Add override</h3>
        <select value={form.origin_hub_id} onChange={e => setForm({ ...form, origin_hub_id: e.target.value })} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="hr-origin">
          <option value="">Origin hub…</option>
          {hubs.map(h => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
        </select>
        <select value={form.destination_hub_id} onChange={e => setForm({ ...form, destination_hub_id: e.target.value })} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="hr-destination">
          <option value="">Destination hub…</option>
          {hubs.map(h => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
        </select>
        <input type="number" value={form.rate_per_km} onChange={e => setForm({ ...form, rate_per_km: e.target.value })} placeholder="Negotiated ₹/km" className="h-9 text-sm w-full mb-3 border border-[var(--border-default)] rounded-sm px-2 mono" data-testid="hr-rate" />
        <button onClick={create} className="w-full bg-zinc-900 text-white text-[13px] py-2 rounded-sm flex items-center justify-center gap-2" data-testid="hr-create"><Plus size={14} /> Create override</button>
      </div>
    </div>
  );
}

function Resolver() {
  const [hubs, setHubs] = useState([]);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [res, setRes] = useState(null);
  useEffect(() => { api.get("/hubs").then(r => setHubs(r.data.hubs)); }, []);
  async function resolve() {
    if (!origin || !dest) return;
    const r = await api.get("/pricing/resolve", { params: { origin_hub_id: origin, destination_hub_id: dest } });
    setRes(r.data);
  }
  const sourceLabel = { hub_route: "Hub-pair override", zone_route: "Zone route", default: "Default fallback" };
  const sourceColor = { hub_route: "bg-indigo-50 text-indigo-800 border-indigo-300", zone_route: "bg-emerald-50 text-emerald-800 border-emerald-300", default: "bg-zinc-100 text-zinc-700 border-zinc-300" };
  return (
    <div className="surface p-5 max-w-2xl" data-testid="resolver-card">
      <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: "Outfit" }}>Pricing resolver</h3>
      <p className="text-[12px] text-zinc-500 mb-4">Pick any hub pair to see which rate the system applies and where it came from.</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select value={origin} onChange={e => setOrigin(e.target.value)} className="h-9 text-sm border border-[var(--border-default)] rounded-sm px-2" data-testid="res-origin">
          <option value="">Origin hub…</option>
          {hubs.map(h => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
        </select>
        <select value={dest} onChange={e => setDest(e.target.value)} className="h-9 text-sm border border-[var(--border-default)] rounded-sm px-2" data-testid="res-dest">
          <option value="">Destination hub…</option>
          {hubs.map(h => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
        </select>
      </div>
      <button onClick={resolve} className="bg-zinc-900 text-white text-[13px] px-4 py-2 rounded-sm" data-testid="res-go">Resolve</button>
      {res && (
        <div className="mt-4 p-4 border border-[var(--border-default)] rounded-sm" data-testid="res-result">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold mono">₹{res.rate_per_km}</span>
            <span className="text-zinc-500 text-sm">per km · corridor leg</span>
          </div>
          <div className="mt-3">
            <span className={`pill ${sourceColor[res.source]}`}>{sourceLabel[res.source]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
