import { APP_LOGO_URL } from "@/lib/brand";
import "./BrandLogo.css";

/**
 * Shared YouDash Express mark (orange cube + wordmark).
 * variant: hero (white on photo), light (sidebar), dark (light panels)
 */
export default function BrandLogo({ variant = "dark", compact = false, className = "" }) {
  return (
    <div
      className={`brand-logo brand-logo--${variant} ${compact ? "brand-logo--compact" : ""} ${className}`.trim()}
    >
      <img src={APP_LOGO_URL} alt="" className="brand-logo__icon" width={40} height={40} />
      <div className="brand-logo__text">
        <span className="brand-logo__name">
          <strong>YouDash</strong> Express
        </span>
        {!compact && <span className="brand-logo__tag">Admin Console</span>}
      </div>
    </div>
  );
}
