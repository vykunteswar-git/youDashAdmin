import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Smile,
  Hash,
  X,
} from "lucide-react";
import {
  packageCategoryService,
  unwrapList,
} from "../services/apiService";

const emptyForm = () => ({
  name: "",
  emoji: "",
  sortOrder: "",
  isActive: true,
});

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const sa = Number(a.sortOrder);
    const sb = Number(b.sortOrder);
    if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

const Categories = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await packageCategoryService.list();
      setRows(sortRows(unwrapList(res)));
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load package categories."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.name || "")
          .toLowerCase()
          .includes(q) ||
        String(r.emoji || "").includes(q) ||
        String(r.id).includes(q)
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditingId(null);
    const nextOrder =
      rows.length > 0
        ? Math.max(...rows.map((r) => Number(r.sortOrder) || 0)) + 1
        : 1;
    setForm({
      name: "",
      emoji: "",
      sortOrder: String(nextOrder),
      isActive: true,
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      emoji: row.emoji ?? "",
      sortOrder:
        row.sortOrder != null && row.sortOrder !== ""
          ? String(row.sortOrder)
          : "",
      isActive: Boolean(row.isActive),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const buildCreatePayload = () => {
    const name = form.name.trim();
    const emoji = form.emoji.trim();
    if (!name) throw new Error("Name is required.");
    if (!emoji) throw new Error("Emoji is required (non-blank).");
    const payload = { name, emoji, isActive: Boolean(form.isActive) };
    const so = parseInt(String(form.sortOrder).trim(), 10);
    if (Number.isFinite(so)) payload.sortOrder = so;
    return payload;
  };

  const buildUpdatePayload = () => {
    const name = form.name.trim();
    if (!name) throw new Error("Name is required.");
    const payload = {
      name,
      isActive: Boolean(form.isActive),
    };
    const emoji = form.emoji.trim();
    if (emoji) payload.emoji = emoji;
    const so = parseInt(String(form.sortOrder).trim(), 10);
    if (Number.isFinite(so)) payload.sortOrder = so;
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let payload;
    try {
      payload = editingId == null ? buildCreatePayload() : buildUpdatePayload();
    } catch (err) {
      window.alert(err.message || "Invalid form.");
      return;
    }
    setSaving(true);
    try {
      if (editingId != null) {
        await packageCategoryService.update(editingId, payload);
      } else {
        await packageCategoryService.create(payload);
      }
      closeForm();
      await load();
    } catch (err) {
      window.alert(
        err?.response?.data?.message ||
          err?.message ||
          "Save failed."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (
      !window.confirm(
        `Delete package category “${row.name}”? This cannot be undone.`
      )
    )
      return;
    try {
      await packageCategoryService.remove(row.id);
      await load();
    } catch (e) {
      window.alert(
        e?.response?.data?.message || e?.message || "Delete failed."
      );
    }
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Package size={26} className="text-primary-red" style={{ color: "#E51818" }} />
            Package categories
          </h2>
          <p className="text-muted small mb-0">
            {loading
              ? "Loading…"
              : "Names and emoji shown to customers when choosing a package type."}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-2 rounded-3"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            type="button"
            className="btn text-white d-flex align-items-center gap-2 px-4 rounded-3 shadow-sm border-0"
            style={{ backgroundColor: "#E51818" }}
            onClick={openCreate}
          >
            <Plus size={18} />
            Add category
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          {error}
        </div>
      )}

      {formOpen && (
        <div className="dashboard-card border-0 shadow-sm mb-3 border border-secondary border-opacity-10">
          <div className="p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
              <h5 className="fw-bold mb-0">
                {editingId == null ? "New package category" : "Edit category"}
              </h5>
              <button
                type="button"
                className="btn btn-sm btn-light border rounded-2"
                aria-label="Close form"
                onClick={closeForm}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Name</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Fragile"
                    required
                    autoFocus
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold d-flex align-items-center gap-2">
                    <Smile size={16} />
                    Emoji
                    {editingId != null && (
                      <span className="text-muted fw-normal small">
                        (empty = keep current)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={form.emoji}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, emoji: e.target.value }))
                    }
                    placeholder={editingId == null ? "e.g. ⚠️" : "—"}
                    required={editingId == null}
                  />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="form-label small fw-semibold">
                    Sort order
                  </label>
                  <input
                    type="number"
                    className="form-control rounded-3"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sortOrder: e.target.value }))
                    }
                    placeholder="Server default if empty"
                    min={0}
                  />
                </div>
                <div className="col-12 col-sm-6 col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch mb-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="cat-active"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isActive: e.target.checked }))
                      }
                    />
                    <label className="form-check-label" htmlFor="cat-active">
                      Active
                    </label>
                  </div>
                </div>
                <div className="col-12 col-md-4 d-flex align-items-end gap-2 justify-content-md-end flex-wrap pb-1">
                  <button
                    type="button"
                    className="btn btn-light rounded-3 border"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn text-white rounded-3 px-4 border-0"
                    style={{ backgroundColor: "#E51818" }}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
              <p className="text-muted small mb-0 mt-2">
                Lower sort numbers appear first. On create, leave sort empty to
                use the server default.
              </p>
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-card border-0 shadow-sm mb-3">
        <div className="p-3 border-bottom border-light">
          <div className="position-relative" style={{ maxWidth: 360 }}>
            <Search
              size={18}
              className="position-absolute text-muted"
              style={{ left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="search"
              className="form-control ps-5 rounded-3"
              placeholder="Search by name, emoji, or id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 72 }}>Emoji</th>
                <th>Name</th>
                <th style={{ width: 100 }}>Sort</th>
                <th style={{ width: 100 }}>Active</th>
                <th style={{ width: 120 }} className="text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="text-muted py-4 text-center">
                    Loading categories…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted py-4 text-center">
                    No categories match.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="fs-4" title={r.emoji || ""}>
                        {r.emoji || "—"}
                      </span>
                    </td>
                    <td className="fw-medium">{r.name ?? "—"}</td>
                    <td>
                      <span className="text-muted small d-flex align-items-center gap-1">
                        <Hash size={14} />
                        {r.sortOrder ?? "—"}
                      </span>
                    </td>
                    <td>
                      {r.isActive ? (
                        <span className="badge bg-success bg-opacity-10 text-success rounded-pill">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">
                          Off
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border rounded-2 me-1"
                        onClick={() => openEdit(r)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border rounded-2 text-danger"
                        onClick={() => handleDelete(r)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Categories;
