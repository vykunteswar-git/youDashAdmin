import { useState, useEffect, useCallback } from "react";
import { Save, RotateCcw, Pencil, Smartphone, Link } from "lucide-react";
import { appVersionService, unwrapEntity } from "../services/apiService";

const emptyForm = () => ({
  id: "",
  userVersionCode: "",
  userPlayStoreUrl: "",
  riderVersionCode: "",
  riderPlayStoreUrl: "",
});

function mapFromApi(cfg) {
  if (!cfg || typeof cfg !== "object") return emptyForm();
  return {
    id: cfg.id != null ? String(cfg.id) : "",
    userVersionCode: cfg.userVersionCode ?? "",
    userPlayStoreUrl: cfg.userPlayStoreUrl ?? "",
    riderVersionCode: cfg.riderVersionCode ?? "",
    riderPlayStoreUrl: cfg.riderPlayStoreUrl ?? "",
  };
}

const AppVersion = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await appVersionService.getConfig();
      const cfg = unwrapEntity(res);
      setForm(mapFromApi(cfg));
    } catch (e) {
      setLoadError(e?.response?.data?.message || e?.message || "Failed to load version config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [field]: v }));
  };

  const handleSave = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    setSaving(true);
    setLoadError("");
    try {
      const payload = {
        userVersionCode: parseInt(String(form.userVersionCode || "1"), 10) || 1,
        userPlayStoreUrl: String(form.userPlayStoreUrl || "").trim(),
        riderVersionCode: parseInt(String(form.riderVersionCode || "1"), 10) || 1,
        riderPlayStoreUrl: String(form.riderPlayStoreUrl || "").trim(),
      };
      const res = await appVersionService.updateConfig(payload);
      const cfg = unwrapEntity(res);
      setForm(mapFromApi(cfg ?? payload));
      setIsEditing(false);
    } catch (e) {
      setLoadError(e?.response?.data?.message || e?.message || "Failed to save version config.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm("Reload config from server? Unsaved edits will be lost.")) return;
    setIsEditing(false);
    load();
  };

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 960 }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">App version control</h2>
          <p className="text-muted small mb-0">
            GET/PUT <code className="small">/admin/app-version</code> — Set version
            codes and Play Store URLs for user and rider apps.
          </p>
          <p className="text-muted small mt-2 mb-0">
            When an app's version code doesn't match the value set here, a full-screen
            update prompt is shown to the user.
          </p>
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 rounded-3"
            disabled={loading || saving}
          >
            <RotateCcw size={18} />
            Reload
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn d-flex align-items-center gap-2 rounded-3 text-white border-0 shadow-sm px-4"
            style={{ backgroundColor: "#E51818" }}
            disabled={loading || saving}
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm" />
            ) : isEditing ? (
              <Save size={18} />
            ) : (
              <Pencil size={18} />
            )}
            {isEditing ? "Save changes" : "Edit"}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div
          className="dashboard-card border-0 d-flex flex-column align-items-center justify-content-center py-5 gap-3"
          style={{ minHeight: 320 }}
        >
          <div
            className="spinner-border text-danger"
            style={{ width: "2.5rem", height: "2.5rem" }}
            role="status"
          />
          <p className="text-muted small mb-0">Loading version config…</p>
        </div>
      ) : (
        <div className="row g-3 g-md-4">
          {/* User App */}
          <div className="col-12 col-md-6">
            <div className="dashboard-card border-0 h-100 shadow-sm">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ background: "rgba(229, 24, 24, 0.08)" }}
                >
                  <Smartphone size={20} style={{ color: "#E51818" }} />
                </div>
                <div>
                  <p className="fw-semibold mb-0">User app</p>
                  <p className="text-muted small mb-0">Customer-facing app</p>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold mb-1">Version code</label>
                <p className="text-muted small mb-2">
                  Bump this number to force all user app installs to update.
                </p>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  value={form.userVersionCode}
                  onChange={handleChange("userVersionCode")}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="form-label fw-semibold mb-1 d-flex align-items-center gap-2">
                  <Link size={14} />
                  Play Store URL
                </label>
                <p className="text-muted small mb-2">
                  Users are redirected here when an update is required.
                </p>
                <input
                  type="url"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  value={form.userPlayStoreUrl}
                  onChange={handleChange("userPlayStoreUrl")}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Rider App */}
          <div className="col-12 col-md-6">
            <div className="dashboard-card border-0 h-100 shadow-sm">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ background: "rgba(229, 24, 24, 0.08)" }}
                >
                  <Smartphone size={20} style={{ color: "#E51818" }} />
                </div>
                <div>
                  <p className="fw-semibold mb-0">Rider app</p>
                  <p className="text-muted small mb-0">Delivery partner app</p>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold mb-1">Version code</label>
                <p className="text-muted small mb-2">
                  Bump this number to force all rider app installs to update.
                </p>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  value={form.riderVersionCode}
                  onChange={handleChange("riderVersionCode")}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="form-label fw-semibold mb-1 d-flex align-items-center gap-2">
                  <Link size={14} />
                  Play Store URL
                </label>
                <p className="text-muted small mb-2">
                  Riders are redirected here when an update is required.
                </p>
                <input
                  type="url"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  value={form.riderPlayStoreUrl}
                  onChange={handleChange("riderPlayStoreUrl")}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="col-12">
            <div
              className="rounded-4 p-3 small"
              style={{ background: "rgba(229, 24, 24, 0.05)", border: "1px solid rgba(229, 24, 24, 0.15)" }}
            >
              <p className="fw-semibold mb-1" style={{ color: "#E51818" }}>How it works</p>
              <p className="text-muted mb-0">
                On every app launch, the app sends its local version code to{" "}
                <code>/public/version-check</code>. If it doesn't match the code set
                above, a full-screen update screen is shown and the app is blocked until
                the user updates via the Play Store URL.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppVersion;
