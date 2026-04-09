import { useState } from "react";
import {
    ListTree,
    Plus,
    Search,
    MapPin,
    Package,
    Bike,
    Truck,
    FileText,
    ShieldCheck,
    Zap,
    MoreVertical,
    MoveRight,
    ChevronRight,
    Trash2,
    Edit,
    X,
    Image,
    Layers,
    FileBadge2,
    AlertOctagon
} from "lucide-react";

const Categories = () => {
    const [activeTab, setActiveTab] = useState("categories");

    const [categories, setCategories] = useState([
        { id: 1, name: "Backpack / Bag", description: "Standard daily items, medium weight limits.", icon: Package, status: "Active", contents: ["Laptop", "Books", "Clothes", "Medicines"], color: "#E51818" },
        { id: 2, name: "Cardboard Box", description: "Sturdy packaging for medium to heavy items.", icon: Package, status: "Active", contents: ["Groceries", "Home Appliances", "Glassware", "Electronics"], color: "#10B981" },
        { id: 3, name: "Envelope / File", description: "Important documents and small flat objects.", icon: FileText, status: "Active", contents: ["Legal Documents", "Cheques", "Certificates", "Passports"], color: "#3B82F6" },
        { id: 4, name: "Suitcase / Luggage", description: "Large heavy items usually for out of station drops.", icon: Truck, status: "Inactive", contents: ["Clothes", "Shoes", "Heavy Tools", "Camera Gear"], color: "#F59E0B" },
    ]);

    const [contentItems, setContentItems] = useState([
        { id: 1, name: "Laptop", gstin: false, fragile: true, restricted: false, handlingFee: 50 },
        { id: 2, name: "Books", gstin: false, fragile: false, restricted: false, handlingFee: 0 },
        { id: 3, name: "Clothes", gstin: false, fragile: false, restricted: false, handlingFee: 0 },
        { id: 4, name: "Medicines", gstin: true, fragile: false, restricted: false, handlingFee: 20 },
        { id: 5, name: "Electronics", gstin: true, fragile: true, restricted: false, handlingFee: 100 },
        { id: 8, name: "Home Appliances", gstin: true, fragile: true, restricted: false, handlingFee: 150 },
        { id: 9, name: "Glassware", gstin: false, fragile: true, restricted: false, handlingFee: 40 },
        { id: 10, name: "Legal Documents", gstin: false, fragile: false, restricted: true, handlingFee: 0 },
        { id: 15, name: "Heavy Tools", gstin: false, fragile: false, restricted: false, handlingFee: 200 },
        { id: 16, name: "Camera Gear", gstin: true, fragile: true, restricted: false, handlingFee: 120 },
    ]);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: "", desc: "", contents: [] });
    const [editingCategoryId, setEditingCategoryId] = useState(null);

    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    const [newContent, setNewContent] = useState({ name: "", gstin: false, fragile: false, restricted: false, handlingFee: 0 });
    const [editingContentId, setEditingContentId] = useState(null);

    const handleAddCategoryOpen = () => {
        setEditingCategoryId(null);
        setNewCategory({ name: "", desc: "", contents: [] });
        setIsCategoryModalOpen(true);
    };

    const handleEditCategoryOpen = (cat) => {
        setEditingCategoryId(cat.id);
        setNewCategory({ name: cat.name, desc: cat.description, contents: cat.contents });
        setIsCategoryModalOpen(true);
    };

    const handleDeleteCategory = (id) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            setCategories(categories.filter(c => c.id !== id));
        }
    };

    const handleAddContentOpen = () => {
        setEditingContentId(null);
        setNewContent({ name: "", gstin: false, fragile: false, restricted: false, handlingFee: 0 });
        setIsContentModalOpen(true);
    };

    const handleEditContentOpen = (item) => {
        setEditingContentId(item.id);
        setNewContent({ name: item.name, gstin: item.gstin || false, fragile: item.fragile || false, restricted: item.restricted || false, handlingFee: item.handlingFee || 0 });
        setIsContentModalOpen(true);
    };

    const handleDeleteContent = (id) => {
        if (window.confirm("Are you sure you want to delete this content item?")) {
            setContentItems(contentItems.filter(i => i.id !== id));
        }
    };

    const toggleCategory = (id) => {
        setCategories(categories.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c));
    };

    const toggleContentSelection = (item) => {
        if (newCategory.contents.includes(item)) {
            setNewCategory({ ...newCategory, contents: newCategory.contents.filter(i => i !== item) });
        } else {
            setNewCategory({ ...newCategory, contents: [...newCategory.contents, item] });
        }
    };

    const handleCategorySubmit = () => {
        if (!newCategory.name) return alert("Please enter a category name");
        if (editingCategoryId) {
            setCategories(categories.map(c => c.id === editingCategoryId ? {
                ...c, name: newCategory.name, description: newCategory.desc, contents: newCategory.contents
            } : c));
        } else {
            const c = {
                id: categories.length + 1,
                name: newCategory.name,
                description: newCategory.desc || "New category added by admin.",
                icon: Package,
                status: "Active",
                contents: newCategory.contents,
                color: "#E51818"
            };
            setCategories([...categories, c]);
        }
        setIsCategoryModalOpen(false);
        setEditingCategoryId(null);
        setNewCategory({ name: "", desc: "", contents: [] });
    };

    const handleContentSubmit = () => {
        if (!newContent.name) return alert("Please enter a content name");
        if (editingContentId) {
            setContentItems(contentItems.map(i => i.id === editingContentId ? {
                ...i, name: newContent.name, gstin: newContent.gstin, fragile: newContent.fragile, restricted: newContent.restricted, handlingFee: Number(newContent.handlingFee)
            } : i));
        } else {
            const item = {
                id: contentItems.length + 1,
                name: newContent.name,
                gstin: newContent.gstin,
                fragile: newContent.fragile,
                restricted: newContent.restricted,
                handlingFee: Number(newContent.handlingFee)
            };
            setContentItems([...contentItems, item]);
        }
        setIsContentModalOpen(false);
        setEditingContentId(null);
        setNewContent({ name: "", gstin: false, fragile: false, restricted: false, handlingFee: 0 });
    };

    return (
        <>
            <div className="container-fluid fade-in">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                    <div>
                        <h2 className="fw-bold mb-1">Catalog Management</h2>
                        <p className="text-muted small mb-0">Manage your package categories and allowed content inventory.</p>
                    </div>
                    {activeTab === 'categories' ? (
                        <button
                            onClick={handleAddCategoryOpen}
                            className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
                            style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}
                        >
                            <Plus size={18} /> <span>Create Category</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleAddContentOpen}
                            className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
                            style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}
                        >
                            <Plus size={18} /> <span>Create Content</span>
                        </button>
                    )}
                </div>

                <div className="d-flex gap-4 border-bottom mb-4">
                    <button
                        className={`btn pb-3 px-0 border-0 ${activeTab === 'categories' ? 'fw-bold border-bottom border-2 border-danger text-danger' : 'text-muted'}`}
                        onClick={() => setActiveTab('categories')}
                        style={{ borderRadius: 0, boxShadow: 'none' }}
                    >
                        <Layers size={18} className="me-2 d-none d-sm-inline" />
                        Package Categories
                    </button>
                    <button
                        className={`btn pb-3 px-0 border-0 ${activeTab === 'content' ? 'fw-bold border-bottom border-2 border-danger text-danger' : 'text-muted'}`}
                        onClick={() => setActiveTab('content')}
                        style={{ borderRadius: 0, boxShadow: 'none' }}
                    >
                        <FileBadge2 size={18} className="me-2 d-none d-sm-inline" />
                        Content Inventory
                    </button>
                </div>

                {activeTab === 'categories' && (
                    <div className="fade-in">
                        <div className="row g-4 mb-5">
                            {categories.map((cat) => (
                                <div key={cat.id} className="col-12 col-md-6 col-xl-3">
                                    <div className={`dashboard-card h-100 border-0 shadow-sm transition-all hover-bg-light ${cat.status === 'Inactive' ? 'opacity-75 grayscale' : ''}`}>
                                        <div className="d-flex justify-content-between mb-4">
                                            <div className="p-3 rounded-3 shadow-inner" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                                <cat.icon size={32} />
                                            </div>
                                            <button className="btn btn-link p-0 text-muted" onClick={() => toggleCategory(cat.id)}><MoreVertical size={20} /></button>
                                        </div>

                                        <h5 className="fw-bold mb-1">{cat.name}</h5>
                                        <p className="text-muted small mb-4" style={{ minHeight: '40px' }}>{cat.description}</p>

                                        <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
                                            <div className="d-flex align-items-center gap-2 small text-muted">
                                                <ListTree size={14} /> <span>{cat.contents.length} Linked Contents</span>
                                            </div>
                                            <div className={`status-badge status-${cat.status.toLowerCase()} p-1 px-3`} style={{ fontSize: '10px' }}>{cat.status}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h4 className="fw-bold mb-4">Content Mappings</h4>
                        <div className="dashboard-card border-0 shadow-sm p-0 overflow-hidden">
                            <div className="table-responsive">
                                <table className="table mb-0 table-hover">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4 py-3 text-muted small border-0">PACKAGE CATEGORY</th>
                                            <th className="px-3 py-3 text-muted small border-0">ALLOWED CONTENTS</th>
                                            <th className="px-3 py-3 text-muted small border-0 text-end">TOTAL ITEMS</th>
                                            <th className="px-4 py-3 text-muted small border-0"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map((cat) => (
                                            <tr key={cat.id} className="align-middle border-bottom border-light">
                                                <td className="px-4 py-3 border-0 small fw-bold">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="p-1 rounded-3" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}><cat.icon size={16} /></div>
                                                        <span>{cat.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 border-0 small text-muted">
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {cat.contents.map((item, i) => (
                                                            <span key={i} className="p-1 px-2 bg-light border rounded small" style={{ fontSize: '10px' }}>{item}</span>
                                                        ))}
                                                        <button className="btn btn-link p-0 text-primary-red fw-bold small" style={{ fontSize: '10px', color: '#E51818' }}>+ Edit Links</button>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 border-0 text-end small fw-bold">
                                                    {cat.contents.length} items
                                                </td>
                                                <td className="px-4 py-3 border-0 text-end">
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button className="btn btn-light p-2 rounded-3 border-0" onClick={() => handleEditCategoryOpen(cat)}><Edit size={16} /></button>
                                                        <button className="btn btn-light p-2 rounded-3 border-0 text-danger" onClick={() => handleDeleteCategory(cat.id)}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="fade-in">
                        <div className="dashboard-card border-0 shadow-sm p-4">
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                                <FileBadge2 size={20} className="text-primary-red" /> Content Items Inventory
                            </h5>
                            <div className="table-responsive">
                                <table className="table mb-0 table-hover">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4 py-3 text-muted small border-0">CONTENT NAME</th>
                                            <th className="px-3 py-3 text-muted small border-0">COMPLIANCE & RULES</th>
                                            <th className="px-3 py-3 text-muted small border-0">HANDLING FEE</th>
                                            <th className="px-4 py-3 text-muted small border-0 text-end">ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contentItems.map((item) => (
                                            <tr key={item.id} className="align-middle border-bottom border-light">
                                                <td className="px-4 py-3 border-0 fw-bold d-flex align-items-center gap-3">
                                                    <div className="bg-light p-2 rounded-3 text-muted d-flex align-items-center justify-content-center">
                                                        <Image size={18} />
                                                    </div>
                                                    {item.name}
                                                </td>
                                                <td className="px-3 py-3 border-0">
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {item.gstin && <span className="badge bg-warning text-dark px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}>GSTIN Req.</span>}
                                                        {item.fragile && <span className="badge bg-danger text-white px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}>Fragile</span>}
                                                        {item.restricted && <span className="badge bg-dark text-white px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}><AlertOctagon size={10} className="me-1" />Restricted</span>}
                                                        {!item.gstin && !item.fragile && !item.restricted && <span className="badge bg-light text-muted border px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}>Standard</span>}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 border-0 fw-bold small text-muted">
                                                    {item.handlingFee > 0 ? <span className="text-danger flex align-items-center gap-1">+ ₹{item.handlingFee}</span> : 'None'}
                                                </td>
                                                <td className="px-4 py-3 border-0 text-end">
                                                    <button className="btn btn-light p-2 rounded-3 border-0 me-2" onClick={() => handleEditContentOpen(item)}><Edit size={16} /></button>
                                                    <button className="btn btn-light p-2 rounded-3 border-0 text-danger" onClick={() => handleDeleteContent(item.id)}><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Category Modal Overlay */}
            {isCategoryModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-4 p-4 shadow-lg fade-in" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold mb-0">{editingCategoryId ? "Edit Category Details" : "Create New Category"}</h4>
                            <button className="btn btn-light p-2 rounded-circle border-0 d-flex justify-content-center align-items-center" onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryId(null); }}>
                                <X size={20} className="text-muted" />
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Category Name</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. Courier Bag" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Description</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. Standard shipping bag" value={newCategory.desc} onChange={(e) => setNewCategory({ ...newCategory, desc: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold mb-2">Allowed Contents (Selected from Inventory)</label>

                                <div className="d-flex flex-wrap gap-2 p-3 bg-light rounded-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {contentItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => toggleContentSelection(item.name)}
                                            className={`badge border p-2 cursor-pointer transition-all ${newCategory.contents.includes(item.name) ? 'bg-primary-red border-danger' : 'bg-white text-muted'}`}
                                            style={{ fontSize: '12px', fontWeight: 'normal', backgroundColor: newCategory.contents.includes(item.name) ? '#E51818' : 'white', color: newCategory.contents.includes(item.name) ? 'white' : '' }}
                                        >
                                            {item.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Category Image</label>
                                <div className="p-4 border border-dashed rounded-3 text-center cursor-pointer hover-bg-light transition-all" style={{ borderColor: '#CBD5E1' }}>
                                    <Image size={32} className="text-muted mb-2 mx-auto d-block" />
                                    <p className="small text-muted mb-0">Click to browse or drag & drop image</p>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3" onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryId(null); }}>Cancel</button>
                            <button className="btn btn-primary-red flex-grow-1 py-3 fw-bold text-white shadow-sm rounded-3" style={{ backgroundColor: '#E51818' }} onClick={handleCategorySubmit}>{editingCategoryId ? "Save Changes" : "Save Category"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Modal Overlay */}
            {isContentModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-4 p-4 shadow-lg fade-in" style={{ width: '100%', maxWidth: '450px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold mb-0">{editingContentId ? "Edit Content Details" : "Create Content Item"}</h4>
                            <button className="btn btn-light p-2 rounded-circle border-0 d-flex justify-content-center align-items-center" onClick={() => { setIsContentModalOpen(false); setEditingContentId(null); }}>
                                <X size={20} className="text-muted" />
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Content Name</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. Guitar, Glasses" value={newContent.name} onChange={(e) => setNewContent({ ...newContent, name: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Content Image</label>
                                <div className="p-4 border border-dashed rounded-3 text-center cursor-pointer hover-bg-light transition-all" style={{ borderColor: '#CBD5E1' }}>
                                    <Image size={32} className="text-muted mb-2 mx-auto d-block" />
                                    <p className="small text-muted mb-0">Click to upload icon for this content</p>
                                </div>
                            </div>

                            <div className="col-12 mt-4 d-flex flex-column gap-3">
                                <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 border">
                                    <div>
                                        <p className="fw-bold mb-0 small">Require GSTIN</p>
                                        <p className="text-muted mb-0" style={{ fontSize: '11px' }}>Must provide GST number to ship</p>
                                    </div>
                                    <div className="form-check form-switch p-0 m-0">
                                        <input
                                            className="form-check-input ms-0"
                                            type="checkbox"
                                            checked={newContent.gstin}
                                            onChange={(e) => setNewContent({ ...newContent, gstin: e.target.checked })}
                                            style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 border">
                                    <div>
                                        <p className="fw-bold text-danger mb-0 small">Mark as Fragile</p>
                                        <p className="text-muted mb-0" style={{ fontSize: '11px' }}>Will alert rider to handle carefully</p>
                                    </div>
                                    <div className="form-check form-switch p-0 m-0">
                                        <input
                                            className="form-check-input ms-0"
                                            type="checkbox"
                                            checked={newContent.fragile}
                                            onChange={(e) => setNewContent({ ...newContent, fragile: e.target.checked })}
                                            style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 border">
                                    <div>
                                        <p className="fw-bold text-dark mb-0 small d-flex align-items-center gap-1"><AlertOctagon size={14} /> Restricted Item</p>
                                        <p className="text-muted mb-0" style={{ fontSize: '11px' }}>Notifies system of potential compliance issue</p>
                                    </div>
                                    <div className="form-check form-switch p-0 m-0">
                                        <input
                                            className="form-check-input ms-0"
                                            type="checkbox"
                                            checked={newContent.restricted}
                                            onChange={(e) => setNewContent({ ...newContent, restricted: e.target.checked })}
                                            style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                                <div className="p-3 bg-light rounded-3 border">
                                    <label className="fw-bold mb-2 small w-100">Extra Handling Charge (₹)</label>
                                    <input type="number" className="form-control bg-white border-0 py-2 fw-bold" placeholder="0" value={newContent.handlingFee} onChange={(e) => setNewContent({ ...newContent, handlingFee: e.target.value })} style={{ borderRadius: '8px' }} />
                                    <p className="text-muted mt-2 mb-0" style={{ fontSize: '11px' }}>Applied automatically to the base fare of the order.</p>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3" onClick={() => { setIsContentModalOpen(false); setEditingContentId(null); }}>Cancel</button>
                            <button className="btn btn-primary-red flex-grow-1 py-3 fw-bold text-white shadow-sm rounded-3" style={{ backgroundColor: '#E51818' }} onClick={handleContentSubmit}>{editingContentId ? "Save Changes" : "Save Content"}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Categories;
