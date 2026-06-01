import { STATUS_COLORS } from "@/lib/status";

export default function StatusPill({ status, testid }) {
  const cls = STATUS_COLORS[status] || "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`pill ${cls}`} data-testid={testid || `status-${status}`}>
      <span className="dot" /> {status.replaceAll("_", " ")}
    </span>
  );
}
