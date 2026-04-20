import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    Send,
    Users,
    Bike,
    Settings,
    Plus,
    Image,
    MoreVertical,
    Search,
    ChevronRight,
    Clock,
    UserPlus,
    FlaskConical,
} from "lucide-react";
import {
    notificationAdminService,
    unwrapList,
    readApiMessage,
    isApiFailureBody,
    getAxiosErrorMessage,
} from "../services/apiService";

const Notifications = () => {
    const [targetsLoading, setTargetsLoading] = useState(true);
    const [targetsError, setTargetsError] = useState("");
    const [fcmTargets, setFcmTargets] = useState([]);
    const [selectedTargetId, setSelectedTargetId] = useState("");

    const [pushToken, setPushToken] = useState("");
    const [pushTitle, setPushTitle] = useState("");
    const [pushBody, setPushBody] = useState("");
    const [pushType, setPushType] = useState("");
    const [pushDataJson, setPushDataJson] = useState("");
    const [pushSubmitting, setPushSubmitting] = useState(false);
    const [pushFeedback, setPushFeedback] = useState({ type: "", text: "" });

    const [target, setTarget] = useState("All Users");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const loadTargets = async () => {
            setTargetsLoading(true);
            setTargetsError("");
            try {
                const res = await notificationAdminService.listFcmTargets();
                const raw = res?.data;
                if (isApiFailureBody(raw)) {
                    throw new Error(readApiMessage(raw) || "Failed to load FCM targets.");
                }
                const list = unwrapList(res);
                if (!cancelled) {
                    setFcmTargets(list);
                }
            } catch (e) {
                if (!cancelled) {
                    setTargetsError(getAxiosErrorMessage(e, "Unable to load FCM targets."));
                    setFcmTargets([]);
                }
            } finally {
                if (!cancelled) setTargetsLoading(false);
            }
        };
        loadTargets();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedTarget = useMemo(
        () => fcmTargets.find((x) => String(x.id) === String(selectedTargetId)),
        [fcmTargets, selectedTargetId]
    );

    const handleSend = () => {
        if (!message) return alert("Please enter a message!");
        setIsSending(true);
        setTimeout(() => {
            setIsSending(false);
            setMessage("");
            alert(`Notification sent to ${target}!`);
        }, 1500);
    };

    const parseDataStringMap = (raw) => {
        const s = String(raw || "").trim();
        if (!s) return undefined;
        let obj;
        try {
            obj = JSON.parse(s);
        } catch {
            throw new Error("Data must be valid JSON object (string keys and string values).");
        }
        if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
            throw new Error("Data must be a JSON object, not an array.");
        }
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = typeof v === "string" ? v : String(v);
        }
        return out;
    };

    const handlePushTest = async () => {
        setPushFeedback({ type: "", text: "" });
        const token =
            selectedTarget?.fcmToken?.trim() || pushToken.trim();
        if (!token) {
            setPushFeedback({ type: "danger", text: "Device FCM token is required." });
            return;
        }
        let data;
        try {
            data = parseDataStringMap(pushDataJson);
        } catch (err) {
            setPushFeedback({
                type: "danger",
                text: err?.message || "Invalid data JSON.",
            });
            return;
        }
        const payload = { token };
        const t = pushTitle.trim();
        const b = pushBody.trim();
        const ty = pushType.trim();
        if (t) payload.title = t;
        if (b) payload.body = b;
        if (ty) payload.type = ty;
        if (data) payload.data = data;

        setPushSubmitting(true);
        try {
            let response;
            try {
                // Preferred backend path per current OpenAPI
                response = await notificationAdminService.sendFcmTest({
                    fcmToken: token,
                    title: t || "YouDash test notification",
                    body: b || "Test push from admin panel",
                });
            } catch (primaryErr) {
                // Backward compatibility with old endpoint
                response = await notificationAdminService.testPush(payload);
            }
            const body = response.data;
            if (isApiFailureBody(body)) {
                setPushFeedback({
                    type: "danger",
                    text: readApiMessage(body) || "Push test failed.",
                });
                return;
            }
            setPushFeedback({
                type: "success",
                text: readApiMessage(body) || "Test push accepted.",
            });
        } catch (e) {
            setPushFeedback({
                type: "danger",
                text: getAxiosErrorMessage(e, "Push test failed."),
            });
        } finally {
            setPushSubmitting(false);
        }
    };

    const history = [
        { title: "Diwali Offer 🎉", target: "All Users", sent: "Oct 20, 2024", type: "Promotional", status: "Sent" },
        { title: "Rider Payout Delayed ⚠️", target: "All Riders", sent: "Oct 21, 2024", type: "Operational", status: "Sent" },
        { title: "Update App Version 3.4.1", target: "All Users", sent: "Oct 22, 2024", type: "System", status: "Scheduled" },
        { title: "City Shutdown Notice", target: "Hyderabad Riders", sent: "Oct 23, 2024", type: "Critical", status: "Draft" },
    ];

    return (
        <div className="container-fluid fade-in">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Push Notifications</h2>
                    <p className="text-muted small mb-0">Compose and broadcast messages to users, riders, or select segments.</p>
                </div>
                <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                    <UserPlus size={18} /> <span>Audience Segments</span>
                </button>
            </div>

            <div className="dashboard-card border-0 shadow-sm mb-4">
                <div className="d-flex align-items-start gap-3 mb-3">
                    <div
                        className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ background: "rgba(229, 24, 24, 0.08)" }}
                    >
                        <FlaskConical size={22} style={{ color: "#E51818" }} />
                    </div>
                    <div className="flex-grow-1 min-w-0">
                        <h5 className="fw-bold mb-1">Admin: push test</h5>
                        <p className="text-muted small mb-0">
                            <code className="small">GET /admin/fcm-test/targets</code> ·{" "}
                            <code className="small">POST /admin/fcm-test/send</code> (with backward fallback to{" "}
                            <code className="small">/admin/notifications/test</code>).
                        </p>
                    </div>
                </div>
                {pushFeedback.text ? (
                    <div
                        className={`alert ${pushFeedback.type === "success" ? "alert-success" : "alert-danger"} rounded-4 border-0 mb-3`}
                    >
                        {pushFeedback.text}
                    </div>
                ) : null}
                {targetsError ? (
                    <div className="alert alert-warning rounded-4 border-0 mb-3">
                        {targetsError}
                    </div>
                ) : null}
                <div className="row g-3">
                    <div className="col-12 col-md-5">
                        <label className="form-label small text-muted fw-bold mb-1">
                            Select target (optional)
                        </label>
                        <select
                            className="form-select bg-light border-0 py-2"
                            style={{ borderRadius: "10px" }}
                            value={selectedTargetId}
                            onChange={(e) => {
                                setPushFeedback({ type: "", text: "" });
                                setSelectedTargetId(e.target.value);
                            }}
                            disabled={targetsLoading}
                        >
                            <option value="">Manual token</option>
                            {fcmTargets.map((tgt) => (
                                <option
                                    key={tgt.id}
                                    value={String(tgt.id)}
                                    disabled={!tgt.hasFcmToken}
                                >
                                    {tgt.name || tgt.type || `Target ${tgt.id}`}{" "}
                                    {tgt.phone ? `(${tgt.phone})` : ""}
                                    {tgt.hasFcmToken ? "" : " — no token"}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-12 col-md-7">
                        <label className="form-label small text-muted fw-bold mb-1">Resolved token</label>
                        <input
                            type="text"
                            className="form-control bg-light border-0 py-2 font-monospace"
                            style={{ borderRadius: "10px" }}
                            readOnly
                            value={
                                selectedTarget?.fcmToken
                                    ? `${selectedTarget.fcmToken.slice(0, 14)}…${selectedTarget.fcmToken.slice(-8)}`
                                    : "No target selected"
                            }
                        />
                    </div>
                    <div className="col-12">
                        <label className="form-label small text-muted fw-bold mb-1">Device token *</label>
                        <textarea
                            className="form-control bg-light border-0 small font-monospace"
                            rows={2}
                            placeholder="FCM registration token"
                            value={pushToken}
                            onChange={(e) => {
                                setPushFeedback({ type: "", text: "" });
                                setPushToken(e.target.value);
                            }}
                            disabled={Boolean(selectedTarget?.fcmToken)}
                            style={{ borderRadius: "10px" }}
                        />
                    </div>
                    <div className="col-12 col-md-4">
                        <label className="form-label small text-muted fw-bold mb-1">Title</label>
                        <input
                            type="text"
                            className="form-control bg-light border-0 py-2"
                            value={pushTitle}
                            onChange={(e) => {
                                setPushFeedback({ type: "", text: "" });
                                setPushTitle(e.target.value);
                            }}
                            style={{ borderRadius: "10px" }}
                        />
                    </div>
                    <div className="col-12 col-md-4">
                        <label className="form-label small text-muted fw-bold mb-1">Body</label>
                        <input
                            type="text"
                            className="form-control bg-light border-0 py-2"
                            value={pushBody}
                            onChange={(e) => {
                                setPushFeedback({ type: "", text: "" });
                                setPushBody(e.target.value);
                            }}
                            style={{ borderRadius: "10px" }}
                        />
                    </div>
                    <div className="col-12 col-md-4">
                        <label className="form-label small text-muted fw-bold mb-1">Type</label>
                        <input
                            type="text"
                            className="form-control bg-light border-0 py-2"
                            value={pushType}
                            onChange={(e) => {
                                setPushFeedback({ type: "", text: "" });
                                setPushType(e.target.value);
                            }}
                            style={{ borderRadius: "10px" }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="form-label small text-muted fw-bold mb-1">Data (optional JSON)</label>
                        <textarea
                            className="form-control bg-light border-0 small font-monospace"
                            rows={2}
                            placeholder='e.g. {"orderId":"123","screen":"TRACK"}'
                            value={pushDataJson}
                            onChange={(e) => {
                                setPushFeedback({ type: "", text: "" });
                                setPushDataJson(e.target.value);
                            }}
                            style={{ borderRadius: "10px" }}
                        />
                    </div>
                    <div className="col-12 d-flex justify-content-end">
                        <button
                            type="button"
                            className="btn d-flex align-items-center gap-2 px-4 text-white border-0 shadow-sm rounded-3"
                            style={{ backgroundColor: "#E51818" }}
                            disabled={pushSubmitting}
                            onClick={handlePushTest}
                        >
                            {pushSubmitting ? (
                                <span className="spinner-border spinner-border-sm" />
                            ) : (
                                <Send size={18} />
                            )}
                            Send test push
                        </button>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Compose Module */}
                <div className="col-12 col-xl-5">
                    <div className="dashboard-card border-0 shadow-sm h-100">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Plus size={20} className="text-primary-red" /> Compose Broadcast
                        </h5>
                        <div className="d-flex flex-column gap-3 mb-4">
                            <div>
                                <label className="form-label small text-muted fw-bold">Target Audience</label>
                                <div className="d-flex gap-2 flex-wrap">
                                    {["All Users", "All Riders", "By City", "Specific ID"].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setTarget(opt)}
                                            className={`btn p-1 px-3 rounded-pill small fw-bold border transition-all ${target === opt ? 'bg-primary-red text-white' : 'bg-light text-muted'}`}
                                            style={{ minWidth: '100px', backgroundColor: target === opt ? '#E51818' : '' }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-2">
                                <label className="form-label small text-muted fw-bold">Notification Title</label>
                                <input type="text" className="form-control bg-light border-0 py-2 fs-6" placeholder="e.g. Free Delivery Alert!" style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="mt-2">
                                <label className="form-label small text-muted fw-bold">Message Content</label>
                                <textarea
                                    className="form-control bg-light border-0 p-3 fs-6"
                                    rows="4"
                                    placeholder="Write your broadcast message here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    style={{ borderRadius: '12px' }}
                                ></textarea>
                                <div className="text-end mt-1 small text-muted opacity-75">{message.length} / 120 chars</div>
                            </div>

                            <div className="p-3 border rounded-3 d-flex align-items-center justify-content-between mb-4">
                                <div className="d-flex align-items-center gap-2 small text-muted">
                                    <Image size={16} /> <span>Attach Banner Image (Optional)</span>
                                </div>
                                <button className="btn btn-link p-0 text-primary-red fw-bold small" style={{ color: '#E51818' }}>Upload</button>
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3 shadow-sm">Save Draft</button>
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className="btn btn-primary-red flex-grow-1 py-3 fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                                style={{ backgroundColor: '#E51818', color: 'white' }}
                            >
                                {isSending ? 'Sending...' : <><Send size={18} /> Send Broadcast</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* History Module */}
                <div className="col-12 col-xl-7 h-100">
                    <div className="dashboard-card border-0 shadow-sm h-100 p-0 overflow-hidden d-flex flex-column">
                        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0">Notification History</h5>
                            <div className="search-container">
                                <Search size={16} className="text-muted" />
                                <input type="text" placeholder="Search logs..." className="form-control bg-light border-0 ps-5 py-2 small" style={{ borderRadius: '8px' }} />
                            </div>
                        </div>
                        <div className="flex-grow-1 overflow-auto custom-scrollbar">
                            <div className="table-responsive">
                                <table className="table mb-0 table-hover">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4 py-3 text-muted small border-0">TITLE</th>
                                            <th className="px-3 py-3 text-muted small border-0">TARGET</th>
                                            <th className="px-3 py-3 text-muted small border-0">TYPE</th>
                                            <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                                            <th className="px-4 py-3 text-muted small border-0 text-end">DATE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h, i) => (
                                            <tr key={i} className="align-middle">
                                                <td className="px-4 py-3 border-0 small fw-bold">{h.title}</td>
                                                <td className="px-3 py-3 border-0 small text-muted">{h.target}</td>
                                                <td className="px-3 py-3 border-0 small">
                                                    <span className="p-1 px-2 bg-light border rounded small" style={{ fontSize: '10px' }}>{h.type}</span>
                                                </td>
                                                <td className="px-3 py-3 border-0">
                                                    <span className={`status-badge status-${h.status.toLowerCase()} p-1 px-3`} style={{ fontSize: '11px' }}>{h.status}</span>
                                                </td>
                                                <td className="px-4 py-3 border-0 text-end small text-muted">{h.sent}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <button className="btn btn-light w-100 py-3 small fw-bold border-top">View All Notification Logs</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
