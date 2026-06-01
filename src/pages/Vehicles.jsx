import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import ImageUploadField from "@/components/ImageUploadField";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  base_fare: "",
  per_km: "",
  min_distance: "",
  max_weight: "",
  active: true,
};

export default function Vehicles() {
  const [vs, setVs] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get("/vehicles");
    setVs(r.data?.vehicles ?? []);
  }

  useEffect(() => { load(); }, []);

  const filtered = vs.filter(v => tab === "ALL" || (tab === "ACTIVE" ? v.active : !v.active));

  function set(k, v) {
    setForm(current => ({ ...current, [k]: v }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setExistingImageUrl("");
    setShowAdd(true);
  }

  function openEdit(v) {
    setEditingId(v.id);
    setImageFile(null);
    setExistingImageUrl(v.image || "");
    setForm({
      name: v.name || "",
      base_fare: String(v.base_fare ?? ""),
      per_km: String(v.per_km ?? ""),
      min_distance: String(v.min_distance ?? ""),
      max_weight: String(v.max_weight ?? ""),
      active: v.active ?? true,
    });
    setShowAdd(true);
  }

  function closeForm() {
    setShowAdd(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setExistingImageUrl("");
  }

  async function toggle(v) {
    await api.patch(`/vehicles/${v.id}`, { active: !v.active });
    toast.success("Updated");
    load();
  }

  async function saveVehicle(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Vehicle name is required");
    if (!editingId && !imageFile) return toast.error("Vehicle image is required");
    if (editingId && !imageFile && !existingImageUrl) return toast.error("Vehicle image is required");
    setSaving(true);
    const payload = {
      ...form,
      image: existingImageUrl || undefined,
      imageFile: imageFile || undefined,
      base_fare: Number(form.base_fare || 0),
      per_km: Number(form.per_km || 0),
      min_distance: Number(form.min_distance || 0),
      max_weight: Number(form.max_weight || 0),
    };
    try {
      if (editingId) {
        await api.patch(`/vehicles/${editingId}`, payload);
        toast.success("Vehicle updated");
      } else {
        await api.post("/vehicles", payload);
        toast.success("Vehicle added");
      }
      closeForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-testid="vehicles-page">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Vehicles" subtitle="Vehicle types and pricing" />
        <button type="button" onClick={() => (showAdd ? closeForm() : openCreate())} className="btn-primary" data-testid="add-vehicle-btn">
          {showAdd ? "Close" : "Add Vehicle"}
        </button>
      </div>

      <div className="surface p-2 mb-4 inline-flex gap-1" data-testid="vehicle-status-toggle">
        {["ALL", "ACTIVE", "INACTIVE"].map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`chip px-4 justify-center ${tab === t ? "chip-active" : ""}`} data-testid={`veh-tab-${t}`}>
            {t}
          </button>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={saveVehicle} className="surface p-4 mb-4" data-testid="vehicle-form">
          <h3 className="text-sm font-semibold mb-3">{editingId ? "Edit vehicle" : "Add vehicle"}</h3>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name" value={form.name} onChange={v => set("name", v)} placeholder="Bike" autoFocus />
            <ImageUploadField
              label="Vehicle image"
              file={imageFile}
              onFileChange={setImageFile}
              existingUrl={existingImageUrl}
              required={!editingId || !existingImageUrl}
              testId="vehicle-image-upload"
            />
            <div>
              <label className="label">Status</label>
              <button
                type="button"
                onClick={() => set("active", !form.active)}
                className={`w-full h-9 rounded-sm border text-sm font-semibold ${form.active ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-700 border-zinc-300"}`}
              >
                {form.active ? "Active" : "Inactive"}
              </button>
            </div>
            <Field label="Base Fare" value={form.base_fare} onChange={v => set("base_fare", v)} type="number" />
            <Field label="₹/km" value={form.per_km} onChange={v => set("per_km", v)} type="number" />
            <Field label="Min Distance" value={form.min_distance} onChange={v => set("min_distance", v)} type="number" />
            <Field label="Max Weight" value={form.max_weight} onChange={v => set("max_weight", v)} type="number" />
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border-default)]">
            <button type="submit" disabled={saving} className="btn-primary" data-testid="vehicle-save">
              {saving ? "Saving..." : editingId ? "Save changes" : "Save vehicle"}
            </button>
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {filtered.length ? filtered.map(v => {
          const expanded = expandedId === v.id;
          return (
            <div key={v.id} className={`surface border transition ${expanded ? "border-[var(--brand-red)] shadow-sm" : "border-transparent hover:border-[var(--border-default)]"}`} data-testid={`vehicle-row-${v.id}`}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : v.id)} className="w-full text-left p-4">
                <div className="flex items-center gap-3">
                  {v.image ? (
                    <img src={v.image} alt="" className="w-12 h-12 object-contain rounded-sm bg-[var(--slate-50)]" />
                  ) : (
                    <div className="w-12 h-12 rounded-sm bg-[var(--slate-50)] flex items-center justify-center text-[10px] text-zinc-400">No img</div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{v.name}</div>
                    <div className="text-[11px] text-zinc-500 mono mt-1">₹{v.base_fare} base · ₹{v.per_km}/km · up to {v.max_weight} kg</div>
                  </div>
                  <span className={`pill ${v.active ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-600 border-zinc-300"}`}>{v.active ? "ACTIVE" : "INACTIVE"}</span>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-[var(--border-default)] bg-[var(--slate-50)] p-4" data-testid="vehicle-detail">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="section-title">{v.name}</h3>
                      <p className="section-subtitle">Pricing and capacity details</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(v)} className="chip" data-testid={`edit-vehicle-${v.id}`}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(v)}
                        className={`min-w-28 h-9 rounded-full border px-2 text-xs font-semibold transition ${v.active ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-700 border-zinc-300"}`}
                        data-testid={`toggle-vehicle-${v.id}`}
                      >
                        {v.active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <Box k="Base Fare" v={`₹${v.base_fare}`} />
                    <Box k="₹/km" v={`₹${v.per_km}`} />
                    <Box k="Min Distance" v={`${v.min_distance} km`} />
                    <Box k="Max Weight" v={`${v.max_weight} kg`} />
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="empty surface">No vehicles found</div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", autoFocus = false }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="input"
      />
    </div>
  );
}

function Box({ k, v }) {
  return (
    <div className="surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{k}</div>
      <div className="text-lg font-semibold mono mt-1">{v}</div>
    </div>
  );
}
