import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function AppVersion() {
  const [data, setData] = useState({ user: { version_code: 0, play_store_url: "" }, rider: { version_code: 0, play_store_url: "" } });
  async function load() { const r = await api.get("/config/app-version"); setData({ user: r.data.user || {}, rider: r.data.rider || {} }); }
  useEffect(() => { load(); }, []);
  async function save(app) {
    const d = data[app];
    await api.put("/config/app-version", { app, version_code: parseInt(d.version_code), play_store_url: d.play_store_url });
    toast.success(`${app} app version saved`);
  }
  return (
    <div data-testid="app-version-page">
      <PageHeader title="App Version" subtitle="Force-update controls" />
      <div className="grid grid-cols-2 gap-4 max-w-4xl">
        {["user", "rider"].map(app => (
          <div key={app} className="surface p-5" data-testid={`appver-${app}`}>
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>{app === "user" ? "User App" : "Rider App"}</h3>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Version code</label>
            <input type="number" value={data[app].version_code || 0}
              onChange={e => setData({ ...data, [app]: { ...data[app], version_code: e.target.value } })}
              className="h-9 text-sm w-full mb-3 border border-[var(--border-default)] rounded-sm px-2 mono" data-testid={`ver-${app}`} />
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Play Store URL</label>
            <input value={data[app].play_store_url || ""}
              onChange={e => setData({ ...data, [app]: { ...data[app], play_store_url: e.target.value } })}
              className="h-9 text-sm w-full mb-3 border border-[var(--border-default)] rounded-sm px-2" data-testid={`url-${app}`} />
            <button onClick={() => save(app)} className="bg-zinc-900 text-white text-[13px] px-4 py-2 rounded-sm" data-testid={`save-${app}`}>Save</button>
          </div>
        ))}
      </div>
    </div>
  );
}
