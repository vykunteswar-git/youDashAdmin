import { useState } from "react";
import {
  CreditCard,
  Settings,
  CheckCircle2,
  Zap,
  Info,
  Smartphone,
  Banknote,
  AlertTriangle
} from "lucide-react";

const Payments = () => {
  const [configs, setConfigs] = useState({
    masterOnlineSwitch: true, // Emergency switch
    upi: true,
    card: true,
    cod: true,
    wallet: true,
    payerOptions: {
      sender: true,
      receiver: true,
      both: true
    },
    defaultPayAt: "Sender",
    tax: 18,
    insurance: 5
  });

  const paymentMethods = [
    { id: "upi", label: "UPI & QR Codes", icon: Smartphone, description: "Instant settlements via Razorpay/PhonePe gateways." },
    { id: "card", label: "Credit & Debit Cards", icon: CreditCard, description: "Standard card processing. 2% MDR fee applies." },
    { id: "wallet", label: "YouDash Wallet", icon: Zap, description: "Internal customer wallet and promotional cashback funds." },
    { id: "cod", label: "Cash on Delivery", icon: Banknote, description: "Physical cash collection by rider. Risk of exact change issues." }
  ];

  const handlePayerToggle = (key) => {
    setConfigs({
      ...configs,
      payerOptions: {
        ...configs.payerOptions,
        [key]: !configs.payerOptions[key]
      }
    });
  };

  return (
    <div className="container-fluid fade-in position-relative">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Payment Routing & Gateways</h2>
          <p className="text-muted small mb-0">Manage active payment gateways and dynamic "Who Pays" customer logic.</p>
        </div>
        <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
          <CheckCircle2 size={18} /> <span>Publish Config</span>
        </button>
      </div>

      <div className="row g-4">
        {/* Main Configuration Section */}
        <div className="col-12 col-xl-8">
          {/* EMERGENCY SWITCH */}
          <div className="dashboard-card border-0 shadow-sm p-4 mb-4 bg-white position-relative overflow-hidden">
            <div className={`position-absolute h-100 border-start border-4 top-0 start-0 ${configs.masterOnlineSwitch ? 'border-success' : 'border-danger'}`}></div>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold d-flex align-items-center gap-2 text-dark mb-1">
                  {configs.masterOnlineSwitch ? <CheckCircle2 className="text-success" size={20} /> : <AlertTriangle className="text-danger" size={20} />}
                  Master Online Gateway Switch
                </h5>
                <p className={`small mb-0 ${configs.masterOnlineSwitch ? 'text-muted' : 'text-danger fw-bold'}`}>
                  {configs.masterOnlineSwitch ? "All selected gateways are currently active and processing." : "EMERGENCY: All online payments are currently blocked. App defaults to COD/Wallet."}
                </p>
              </div>
              <div className="form-check form-switch p-0">
                <input className="form-check-input ms-0 cursor-pointer" type="checkbox" checked={configs.masterOnlineSwitch} onChange={() => setConfigs({ ...configs, masterOnlineSwitch: !configs.masterOnlineSwitch })} style={{ width: '50px', height: '25px', borderColor: configs.masterOnlineSwitch ? '#10B981' : '' }} />
              </div>
            </div>
          </div>

          <div className="dashboard-card border-0 shadow-sm mb-4">
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <Settings size={20} className="text-primary-red" /> Dynamic Payment Methods
            </h5>
            <div className={`d-flex flex-column gap-3 ${!configs.masterOnlineSwitch ? 'opacity-50 pointer-events-none' : ''}`}>
              {paymentMethods.map(method => (
                <div key={method.id} className="p-3 border rounded-3 d-flex align-items-center justify-content-between transition-all hover-bg-light">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-light rounded-3">
                      <method.icon size={20} className={configs[method.id] ? "text-primary-red" : "text-muted"} />
                    </div>
                    <div>
                      <p className="mb-0 fw-bold small">{method.label}</p>
                      <small className="text-muted" style={{ fontSize: '10px' }}>{method.description}</small>
                    </div>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={configs[method.id]}
                      onChange={() => setConfigs({ ...configs, [method.id]: !configs[method.id] })}
                      style={{ width: '45px', height: '22px' }}
                      disabled={!configs.masterOnlineSwitch && method.id !== 'cod'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card border-0 shadow-sm">
            <h5 className="fw-bold mb-4">Service Fees & Tax Base</h5>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted">Platform GST Percentage (%)</label>
                <div className="input-group">
                  <input type="number" className="form-control" value={configs.tax} onChange={(e) => setConfigs({ ...configs, tax: e.target.value })} />
                  <span className="input-group-text bg-white fw-bold">%</span>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted">Additional Insurance Premium Rate (%)</label>
                <div className="input-group">
                  <input type="number" className="form-control" value={configs.insurance} onChange={(e) => setConfigs({ ...configs, insurance: e.target.value })} />
                  <span className="input-group-text bg-white fw-bold">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Selection Section */}
        <div className="col-12 col-xl-4 h-100">
          <div className="dashboard-card border-0 shadow-sm mb-4 h-100 d-flex flex-column">
            <h5 className="fw-bold mb-4">Who Pays? (Customer Logic)</h5>
            <p className="small text-muted mb-4">Enable which options the user sees in the app when booking a delivery.</p>

            <div className="d-flex flex-column gap-3 mb-4">
              {[
                { id: "sender", label: "Sender Pays", desc: "Allows the sender to prepay before package pickup." },
                { id: "receiver", label: "Receiver Pays", desc: "Allows rider to collect payment upon delivery." },
                { id: "both", label: "Split / Both Selectable", desc: "System allows users to split or choose between the two dynamically." }
              ].map(option => (
                <div key={option.id} className="p-3 border rounded-3 position-relative">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div>
                        <p className="mb-0 fw-bold small">{option.label}</p>
                        <small className="text-muted" style={{ fontSize: '10px' }}>{option.desc}</small>
                      </div>
                    </div>
                    <div className="form-check form-switch p-0">
                      <input className="form-check-input ms-0 cursor-pointer" type="checkbox" checked={configs.payerOptions[option.id]} onChange={() => handlePayerToggle(option.id)} style={{ width: '40px', height: '20px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h6 className="fw-bold fs-6 mt-2 mb-3 pt-3 border-top">Default Checkout Selection</h6>
            <select className="form-select bg-light border-0 py-2 fw-bold mb-auto" value={configs.defaultPayAt} onChange={(e) => setConfigs({ ...configs, defaultPayAt: e.target.value })} style={{ borderRadius: '10px' }}>
              <option value="Sender">Force Default to: Sender Pays</option>
              <option value="Receiver">Force Default to: Receiver Pays</option>
            </select>

            <div className="p-3 bg-light rounded-3 d-flex gap-2 mt-4 text-center">
              <Info size={16} className="text-info flex-shrink-0 mt-1" />
              <p className="mb-0 text-muted mx-auto" style={{ fontSize: '10px' }}>
                Changing these toggles modifies the Checkout UI screen logic in the main YouDash app immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
