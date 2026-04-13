import { useState, useEffect, useCallback } from "react";
import {
  Search, MoreVertical, Edit, Trash2, Eye, Mail, Phone, UserPlus,
  ShieldOff, KeyRound, X, MapPin, Package, CreditCard, Clock,
  ChevronRight, ArrowUpRight, ArrowDownLeft, Calendar, User,
  CheckCircle2, XCircle, AlertCircle, Wallet, Star
} from "lucide-react";
import { userService, unwrapList } from "../services/apiService";

/** Maps UserResponseDTO into the shape used by this page (orders/wallet still placeholders until APIs exist). */
function normalizeApiUser(u) {
  const first = String(u?.firstName ?? "").trim();
  const last = String(u?.lastName ?? "").trim();
  const name = [first, last].filter(Boolean).join(" ") || "—";
  const avatar = (() => {
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    const one = first || last || "";
    if (one.length >= 2) return one.slice(0, 2).toUpperCase();
    if (one.length === 1) return `${one[0]}${one[0]}`.toUpperCase();
    const e = String(u?.email ?? "").trim();
    if (e.length >= 2) return e.slice(0, 2).toUpperCase();
    return "?";
  })();
  const active = Boolean(u?.active);
  const profileCompleted = Boolean(u?.profileCompleted);
  let status = "Inactive";
  if (active && profileCompleted) status = "Active";
  else if (active && !profileCompleted) status = "Pending";

  return {
    id: u.id,
    name,
    email: u.email ?? "",
    phone: u.phoneNumber ?? "",
    city: "—",
    status,
    joined: "—",
    lastSeen: "—",
    wallet: 0,
    totalOrders: 0,
    totalSpend: 0,
    rating: null,
    avatar,
    profileCompleted,
  };
}

const ordersMap = {};
const transactionsMap = {};

/* ─── Helpers ────────────────────────────────────────────────────────── */
const statusBadge = {
  Active: { bg: "#D1FAE5", color: "#059669" },
  Inactive: { bg: "#F3F4F6", color: "#6B7280" },
  Pending: { bg: "#FEF3C7", color: "#D97706" },
  Banned: { bg: "#FEE2E2", color: "#DC2626" },
};
const orderStatusBadge = {
  Delivered: { bg: "#D1FAE5", color: "#059669" },
  Active: { bg: "#DBEAFE", color: "#2563EB" },
  Pending: { bg: "#FEF3C7", color: "#D97706" },
  Cancelled: { bg: "#FEE2E2", color: "#DC2626" },
};
const txnStatusBadge = {
  Success: { bg: "#D1FAE5", color: "#059669" },
  Pending: { bg: "#FEF3C7", color: "#D97706" },
  Processed: { bg: "#DBEAFE", color: "#2563EB" },
};

const Badge = ({ label, map }) => {
  const s = map[label] || { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span className="px-3 py-1 fw-bold rounded-pill" style={{ fontSize: "11px", backgroundColor: s.bg, color: s.color }}>
      {label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════════ */
const Users = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [users, setUsers] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailTab, setDetailTab] = useState("Orders");
  const [selectedOrder, setSelectedOrder] = useState(null);

  /* actions */
  const updateUser = (id, patch) => {
    setUsers(u => u.map(x => x.id === id ? { ...x, ...patch } : x));
    setSelectedUser(u => u ? { ...u, ...patch } : null);
  };
  const handleBan = (id) => updateUser(id, { status: "Banned" });
  const handleReset = (id) => alert(`Password reset link sent to user #${id}.`);
  const handleDelete = (id) => {
    if (!window.confirm("Permanently delete this user?")) return;
    setUsers(u => u.filter(x => x.id !== id));
    setSelectedUser(null);
  };
  const openProfile = (user) => { setSelectedUser(user); setDetailTab("Orders"); setSelectedOrder(null); };

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await userService.getUsers();
      const raw = unwrapList(res);
      setUsers(raw.map(normalizeApiUser));
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load users.";
      setListError(msg);
      setUsers([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* filtered list */
  const tabs = ["All", "Active", "Inactive", "Pending", "Banned"];
  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      String(u.phone).toLowerCase().includes(q);
    const matchTab = activeTab === "All" || u.status === activeTab;
    return matchSearch && matchTab;
  });

  const userOrders = selectedUser ? (ordersMap[selectedUser.id] || []) : [];
  const userTxns = selectedUser ? (transactionsMap[selectedUser.id] || []) : [];

  /* ── MAIN LIST ─────────────────────────────────────────────────────── */
  return (
    <>
      <div className="container-fluid fade-in">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">User Management</h2>
            <p className="text-muted small mb-0">
              {listLoading ? "Loading users…" : `${users.length} registered users`}
            </p>
          </div>
          <button className="btn d-flex align-items-center gap-2 px-4 py-2 fw-bold text-white" style={{ backgroundColor: "#E51818", borderRadius: "10px" }}>
            <UserPlus size={16} /> Add User
          </button>
        </div>

        {/* Status Tabs */}
        <div className="d-flex gap-2 mb-4 overflow-auto pb-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="btn px-4 py-2 small fw-bold border-0 rounded-pill flex-shrink-0"
              style={{ backgroundColor: activeTab === t ? "#E51818" : "#fff", color: activeTab === t ? "#fff" : "#6B7280", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
              {t} {t !== "All" && <span className="ms-1 opacity-75">({users.filter(u => u.status === t).length})</span>}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="dashboard-card mb-4 border-0 shadow-sm">
          <div className="d-flex align-items-center gap-3 bg-light rounded-3 px-3" style={{ height: "44px" }}>
            <Search size={16} className="text-muted flex-shrink-0" />
            <input type="text" className="form-control border-0 bg-transparent p-0 shadow-none small"
              placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {listError ? (
          <div className="alert alert-danger mb-4 d-flex align-items-center justify-content-between gap-3" role="alert">
            <span>{listError}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadUsers}>
              Retry
            </button>
          </div>
        ) : null}

        {/* Table */}
        <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr className="bg-light">
                  <th className="px-4 py-3 small text-muted border-0 fw-bold">USER</th>
                  <th className="px-3 py-3 small text-muted border-0 fw-bold">PHONE</th>
                  <th className="px-3 py-3 small text-muted border-0 fw-bold">CITY</th>
                  <th className="px-3 py-3 small text-muted border-0 fw-bold">ORDERS</th>
                  <th className="px-3 py-3 small text-muted border-0 fw-bold">STATUS</th>
                  <th className="px-3 py-3 small text-muted border-0 fw-bold">JOINED</th>
                  <th className="px-4 py-3 small text-muted border-0 fw-bold text-end">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted small">
                      Loading users…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted small">
                      {users.length === 0 ? "No users found." : "No users match your filters."}
                    </td>
                  </tr>
                ) : null}
                {!listLoading && filtered.map(user => (
                  <tr key={user.id} className="align-middle" style={{ cursor: "pointer" }} onClick={() => openProfile(user)}>
                    <td className="px-4 py-3 border-0">
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                          style={{ width: 40, height: 40, fontSize: 13, background: "linear-gradient(135deg,#E51818,#ff6b6b)" }}>
                          {user.avatar}
                        </div>
                        <div>
                          <p className="mb-0 fw-bold small">{user.name}</p>
                          <small className="text-muted" style={{ fontSize: 11 }}>{user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-0 small text-muted">{user.phone}</td>
                    <td className="px-3 py-3 border-0 small text-muted">{user.city}</td>
                    <td className="px-3 py-3 border-0 small fw-bold">{user.totalOrders}</td>
                    <td className="px-3 py-3 border-0"><Badge label={user.status} map={statusBadge} /></td>
                    <td className="px-3 py-3 border-0 small text-muted">{user.joined}</td>
                    <td className="px-4 py-3 border-0 text-end" onClick={e => e.stopPropagation()}>
                      <div className="dropdown">
                        <button className="btn btn-link p-0 text-muted" data-bs-toggle="dropdown"><MoreVertical size={18} /></button>
                        <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2" style={{ borderRadius: 12, minWidth: 200 }}>
                          <li><button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small" onClick={() => openProfile(user)}><Eye size={15} /> View Profile</button></li>
                          <li><hr className="dropdown-divider my-1 opacity-25" /></li>
                          <li><button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small fw-bold text-danger" onClick={() => handleBan(user.id)}><ShieldOff size={15} /> Ban Account</button></li>
                          <li><button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small fw-bold text-warning" onClick={() => handleReset(user.id)}><KeyRound size={15} /> Reset Password</button></li>
                          <li><hr className="dropdown-divider my-1 opacity-25" /></li>
                          <li><button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small text-danger" onClick={() => handleDelete(user.id)}><Trash2 size={15} /> Delete</button></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-4">
          <p className="text-muted small mb-0">Showing {filtered.length} of {users.length} users</p>
          <div className="d-flex gap-2">
            <button className="btn btn-light px-3 py-1 small rounded-3 fw-bold">← Prev</button>
            <button className="btn px-3 py-1 small rounded-3 fw-bold text-white" style={{ backgroundColor: "#E51818" }}>Next →</button>
          </div>
        </div>
      </div>

      {/* ═══════════ FULL-SCREEN USER PROFILE ═══════════ */}
      {selectedUser && !selectedOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 fade-in"
          style={{ zIndex: 1050, overflowY: "auto", backgroundColor: "#F8F9FB" }}>

          {/* ── Top Bar ── */}
          <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{ zIndex: 10 }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                style={{ width: 48, height: 48, fontSize: 16, minWidth: 48, background: "linear-gradient(135deg,#E51818,#ff6b6b)" }}>
                {selectedUser.avatar}
              </div>
              <div>
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  {selectedUser.name}
                  <Badge label={selectedUser.status} map={statusBadge} />
                </h5>
                <small className="text-muted">{selectedUser.email}</small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm fw-bold border-0 d-flex align-items-center gap-1"
                style={{ backgroundColor: "#FEE2E2", color: "#DC2626", borderRadius: 8 }}
                onClick={() => handleBan(selectedUser.id)}>
                <ShieldOff size={14} /> Ban
              </button>
              <button className="btn btn-sm fw-bold border-0 d-flex align-items-center gap-1"
                style={{ backgroundColor: "#FEF3C7", color: "#D97706", borderRadius: 8 }}
                onClick={() => handleReset(selectedUser.id)}>
                <KeyRound size={14} /> Reset PW
              </button>
              <button onClick={() => setSelectedUser(null)}
                className="btn btn-sm d-flex align-items-center justify-content-center text-white border-0"
                style={{ backgroundColor: "#E51818", width: 36, height: 36, borderRadius: "50%" }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="container-fluid px-3 px-sm-4 py-4 pb-5" style={{ maxWidth: 1280 }}>
            <div className="row g-4">

              {/* LEFT — info cards */}
              <div className="col-12 col-lg-4">
                {/* Contact Info */}
                <div className="bg-white rounded-4 shadow-sm p-4 mb-4">
                  <p className="fw-bold mb-3" style={{ fontSize: 11, letterSpacing: 1, color: "#9CA3AF" }}>CONTACT INFORMATION</p>
                  {[
                    { icon: Mail, label: "Email", val: selectedUser.email },
                    { icon: Phone, label: "Phone", val: selectedUser.phone },
                    { icon: MapPin, label: "City", val: selectedUser.city },
                    { icon: Calendar, label: "Joined", val: selectedUser.joined },
                    { icon: Clock, label: "Last Seen", val: selectedUser.lastSeen },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                      <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 36, height: 36, backgroundColor: "#F3F4F6" }}>
                        <Icon size={16} color="#6B7280" />
                      </div>
                      <div>
                        <p className="text-muted mb-0" style={{ fontSize: 10 }}>{label}</p>
                        <p className="fw-bold small mb-0">{val}</p>
                      </div>
                    </div>
                  ))}
                  {/* Rating */}
                  <div className="d-flex align-items-center gap-3 mb-0">
                    <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 36, height: 36, backgroundColor: "#FEF3C7" }}>
                      <Star size={16} color="#D97706" />
                    </div>
                    <div>
                      <p className="text-muted mb-0" style={{ fontSize: 10 }}>Avg Rating</p>
                      <p className="fw-bold small mb-0">{selectedUser.rating ? `${selectedUser.rating} / 5.0` : "No ratings yet"}</p>
                    </div>
                  </div>
                </div>

                {/* Wallet */}
                <div className="rounded-4 p-4 text-white mb-4"
                  style={{ background: "linear-gradient(135deg,#1e1e2e,#2d2d44)" }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="small opacity-75 mb-1">Wallet Balance</p>
                      <h3 className="fw-bold mb-0">₹{selectedUser.wallet.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 rounded-3" style={{ backgroundColor: "rgba(255,255,255,.12)" }}>
                      <Wallet size={20} />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-top border-white border-opacity-25 d-flex gap-3">
                    <div>
                      <p className="mb-0 opacity-60" style={{ fontSize: 10 }}>Total Spent</p>
                      <p className="fw-bold mb-0 small">₹{selectedUser.totalSpend.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="mb-0 opacity-60" style={{ fontSize: 10 }}>Orders</p>
                      <p className="fw-bold mb-0 small">{selectedUser.totalOrders}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-4 shadow-sm p-4">
                  <p className="fw-bold mb-3" style={{ fontSize: 11, letterSpacing: 1, color: "#9CA3AF" }}>EXECUTIVE ACTIONS</p>
                  <div className="d-flex flex-column gap-2">
                    <button className="btn fw-bold small d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3"
                      style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                      onClick={() => handleBan(selectedUser.id)}>
                      <ShieldOff size={15} /> Ban This Account
                    </button>
                    <button className="btn fw-bold small d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3"
                      style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
                      onClick={() => handleReset(selectedUser.id)}>
                      <KeyRound size={15} /> Force Reset Password
                    </button>
                    <button className="btn fw-bold small d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3"
                      style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                      onClick={() => handleDelete(selectedUser.id)}>
                      <Trash2 size={15} /> Delete Account
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT — stats + tabs */}
              <div className="col-12 col-lg-8">
                {/* Stat chips */}
                <div className="row g-3 mb-4">
                  {[
                    { label: "Total Orders", val: selectedUser.totalOrders, icon: Package, color: "#E51818", bg: "#FEE2E2" },
                    { label: "Total Spent", val: `₹${selectedUser.totalSpend.toLocaleString()}`, icon: CreditCard, color: "#059669", bg: "#D1FAE5" },
                    { label: "Transactions", val: userTxns.length, icon: ArrowUpRight, color: "#2563EB", bg: "#DBEAFE" },
                    { label: "Wallet", val: `₹${selectedUser.wallet}`, icon: Wallet, color: "#7C3AED", bg: "#EDE9FE" },
                  ].map((s, i) => (
                    <div key={i} className="col-6">
                      <div className="bg-white rounded-4 shadow-sm p-3 d-flex align-items-center gap-3">
                        <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 44, height: 44, backgroundColor: s.bg }}>
                          <s.icon size={20} color={s.color} />
                        </div>
                        <div>
                          <p className="mb-0 text-muted" style={{ fontSize: 11 }}>{s.label}</p>
                          <h5 className="fw-bold mb-0">{s.val}</h5>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-4 shadow-sm overflow-hidden">
                  <div className="d-flex border-bottom px-3 pt-2">
                    {["Orders", "Transactions"].map(t => (
                      <button key={t} onClick={() => setDetailTab(t)}
                        className="btn border-0 small fw-bold py-3 px-4"
                        style={{
                          borderRadius: 0,
                          boxShadow: detailTab === t ? "0 -2px 0 #E51818 inset" : "none",
                          color: detailTab === t ? "#E51818" : "#9CA3AF",
                          background: "transparent"
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Orders Tab */}
                  {detailTab === "Orders" && (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th className="px-4 py-3 small text-muted fw-bold border-0">ORDER</th>
                            <th className="px-3 py-3 small text-muted fw-bold border-0">ROUTE</th>
                            <th className="px-3 py-3 small text-muted fw-bold border-0">STATUS</th>
                            <th className="px-3 py-3 small text-muted fw-bold border-0 text-end">AMOUNT</th>
                            <th className="px-4 py-3 border-0"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {userOrders.length === 0
                            ? <tr><td colSpan={5} className="text-center py-5 text-muted small">No orders yet.</td></tr>
                            : userOrders.map(o => (
                              <tr key={o.id} className="align-middle" style={{ cursor: "pointer" }} onClick={() => setSelectedOrder(o)}>
                                <td className="px-4 py-3 border-0">
                                  <p className="fw-bold small mb-0">{o.id}</p>
                                  <small className="text-muted" style={{ fontSize: 10 }}>{o.date} • {o.type}</small>
                                </td>
                                <td className="px-3 py-3 border-0">
                                  <div className="d-flex flex-column gap-1">
                                    <small className="d-flex align-items-center gap-1 fw-bold" style={{ fontSize: 11 }}><MapPin size={10} color="#E51818" />{o.pick}</small>
                                    <small className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: 11 }}><MapPin size={10} color="#059669" />{o.drop}</small>
                                  </div>
                                </td>
                                <td className="px-3 py-3 border-0"><Badge label={o.status} map={orderStatusBadge} /></td>
                                <td className="px-3 py-3 border-0 fw-bold text-end">₹{o.amount}</td>
                                <td className="px-4 py-3 border-0 text-muted"><ChevronRight size={16} /></td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Transactions Tab */}
                  {detailTab === "Transactions" && (
                    <div className="p-4">
                      {userTxns.length === 0
                        ? <p className="text-center text-muted small py-4">No transactions yet.</p>
                        : userTxns.map((txn) => {
                          const isCredit = txn.amount > 0;
                          const s = txnStatusBadge[txn.status] || { bg: "#F3F4F6", color: "#6B7280" };
                          return (
                            <div key={txn.id}
                              className="d-flex align-items-center gap-3 p-3 mb-2 rounded-4"
                              style={{ backgroundColor: "#F8F9FB" }}>
                              {/* Icon */}
                              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 42, height: 42, backgroundColor: isCredit ? "#D1FAE5" : "#FEE2E2" }}>
                                {isCredit
                                  ? <ArrowDownLeft size={18} color="#059669" />
                                  : <ArrowUpRight size={18} color="#DC2626" />}
                              </div>
                              {/* Details */}
                              <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <p className="fw-bold small mb-0">{txn.desc}</p>
                                    <small className="text-muted" style={{ fontSize: 11 }}>{txn.id} • {txn.method}{txn.ref !== "—" ? ` • ${txn.ref}` : ""}</small>
                                  </div>
                                  <div className="text-end">
                                    <p className="fw-bold small mb-0" style={{ color: isCredit ? "#059669" : "#DC2626" }}>
                                      {isCredit ? "+" : ""}₹{Math.abs(txn.amount).toLocaleString()}
                                    </p>
                                    <small className="text-muted" style={{ fontSize: 10 }}>{txn.date}</small>
                                  </div>
                                </div>
                              </div>
                              {/* Status pill */}
                              <span className="px-2 py-1 rounded-pill fw-bold flex-shrink-0"
                                style={{ fontSize: 10, backgroundColor: s.bg, color: s.color }}>
                                {txn.status}
                              </span>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═══════════ ORDER DETAIL (layered on top) ═══════════ */}
      {selectedOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 fade-in"
          style={{ zIndex: 1060, overflowY: "auto", backgroundColor: "#F8F9FB" }}>

          <div className="bg-white border-bottom px-4 py-3 sticky-top d-flex justify-content-between align-items-center shadow-sm">
            <div>
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                {selectedOrder.id}
                <Badge label={selectedOrder.status} map={orderStatusBadge} />
              </h5>
              <small className="text-muted">{selectedUser.name} • {selectedOrder.date}</small>
            </div>
            <button onClick={() => setSelectedOrder(null)}
              className="btn btn-sm d-flex align-items-center justify-content-center text-white border-0"
              style={{ backgroundColor: "#E51818", width: 36, height: 36, borderRadius: "50%" }}>
              <X size={18} />
            </button>
          </div>

          <div className="container-fluid px-3 px-sm-4 py-4 pb-5" style={{ maxWidth: 1100 }}>
            <div className="row g-4">

              {/* Route card */}
              <div className="col-12 col-lg-7">
                <div className="bg-white rounded-4 shadow-sm p-4 mb-4">
                  <p className="fw-bold mb-3" style={{ fontSize: 11, letterSpacing: 1, color: "#9CA3AF" }}>DELIVERY ROUTE</p>
                  <div className="d-flex flex-column gap-3 position-relative ps-3">
                    <div className="position-absolute border-start border-2 border-secondary opacity-25" style={{ left: 19, top: 20, bottom: 20 }}></div>
                    {[
                      { loc: selectedOrder.pick, label: "Pickup", dotColor: "#E51818" },
                      { loc: selectedOrder.drop, label: "Drop-off", dotColor: "#059669" },
                    ].map(({ loc, label, dotColor }) => (
                      <div key={label} className="d-flex gap-3 align-items-center position-relative z-1">
                        <div className="rounded-circle border border-2 bg-white d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 32, height: 32, borderColor: dotColor }}>
                          <MapPin size={15} color={dotColor} />
                        </div>
                        <div className="flex-grow-1 p-3 rounded-3" style={{ backgroundColor: "#F8F9FB" }}>
                          <p className="text-muted mb-0" style={{ fontSize: 10 }}>{label}</p>
                          <p className="fw-bold small mb-0">{loc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package */}
                <div className="bg-white rounded-4 shadow-sm p-4">
                  <p className="fw-bold mb-3" style={{ fontSize: 11, letterSpacing: 1, color: "#9CA3AF" }}>PACKAGE & RIDER</p>
                  <div className="row g-3">
                    {[
                      { label: "Service Type", val: selectedOrder.type },
                      { label: "Assigned Rider", val: selectedOrder.rider },
                      { label: "Est. Weight", val: "3.5 kg" },
                      { label: "Packaging", val: "Courier Bag" },
                      { label: "Distance", val: "~120 km" },
                      { label: "Est. Duration", val: "2-3 hours" },
                    ].map(({ label, val }) => (
                      <div key={label} className="col-6">
                        <div className="p-3 rounded-3" style={{ backgroundColor: "#F8F9FB" }}>
                          <p className="text-muted mb-0" style={{ fontSize: 10 }}>{label}</p>
                          <p className="fw-bold small mb-0">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Billing card */}
              <div className="col-12 col-lg-5">
                <div className="bg-white rounded-4 shadow-sm p-4 mb-4">
                  <p className="fw-bold mb-3" style={{ fontSize: 11, letterSpacing: 1, color: "#9CA3AF" }}>BILLING SUMMARY</p>
                  {[
                    { label: "Base Fare", val: `₹${Math.max(selectedOrder.amount - 150, 0)}` },
                    { label: "Distance Charge", val: "₹100" },
                    { label: "Tax & Insurance", val: "₹50" },
                    { label: "Coupon Discount", val: "—" },
                  ].map(({ label, val }) => (
                    <div key={label} className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: "#F3F4F6 !important" }}>
                      <span className="text-muted small">{label}</span>
                      <span className="fw-bold small">{val}</span>
                    </div>
                  ))}
                  <div className="d-flex justify-content-between pt-3 mt-1">
                    <span className="fw-bold">Total</span>
                    <span className="fw-bold fs-5" style={{ color: "#E51818" }}>₹{selectedOrder.amount}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div className="bg-white rounded-4 shadow-sm p-4">
                  <p className="fw-bold mb-3" style={{ fontSize: 11, letterSpacing: 1, color: "#9CA3AF" }}>PAYMENT METHOD</p>
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: "#F0FDF4" }}>
                    <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, backgroundColor: "#D1FAE5" }}>
                      <CreditCard size={18} color="#059669" />
                    </div>
                    <div>
                      <p className="fw-bold small mb-0 text-success">Paid via UPI</p>
                      <small className="text-muted" style={{ fontSize: 10 }}>Settled instantly</small>
                    </div>
                    <CheckCircle2 size={20} color="#059669" className="ms-auto" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;
