import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Command,
} from "lucide-react";
import { menuGroups, extraSearchRoutes } from "../config/adminNavConfig";
import { filterAndRankNav, flattenNav } from "../utils/navSearch";

const MODAL_Z = 10050;

export default function GlobalSearchPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const flatItems = useMemo(
    () => flattenNav(menuGroups, extraSearchRoutes),
    [],
  );

  const results = useMemo(
    () => filterAndRankNav(flatItems, query, 14),
    [flatItems, query],
  );

  const go = useCallback(
    (path) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[selected]) {
        e.preventDefault();
        go(results[selected].path);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, results, selected, go]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);

  if (!open) return null;

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPod|iPad/i.test(
      navigator.platform || navigator.userAgent || "",
    );

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center pt-5 px-2"
      style={{
        zIndex: MODAL_Z,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search navigation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white shadow-lg border-0 w-100 fade-in"
        style={{ maxWidth: 560, borderRadius: 14, overflow: "hidden" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
          <Search size={20} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="form-control border-0 shadow-none px-1 py-2"
            placeholder="Jump to a page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search pages"
            style={{ fontSize: "1rem" }}
          />
          <kbd
            className="d-none d-sm-inline-flex align-items-center gap-1 small text-muted border rounded px-2 py-1 bg-light flex-shrink-0"
            style={{ fontSize: 10 }}
          >
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="overflow-auto"
          style={{ maxHeight: "min(52vh, 380px)" }}
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-muted small">
              No pages match “{query.trim()}”. Try another word or check
              spelling.
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === selected;
              return (
                <button
                  key={`${item.path}-${idx}`}
                  type="button"
                  data-idx={idx}
                  className={`w-100 d-flex align-items-center gap-3 text-start border-0 px-3 py-2 ${
                    active ? "bg-light" : "bg-white"
                  }`}
                  style={{
                    cursor: "pointer",
                    borderLeft: active
                      ? "3px solid #E51818"
                      : "3px solid transparent",
                  }}
                  onMouseEnter={() => setSelected(idx)}
                  onClick={() => go(item.path)}
                >
                  {Icon ? (
                    <span
                      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                      style={{
                        width: 38,
                        height: 38,
                        background: active ? "#fef2f2" : "#f1f5f9",
                        color: active ? "#E51818" : "#64748b",
                      }}
                    >
                      <Icon size={18} />
                    </span>
                  ) : null}
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold small text-dark text-truncate">
                      {item.label}
                    </div>
                    <div
                      className="text-muted text-truncate"
                      style={{ fontSize: 11 }}
                    >
                      {item.group} · {item.path}
                    </div>
                  </div>
                  {active ? (
                    <CornerDownLeft
                      size={16}
                      className="text-muted flex-shrink-0 d-none d-sm-block"
                    />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-top bg-light small text-muted">
          <span
            className="d-flex align-items-center gap-1"
            style={{ fontSize: 11 }}
          >
            <ArrowUp size={12} />
            <ArrowDown size={12} />
            navigate
            <span className="mx-1">·</span>
            <CornerDownLeft size={12} />
            open
          </span>
          <span
            className="d-flex align-items-center gap-1"
            style={{ fontSize: 11 }}
          >
            <Command size={12} />
            {isMac ? "K" : "Ctrl K"} to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
