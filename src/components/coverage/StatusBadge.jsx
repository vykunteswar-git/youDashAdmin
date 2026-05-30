import { CheckCircle2, PauseCircle, XCircle, AlertTriangle } from "lucide-react";

const STYLES = {
  zoneActive: {
    className: "text-bg-success",
    icon: CheckCircle2,
    label: "Zone active",
  },
  zonePaused: {
    className: "text-bg-warning text-dark",
    icon: PauseCircle,
    label: "Zone paused",
  },
  hubActive: {
    className: "text-bg-success",
    icon: CheckCircle2,
    label: "Hub active",
  },
  hubOff: {
    className: "text-bg-secondary",
    icon: XCircle,
    label: "Hub off",
  },
  crossCity: {
    className: "text-bg-info text-dark",
    icon: AlertTriangle,
    label: "Cross-city hub",
  },
};

export function StatusBadge({ variant, subtitle, size = "sm" }) {
  const cfg = STYLES[variant] || STYLES.hubOff;
  const Icon = cfg.icon;
  const py = size === "lg" ? "py-2 px-3" : "py-1 px-2";
  return (
    <span
      className={`badge rounded-pill d-inline-flex align-items-center gap-1 ${py} ${cfg.className}`}
    >
      <Icon size={size === "lg" ? 16 : 12} />
      <span>{cfg.label}</span>
      {subtitle ? (
        <span className="opacity-75 fw-normal ms-1 d-none d-md-inline">· {subtitle}</span>
      ) : null}
    </span>
  );
}

export function BookingImpactCard({ type, zoneActive, hubActive, zoneName }) {
  if (type === "zone") {
    return zoneActive ? (
      <div className="rounded-4 border border-success border-opacity-25 bg-success bg-opacity-10 p-3 small">
        <strong className="text-success">Zone is serving</strong>
        <p className="mb-0 mt-1 text-muted">
          Customers booking <strong>pickup and drop inside this zone</strong> get{" "}
          <strong>in-city</strong> vehicles (bike/auto). Outstation to other cities still
          works.
        </p>
      </div>
    ) : (
      <div className="rounded-4 border border-warning border-opacity-50 bg-warning bg-opacity-10 p-3 small">
        <strong className="text-dark">Zone is paused</strong>
        <p className="mb-0 mt-1 text-muted">
          <strong>Local trips</strong> (pickup and drop both inside{" "}
          {zoneName || "this zone"}) are <strong>blocked</strong> in the Parcel app.
          Active hubs here can still support <strong>cross-city</strong> (e.g. to another
          city).
        </p>
      </div>
    );
  }

  if (hubActive && !zoneActive) {
    return (
      <div className="rounded-4 border border-info border-opacity-25 bg-info bg-opacity-10 p-3 small">
        <strong className="text-dark">Hub on · zone paused</strong>
        <p className="mb-0 mt-1 text-muted">
          This hub stays available for <strong>outstation</strong> corridors from{" "}
          {zoneName || "its zone"} (see <strong>Zone routes</strong>). It does{" "}
          <strong>not</strong> restore in-city delivery while the zone is paused.
        </p>
      </div>
    );
  }

  if (!hubActive) {
    return (
      <div className="rounded-4 border bg-light p-3 small text-muted">
        <strong>Hub is off</strong>
        <p className="mb-0 mt-1">
          Turn the hub on when you want it used in quotes and zone corridors. Set intake
          cutoff in the hub editor.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-4 border border-success border-opacity-25 bg-success bg-opacity-10 p-3 small">
      <strong className="text-success">Hub operational</strong>
      <p className="mb-0 mt-1 text-muted">
        Linked to an active zone — in-city trips plus outstation via zone routes. Set
        per-hub intake time in the editor.
      </p>
    </div>
  );
}
