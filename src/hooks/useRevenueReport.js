import { useCallback, useEffect, useState } from "react";
import { analyticsService, getAxiosErrorMessage } from "../services/apiService";

const DEFAULT_REPORT = {
  totalRevenue: 0,
  rushMultiplier: 0,
  completionRate: 0,
  avgAssignmentEtaMinutes: 0,
  trend: [],
  topSources: [],
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTrendPoint(point, index) {
  const label =
    point?.label ??
    point?.timeLabel ??
    point?.bucket ??
    point?.day ??
    point?.date ??
    point?.name ??
    String(index + 1);

  const value = toNumber(
    point?.value ?? point?.revenue ?? point?.amount ?? point?.total ?? point?.grossRevenue,
    0
  );

  return { ...point, label: String(label), value };
}

function fallbackTrend(range, totalRevenue) {
  if (!toNumber(totalRevenue)) return [];

  const now = new Date();
  const labelByRange =
    range === "TODAY"
      ? `${String(now.getHours()).padStart(2, "0")}:00`
      : range === "THIS_WEEK"
        ? now.toLocaleDateString(undefined, { weekday: "short" })
        : String(now.getDate());

  return [{ label: labelByRange, value: toNumber(totalRevenue) }];
}

function normalizeReport(data, range) {
  const totalRevenue = toNumber(data?.totalRevenue ?? data?.grossRevenue ?? data?.revenue ?? data?.total, 0);
  const rushMultiplier = toNumber(data?.rushMultiplier ?? data?.roasMultiplier ?? data?.multiplier, 0);
  const completionRate = toNumber(data?.completionRate ?? data?.successRate, 0);
  const avgAssignmentEtaMinutes = toNumber(
    data?.avgAssignmentEtaMinutes ?? data?.avgEtaMinutes ?? data?.avgEta,
    0
  );

  const trendRaw = Array.isArray(data?.trend)
    ? data.trend
    : Array.isArray(data?.trends)
      ? data.trends
      : [];

  const trend = trendRaw.map(normalizeTrendPoint);
  const hasNonZeroTrend = trend.some((p) => p.value > 0);

  return {
    ...DEFAULT_REPORT,
    ...(data || {}),
    totalRevenue,
    rushMultiplier,
    completionRate,
    avgAssignmentEtaMinutes,
    trend: hasNonZeroTrend ? trend : fallbackTrend(range, totalRevenue),
    topSources: Array.isArray(data?.topSources)
      ? data.topSources
      : Array.isArray(data?.sources)
        ? data.sources
        : [],
  };
}

export function useRevenueReport(range) {
  const [report, setReport] = useState(DEFAULT_REPORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await analyticsService.getRevenueReport(range);
      setReport(normalizeReport(data, range));
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load revenue report."));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    report,
    loading,
    error,
    retry: fetchReport,
  };
}
