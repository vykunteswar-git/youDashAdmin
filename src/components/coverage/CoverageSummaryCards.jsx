export function CoverageSummaryCards({ items }) {
  return (
    <div className="row g-3 mb-4">
      {items.map((item) => (
        <div key={item.key} className="col-6 col-md-3">
          <div className="dashboard-card border-0 shadow-sm h-100 p-3">
            <p className="text-muted small mb-1">{item.label}</p>
            <p className="fw-bold fs-4 mb-0" style={{ color: item.color || "#111" }}>
              {item.value}
            </p>
            {item.hint ? (
              <p className="text-muted mb-0 mt-1" style={{ fontSize: 11 }}>
                {item.hint}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
