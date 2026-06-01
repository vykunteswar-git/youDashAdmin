import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function Categories() {
  const [cs, setCs] = useState([]);
  const [form, setForm] = useState({ name: "", emoji: "📦", sort_order: 0, active: true });
  async function load() { const r = await api.get("/categories"); setCs(r.data.categories); }
  useEffect(() => { load(); }, []);
  async function create() {
    if (!form.name) return;
    await api.post("/categories", form);
    setForm({ name: "", emoji: "📦", sort_order: 0, active: true });
    toast.success("Added"); load();
  }
  async function del(id) { await api.delete(`/categories/${id}`); toast.success("Deleted"); load(); }
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
                  <td>{c.active ? "✓" : "✗"}</td>
                  <td><button onClick={() => del(c.id)} className="chip" data-testid={`del-cat-${c.id}`}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="surface p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Add category</h3>
          <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} placeholder="Emoji" className="h-9 text-sm w-full border border-[var(--border-default)] rounded-sm px-2 mb-2" data-testid="cat-emoji" />
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="h-9 text-sm w-full border border-[var(--border-default)] rounded-sm px-2 mb-2" data-testid="cat-name" />
          <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value || 0) })} placeholder="Sort order" className="h-9 text-sm w-full border border-[var(--border-default)] rounded-sm px-2 mb-3" data-testid="cat-sort" />
          <button onClick={create} className="w-full bg-zinc-900 text-white text-[13px] py-2 rounded-sm" data-testid="cat-create">Create</button>
        </div>
      </div>
    </div>
  );
}
