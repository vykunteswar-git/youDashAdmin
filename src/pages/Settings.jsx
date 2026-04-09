import { useState, useRef } from "react";
import {
    Building2,
    CreditCard,
    ShoppingBag,
    RefreshCw,
    Bike,
    User,
    BarChart3,
    Banknote,
    Power,
    Save,
    RotateCcw,
    Upload,
    X,
    Globe,
    Phone,
    Mail,
    MapPin,
    Clock,
    DollarSign,
    Percent,
    ChevronRight,
    ChevronLeft,
    Image as ImageIcon,
    CheckCircle2,
    AlertTriangle
} from "lucide-react";

const TABS = [
    { id: "business", label: "Business Info", icon: Building2 },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "order", label: "Order", icon: ShoppingBag },
    { id: "refund", label: "Refund", icon: RefreshCw },
    { id: "deliveryman", label: "Deliveryman", icon: Bike },
    { id: "customer", label: "Customer", icon: User },
    { id: "priority", label: "Priority Setup", icon: BarChart3 },
    { id: "disbursement", label: "Disbursement", icon: Banknote },
];

const COUNTRIES = [
    { code: "IN", name: "India", flag: "🇮🇳", dial: "+91" },
    { code: "US", name: "United States", flag: "🇺🇸", dial: "+1" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44" },
    { code: "AE", name: "UAE", flag: "🇦🇪", dial: "+971" },
    { code: "SG", name: "Singapore", flag: "🇸🇬", dial: "+65" },
    { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61" },
    { code: "CA", name: "Canada", flag: "🇨🇦", dial: "+1" },
    { code: "DE", name: "Germany", flag: "🇩🇪", dial: "+49" },
];

const CURRENCIES = ["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)", "AED (د.إ)", "SGD (S$)"];
const TIMEZONES = ["Asia/Kolkata (IST)", "America/New_York (EST)", "America/Los_Angeles (PST)", "Europe/London (GMT)", "Asia/Dubai (GST)"];

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, size = "md" }) => {
    const w = size === "sm" ? 36 : 48;
    const h = size === "sm" ? 20 : 26;
    const dot = size === "sm" ? 14 : 18;
    return (
        <div
            onClick={onChange}
            className="cursor-pointer d-inline-flex align-items-center"
            style={{
                width: w, height: h, borderRadius: h,
                background: checked ? "#E51818" : "#CBD5E1",
                transition: "background 0.25s",
                position: "relative", cursor: "pointer"
            }}
        >
            <div style={{
                width: dot, height: dot, borderRadius: "50%", background: "#fff",
                position: "absolute",
                left: checked ? w - dot - 4 : 4,
                transition: "left 0.25s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.18)"
            }} />
        </div>
    );
};

// ─── Field Label ──────────────────────────────────────────────────────────────
const FieldLabel = ({ children, required, hint }) => (
    <label className="form-label fw-semibold mb-1" style={{ fontSize: 13, color: "#374151" }}>
        {children}
        {required && <span className="text-danger ms-1">*</span>}
        {hint && (
            <span
                className="ms-1 d-inline-flex align-items-center justify-content-center rounded-circle bg-secondary text-white"
                style={{ width: 16, height: 16, fontSize: 10, cursor: "help" }}
                title={hint}
            >?</span>
        )}
    </label>
);

// ─── Business Info Tab ────────────────────────────────────────────────────────
const BusinessInfoTab = ({ form, setForm, logoPreview, setLogoPreview }) => {
    const fileRef = useRef();
    const selectedCountry = COUNTRIES.find(c => c.code === form.countryCode) || COUNTRIES[0];

    const handleLogo = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    return (
        <div className="fade-in">
            {/* Maintenance Mode Card */}
            <div className="mb-4 p-4 bg-white rounded-4 border d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3"
                style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ maxWidth: 560 }}>
                    <h5 className="fw-bold mb-1" style={{ fontSize: 17 }}>Maintenance Mode</h5>
                    <p className="mb-0 text-muted" style={{ fontSize: 13 }}>
                        Turn on the Maintenance Mode will temporarily deactivate your selected systems as of your chosen date and time.
                    </p>
                </div>
                <div className="d-flex align-items-center gap-3 flex-shrink-0">
                    <span className="text-muted fw-medium" style={{ fontSize: 14, whiteSpace: "nowrap" }}>Maintenance Mode</span>
                    <Toggle checked={form.maintenanceMode} onChange={() => setForm(f => ({ ...f, maintenanceMode: !f.maintenanceMode }))} />
                </div>
            </div>

            {/* Basic Information Card */}
            <div className="p-4 bg-white rounded-4 border" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                <h5 className="fw-bold mb-1" style={{ fontSize: 17 }}>Basic Information</h5>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>Here you setup your all business information.</p>

                <div className="row g-4">
                    {/* Left + Center columns */}
                    <div className="col-12 col-lg-8">
                        <div className="row g-3">
                            {/* Business Name */}
                            <div className="col-12 col-md-6">
                                <FieldLabel required>Business Name</FieldLabel>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.businessName}
                                    onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                                    style={{ borderRadius: 8, fontSize: 14 }}
                                />
                            </div>

                            {/* Email */}
                            <div className="col-12 col-md-6">
                                <FieldLabel required>Email</FieldLabel>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0" style={{ borderRadius: "8px 0 0 8px" }}>
                                        <Mail size={15} className="text-muted" />
                                    </span>
                                    <input
                                        type="email"
                                        className="form-control border-start-0"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        style={{ borderRadius: "0 8px 8px 0", fontSize: 14 }}
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="col-12 col-md-6">
                                <FieldLabel required>Phone</FieldLabel>
                                <div className="d-flex gap-2">
                                    <select
                                        className="form-select flex-shrink-0"
                                        value={form.countryCode}
                                        onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}
                                        style={{ width: 96, borderRadius: 8, fontSize: 14 }}
                                    >
                                        {COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        style={{ borderRadius: 8, fontSize: 14 }}
                                    />
                                </div>
                            </div>

                            {/* Country */}
                            <div className="col-12 col-md-6">
                                <FieldLabel required>Country</FieldLabel>
                                <div className="position-relative">
                                    <Globe size={15} className="position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2 }} />
                                    <select
                                        className="form-select ps-5"
                                        value={form.countryCode}
                                        onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}
                                        style={{ borderRadius: 8, fontSize: 14 }}
                                    >
                                        {COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="col-12">
                                <FieldLabel required hint="Enter the registered business address">Address</FieldLabel>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0" style={{ borderRadius: "8px 0 0 8px" }}>
                                        <MapPin size={15} className="text-muted" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Enter full business address"
                                        value={form.address}
                                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                        style={{ borderRadius: "0 8px 8px 0", fontSize: 14 }}
                                    />
                                </div>
                            </div>

                            {/* Currency + Timezone */}
                            <div className="col-12 col-md-6">
                                <FieldLabel required>Currency</FieldLabel>
                                <select
                                    className="form-select"
                                    value={form.currency}
                                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                                    style={{ borderRadius: 8, fontSize: 14 }}
                                >
                                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="col-12 col-md-6">
                                <FieldLabel required>Timezone</FieldLabel>
                                <div className="position-relative">
                                    <Clock size={15} className="position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2 }} />
                                    <select
                                        className="form-select ps-5"
                                        value={form.timezone}
                                        onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                                        style={{ borderRadius: 8, fontSize: 14 }}
                                    >
                                        {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upload Logo */}
                    <div className="col-12 col-lg-4">
                        <FieldLabel required>Upload Logo</FieldLabel>
                        <p className="text-muted mb-2" style={{ fontSize: 12 }}>Upload your business logo</p>

                        <div
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => fileRef.current.click()}
                            className="position-relative d-flex align-items-center justify-content-center cursor-pointer"
                            style={{
                                border: "2px dashed #CBD5E1",
                                borderRadius: 12,
                                minHeight: 180,
                                background: "#F8FAFC",
                                transition: "border-color 0.2s",
                                cursor: "pointer",
                                overflow: "hidden"
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "#E51818"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "#CBD5E1"}
                        >
                            {logoPreview ? (
                                <>
                                    <img src={logoPreview} alt="Logo Preview" style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain", padding: 8 }} />
                                    <button
                                        className="btn btn-sm position-absolute top-0 end-0 m-2"
                                        style={{ background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "2px 6px" }}
                                        onClick={e => { e.stopPropagation(); setLogoPreview(null); }}
                                    >
                                        <X size={14} color="white" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center p-3">
                                    <div className="mb-2 d-flex justify-content-center">
                                        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Upload size={22} className="text-muted" />
                                        </div>
                                    </div>
                                    <p className="mb-0 fw-semibold" style={{ fontSize: 13, color: "#374151" }}>Click or drag & drop</p>
                                    <p className="mb-0 text-muted" style={{ fontSize: 11 }}>PNG, JPG, SVG up to 2MB</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={handleLogo} />

                        {/* Favicon Upload */}
                        <div className="mt-3">
                            <FieldLabel>Favicon</FieldLabel>
                            <p className="text-muted mb-2" style={{ fontSize: 12 }}>Upload browser tab icon (32×32 px recommended)</p>
                            <div
                                className="d-flex align-items-center gap-3 p-3 rounded-3"
                                style={{ border: "1.5px dashed #CBD5E1", background: "#F8FAFC", cursor: "pointer" }}
                            >
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#E51818", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <ImageIcon size={16} color="white" />
                                </div>
                                <div>
                                    <p className="mb-0 fw-semibold" style={{ fontSize: 12 }}>favicon.ico</p>
                                    <p className="mb-0 text-muted" style={{ fontSize: 11 }}>Click to change</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Payment Tab ──────────────────────────────────────────────────────────────
const PaymentTab = ({ form, setForm }) => {
    const gateways = [
        { key: "razorpay", label: "Razorpay", color: "#072654" },
        { key: "stripe", label: "Stripe", color: "#635BFF" },
        { key: "paypal", label: "PayPal", color: "#003087" },
        { key: "cashOnDelivery", label: "Cash on Delivery", color: "#10B981" },
        { key: "wallet", label: "YouDash Wallet", color: "#E51818" },
    ];

    return (
        <div className="fade-in">
            <div className="p-4 bg-white rounded-4 border mb-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                <h5 className="fw-bold mb-1" style={{ fontSize: 17 }}>Payment Gateways</h5>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>Enable or disable payment methods available to customers.</p>
                <div className="row g-3">
                    {gateways.map(gw => (
                        <div className="col-12 col-md-6" key={gw.key}>
                            <div className="d-flex align-items-center justify-content-between p-3 rounded-3 border">
                                <div className="d-flex align-items-center gap-3">
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: gw.color }} />
                                    <span className="fw-semibold" style={{ fontSize: 14 }}>{gw.label}</span>
                                </div>
                                <Toggle
                                    checked={form.payments?.[gw.key] ?? true}
                                    onChange={() => setForm(f => ({ ...f, payments: { ...(f.payments || {}), [gw.key]: !(f.payments?.[gw.key] ?? true) } }))}
                                    size="sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-white rounded-4 border" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                <h5 className="fw-bold mb-1" style={{ fontSize: 17 }}>Transaction Limits</h5>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>Set minimum and maximum order values for transactions.</p>
                <div className="row g-3">
                    {[{ key: "minOrder", label: "Minimum Order Value" }, { key: "maxOrder", label: "Maximum Order Value" }, { key: "walletLimit", label: "Wallet Top-up Limit" }].map(f => (
                        <div className="col-12 col-md-4" key={f.key}>
                            <FieldLabel>{f.label}</FieldLabel>
                            <div className="input-group">
                                <span className="input-group-text bg-light" style={{ borderRadius: "8px 0 0 8px" }}>
                                    <DollarSign size={14} className="text-muted" />
                                </span>
                                <input type="number" className="form-control border-start-0" defaultValue={f.key === "minOrder" ? 50 : f.key === "maxOrder" ? 5000 : 10000} style={{ borderRadius: "0 8px 8px 0", fontSize: 14 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Order Tab ────────────────────────────────────────────────────────────────
const OrderTab = () => (
    <div className="fade-in">
        <div className="p-4 bg-white rounded-4 border mb-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <h5 className="fw-bold mb-1" style={{ fontSize: 17 }}>Order Configuration</h5>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>Configure order processing and delivery rules.</p>
            <div className="row g-3">
                {[
                    { label: "Auto-Accept Orders", desc: "Automatically accept orders without manual confirmation" },
                    { label: "Order Cancellation Window", desc: "Allow customers to cancel within 5 minutes of placing" },
                    { label: "Real-time Tracking", desc: "Enable live GPS tracking for customers" },
                    { label: "Scheduled Orders", desc: "Allow customers to schedule delivery for a later time" },
                ].map(item => (
                    <div className="col-12" key={item.label}>
                        <div className="d-flex align-items-center justify-content-between p-3 rounded-3 border">
                            <div>
                                <p className="mb-0 fw-semibold" style={{ fontSize: 14 }}>{item.label}</p>
                                <p className="mb-0 text-muted" style={{ fontSize: 12 }}>{item.desc}</p>
                            </div>
                            <Toggle checked={true} onChange={() => { }} size="sm" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// ─── Generic Placeholder Tab ──────────────────────────────────────────────────
const PlaceholderTab = ({ label, icon: Icon, color = "#E51818" }) => (
    <div className="fade-in d-flex flex-column align-items-center justify-content-center py-5 text-center">
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon size={32} style={{ color }} />
        </div>
        <h5 className="fw-bold mb-2">{label} Settings</h5>
        <p className="text-muted" style={{ fontSize: 14, maxWidth: 380 }}>
            Configure all settings related to <strong>{label}</strong> here. This section is being set up.
        </p>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Settings = () => {
    const [activeTab, setActiveTab] = useState("business");
    const [tabScrollOffset, setTabScrollOffset] = useState(0);
    const [logoPreview, setLogoPreview] = useState(null);
    const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
    const tabBarRef = useRef();

    const [form, setForm] = useState({
        businessName: "Youdash",
        email: "info@youdash.in",
        phone: "7033323455",
        countryCode: "IN",
        address: "",
        currency: "INR (₹)",
        timezone: "Asia/Kolkata (IST)",
        maintenanceMode: false,
        payments: {
            razorpay: true,
            stripe: false,
            paypal: false,
            cashOnDelivery: true,
            wallet: true,
        }
    });

    const handleSave = () => {
        setSaveState("saving");
        setTimeout(() => {
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 2000);
        }, 900);
    };

    const handleReset = () => {
        setForm(f => ({
            ...f,
            businessName: "Youdash",
            email: "info@youdash.in",
            phone: "7033323455",
            countryCode: "IN",
            address: "",
            currency: "INR (₹)",
            timezone: "Asia/Kolkata (IST)",
            maintenanceMode: false,
        }));
        setLogoPreview(null);
    };

    const scrollTabs = (dir) => {
        const bar = tabBarRef.current;
        if (!bar) return;
        bar.scrollBy({ left: dir * 200, behavior: "smooth" });
    };

    const activeTabObj = TABS.find(t => t.id === activeTab);

    const renderTab = () => {
        switch (activeTab) {
            case "business": return <BusinessInfoTab form={form} setForm={setForm} logoPreview={logoPreview} setLogoPreview={setLogoPreview} />;
            case "payment": return <PaymentTab form={form} setForm={setForm} />;
            case "order": return <OrderTab />;
            default: return <PlaceholderTab label={activeTabObj?.label} icon={activeTabObj?.icon} />;
        }
    };

    return (
        <div className="container-fluid fade-in pb-5" style={{ maxWidth: 1200 }}>

            {/* ── Page Header */}
            <div className="d-flex align-items-center gap-3 mb-4">
                <div style={{
                    width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#E51818,#ff6b35)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                    <Building2 size={22} color="white" />
                </div>
                <div>
                    <h4 className="fw-bold mb-0" style={{ fontSize: 22 }}>Business Settings</h4>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>Manage your business configuration and preferences</p>
                </div>
            </div>

            {/* ── Horizontal Tab Bar */}
            <div className="bg-white rounded-4 border mb-4 px-3 py-2 d-flex align-items-center gap-2" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)", position: "relative" }}>
                <button className="btn btn-sm p-1 flex-shrink-0" onClick={() => scrollTabs(-1)} style={{ color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8 }}>
                    <ChevronLeft size={16} />
                </button>

                <div
                    ref={tabBarRef}
                    className="d-flex gap-1 overflow-hidden flex-nowrap"
                    style={{ flex: 1, scrollBehavior: "smooth", overflowX: "hidden" }}
                >
                    {TABS.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="btn flex-shrink-0 d-flex align-items-center gap-2"
                                style={{
                                    borderRadius: 8,
                                    padding: "6px 14px",
                                    fontSize: 13,
                                    fontWeight: active ? 700 : 500,
                                    background: active ? "#E51818" : "transparent",
                                    color: active ? "white" : "#64748B",
                                    border: "none",
                                    transition: "all 0.2s",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <button className="btn btn-sm p-1 flex-shrink-0" onClick={() => scrollTabs(1)} style={{ color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 8 }}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* ── Tab Content */}
            {renderTab()}

            {/* ── Bottom Action Bar */}
            <div
                className="mt-4 p-3 bg-white border rounded-4 d-flex justify-content-end gap-3 align-items-center"
                style={{ boxShadow: "0 -1px 12px rgba(0,0,0,0.05)", position: "sticky", bottom: 16 }}
            >
                {saveState === "saved" && (
                    <div className="d-flex align-items-center gap-2 text-success me-auto fade-in">
                        <CheckCircle2 size={16} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Changes saved successfully!</span>
                    </div>
                )}

                <button
                    onClick={handleReset}
                    className="btn d-flex align-items-center gap-2"
                    style={{ borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", color: "#374151", fontSize: 14, fontWeight: 600, padding: "8px 20px" }}
                >
                    <RotateCcw size={15} />
                    Reset
                </button>

                <button
                    onClick={handleSave}
                    disabled={saveState === "saving"}
                    className="btn d-flex align-items-center gap-2"
                    style={{
                        borderRadius: 10,
                        background: saveState === "saving" ? "#94A3B8" : "linear-gradient(135deg,#E51818,#c41414)",
                        color: "white",
                        fontSize: 14,
                        fontWeight: 700,
                        padding: "8px 24px",
                        border: "none",
                        boxShadow: saveState === "saving" ? "none" : "0 4px 12px rgba(229,24,24,0.3)",
                        transition: "all 0.3s"
                    }}
                >
                    <Save size={15} />
                    {saveState === "saving" ? "Saving…" : "Save Information"}
                </button>
            </div>
        </div>
    );
};

export default Settings;
