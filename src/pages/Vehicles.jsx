import { useCallback, useEffect, useRef, useState } from "react";
import {
  Truck,
  Bike,
  Car,
  Package,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Image,
} from "lucide-react";
import { vehicleService, unwrapList } from "../services/apiService";
  import { uploadImageToCloudinary } from "../services/cloudinaryUpload";

function pickIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("bike") || n.includes("motor")) return Bike;
  if (n.includes("truck")) return Truck;
  if (n.includes("auto") || n.includes("car") || n.includes("sedan")) return Car;
  return Package;
}

function normalizeApiVehicle(v) {
  return {
    id: v.id,
    name: v.name ?? "",
    pricePerKm: v.pricePerKm ?? null,
    baseFare: v.baseFare ?? null,
    minimumKm: v.minimumKm ?? null,
    maxWeight: v.maxWeight ?? null,
    imageUrl: v.imageUrl ?? null,
    isActive: Boolean(v.isActive),
    orders: 0,
    riders: 0,
  };
}

function formatCapacity(maxWeight) {
  if (maxWeight === null || maxWeight === undefined || maxWeight === "") return "—";
  return `${maxWeight} kg`;
}

function validVehicleImageUrl(url) {
  if (url == null || typeof url !== "string") return null;
  const s = url.trim();
  if (!s || s === "string") return null;
  return s;
}

/** Top-left card slot: API image when present; otherwise red-tint box + icon */
function VehicleThumbnail({ name, imageUrl, active }) {
  const [failed, setFailed] = useState(false);
  const url = validVehicleImageUrl(imageUrl);
  const Icon = pickIcon(name);
  const showImg = Boolean(url && !failed);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (showImg) {
    return (
      <div
        className="rounded-3 overflow-hidden flex-shrink-0 bg-light border border-light"
        style={{ width: 56, height: 56 }}
      >
        <img
          src={url}
          alt=""
          className="w-100 h-100"
          style={{ objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`d-flex align-items-center justify-content-center rounded-3 flex-shrink-0 ${
        active
          ? "bg-primary-red bg-opacity-10 text-primary-red"
          : "bg-light text-muted"
      }`}
      style={{
        width: 56,
        height: 56,
        color: active ? "#E51818" : undefined,
      }}
    >
      <Icon size={32} />
    </div>
  );
}

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [newVehicle, setNewVehicle] = useState({
    name: "",
    perKm: "",
    basePrice: "",
    maxWeight: "",
    minimumKm: "",
    isActive: true,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [retainedImageUrl, setRetainedImageUrl] = useState(null);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fileInputRef = useRef(null);

  const fetchVehicles = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await vehicleService.getVehicles();
      const body = res.data;
      if (body && body.success === false) {
        if (!silent) {
          setError(body.message || "Failed to load vehicles");
          setVehicles([]);
        }
        return;
      }
      const list = unwrapList(res);
      setVehicles(list.map(normalizeApiVehicle));
      if (!silent) setError(null);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load vehicles";
      if (!silent) {
        setError(msg);
        setVehicles([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicleId(null);
    setSaveError(null);
    setNewVehicle({
      name: "",
      perKm: "",
      basePrice: "",
      maxWeight: "",
      minimumKm: "",
      isActive: true,
    });
    clearImageSelection();
    setRetainedImageUrl(null);
  };

  const toggleVehicle = async (id) => {
    const v = vehicles.find((x) => x.id === id);
    if (!v) return;
    const nextActive = !v.isActive;
    try {
      await vehicleService.updateVehicle(id, {
        name: v.name,
        pricePerKm: v.pricePerKm ?? 0,
        baseFare: v.baseFare ?? 0,
        minimumKm: v.minimumKm ?? 0,
        maxWeight: v.maxWeight ?? 0,
        imageUrl: v.imageUrl || "",
        isActive: nextActive,
      });
      setVehicles((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isActive: nextActive } : x))
      );
    } catch (e) {
      window.alert(
        e?.response?.data?.message ||
          e?.message ||
          "Could not update vehicle status."
      );
    }
  };

  const handleAddOpen = () => {
    setEditingVehicleId(null);
    setSaveError(null);
    setNewVehicle({
      name: "",
      perKm: "",
      basePrice: "",
      maxWeight: "",
      minimumKm: "",
      isActive: true,
    });
    clearImageSelection();
    setRetainedImageUrl(null);
    setIsModalOpen(true);
  };

  const handleEditOpen = (v) => {
    setSaveError(null);
    setNewVehicle({
      name: v.name,
      maxWeight:
        v.maxWeight != null && v.maxWeight !== ""
          ? `${v.maxWeight}`.replace(/\s*kg\s*$/i, "").trim() + "kg"
          : "",
      basePrice: v.baseFare != null ? String(v.baseFare) : "",
      perKm: v.pricePerKm != null ? String(v.pricePerKm) : "",
      minimumKm: v.minimumKm != null && v.minimumKm !== "" ? String(v.minimumKm) : "",
      isActive: Boolean(v.isActive),
    });
    setEditingVehicleId(v.id);
    clearImageSelection();
    const url =
      v.imageUrl && typeof v.imageUrl === "string" && v.imageUrl !== "string"
        ? v.imageUrl
        : null;
    setRetainedImageUrl(url);
    setIsModalOpen(true);
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setRetainedImageUrl(null);
    e.target.value = "";
  };

  const handleAddSubmit = async () => {
    if (
      !newVehicle.name?.trim() ||
      !newVehicle.basePrice ||
      !newVehicle.maxWeight ||
      !newVehicle.perKm
    ) {
      alert("Please fill all required fields");
      return;
    }

    const maxWeightNum = parseFloat(
      String(newVehicle.maxWeight).replace(/[^\d.]/g, "")
    );
    if (Number.isNaN(maxWeightNum)) {
      alert("Please enter a valid max weight");
      return;
    }

    const baseFare = parseFloat(newVehicle.basePrice);
    const pricePerKm = parseFloat(newVehicle.perKm);
    if (Number.isNaN(baseFare) || Number.isNaN(pricePerKm)) {
      alert("Please enter valid numbers for base charge and price per km");
      return;
    }

    const minimumKmRaw = newVehicle.minimumKm?.trim();
    const minimumKm =
      minimumKmRaw === "" || minimumKmRaw == null
        ? 0
        : parseFloat(minimumKmRaw);
    if (Number.isNaN(minimumKm)) {
      alert("Please enter a valid minimum km");
      return;
    }

    setSaveError(null);
    setSaveSubmitting(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary(imageFile);
      } else if (retainedImageUrl) {
        imageUrl = retainedImageUrl;
      }

      const editId =
        editingVehicleId != null ? Number(editingVehicleId) : null;
      const payload = {
        name: newVehicle.name.trim(),
        pricePerKm,
        baseFare,
        minimumKm,
        maxWeight: maxWeightNum,
        imageUrl: imageUrl || "",
        isActive: Boolean(newVehicle.isActive),
      };

      const res =
        editId != null
          ? await vehicleService.updateVehicle(editId, payload)
          : await vehicleService.createVehicle(payload);
      const body = res.data;
      if (body && body.success === false) {
        setSaveError(body.message || "Could not save vehicle");
        return;
      }

      await fetchVehicles({ silent: true });
      setSaveSubmitting(false);
      closeModal();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Could not save vehicle. Please try again.";
      setSaveError(msg);
    } finally {
      setSaveSubmitting(false);
    }
  };

  const handleDeleteType = (id) => {
    if (window.confirm("Are you sure you want to remove this vehicle type?")) {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const displayModalImage = imagePreviewUrl || retainedImageUrl;

  return (
    <>
      <div className="container-fluid fade-in">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3 mb-4">
          <div className="flex-grow-1 min-w-0">
            <h2 className="fw-bold mb-1">Vehicle Management</h2>
            <p className="text-muted small mb-0">
              Configure fleet types, capacities, and base pricing. List loads from
              API; add/edit here updates the screen until you reload from the server.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddOpen}
            disabled={loading}
            className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm flex-shrink-0 ms-sm-auto"
            style={{
              backgroundColor: "#E51818",
              color: "white",
              borderRadius: "10px",
            }}
          >
            <Plus size={18} /> <span>Add New Type</span>
          </button>
        </div>

        <div className="d-flex justify-content-end mb-3">
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none text-muted p-0"
            onClick={() => fetchVehicles()}
            disabled={loading}
          >
            Refresh list
          </button>
        </div>

        {loading ? (
          <div
            className="d-flex flex-column align-items-center justify-content-center py-5 gap-3"
            style={{ minHeight: "280px" }}
          >
            <div
              className="spinner-border text-danger"
              role="status"
              style={{ width: "3rem", height: "3rem" }}
            >
              <span className="visually-hidden">Loading vehicles…</span>
            </div>
            <p className="text-muted small mb-0">Loading vehicles…</p>
          </div>
        ) : error ? (
          <div
            className="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => fetchVehicles()}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="row g-4 mb-4">
            {vehicles.map((v) => {
              const active = Boolean(v.isActive);
              const baseDisplay =
                v.baseFare != null && v.baseFare !== ""
                  ? v.baseFare
                  : "—";
              return (
                <div key={v.id} className="col-12 col-md-6 col-xl-3">
                  <div
                    className={`dashboard-card h-100 border-0 shadow-sm transition-all ${
                      active ? "border-success" : "opacity-75 grayscale"
                    }`}
                    style={{
                      borderBottom: active
                        ? "4px solid #10B981"
                        : "4px solid #64748B",
                    }}
                  >
                    <div className="d-flex justify-content-between mb-4">
                      <VehicleThumbnail
                        name={v.name}
                        imageUrl={v.imageUrl}
                        active={active}
                      />
                      <div className="dropdown">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-muted"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          <MoreVertical size={20} />
                        </button>
                        <ul
                          className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2"
                          style={{ borderRadius: "12px" }}
                        >
                          <li>
                            <button
                              type="button"
                              className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small"
                              onClick={() => handleEditOpen(v)}
                            >
                              <Edit size={16} /> Edit Details
                            </button>
                          </li>
                          <li>
                            <hr className="dropdown-divider opacity-50" />
                          </li>
                          <li>
                            <button
                              type="button"
                              className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small text-danger"
                              onClick={() => handleDeleteType(v.id)}
                            >
                              <Trash2 size={16} /> Remove Type
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <h4 className="fw-bold mb-1 text-capitalize">{v.name}</h4>
                    <p className="text-muted small mb-3">
                      Capacity:{" "}
                      <span className="fw-bold text-dark">
                        {formatCapacity(v.maxWeight)}
                      </span>
                    </p>

                    <div className="d-flex gap-3 mb-4">
                      <div className="flex-grow-1 p-2 bg-light rounded-3 text-center">
                        <p
                          className="mb-0 text-muted"
                          style={{ fontSize: "10px" }}
                        >
                          Orders
                        </p>
                        <p className="mb-0 fw-bold small">
                          {Number(v.orders).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex-grow-1 p-2 bg-light rounded-3 text-center">
                        <p
                          className="mb-0 text-muted"
                          style={{ fontSize: "10px" }}
                        >
                          Active Riders
                        </p>
                        <p className="mb-0 fw-bold small">{v.riders}</p>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-auto">
                      <div className="d-flex align-items-center gap-2">
                        <span className="small text-muted">Base Price:</span>
                        <span className="fw-bold small">
                          {baseDisplay === "—" ? "—" : `₹${baseDisplay}`}
                        </span>
                      </div>
                      <div className="form-check form-switch p-0">
                        <input
                          className="form-check-input ms-0"
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleVehicle(v.id)}
                          style={{ width: "40px", height: "20px" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-start p-3 py-4"
          style={{
            zIndex: 1050,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-4 shadow-lg fade-in position-relative w-100"
            style={{
              maxWidth: "500px",
              maxHeight: "min(92vh, calc(100dvh - 32px))",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {saveSubmitting ? (
              <div
                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center rounded-4"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  zIndex: 2,
                }}
              >
                <div className="spinner-border text-danger mb-2" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
                  <span className="visually-hidden">Saving…</span>
                </div>
                <p className="text-muted small mb-0 text-center px-3">
                  Uploading image and saving vehicle…
                </p>
              </div>
            ) : null}

            <div className="d-flex justify-content-between align-items-center p-4 pb-0 flex-shrink-0">
              <h4 className="fw-bold mb-0">
                {editingVehicleId != null ? "Edit Vehicle Details" : "Add New Vehicle"}
              </h4>
              <button
                type="button"
                className="btn btn-light p-2 rounded-circle border-0 d-flex justify-content-center align-items-center"
                onClick={closeModal}
                disabled={saveSubmitting}
              >
                <X size={20} className="text-muted" />
              </button>
            </div>

            <div className="px-4 pt-3 flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
            {saveError ? (
              <div className="alert alert-danger small py-2 mb-3" role="alert">
                {saveError}
              </div>
            ) : null}

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small text-muted fw-bold">
                  Vehicle Name
                </label>
                <input
                  type="text"
                  className="form-control bg-light border-0 py-2"
                  placeholder="e.g. Premium Sedan"
                  value={newVehicle.name}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, name: e.target.value })
                  }
                  disabled={saveSubmitting}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">
                  Max Weight Capacity
                </label>
                <input
                  type="text"
                  className="form-control bg-light border-0 py-2"
                  placeholder="e.g. 50kg"
                  value={newVehicle.maxWeight}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, maxWeight: e.target.value })
                  }
                  disabled={saveSubmitting}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">
                  Minimum km
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-control bg-light border-0 py-2"
                  placeholder="0"
                  value={newVehicle.minimumKm}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, minimumKm: e.target.value })
                  }
                  disabled={saveSubmitting}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">
                  Base Charge (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control bg-light border-0 py-2"
                  placeholder="e.g. 100"
                  value={newVehicle.basePrice}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, basePrice: e.target.value })
                  }
                  disabled={saveSubmitting}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">
                  Price per Km (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control bg-light border-0 py-2"
                  placeholder="e.g. 15"
                  value={newVehicle.perKm}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, perKm: e.target.value })
                  }
                  disabled={saveSubmitting}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="vehicle-active"
                    checked={newVehicle.isActive}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, isActive: e.target.checked })
                    }
                    disabled={saveSubmitting}
                  />
                  <label className="form-check-label small fw-bold text-muted" htmlFor="vehicle-active">
                    Active
                  </label>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label small text-muted fw-bold">
                  Upload Vehicle Image
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={handleImagePick}
                  disabled={saveSubmitting}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !saveSubmitting && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (saveSubmitting) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="p-4 border border-dashed rounded-3 text-center cursor-pointer hover-bg-light transition-all"
                  style={{ borderColor: "#CBD5E1" }}
                >
                  {displayModalImage ? (
                    <div className="position-relative">
                      <img
                        src={displayModalImage}
                        alt=""
                        className="rounded-3 mx-auto d-block"
                        style={{ maxHeight: "140px", maxWidth: "100%", objectFit: "contain" }}
                      />
                      {!saveSubmitting ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearImageSelection();
                            if (editingVehicleId != null) {
                              const v = vehicles.find((x) => x.id === editingVehicleId);
                              const url =
                                v?.imageUrl &&
                                typeof v.imageUrl === "string" &&
                                v.imageUrl !== "string"
                                  ? v.imageUrl
                                  : null;
                              setRetainedImageUrl(url);
                            }
                          }}
                        >
                          Change image
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <Image
                        size={32}
                        className="text-muted mb-2 mx-auto d-block"
                      />
                      <p className="small text-muted mb-0">
                        Click to browse or choose an image (uploaded to Cloudinary on save)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            </div>

            <div className="d-flex gap-3 p-4 pt-3 border-top bg-light flex-shrink-0 rounded-bottom-4">
              <button
                type="button"
                className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3"
                onClick={closeModal}
                disabled={saveSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary-red flex-grow-1 py-3 fw-bold text-white shadow-sm rounded-3 d-flex align-items-center justify-content-center gap-2"
                style={{ backgroundColor: "#E51818" }}
                onClick={handleAddSubmit}
                disabled={saveSubmitting}
              >
                {saveSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Saving…
                  </>
                ) : editingVehicleId != null ? (
                  "Save Changes"
                ) : (
                  "Save Vehicle"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Vehicles;
