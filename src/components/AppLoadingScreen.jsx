import { APP_LOGO_URL, APP_PRODUCT_NAME } from "@/lib/brand";
import "./AppLoadingScreen.css";

/**
 * Branded loading UI — use instead of bare "Loading…" text on white backgrounds.
 * variant: fullscreen (bootstrap / auth), page (shell content), inline (compact row)
 */
export default function AppLoadingScreen({
  message = "Loading…",
  variant = "page",
  testId = "app-loading",
}) {
  return (
    <div
      className={`app-loading app-loading--${variant}`}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-loading__card">
        <img src={APP_LOGO_URL} alt="" className="app-loading__logo" width={44} height={44} />
        <div className="app-loading__spinner" aria-hidden="true" />
        <p className="app-loading__title">{APP_PRODUCT_NAME}</p>
        <p className="app-loading__message">{message}</p>
      </div>
    </div>
  );
}
