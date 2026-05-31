import { describe, expect, it } from "vitest";
import {
  canonicalOrderStatus,
  getOutstationPrimaryNextStatus,
  resolveAdminNextStatuses,
  toApiOrderStatus,
} from "./orderStatusUtils";

describe("orderStatusUtils", () => {
  it("maps legacy statuses to canonical values", () => {
    expect(canonicalOrderStatus("ARRIVED_DESTINATION_HUB")).toBe(
      "AT_DESTINATION_HUB",
    );
    expect(canonicalOrderStatus("DELIVERY_FAILED")).toBe("FAILED_DELIVERY");
    expect(canonicalOrderStatus("DELIVERY_RIDER_ASSIGNED")).toBe(
      "OUT_FOR_DELIVERY",
    );
  });

  it("returns service-specific primary next status", () => {
    expect(
      getOutstationPrimaryNextStatus({
        deliveryType: "DOOR_TO_HUB",
        status: "AT_DESTINATION_HUB",
      }),
    ).toBe("AWAITING_HUB_COLLECTION");

    expect(
      getOutstationPrimaryNextStatus({
        deliveryType: "HUB_TO_DOOR",
        status: "AT_DESTINATION_HUB",
      }),
    ).toBeNull();

    expect(
      getOutstationPrimaryNextStatus({
        deliveryType: "DOOR_TO_DOOR",
        status: "IN_TRANSIT",
      }),
    ).toBe("AT_DESTINATION_HUB");
  });

  it("normalizes backend next statuses and prioritizes recommended step", () => {
    const next = resolveAdminNextStatuses({
      deliveryType: "DOOR_TO_HUB",
      status: "IN_TRANSIT",
      adminSelectableNextStatuses: ["FAILED_DELIVERY", "AT_DESTINATION_HUB"],
    });
    expect(next[0]).toBe("AT_DESTINATION_HUB");
    expect(next).toContain("FAILED_DELIVERY");
  });

  it("always sends canonical status to API", () => {
    expect(toApiOrderStatus("ARRIVED_DESTINATION_HUB")).toBe(
      "AT_DESTINATION_HUB",
    );
  });
});
