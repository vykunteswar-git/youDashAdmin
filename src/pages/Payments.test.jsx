import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Payments from "./Payments";

const apiMocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
}));

vi.mock("../services/apiService", () => ({
  appConfigService: {
    getConfig: apiMocks.getConfig,
    updateConfig: apiMocks.updateConfig,
  },
  unwrapEntity: (res) =>
    res?.data && typeof res.data === "object" && "data" in res.data
      ? res.data.data
      : res?.data,
  getAxiosErrorMessage: (error, fallback = "Request failed.") =>
    error?.message || fallback,
}));

function renderPayments() {
  return render(
    <MemoryRouter>
      <Payments />
    </MemoryRouter>
  );
}

describe("Payments page", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    apiMocks.getConfig.mockReset();
    apiMocks.updateConfig.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads and renders config from /admin/config", async () => {
    apiMocks.getConfig.mockResolvedValue({
      data: {
        codEnabled: false,
        onlineEnabled: true,
        defaultPaymentType: "ONLINE",
      },
    });

    renderPayments();

    await screen.findByText("Default Payment Selection");
    expect(screen.getByLabelText("Cash on Delivery toggle")).not.toBeChecked();
    expect(screen.getByLabelText("Online payment toggle")).toBeChecked();
    expect(screen.getByLabelText("Default payment mode")).toHaveValue("ONLINE");
    expect(
      screen.getByRole("button", { name: "Publish Config" })
    ).toBeDisabled();
  });

  it("auto-switches default when selected mode is disabled", async () => {
    apiMocks.getConfig.mockResolvedValue({
      data: {
        codEnabled: true,
        onlineEnabled: true,
        defaultPaymentType: "COD",
      },
    });

    renderPayments();
    await screen.findByText("Default Payment Selection");

    await userEvent.click(screen.getByLabelText("Cash on Delivery toggle"));

    expect(screen.getByLabelText("Cash on Delivery toggle")).not.toBeChecked();
    expect(screen.getByLabelText("Default payment mode")).toHaveValue("ONLINE");
  });

  it("prevents turning both payment modes off", async () => {
    apiMocks.getConfig.mockResolvedValue({
      data: {
        codEnabled: true,
        onlineEnabled: false,
        defaultPaymentType: "COD",
      },
    });

    renderPayments();
    await screen.findByText("Default Payment Selection");

    await userEvent.click(screen.getByLabelText("Cash on Delivery toggle"));

    expect(
      screen.getByText("At least one payment mode must remain enabled.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Cash on Delivery toggle")).toBeChecked();
  });

  it("submits expected payload when publishing edits", async () => {
    apiMocks.getConfig.mockResolvedValue({
      data: {
        codEnabled: false,
        onlineEnabled: true,
        defaultPaymentType: "ONLINE",
      },
    });
    apiMocks.updateConfig.mockResolvedValue({
      data: {
        codEnabled: true,
        onlineEnabled: true,
        defaultPaymentType: "COD",
      },
    });

    renderPayments();
    await screen.findByText("Default Payment Selection");

    await userEvent.click(screen.getByLabelText("Cash on Delivery toggle"));
    await userEvent.selectOptions(screen.getByLabelText("Default payment mode"), "COD");
    await userEvent.click(screen.getByRole("button", { name: "Publish Config" }));

    await waitFor(() => {
      expect(apiMocks.updateConfig).toHaveBeenCalledWith({
        codEnabled: true,
        onlineEnabled: true,
        defaultPaymentType: "COD",
      });
    });
  });
});
