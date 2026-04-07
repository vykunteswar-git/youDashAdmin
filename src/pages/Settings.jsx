import { useState } from "react";
import {
    Settings as SettingsIcon,
    Smartphone,
    TerminalSquare,
    Zap,
    ShieldAlert,
    Power,
    Sliders,
    Save,
    Info,
    CheckCircle2
} from "lucide-react";

const Settings = () => {
    const [activeTab, setActiveTab] = useState("Killswitches");
    const [isSaving, setIsSaving] = useState(false);

    const [config, setConfig] = useState({
        global: {
            appStatus: "Operational", // Operational, Intermittent, Maintenance
            blockNewBookings: false,
            forceAppUpdateUser: true,
            forceAppUpdateRider: false,
            minVersionUser: "3.2.0",
            minVersionRider: "2.8.5"
        },
        features: {
            insurance: true,
            expressDelivery: true,
            walletSystem: true,
            coupons: false,
            referrals: true
        },
        limits: {
            maxOrdersPerRider: 3,
            maxDistanceKm: 65,
            maxWeightKg: 20
        }
    });

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 800);
    };

    const toggleFeature = (key) => {
        setConfig({
            ...config,
            features: { ...config.features, [key]: !config.features[key] }
        });
    };

    const toggleGlobal = (key) => {
        setConfig({
            ...config,
            global: { ...config.global, [key]: !config.global[key] }
        });
    };

    const updateLimit = (key, value) => {
        setConfig({
            ...config,
            limits: { ...config.limits, [key]: value }
        });
    };

    const updateGlobalText = (key, value) => {
        setConfig({
            ...config,
            global: { ...config.global, [key]: value }
        });
    };

    return (
        <div className="container-fluid fade-in position-relative">
            {/* Header Section */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Remote App Config</h2>
                    <p className="text-muted small mb-0">Control live features, enforce updates, and trigger killswitches instantly.</p>
                </div>
                <button onClick={handleSave} className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: isSaving ? '#10B981' : '#E51818', color: 'white', borderRadius: '10px', transition: 'all 0.3s' }}>
                    {isSaving ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    <span>{isSaving ? "Live Synced!" : "Sync to Apps"}</span>
                </button>
            </div>

            <div className="row g-4">
                {/* Navigation Panel */}
                <div className="col-12 col-xl-3 h-100">
                    <div className="dashboard-card border-0 shadow-sm p-3 bg-white">
                        <div className="d-flex flex-column gap-2 mb-4">
                            {[
                                { label: "Killswitches", id: "Killswitches", icon: Power, color: "text-danger" },
                                { label: "Feature Toggles", id: "Features", icon: Zap, color: "text-warning" },
                                { label: "Operational Limits", id: "Limits", icon: Sliders, color: "text-primary-red" },
                                { label: "Version Control", id: "Versions", icon: TerminalSquare, color: "text-info" }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`btn py-3 px-3 rounded-3 small fw-bold border-0 text-start d-flex align-items-center gap-3 transition-all ${activeTab === item.id ? 'bg-primary-red text-white' : 'text-muted hover-bg-light'}`}
                                    style={{ backgroundColor: activeTab === item.id ? '#E51818' : '' }}
                                >
                                    <item.icon size={18} className={activeTab === item.id ? 'text-white' : item.color} /> {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-3 bg-light rounded-3 text-center border dashed-border">
                            <ShieldAlert size={24} className="text-muted mb-2 opacity-50" />
                            <p className="small text-muted mb-0 fw-bold">Live Push Notice</p>
                            <p className="mb-0 text-muted" style={{ fontSize: '10px' }}>Changes saved here bypass app stores and apply immediately to devices via Firebase Config.</p>
                        </div>
                    </div>
                </div>

                {/* Configurations Area */}
                <div className="col-12 col-xl-9 h-100">
                    <div className="dashboard-card border-0 shadow-sm h-100 bg-white p-4">

                        {activeTab === "Killswitches" && (
                            <div className="fade-in">
                                <h5 className="fw-bold mb-4 border-bottom pb-3"><Power size={20} className="text-danger me-2" /> Master Killswitches</h5>

                                <div className="p-4 border border-danger border-opacity-25 rounded-4 mb-4 bg-light position-relative overflow-hidden">
                                    <div className="position-absolute border-start border-4 border-danger h-100 top-0 start-0"></div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="fw-bold text-danger mb-1">Global Booking Pause</h6>
                                            <p className="text-muted small mb-0">Completely disables new order creation across all zones. Ongoing orders remain active.</p>
                                        </div>
                                        <div className="form-check form-switch p-0">
                                            <input className="form-check-input ms-0 cursor-pointer" type="checkbox" checked={config.global.blockNewBookings} onChange={() => toggleGlobal('blockNewBookings')} style={{ width: '50px', height: '25px', borderColor: config.global.blockNewBookings ? '#E51818' : '' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border rounded-4">
                                    <h6 className="fw-bold mb-3">System Traffic State</h6>
                                    <select className="form-select bg-light border-0 py-3 fw-bold shadow-sm" value={config.global.appStatus} onChange={(e) => updateGlobalText('appStatus', e.target.value)} style={{ borderRadius: '10px' }}>
                                        <option value="Operational">🟢 System Operational (Normal Flow)</option>
                                        <option value="Intermittent">🟡 Intermittent Issues (Shows banner in app)</option>
                                        <option value="Maintenance">🔴 Maintenance Mode (App offline message)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === "Features" && (
                            <div className="fade-in">
                                <h5 className="fw-bold mb-4 border-bottom pb-3"><Zap size={20} className="text-warning me-2" /> Logic & Feature Toggles</h5>
                                <div className="row g-4">
                                    {[
                                        { key: 'expressDelivery', label: 'Express Delivery (4-Hour)', desc: 'Blocks users from selecting 4-hour rush delivery on the Home screen.' },
                                        { key: 'insurance', label: 'Package Insurance Engine', desc: 'Disables the add-on insurance fee selection during checkout.' },
                                        { key: 'walletSystem', label: 'YouDash Wallet', desc: 'Hides wallet balance and prevents paying from wallet funds.' },
                                        { key: 'coupons', label: 'Promo Codes & Coupons', desc: 'Removes the coupon input box temporarily from the app.' },
                                        { key: 'referrals', label: 'Referral Program', desc: 'Turns off the Earn Cash screen for both users and riders.' }
                                    ].map(feat => (
                                        <div key={feat.key} className="col-12 col-md-6">
                                            <div className="p-3 border rounded-3 h-100 d-flex flex-column hover-bg-light transition-all">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold small">{feat.label}</span>
                                                    <div className="form-check form-switch p-0">
                                                        <input className="form-check-input ms-0 cursor-pointer" type="checkbox" checked={config.features[feat.key]} onChange={() => toggleFeature(feat.key)} style={{ width: '40px', height: '20px' }} />
                                                    </div>
                                                </div>
                                                <p className="text-muted mb-0" style={{ fontSize: '11px' }}>{feat.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "Limits" && (
                            <div className="fade-in">
                                <h5 className="fw-bold mb-4 border-bottom pb-3"><Sliders size={20} className="text-primary-red me-2" /> Global Constraints</h5>
                                <div className="row g-4">
                                    <div className="col-12">
                                        <div className="p-4 border rounded-4 d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="fw-bold mb-1">Max Orders Per Rider</h6>
                                                <p className="text-muted small mb-0">Hard limit on how many concurrent orders an agent can accept.</p>
                                            </div>
                                            <div className="input-group" style={{ width: '120px' }}>
                                                <input type="number" className="form-control text-center py-2 fw-bold" value={config.limits.maxOrdersPerRider} onChange={(e) => updateLimit('maxOrdersPerRider', parseInt(e.target.value))} style={{ borderRadius: '10px' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="p-4 border rounded-4 d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="fw-bold mb-1">Absolute Max Distance (KM)</h6>
                                                <p className="text-muted small mb-0">System automatically rejects any order requested beyond this polyline route distance.</p>
                                            </div>
                                            <div className="input-group" style={{ width: '120px' }}>
                                                <input type="number" className="form-control text-center py-2 fw-bold" value={config.limits.maxDistanceKm} onChange={(e) => updateLimit('maxDistanceKm', parseInt(e.target.value))} style={{ borderRadius: '10px' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="p-4 border rounded-4 d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="fw-bold mb-1">Hard Weight Cap (KG)</h6>
                                                <p className="text-muted small mb-0">Maximum cart total weight. App shows "Exceeds Capacity" if crossed.</p>
                                            </div>
                                            <div className="input-group" style={{ width: '120px' }}>
                                                <input type="number" className="form-control text-center py-2 fw-bold" value={config.limits.maxWeightKg} onChange={(e) => updateLimit('maxWeightKg', parseInt(e.target.value))} style={{ borderRadius: '10px' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "Versions" && (
                            <div className="fade-in">
                                <h5 className="fw-bold mb-4 border-bottom pb-3"><TerminalSquare size={20} className="text-info me-2" /> App Version Control</h5>

                                <div className="row g-4">
                                    <div className="col-12 col-md-6">
                                        <div className="p-4 bg-light rounded-4 border">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <Smartphone size={20} className="text-primary-red" />
                                                <h6 className="fw-bold mb-0">User Application</h6>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label small text-muted fw-bold">Required Minimum Version</label>
                                                <input type="text" className="form-control bg-white border py-2 fw-bold font-monospace" value={config.global.minVersionUser} onChange={(e) => updateGlobalText('minVersionUser', e.target.value)} style={{ borderRadius: '10px' }} />
                                            </div>

                                            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                                <span className="small fw-bold text-dark">Force Update UI</span>
                                                <div className="form-check form-switch p-0">
                                                    <input className="form-check-input ms-0 cursor-pointer" type="checkbox" checked={config.global.forceAppUpdateUser} onChange={() => toggleGlobal('forceAppUpdateUser')} style={{ width: '40px', height: '20px' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <div className="p-4 bg-light rounded-4 border">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <Smartphone size={20} className="text-dark" />
                                                <h6 className="fw-bold mb-0">Rider Application</h6>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label small text-muted fw-bold">Required Minimum Version</label>
                                                <input type="text" className="form-control bg-white border py-2 fw-bold font-monospace" value={config.global.minVersionRider} onChange={(e) => updateGlobalText('minVersionRider', e.target.value)} style={{ borderRadius: '10px' }} />
                                            </div>

                                            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                                                <span className="small fw-bold text-dark">Force Update UI</span>
                                                <div className="form-check form-switch p-0">
                                                    <input className="form-check-input ms-0 cursor-pointer" type="checkbox" checked={config.global.forceAppUpdateRider} onChange={() => toggleGlobal('forceAppUpdateRider')} style={{ width: '40px', height: '20px' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
