import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Orders from "./Orders";

const apiMocks = vi.hoisted(() => ({
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  updateStatus: vi.fn(),
  assignRider: vi.fn(),
  getAvailableRiders: vi.fn(),
  getEligibleRidersForOrder: vi.fn(),
  listByStatus: vi.fn(),
  sendBroadcast: vi.fn(),
}));

vi.mock("../services/apiService", () => ({
  orderService: {
    listOrders: apiMocks.listOrders,
    getOrder: apiMocks.getOrder,
    updateStatus: apiMocks.updateStatus,
    assignRider: apiMocks.assignRider,
  },
  riderService: {
    getAvailableRiders: apiMocks.getAvailableRiders,
    getEligibleRidersForOrder: apiMocks.getEligibleRidersForOrder,
    listByStatus: apiMocks.listByStatus,
  },
  notificationAdminService: {
    sendBroadcast: apiMocks.sendBroadcast,
  },
  unwrapList: (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  },
  unwrapEntity: (res) =>
    res?.data && typeof res.data === "object" && "data" in res.data
      ? res.data.data
      : res?.data,
}));

vi.mock("../services/adminSocketService", () => ({
  adminSocketService: {
    subscribe: vi.fn(() => () => {}),
  },
}));

function buildDetail(overrides = {}) {
  return {
    id: 1,
    orderId: 1,
    userId: 9,
    serviceMode: "OUTSTATION",
    status: "RIDER_ASSIGNED",
    pickupAddress: "MG Road, Bengaluru",
    dropAddress: "HSR Layout, Bengaluru",
    pickupLat: 12.9716,
    pickupLng: 77.5946,
    dropLat: 12.9121,
    dropLng: 77.6446,
    adminSelectableNextStatuses: ["PICKED_UP"],
    allowedNextStatuses: ["AT_ORIGIN_HUB"],
    ...overrides,
  };
}

async function renderAndOpenDetail(detailOverrides = {}) {
  apiMocks.listOrders.mockResolvedValue({
    data: [
      {
        id: 1,
        userId: 9,
        serviceMode: "INCITY",
        status: "RIDER_ASSIGNED",
        pickupAddress: "List Pickup",
        dropAddress: "List Drop",
      },
    ],
  });
  apiMocks.getOrder.mockResolvedValue({ data: buildDetail(detailOverrides) });
  apiMocks.getAvailableRiders.mockResolvedValue({ data: [] });
  apiMocks.getEligibleRidersForOrder.mockResolvedValue({ data: [] });
  apiMocks.listByStatus.mockResolvedValue({ data: [] });

  render(<Orders />);
  await screen.findByText("#1");
  const row = screen.getByText("#1").closest("tr");
  expect(row).not.toBeNull();
  await userEvent.click(row);
  await screen.findByLabelText("Next status");
}

describe("Orders page status and address behavior", () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses adminSelectableNextStatuses for dropdown options", async () => {
    await renderAndOpenDetail({
      adminSelectableNextStatuses: ["OUT_FOR_DELIVERY"],
      allowedNextStatuses: ["AT_ORIGIN_HUB", "IN_TRANSIT"],
    });

    const statusSelect = screen.getByLabelText("Next status");
    expect(statusSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Out For Delivery" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "At Origin Hub" })
    ).not.toBeInTheDocument();
  });

  it("falls back to allowedNextStatuses when admin list is empty", async () => {
    await renderAndOpenDetail({
      adminSelectableNextStatuses: [],
      allowedNextStatuses: ["AT_ORIGIN_HUB"],
    });

    expect(screen.getByRole("option", { name: "At Origin Hub" })).toBeInTheDocument();
  });

  it("disables update when no next statuses exist", async () => {
    await renderAndOpenDetail({
      adminSelectableNextStatuses: [],
      allowedNextStatuses: [],
    });

    const updateBtn = screen.getByLabelText("Update status");
    expect(updateBtn).toBeDisabled();
    expect(updateBtn).toHaveTextContent("No valid next status");
  });

  it("shows outstation next-action guidance at destination hub", async () => {
    await renderAndOpenDetail({
      deliveryType: "DOOR_TO_DOOR",
      status: "AT_DESTINATION_HUB",
      adminSelectableNextStatuses: ["FAILED_DELIVERY"],
      allowedNextStatuses: ["FAILED_DELIVERY"],
    });

    expect(screen.getByText("Next action")).toBeInTheDocument();
    expect(
      screen.getByText(/Assign delivery rider — status becomes Out for Delivery automatically/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Out For Delivery" }),
    ).not.toBeInTheDocument();
  });

  it("shows COD mode when confirming pickup for outstation COD order", async () => {
    await renderAndOpenDetail({
      deliveryType: "DOOR_TO_DOOR",
      status: "RIDER_ASSIGNED",
      paymentType: "COD",
      codAlreadyCollected: false,
      adminSelectableNextStatuses: ["PICKED_UP"],
    });

    expect(
      screen.getByLabelText("COD collection mode at pickup"),
    ).toBeInTheDocument();
  });
});
