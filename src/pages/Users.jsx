import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function Users() {
  const [tab, setTab] = useState("ALL");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [profileData, setProfileData] = useState(null);

  async function load() {
    const r = await api.get("/users", { params: tab === "ALL" ? {} : { status: tab } });
    setUsers(r.data.users);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  async function openUser(u) {
    setSelected(u);
    const r = await api.get(`/users/${u.id}`);
    setProfileData(r.data);
  }
  async function del(id) {
    if (prompt('Type DELETE to confirm') !== 'DELETE') return;
    await api.delete(`/users/${id}`); toast.success("Deleted"); setSelected(null); load();
  }

  return (
    <div data-testid="users-page">
      <PageHeader title="Users" subtitle="Customer accounts and disputes" />
      <div className="tabbar mb-4">
        {["ALL", "ACTIVE", "INACTIVE", "PENDING", "BANNED"].map(t => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)} data-testid={`user-tab-${t}`}>{t}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 surface overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Orders</th><th>Status</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="row-link" onClick={() => openUser(u)} data-testid={`user-row-${u.id}`}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-[12px]">{u.email}</td>
                  <td className="mono text-[12px]">{u.phone}</td>
                  <td>{u.city}</td>
                  <td className="mono">{u.total_orders}</td>
                  <td><span className="pill bg-zinc-100 text-zinc-700 border-zinc-300">{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="surface p-4">
          {!selected ? <div className="empty">Click a user to view profile</div> : (
            <div data-testid="user-profile">
              <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>{selected.name}</h3>
              <p className="text-[12px] text-zinc-500">{selected.email} · <span className="mono">{selected.phone}</span></p>
              <div className="mt-3 space-y-1 text-[12px]">
                <div><span className="text-zinc-500">City:</span> {selected.city}</div>
                <div><span className="text-zinc-500">Wallet:</span> <span className="mono">₹{selected.wallet_balance}</span></div>
                <div><span className="text-zinc-500">Total orders:</span> {selected.total_orders}</div>
              </div>
              {profileData && (
                <>
                  <div className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500">Recent orders</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {profileData.orders.slice(0,5).map(o => (
                      <div key={o.id} className="text-[12px] flex justify-between"><span className="mono">{o.tracking_id}</span><span>₹{o.fare.total}</span></div>
                    ))}
                    {profileData.orders.length === 0 && <div className="text-[11px] text-zinc-400">No orders</div>}
                  </div>
                </>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => del(selected.id)} className="flex-1 bg-zinc-900 text-white text-[12px] py-2 rounded-sm" data-testid="delete-user">Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
