import { useCallback, useEffect, useState } from "react";
import { analyticsService, getAxiosErrorMessage } from "../services/apiService";

const DEFAULT_SUMMARY = {
  totalOrders: 0,
  grossRevenue: 0,
  onlineRiders: 0,
  activeUsers: 0,
  avgAssignmentEtaMinutes: 0,
  cancellationRate: 0,
  completionRate: 0,
  avgOrderValue: 0,
};

export function useDashboardData(range) {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [orderVolume, setOrderVolume] = useState([]);
  const [orderVolumeLoading, setOrderVolumeLoading] = useState(true);
  const [orderVolumeError, setOrderVolumeError] = useState("");

  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");

  const fetchSummaryAndOrderVolume = useCallback(async () => {
    setSummaryLoading(true);
    setOrderVolumeLoading(true);
    setSummaryError("");
    setOrderVolumeError("");

    const [summaryRes, volumeRes] = await Promise.allSettled([
      analyticsService.getDashboardSummary(range),
      analyticsService.getDashboardOrderVolume(range),
    ]);

    if (summaryRes.status === "fulfilled") {
      setSummary({ ...DEFAULT_SUMMARY, ...(summaryRes.value || {}) });
    } else {
      setSummaryError(getAxiosErrorMessage(summaryRes.reason, "Failed to load summary."));
    }
    setSummaryLoading(false);

    if (volumeRes.status === "fulfilled") {
      setOrderVolume(Array.isArray(volumeRes.value) ? volumeRes.value : []);
    } else {
      setOrderVolumeError(
        getAxiosErrorMessage(volumeRes.reason, "Failed to load order volume.")
      );
    }
    setOrderVolumeLoading(false);
  }, [range]);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError("");
    try {
      const data = await analyticsService.getDashboardLiveActivity(10);
      setActivity(Array.isArray(data) ? data : []);
    } catch (error) {
      setActivityError(getAxiosErrorMessage(error, "Failed to load live activity."));
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaryAndOrderVolume();
  }, [fetchSummaryAndOrderVolume]);

  useEffect(() => {
    fetchActivity();
    const timer = window.setInterval(() => {
      fetchActivity();
    }, 45000);
    return () => window.clearInterval(timer);
  }, [fetchActivity]);

  return {
    summary,
    summaryLoading,
    summaryError,
    orderVolume,
    orderVolumeLoading,
    orderVolumeError,
    activity,
    activityLoading,
    activityError,
    retrySummaryAndOrderVolume: fetchSummaryAndOrderVolume,
    retryActivity: fetchActivity,
    retryAll: () => {
      fetchSummaryAndOrderVolume();
      fetchActivity();
    },
  };
}
