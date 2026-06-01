import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const today = new Date().toISOString().slice(0, 10);
const EMPTY_FORM = {
  name: "",
  incentive_type: "DAILY_DELIVERIES_SLOT",
  service_mode: "ALL",
  incentive_date: today,
  start_time: "18:00",
  end_time: "22:00",
  days: [],
  active: true,
  target_online_minutes: "120",
  bonus_amount: "100",
  slabs: [
    { min_deliveries: "5", bonus: "100" },
    { min_deliveries: "10", bonus: "250" },
  ],
};

export default function Incentives() {
  const [is, setIs] = useState([]);
  const [mode, setMode] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  async function load() { const r = await api.get("/incentives"); setIs(r.data?.incentives ?? []); }
  useEffect(() => { load(); }, []);
  const filtered = is.filter(i => mode === "ALL" || i.service_mode === mode);
  async function toggle(i) { await api.patch(`/incentives/${i.id}`, { active: !i.active }); toast.success("Updated"); load(); }

  function openEdit(i) {
    setEditingId(i.id);
    setForm({
      ...EMPTY_FORM,
      name: i.name || "",
      incentive_type: i.incentiveType || i.incentive_type || "DAILY_DELIVERIES_SLOT",
      service_mode: i.service_mode || "ALL",
      days: i.days || [],
      active: i.active ?? true,
      target_online_minutes: String(i.targetOnlineMinutes ?? i.target_online_minutes ?? "120"),
      bonus_amount: String(i.bonusAmount ?? i.bonus_amount ?? "100"),
      slabs: (i.slabs || []).length
        ? i.slabs.map(s => ({ min_deliveries: String(s.min_deliveries ?? ""), bonus: String(s.bonus ?? "") }))
        : EMPTY_FORM.slabs,
    });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function del(i) {
    if (!window.confirm(`Delete incentive "${i.name}"?`)) return;
    try {
      await api.delete(`/incentives/${i.id}`);
      toast.success("Incentive deleted");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to delete incentive");
    }
  }

  function set(k, v) {
    setForm(current => ({ ...current, [k]: v }));
  }

  function setSlab(index, key, value) {
    setForm(current => ({
      ...current,
      slabs: current.slabs.map((slab, i) => i === index ? { ...slab, [key]: value } : slab),
    }));
  }

  function addSlab() {
    setForm(current => ({
      ...current,
      slabs: [...current.slabs, { min_deliveries: "", bonus: "" }],
    }));
  }

  function removeSlab(index) {
    setForm(current => ({
      ...current,
      slabs: current.slabs.filter((_, i) => i !== index),
    }));
  }

  function toggleDay(day) {
    setForm(current => ({
      ...current,
      days: current.days.includes(day) ? current.days.filter(d => d !== day) : [...current.days, day],
    }));
  }

  async function create(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Campaign name is required");
    const slabs = form.incentive_type === "DAILY_DELIVERIES_SLOT" ? form.slabs.filter(s => s.min_deliveries && s.bonus) : [];
    if (form.incentive_type === "DAILY_DELIVERIES_SLOT" && !slabs.length) return toast.error("Add at least one incentive slab");
    if (form.incentive_type === "ONLINE_HOURS_DAILY" && !form.target_online_minutes) return toast.error("Target online minutes is required");
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/incentives/${editingId}`, { ...form, slabs });
        toast.success("Incentive campaign updated");
      } else {
        await api.post("/incentives", { ...form, slabs });
        toast.success("Incentive campaign added");
      }
      setForm(EMPTY_FORM);
      setShowAdd(false);
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to save incentive");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-testid="incentives-page">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Rider Incentives" subtitle="Bonus campaigns for peak demand" />
        <button type="button" onClick={() => { if (showAdd) { setEditingId(null); setForm(EMPTY_FORM); } setShowAdd(v => !v); }} className="btn-primary" data-testid="add-incentive-btn">
          {showAdd ? "Close" : "Add Incentive"}
        </button>
      </div>

      <div className="surface p-2 mb-4 inline-flex gap-1">
        {["ALL", "INCITY", "OUTSTATION"].map(m => (
          <button key={m} type="button" className={`chip px-4 justify-center ${mode === m ? "chip-active" : ""}`} onClick={() => setMode(m)} data-testid={`inc-tab-${m}`}>
            {m}
          </button>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={create} className="surface p-4 mb-4" data-testid="incentive-form">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Campaign Name" value={form.name} onChange={v => set("name", v)} placeholder="Weekend peak bonus" autoFocus />
            <Select label="Incentive Type" value={form.incentive_type} onChange={v => set("incentive_type", v)} options={["DAILY_DELIVERIES_SLOT", "ONLINE_HOURS_DAILY"]} />
            <Select label="Service Mode" value={form.service_mode} onChange={v => set("service_mode", v)} options={["ALL", "INCITY", "OUTSTATION"]} />
            <Field label="Date" type="date" value={form.incentive_date} onChange={v => set("incentive_date", v)} />
            <Field label="Start Time" type="time" value={form.start_time} onChange={v => set("start_time", v)} />
            <Field label="End Time" type="time" value={form.end_time} onChange={v => set("end_time", v)} />
            {form.incentive_type === "ONLINE_HOURS_DAILY" && (
              <>
                <Field label="Target Minutes" type="number" value={form.target_online_minutes} onChange={v => set("target_online_minutes", v)} />
                <Field label="Bonus Amount" type="number" value={form.bonus_amount} onChange={v => set("bonus_amount", v)} />
              </>
            )}
            <div>
              <label className="label">Status</label>
              <button type="button" onClick={() => set("active", !form.active)} className={`w-full h-9 rounded-sm border text-sm font-semibold ${form.active ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-700 border-zinc-300"}`}>
                {form.active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Days Of Week</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)} className={`chip ${form.days.includes(day) ? "chip-active" : ""}`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {form.incentive_type === "DAILY_DELIVERIES_SLOT" && <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Slabs</label>
              <button type="button" onClick={addSlab} className="chip" data-testid="add-incentive-slab">
                Add slab
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.slabs.map((slab, index) => (
                <div key={index} className="rounded-sm border border-[var(--border-default)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-semibold">Slab {index + 1}</div>
                    {form.slabs.length > 1 && (
                      <button type="button" onClick={() => removeSlab(index)} className="text-[11px] text-rose-700" data-testid={`remove-incentive-slab-${index}`}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Deliveries" type="number" value={slab.min_deliveries} onChange={v => setSlab(index, "min_deliveries", v)} />
                    <Field label="Bonus" type="number" value={slab.bonus} onChange={v => setSlab(index, "bonus", v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>}

          <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border-default)]">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : editingId ? "Update Incentive" : "Save Incentive"}</button>
            <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setEditingId(null); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filtered.map(i => (
          <div key={i.id} className="surface p-4" data-testid={`inc-card-${i.id}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-[15px]" style={{ fontFamily: "Outfit" }}>{i.name}</h3>
                <div className="text-[11px] text-zinc-500 mt-1">{i.incentiveType || i.incentive_type || "DAILY_DELIVERIES_SLOT"} · {i.service_mode} · {i.days.join(", ")}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggle(i)} className={`chip ${i.active ? "chip-active" : ""}`} data-testid={`toggle-inc-${i.id}`}>{i.active ? "ON" : "OFF"}</button>
                <button onClick={() => openEdit(i)} className="chip" data-testid={`edit-inc-${i.id}`}>Edit</button>
                <button onClick={() => del(i)} className="chip" style={{ color: "var(--brand-red)" }} data-testid={`del-inc-${i.id}`}>Delete</button>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {i.slabs.map((s, idx) => (
                <div key={idx} className="flex justify-between text-[12px] py-1 border-b border-dashed border-zinc-200 last:border-0">
                  <span>≥ {s.min_deliveries} deliveries</span>
                  <span className="mono">₹{s.bonus}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty surface col-span-2">No incentive campaigns found</div>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", autoFocus = false }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="input" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
