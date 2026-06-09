import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { toast } from "sonner";
import { Pencil, Search, Trash2, X } from "lucide-react";

const TABS = ["ALL", "ACTIVE", "INACTIVE", "PENDING"];

const EMPTY_EDIT = {
  first_name: "",
  last_name: "",
  phone: "",
  active: true,
};

function statusPillClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return "pill-green";
  if (s === "PENDING") return "pill-amber";
  if (s === "INACTIVE") return "pill-slate";
  return "pill-slate";
}

function userInitials(user) {
  const f = user.first_name || "";
  const l = user.last_name || "";
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  const n = String(user.name || "").trim();
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  if (n.length === 1) return `${n[0]}${n[0]}`.toUpperCase();
  const e = String(user.email || "").trim();
  if (e.length >= 2) return e.slice(0, 2).toUpperCase();
  return "?";
}

export default function Users() {
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [hardDeleteUser, setHardDeleteUser] = useState(null);
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState("");
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const r = await api.get("/users");
      setUsers(r.data?.users ?? []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load users";
      setLoadError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchTab = tab === "ALL" || String(u.status).toUpperCase() === tab;
      const matchSearch =
        !q ||
        String(u.name || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.phone || "").toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [users, tab, search]);

  async function loadOrders(userId) {
    setOrdersLoading(true);
    setOrders([]);
    try {
      const r = await api.get(`/users/${userId}/orders`);
      setOrders(r.data?.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  function selectUser(u) {
    setSelected(u);
    setEditingId(null);
    setEditForm(EMPTY_EDIT);
    loadOrders(u.id);
  }

  function openEdit(u) {
    setSelected(u);
    setEditingId(u.id);
    setEditForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      phone: u.phone === "—" ? "" : String(u.phone || ""),
      active: u.active ?? u.status !== "INACTIVE",
    });
    loadOrders(u.id);
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(EMPTY_EDIT);
  }

  async function saveEdit(e) {
    e?.preventDefault();
    if (!editingId) return;
    if (!editForm.first_name.trim() && !editForm.last_name.trim()) {
      return toast.error("First or last name is required");
    }
    const userId = editingId;
    setSaving(true);
    try {
      await api.patch(`/users/${userId}`, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone: editForm.phone.trim(),
        active: editForm.active,
      });
      toast.success("User updated");
      closeEdit();
      const r = await api.get("/users");
      const list = r.data?.users ?? [];
      setUsers(list);
      const refreshed = list.find((x) => x.id === userId);
      if (refreshed) setSelected(refreshed);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  async function confirmHardDelete() {
    if (!hardDeleteUser) return;
    if (hardDeleteConfirm !== "DELETE") {
      return toast.error('Type DELETE to confirm');
    }
    setHardDeleteLoading(true);
    try {
      await api.delete(`/users/${hardDeleteUser.id}`);
      toast.success("User permanently deleted");
      if (selected?.id === hardDeleteUser.id) {
        setSelected(null);
        closeEdit();
      }
      setHardDeleteUser(null);
      setHardDeleteConfirm("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to delete user");
    } finally {
      setHardDeleteLoading(false);
    }
  }

  return (
    <div data-testid="users-page">
      <PageHeader title="Users" subtitle="Customer accounts and profile management" />

      <div className="tabbar mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            data-testid={`user-tab-${t}`}
          >
            {t}
            {t !== "ALL" ? (
              <span className="ml-1 opacity-70">
                ({users.filter((u) => String(u.status).toUpperCase() === t).length})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="surface p-3 mb-4 flex items-center gap-2">
        <Search size={16} className="text-zinc-400 shrink-0" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="flex-1 h-9 text-sm border-0 bg-transparent focus:outline-none"
          data-testid="users-search"
        />
      </div>

      {loadError ? (
        <div className="surface p-3 mb-4 flex items-center justify-between gap-3 text-sm text-[var(--brand-red)]">
          <span>{loadError}</span>
          <button type="button" onClick={load} className="chip">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 surface overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <AppLoadingScreen message="Loading users…" variant="inline" testId="users-loading" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-500 text-sm">
                    {users.length === 0 ? "No users found." : "No users match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className={`row-link ${selected?.id === u.id ? "bg-[var(--slate-50)]" : ""}`}
                    onClick={() => selectUser(u)}
                    data-testid={`user-row-${u.id}`}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)" }}
                        >
                          {userInitials(u)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{u.name}</div>
                          <div className="text-[11px] text-zinc-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono text-[12px]">{u.phone}</td>
                    <td className="mono text-[12px]">{u.total_orders}</td>
                    <td>
                      <span className={`pill ${statusPillClass(u.status)}`}>{u.status}</span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="chip"
                          data-testid={`edit-user-${u.id}`}
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setHardDeleteUser(u)}
                          className="chip"
                          style={{ color: "var(--brand-red)" }}
                          data-testid={`delete-user-${u.id}`}
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-[var(--border-default)] text-[11px] text-zinc-500">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>

        <div className="surface p-4 min-h-[320px]">
          {!selected ? (
            <div className="empty">Select a user to view profile, or click Edit on a row</div>
          ) : editingId === selected.id ? (
            <form onSubmit={saveEdit} data-testid="user-edit-form">
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>
                Edit user
              </h3>
              <p className="text-[11px] text-zinc-500 mb-3">{selected.email}</p>
              <label className="label">First name</label>
              <input
                className="input mb-3"
                value={editForm.first_name}
                onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                data-testid="user-edit-first"
              />
              <label className="label">Last name</label>
              <input
                className="input mb-3"
                value={editForm.last_name}
                onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                data-testid="user-edit-last"
              />
              <label className="label">Phone</label>
              <input
                className="input mb-3 mono"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                data-testid="user-edit-phone"
              />
              <label className="label">Account status</label>
              <button
                type="button"
                onClick={() => setEditForm((f) => ({ ...f, active: !f.active }))}
                className={`w-full h-9 mb-4 rounded-sm border text-sm font-semibold ${
                  editForm.active
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-zinc-100 text-zinc-700 border-zinc-300"
                }`}
                data-testid="user-edit-active"
              >
                {editForm.active ? "Active" : "Inactive"}
              </button>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1" data-testid="user-save">
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button type="button" onClick={closeEdit} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div data-testid="user-profile">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)" }}
                  >
                    {userInitials(selected)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>
                      {selected.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500">{selected.email}</p>
                  </div>
                </div>
                <span className={`pill ${statusPillClass(selected.status)}`}>{selected.status}</span>
              </div>

              <div className="space-y-2 text-[12px] mb-4">
                <div>
                  <span className="text-zinc-500">Phone:</span>{" "}
                  <span className="mono">{selected.phone}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Wallet:</span>{" "}
                  <span className="mono">₹{selected.wallet_balance ?? 0}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Total orders:</span> {selected.total_orders}
                </div>
                <div>
                  <span className="text-zinc-500">Profile completed:</span>{" "}
                  {selected.profile_completed ? "Yes" : "No"}
                </div>
              </div>

              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Recent orders</div>
              {ordersLoading ? (
                <p className="text-[11px] text-zinc-400">Loading orders…</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto mb-4">
                  {orders.slice(0, 8).map((o) => (
                    <div key={o.id} className="text-[12px] flex justify-between gap-2">
                      <span className="mono truncate">{o.tracking_id || o.id}</span>
                      <span className="mono shrink-0">₹{o.fare?.total ?? o.amount ?? "—"}</span>
                    </div>
                  ))}
                  {!orders.length ? <div className="text-[11px] text-zinc-400">No orders</div> : null}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => openEdit(selected)}
                  className="chip flex-1 justify-center"
                  data-testid="edit-user-profile"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setHardDeleteUser(selected)}
                  className="chip flex-1 justify-center"
                  style={{ color: "var(--brand-red)" }}
                  data-testid="delete-user"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {hardDeleteUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          data-testid="user-hard-delete-modal"
        >
          <div className="surface w-full max-w-md p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>
                Permanently delete user?
              </h3>
              <button
                type="button"
                onClick={() => {
                  setHardDeleteUser(null);
                  setHardDeleteConfirm("");
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-zinc-600 mb-3">
              This cannot be undone. User <strong>{hardDeleteUser.name}</strong> and related data will be removed.
            </p>
            <label className="label">Type DELETE to confirm</label>
            <input
              className="input mb-4"
              value={hardDeleteConfirm}
              onChange={(e) => setHardDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              data-testid="user-hard-delete-input"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="btn-secondary"
                disabled={hardDeleteLoading}
                onClick={() => {
                  setHardDeleteUser(null);
                  setHardDeleteConfirm("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={hardDeleteLoading || hardDeleteConfirm !== "DELETE"}
                onClick={confirmHardDelete}
                data-testid="user-hard-delete-confirm"
              >
                {hardDeleteLoading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
