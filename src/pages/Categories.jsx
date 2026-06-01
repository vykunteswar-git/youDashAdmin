import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const EMPTY = { name: "", emoji: "📦", sort_order: 0, active: true };

export default function Categories() {
  const [cs, setCs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  async function load() { const r = await api.get("/categories"); setCs(r.data.categories); }
  useEffect(() => { load(); }, []);
  async function save() {
    if (!form.name) return toast.error("Name is required");
    try {
      if (editingId) {
        await api.patch(`/categories/${editingId}`, form);
        toast.success("Category updated");
      } else {
        await api.post("/categories", form);
        toast.success("Category added");
      }
      setForm(EMPTY); setEditingId(null); load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to save category");
    }
  }
  function openEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name || "", emoji: c.emoji || "📦", sort_order: c.sort_order ?? 0, active: c.active ?? true });
  }
  async function toggle(c) { await api.patch(`/categories/${c.id}`, { active: !c.active }); toast.success("Updated"); load(); }
  async function del(id) { await api.delete(`/categories/${id}`); toast.success("Deleted"); setEditingId(null); load(); }
  return (
    <div data-testid="categories-page">
      <PageHeader title="Categories" subtitle="Parcel package types" />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 surface overflow-hidden">
          <table className="tbl">
            <thead><tr><th></th><th>Name</th><th>Sort</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {cs.map(c => (
                <tr key={c.id} data-testid={`cat-row-${c.id}`}>
                  <td className="text-2xl">{c.emoji}</td>
                  <td className="font-medium">{c.name}</td>
                  <td className="mono">{c.sort_order}</td>
                  <td>
                    <button onClick={() => toggle(c)} className={`pill ${c.active ? "pill-green" : "pill-slate"}`} data-testid={`toggle-cat-${c.id}`}>{c.active ? "Active" : "Inactive"}</button>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="chip" data-testid={`edit-cat-${c.id}`}>Edit</button>
                      <button onClick={() => del(c.id)} className="chip" style={{ color: "var(--brand-red)" }} data-testid={`del-cat-${c.id}`}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="surface p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>{editingId ? "Edit category" : "Add category"}</h3>
          <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} placeholder="Emoji" className="h-9 text-sm w-full border border-[var(--border-default)] rounded-sm px-2 mb-2" data-testid="cat-emoji" />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="h-9 text-sm w-full border border-[var(--border-default)] rounded-sm px-2 mb-2" data-testid="cat-name" />
          <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value || 0) })} placeholder="Sort order" className="h-9 text-sm w-full border border-[var(--border-default)] rounded-sm px-2 mb-2" data-testid="cat-sort" />
          <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={`w-full h-9 mb-3 rounded-sm border text-sm font-semibold ${form.active ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-700 border-zinc-300"}`} data-testid="cat-active">{form.active ? "Active" : "Inactive"}</button>
          <button onClick={save} className="w-full bg-zinc-900 text-white text-[13px] py-2 rounded-sm" data-testid="cat-create">{editingId ? "Update" : "Create"}</button>
          {editingId && <button onClick={() => { setEditingId(null); setForm(EMPTY); }} className="w-full mt-2 btn-secondary justify-center" data-testid="cat-cancel">Cancel</button>}
        </div>
      </div>
    </div>
  );
}
