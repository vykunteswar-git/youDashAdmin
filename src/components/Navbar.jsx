import { useState, useEffect } from "react";
import { Search, User, Menu, Command } from "lucide-react";
import GlobalSearchPalette from "./GlobalSearchPalette";

/* NOT INTEGRATED: mock operational alerts (WebSocket / incident API). Previous implementation used:
   Bell, incidents[], showAlerts, dropdown list. Re-enable when a real feed exists. */

const Header = ({ setCollapsed, collapsed }) => {
  const [searchOpen, setSearchOpen] = useState(false);

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent || "");

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [searchOpen]);

  return (
    <>
      <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header className="glass-header header-shadow px-4 py-2 d-flex align-items-center justify-content-between border-bottom position-relative bg-white" style={{ zIndex: 100 }}>
        <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1 min-w-0">
          <button className="btn btn-link text-dark p-0 d-lg-none flex-shrink-0" type="button" onClick={() => setCollapsed(!collapsed)}>
            <Menu size={20} />
          </button>

          <button
            type="button"
            className="d-flex align-items-center flex-grow-1 text-start border-0 bg-transparent p-0"
            onClick={() => setSearchOpen(true)}
            style={{ maxWidth: 420 }}
            aria-label="Open page search"
          >
            <span
              className="d-flex align-items-center w-100 bg-light gap-2 px-3 py-2"
              style={{ borderRadius: "10px", minHeight: 40 }}
            >
              <Search size={18} className="text-muted flex-shrink-0" />
              <span className="text-muted small text-truncate d-none d-sm-inline">Jump to page…</span>
              <span className="text-muted small text-truncate d-sm-none">Search pages…</span>
              <kbd
                className="ms-auto d-none d-md-inline-flex align-items-center gap-1 small text-muted border rounded px-2 py-0 bg-white flex-shrink-0"
                style={{ fontSize: 10 }}
              >
                <Command size={11} />
                {isMac ? "K" : "Ctrl K"}
              </kbd>
            </span>
          </button>
        </div>

        <div className="d-flex align-items-center gap-2 gap-md-3 flex-shrink-0">
          <div className="vr mx-1 mx-md-2 d-none d-sm-block"></div>

          <div className="d-flex align-items-center gap-2 cursor-pointer">
            <div className="text-end d-none d-sm-block">
              <p className="mb-0 fw-bold small">Admin User</p>
              <p className="mb-0 text-muted small" style={{ fontSize: '10px' }}>Super Admin</p>
            </div>
            <div className="bg-primary-red p-1 rounded-circle" style={{ backgroundColor: '#E51818' }}>
              <User size={24} className="text-white" />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
