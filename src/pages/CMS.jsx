import { useState } from "react";
import {
    Image,
    Plus,
    MoreVertical,
    Trash2,
    Edit,
    Eye,
    Zap,
    Layout,
    Tag,
    Clock,
    CheckCircle2,
    PlusCircle,
    ChevronRight,
    ArrowRight
} from "lucide-react";

/* TODO(Backend): No /admin/... CMS or content endpoints on deployed OpenAPI; content list is mock. Wire when matching admin APIs exist. */

const CMS = () => {
    const [banners, setBanners] = useState([
        { id: 1, title: "Diwali Fest 🪔", type: "Hero Banner", status: "Active", start: "Oct 20", end: "Oct 25", link: "/promos/fest" },
        { id: 2, title: "Rider Onboarding", type: "Rider Banner", status: "Active", start: "Oct 1", end: "Nov 1", link: "/riders/join" },
        { id: 3, title: "Weekend Saver", type: "App Card", status: "Scheduled", start: "Oct 26", end: "Oct 27", link: "/offer/save" },
        { id: 4, title: "New City Launch", type: "Hero Banner", status: "Inactive", start: "Sep 1", end: "Sep 15", link: "/news/city" },
    ]);

    return (
        <div className="container-fluid fade-in">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Content Management (CMS)</h2>
                    <p className="text-muted small mb-0">Control app banners, dynamic offers, and promotional content layouts.</p>
                </div>
                <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                    <Plus size={18} /> <span>Create New Content</span>
                </button>
            </div>

            <div className="row g-4 mb-5">
                {banners.map((banner) => (
                    <div key={banner.id} className="col-12 col-md-6 col-xl-3">
                        <div className={`dashboard-card h-100 border-0 shadow-sm transition-all hover-scale position-relative overflow-hidden ${banner.status === 'Inactive' ? 'opacity-75 grayscale' : ''}`}>
                            <div className="mb-3 rounded-3 bg-light d-flex align-items-center justify-content-center p-5 position-relative" style={{ minHeight: '140px' }}>
                                <Image size={48} className="text-muted opacity-20" />
                                <div className="position-absolute top-0 end-0 p-2"><button className="btn btn-link p-0 text-muted"><MoreVertical size={18} /></button></div>
                                <div className="position-absolute bottom-0 start-0 m-2"><span className="p-1 px-2 border bg-white rounded small" style={{ fontSize: '9px' }}>{banner.type}</span></div>
                            </div>
                            <h6 className="fw-bold mb-1">{banner.title}</h6>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <small className="text-muted" style={{ fontSize: '10px' }}>{banner.start} - {banner.end}</small>
                                <span className={`status-badge status-${banner.status.toLowerCase() === 'active' ? 'active' : banner.status.toLowerCase() === 'scheduled' ? 'info' : 'cancelled'} p-1 px-3`} style={{ fontSize: '10px' }}>{banner.status}</span>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-light flex-grow-1 small py-2 fw-bold rounded-3">Edit</button>
                                <button className="btn btn-light px-3 py-2 rounded-3 text-muted"><Eye size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4">
                <div className="col-12 col-xl-6">
                    <div className="dashboard-card border-0 shadow-sm h-100">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Tag size={20} className="text-primary-red" /> Active Offers & Coupons
                        </h5>
                        <div className="d-flex flex-column gap-3">
                            {[
                                { code: "FEST50", label: "FLAT 50% Off (Max 100)", usage: "124/500 times" },
                                { code: "FIRSTDAY", label: "Free Delivery on 1st Order", usage: "Daily Pool" },
                                { code: "RIDERPLUS", label: "₹20 Bonus for Riders", usage: "35 / 500 Riders" }
                            ].map((promo, i) => (
                                <div key={i} className="p-3 border border-2 border-dashed rounded-3 d-flex align-items-center justify-content-between border-secondary border-opacity-10">
                                    <div>
                                        <p className="mb-0 fw-bold small text-primary-red" style={{ color: '#E51818' }}>{promo.code}</p>
                                        <small className="text-muted" style={{ fontSize: '10px' }}>{promo.label} • {promo.usage}</small>
                                    </div>
                                    <button className="btn btn-link p-0 text-muted"><MoreVertical size={16} /></button>
                                </div>
                            ))}
                            <button className="btn btn-light w-100 mt-2 py-3 small fw-bold border-dashed border-2 d-flex align-items-center justify-content-center gap-2 border-secondary border-opacity-20 text-muted">
                                <PlusCircle size={18} /> <span>Create New Promo Code</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-6">
                    <div className="dashboard-card border-0 shadow-sm h-100">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Layout size={20} className="text-primary-red" /> App Content Sections
                        </h5>
                        <div className="d-flex flex-column gap-3">
                            {[
                                { label: "Hero Slider (Top)", items: "3 Active Banners" },
                                { label: "Our Services (Icons)", items: "Express, Standard, Bulk..." },
                                { label: "Trending News (Bottom)", items: "2 Active Cards" }
                            ].map((section, i) => (
                                <div key={i} className="p-3 border rounded-3 d-flex align-items-center justify-content-between hover-bg-light transition-all cursor-pointer">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="p-2 bg-light rounded-3 text-muted">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="mb-0 fw-bold small">{section.label}</p>
                                            <small className="text-muted" style={{ fontSize: '10px' }}>{section.items}</small>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-muted opacity-50" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CMS;
