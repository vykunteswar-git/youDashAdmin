export default function PageHeader({ title, subtitle, actions, testid }) {
  return (
    <div className="flex items-end justify-between mb-5" data-testid={testid || "page-header"}>
      <div>
        <h1 className="section-title">{title}</h1>
        {subtitle && <div className="section-subtitle">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
