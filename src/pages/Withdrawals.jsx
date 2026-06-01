import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function Withdrawals() {
  const [tab, setTab] = useState("PENDING");
  const [ws, setWs] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [actingId, setActingId] = useState(null);
  async function load() {
    const r = await api.get("/withdrawals", { params: tab === "ALL" ? {} : { status: tab } });
    const rows = r.data?.withdrawals ?? [];
    setWs(rows);
    setExpandedId(current => rows.some(w => w.id === current) ? current : null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);
  async function decide(id, action) {
    setActingId(id);
    try {
      await api.post(`/withdrawals/${id}/${action}`);
      toast.success(action === "approve" ? "Withdrawal approved" : "Withdrawal rejected");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || `Failed to ${action} withdrawal`);
    } finally {
      setActingId(null);
    }
  }
  return (
    <div data-testid="withdrawals-page">
      <PageHeader title="Withdrawal Requests" subtitle="Rider payout approvals" />

      <div className="surface p-2 mb-4 inline-flex gap-1" data-testid="withdrawal-status-toggle">
        {["PENDING", "APPROVED", "REJECTED", "ALL"].map(t => (
          <button
            key={t}
            type="button"
            className={`chip px-4 justify-center ${tab === t ? "chip-active" : ""}`}
            onClick={() => setTab(t)}
            data-testid={`wd-tab-${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {ws.length ? ws.map(w => {
          const expanded = expandedId === w.id;
          return (
            <div
              key={w.id}
              className={`surface border transition ${expanded ? "border-[var(--brand-red)] shadow-sm" : "border-transparent hover:border-[var(--border-default)]"}`}
              data-testid={`wd-card-${w.id}`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : w.id)}
                className="w-full text-left p-4"
              >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{w.rider_name}</div>
                  <div className="text-[11px] text-[var(--slate-500)] mt-1">Rider #{w.rider_id || "—"} · Request #{w.id}</div>
                </div>
                <StatusPill status={w.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <Info label="Amount" value={`₹${Number(w.amount || 0).toLocaleString()}`} mono />
                <Info label="Bank A/C" value={w.bank_account_masked} mono />
                <Info label="Requested" value={new Date(w.requested_at).toLocaleString()} />
              </div>
              </button>

              {expanded && (
                <div className="border-t border-[var(--border-default)] p-4 bg-[var(--slate-50)]" data-testid="withdrawal-detail">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <Info label="Amount" value={`₹${Number(w.amount || 0).toLocaleString()}`} mono large />
                    <Info label="Rider ID" value={w.rider_id || "—"} mono />
                    <Info label="Account Holder" value={w.account_holder_name} />
                    <Info label="IFSC" value={w.ifsc} mono />
                    <Info label="Account Number" value={w.account_number || w.bank_account_masked} mono />
                    <Info label="Requested At" value={new Date(w.requested_at).toLocaleString()} />
                  </div>

                  {w.status === "PENDING" ? (
                    <div>
                      <div className="label">Decision</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actingId === w.id}
                          onClick={() => decide(w.id, "approve")}
                          className="h-10 px-5 rounded-sm border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60"
                          data-testid={`approve-wd-${w.id}`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actingId === w.id}
                          onClick={() => decide(w.id, "reject")}
                          className="h-10 px-5 rounded-sm border border-rose-300 bg-rose-50 text-rose-800 text-sm font-semibold hover:bg-rose-100 disabled:opacity-60"
                          data-testid={`reject-wd-${w.id}`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-sm border border-[var(--border-default)] bg-white p-3 text-[12px] text-[var(--slate-600)]">
                      This request is already marked as {w.status}.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="empty surface">No withdrawal requests found.</div>
          )}
      </div>
    </div>
  );
}

function Info({ label, value, mono = false, large = false }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className={`${mono ? "mono" : ""} ${large ? "text-2xl font-semibold" : "text-sm"} break-words`}>
        {value || "—"}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const classes = status === "PENDING"
    ? "bg-amber-50 text-amber-800 border-amber-300"
    : status === "APPROVED"
      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
      : "bg-rose-50 text-rose-800 border-rose-300";

  return <span className={`pill ${classes}`}>{status || "UNKNOWN"}</span>;
}
