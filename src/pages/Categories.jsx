import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Package, MoreVertical, Trash2, Edit, X, Image } from "lucide-react";
import { categoryService } from "../services/apiService";
import { uploadImageToCloudinary } from "../services/cloudinaryUpload";

function mapApiCategoryToRow(c) {
    return {
        id: c.id,
        name: c.name || "—",
        description: c.defaultDescription ?? "",
        imageUrl: c.imageUrl,
        icon: Package,
        status: c.isActive ? "Active" : "Inactive",
        color: "#E51818",
    };
}

/** Non-empty URL for API, or null when image is optional / not provided */
function categoryImageUrlForApi(imageUrl) {
    if (imageUrl == null || typeof imageUrl !== "string") return null;
    const t = imageUrl.trim();
    if (!t || t === "string") return null;
    return t;
}

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState(null);
    const [categoriesMeta, setCategoriesMeta] = useState({ message: null, totalCount: null });

    const fetchCategories = useCallback(async (options = {}) => {
        const silent = Boolean(options.silent);
        if (!silent) {
            setCategoriesLoading(true);
            setCategoriesError(null);
        }
        try {
            const res = await categoryService.getCategories();
            const body = res.data;
            if (body && body.success === false) {
                if (!silent) {
                    setCategoriesError(body.message || "Failed to load categories");
                    setCategories([]);
                    setCategoriesMeta({ message: null, totalCount: null });
                }
                return;
            }
            const list = Array.isArray(body?.data) ? body.data : [];
            setCategories(list.map(mapApiCategoryToRow));
            setCategoriesMeta({
                message: body?.message ?? null,
                totalCount: body?.totalCount ?? list.length,
            });
            if (!silent) setCategoriesError(null);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to load categories";
            if (!silent) {
                setCategoriesError(msg);
                setCategories([]);
                setCategoriesMeta({ message: null, totalCount: null });
            }
        } finally {
            if (!silent) setCategoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategory, setNewCategory] = useState({
        name: "",
        desc: "",
        isActive: true,
    });
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [retainedImageUrl, setRetainedImageUrl] = useState(null);
    const [saveSubmitting, setSaveSubmitting] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const categoryFileInputRef = useRef(null);

    const clearCategoryImageSelection = () => {
        setImageFile(null);
        setImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    };

    const closeCategoryModal = () => {
        setIsCategoryModalOpen(false);
        setEditingCategoryId(null);
        setNewCategory({ name: "", desc: "", isActive: true });
        setSaveError(null);
        clearCategoryImageSelection();
        setRetainedImageUrl(null);
    };

    useEffect(() => {
        return () => {
            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        };
    }, [imagePreviewUrl]);

    const handleAddCategoryOpen = () => {
        setEditingCategoryId(null);
        setSaveError(null);
        setNewCategory({ name: "", desc: "", isActive: true });
        clearCategoryImageSelection();
        setRetainedImageUrl(null);
        setIsCategoryModalOpen(true);
    };

    const handleEditCategoryOpen = (cat) => {
        setEditingCategoryId(cat.id);
        setSaveError(null);
        clearCategoryImageSelection();
        const url =
            cat.imageUrl &&
            typeof cat.imageUrl === "string" &&
            cat.imageUrl !== "string"
                ? cat.imageUrl
                : null;
        setRetainedImageUrl(url);
        setNewCategory({
            name: cat.name,
            desc: cat.description,
            isActive: cat.status === "Active",
        });
        setIsCategoryModalOpen(true);
    };

    const handleCategoryImagePick = (e) => {
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

    const handleDeleteCategory = (id) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            setCategories(categories.filter(c => c.id !== id));
        }
    };

    const toggleCategory = (id) => {
        setCategories(categories.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c));
    };

    const handleCategorySubmit = async () => {
        if (!newCategory.name?.trim()) {
            alert("Please enter a category name");
            return;
        }

        setSaveError(null);
        setSaveSubmitting(true);
        try {
            let resolvedUrl = null;
            if (imageFile) {
                resolvedUrl = categoryImageUrlForApi(
                    await uploadImageToCloudinary(imageFile)
                );
            } else if (retainedImageUrl) {
                resolvedUrl = categoryImageUrlForApi(retainedImageUrl);
            }

            if (editingCategoryId != null) {
                const id = Number(editingCategoryId);
                const payload = {
                    id,
                    name: newCategory.name.trim(),
                    imageUrl: resolvedUrl,
                    defaultDescription: newCategory.desc?.trim() || "",
                    isActive: Boolean(newCategory.isActive),
                };

                const res = await categoryService.updateCategory(id, payload);
                const body = res.data;
                if (body && body.success === false) {
                    setSaveError(body.message || "Could not update category");
                    return;
                }

                await fetchCategories({ silent: true });
                closeCategoryModal();
                return;
            }

            const payload = {
                id: 0,
                name: newCategory.name.trim(),
                imageUrl: resolvedUrl,
                defaultDescription: newCategory.desc?.trim() || "",
                isActive: Boolean(newCategory.isActive),
            };

            const res = await categoryService.createCategory(payload);
            const body = res.data;
            if (body && body.success === false) {
                setSaveError(body.message || "Could not save category");
                return;
            }

            await fetchCategories({ silent: true });
            closeCategoryModal();
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                "Could not save category. Please try again.";
            setSaveError(msg);
        } finally {
            setSaveSubmitting(false);
        }
    };

    const displayCategoryModalImage = imagePreviewUrl || retainedImageUrl;

    return (
        <>
            <div className="container-fluid fade-in">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                    <div>
                        <h2 className="fw-bold mb-1">Catalog Management</h2>
                        <p className="text-muted small mb-0">Manage your package categories.</p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={fetchCategories}
                            disabled={categoriesLoading}
                        >
                            Refresh
                        </button>
                        <button
                            onClick={handleAddCategoryOpen}
                            className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
                            style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}
                        >
                            <Plus size={18} /> <span>Create Category</span>
                        </button>
                    </div>
                </div>

                <div className="fade-in">
                        {!categoriesLoading && !categoriesError && categoriesMeta.message && (
                            <p className="text-muted small mb-3 mb-md-4">
                                {categoriesMeta.message}
                                {categoriesMeta.totalCount != null
                                    ? ` · ${categoriesMeta.totalCount} total`
                                    : ""}
                            </p>
                        )}

                        {categoriesLoading ? (
                            <div
                                className="d-flex flex-column align-items-center justify-content-center py-5 gap-3 mb-5"
                                style={{ minHeight: "280px" }}
                            >
                                <div
                                    className="spinner-border text-danger"
                                    role="status"
                                    style={{ width: "3rem", height: "3rem" }}
                                >
                                    <span className="visually-hidden">Loading categories…</span>
                                </div>
                                <p className="text-muted small mb-0">Loading categories…</p>
                            </div>
                        ) : categoriesError ? (
                            <div
                                className="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-5"
                                role="alert"
                            >
                                <span>{categoriesError}</span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={fetchCategories}
                                >
                                    Try again
                                </button>
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center text-muted py-5 mb-5">
                                No categories returned from the API.
                            </div>
                        ) : (
                                <div className="row g-4 mb-5">
                                    {categories.map((cat) => {
                                        const Icon = cat.icon;
                                        return (
                                        <div key={cat.id} className="col-12 col-md-6 col-xl-3">
                                            <div
                                                className={`dashboard-card h-100 border-0 shadow-sm transition-all hover-bg-light ${cat.status === "Inactive" ? "opacity-75 grayscale" : ""}`}
                                            >
                                                <div className="d-flex justify-content-between mb-4">
                                                    <div
                                                        className="p-3 rounded-3 shadow-inner"
                                                        style={{
                                                            backgroundColor: `${cat.color}15`,
                                                            color: cat.color,
                                                        }}
                                                    >
                                                        <Icon size={32} />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-link p-0 text-muted"
                                                        onClick={() => toggleCategory(cat.id)}
                                                    >
                                                        <MoreVertical size={20} />
                                                    </button>
                                                </div>

                                                <h5 className="fw-bold mb-1">{cat.name}</h5>
                                                {cat.imageUrl && cat.imageUrl !== "string" ? (
                                                    <div
                                                        className="mb-3 rounded-3 overflow-hidden bg-light"
                                                        style={{ maxHeight: "120px" }}
                                                    >
                                                        <img
                                                            src={cat.imageUrl}
                                                            alt={cat.name || "Category"}
                                                            className="w-100"
                                                            style={{
                                                                maxHeight: "120px",
                                                                objectFit: "cover",
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display = "none";
                                                            }}
                                                        />
                                                    </div>
                                                ) : null}
                                                <p
                                                    className="text-muted small mb-4"
                                                    style={{ minHeight: "40px" }}
                                                >
                                                    {cat.description || "—"}
                                                </p>

                                                <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-auto gap-2">
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-light p-2 rounded-3 border-0"
                                                            onClick={() => handleEditCategoryOpen(cat)}
                                                            aria-label="Edit category"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-light p-2 rounded-3 border-0 text-danger"
                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                            aria-label="Delete category"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div
                                                        className={`status-badge status-${cat.status.toLowerCase()} p-1 px-3`}
                                                        style={{ fontSize: "10px" }}
                                                    >
                                                        {cat.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                    })}
                                </div>
                        )}
                </div>
            </div>

            {/* Category Modal Overlay */}
            {isCategoryModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-4 p-4 shadow-lg fade-in position-relative" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
                        {saveSubmitting ? (
                            <div
                                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center rounded-4"
                                style={{ background: "rgba(255,255,255,0.92)", zIndex: 2 }}
                            >
                                <div className="spinner-border text-danger mb-2" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
                                    <span className="visually-hidden">Saving…</span>
                                </div>
                                <p className="text-muted small mb-0 text-center px-3">
                                    {imageFile
                                        ? "Uploading image and saving category…"
                                        : "Saving category…"}
                                </p>
                            </div>
                        ) : null}

                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold mb-0">{editingCategoryId ? "Edit Category Details" : "Create New Category"}</h4>
                            <button
                                type="button"
                                className="btn btn-light p-2 rounded-circle border-0 d-flex justify-content-center align-items-center"
                                onClick={closeCategoryModal}
                                disabled={saveSubmitting}
                            >
                                <X size={20} className="text-muted" />
                            </button>
                        </div>

                        {saveError ? (
                            <div className="alert alert-danger small py-2 mb-3" role="alert">
                                {saveError}
                            </div>
                        ) : null}

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Category Name</label>
                                <input
                                    type="text"
                                    className="form-control bg-light border-0 py-2"
                                    placeholder="e.g. Courier Bag"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                    disabled={saveSubmitting}
                                    style={{ borderRadius: '10px' }}
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Description</label>
                                <input
                                    type="text"
                                    className="form-control bg-light border-0 py-2"
                                    placeholder="e.g. Standard shipping bag"
                                    value={newCategory.desc}
                                    onChange={(e) => setNewCategory({ ...newCategory, desc: e.target.value })}
                                    disabled={saveSubmitting}
                                    style={{ borderRadius: '10px' }}
                                />
                            </div>
                            <div className="col-12">
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="category-active"
                                        checked={newCategory.isActive}
                                        onChange={(e) =>
                                            setNewCategory({ ...newCategory, isActive: e.target.checked })
                                        }
                                        disabled={saveSubmitting}
                                    />
                                    <label className="form-check-label small fw-bold text-muted" htmlFor="category-active">
                                        Active
                                    </label>
                                </div>
                            </div>
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">
                                    Category image <span className="fw-normal text-muted">(optional)</span>
                                </label>
                                <input
                                    ref={categoryFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="d-none"
                                    onChange={handleCategoryImagePick}
                                    disabled={saveSubmitting}
                                />
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                        !saveSubmitting &&
                                        categoryFileInputRef.current?.click()
                                    }
                                    onKeyDown={(e) => {
                                        if (saveSubmitting) return;
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            categoryFileInputRef.current?.click();
                                        }
                                    }}
                                    className="p-4 border border-dashed rounded-3 text-center cursor-pointer hover-bg-light transition-all"
                                    style={{ borderColor: '#CBD5E1' }}
                                >
                                    {displayCategoryModalImage ? (
                                        <div className="position-relative">
                                            <img
                                                src={displayCategoryModalImage}
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
                                                        clearCategoryImageSelection();
                                                        if (editingCategoryId != null) {
                                                            const cat = categories.find(
                                                                (x) => x.id === editingCategoryId
                                                            );
                                                            const url =
                                                                cat?.imageUrl &&
                                                                typeof cat.imageUrl === "string" &&
                                                                cat.imageUrl !== "string"
                                                                    ? cat.imageUrl
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
                                            <Image size={32} className="text-muted mb-2 mx-auto d-block" />
                                            <p className="small text-muted mb-0">
                                                Optional — add a file if you want; it uploads to Cloudinary when you save.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button
                                type="button"
                                className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3"
                                onClick={closeCategoryModal}
                                disabled={saveSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary-red flex-grow-1 py-3 fw-bold text-white shadow-sm rounded-3"
                                style={{ backgroundColor: '#E51818' }}
                                onClick={handleCategorySubmit}
                                disabled={saveSubmitting}
                            >
                                {editingCategoryId ? "Save Changes" : "Save Category"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Categories;
