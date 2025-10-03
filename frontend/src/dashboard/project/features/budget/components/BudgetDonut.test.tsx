import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("recharts", () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Pie: ({
      data = [],
      activeIndex,
      children,
      onClick,
      onMouseEnter,
      onMouseLeave,
    }: {
      data?: unknown[];
      activeIndex?: number;
      children?: React.ReactNode;
      onClick?: (payload: unknown, index: number) => void;
      onMouseEnter?: (payload: unknown, index: number) => void;
      onMouseLeave?: (payload: unknown, index: number) => void;
    }) => (
      <div data-testid="pie-root">
        {data.map((entry, index) => (
          <button
            key={index}
            type="button"
            data-testid={`slice-${index}`}
            data-active={index === activeIndex}
            onClick={(event) => onClick?.(event, index)}
            onMouseEnter={(event) => onMouseEnter?.(event, index)}
            onMouseLeave={(event) => onMouseLeave?.(event, index)}
          >
            {React.Children.map(children, (child) => child)}
          </button>
        ))}
      </div>
    ),
    Cell: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Tooltip: () => null,
    Sector: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="sector">{children}</div>
    ),
  };
});

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      private callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe() {
        this.callback([
          {
            contentRect: { width: 320, height: 240 },
          } as unknown as ResizeObserverEntry,
        ]);
      }

      unobserve() {}

      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import BudgetDonut, { type BudgetDonutSlice } from "./BudgetDonut";

describe("BudgetDonut", () => {
  const slices: BudgetDonutSlice[] = [
    { id: "design", label: "Design", value: 1000 },
    { id: "labor", label: "Labor", value: 500 },
  ];

  it("renders total label and accessible table", async () => {
    render(
      <div style={{ width: 320, height: 240 }}>
        <BudgetDonut
          data={slices}
          total={1500}
          ariaLabel="Test budget chart"
          totalFormatter={(value) => `$${value.toFixed(0)}`}
        />
      </div>
    );

    expect(screen.getByText("$1500")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Test budget chart" })).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Labor")).toBeInTheDocument();

    const centerButton = screen.getByRole("button", { name: /view budget allocation/i });
    fireEvent.mouseEnter(centerButton);

    const dialog = await screen.findByRole("dialog", { name: "Budget allocation breakdown" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Budget allocation")).toBeInTheDocument();
    expect(within(dialog).getByText("Design")).toBeInTheDocument();
    expect(within(dialog).getByText("66.7%"))
      .toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(
      screen.queryByRole("dialog", { name: "Budget allocation breakdown" })
    ).not.toBeInTheDocument();
  });

  it("refreshes the center popover when slice labels change", async () => {
    const { rerender } = render(
      <div style={{ width: 320, height: 240 }}>
        <BudgetDonut
          data={slices}
          total={1500}
          ariaLabel="Budget chart label change"
          totalFormatter={(value) => `$${value.toFixed(0)}`}
        />
      </div>
    );

    const centerButton = screen.getByRole("button", { name: /view budget allocation/i });

    fireEvent.mouseEnter(centerButton);
    const initialDialog = await screen.findByRole("dialog", {
      name: "Budget allocation breakdown",
    });
    expect(within(initialDialog).getByText("Design")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    rerender(
      <div style={{ width: 320, height: 240 }}>
        <BudgetDonut
          data={[
            { id: "design", label: "Strategy", value: 1000 },
            { id: "labor", label: "Labor", value: 500 },
          ]}
          total={1500}
          ariaLabel="Budget chart label change"
          totalFormatter={(value) => `$${value.toFixed(0)}`}
        />
      </div>
    );

    fireEvent.pointerDown(document.body);
    fireEvent.mouseEnter(centerButton);
    const updatedDialog = await screen.findByRole("dialog", {
      name: "Budget allocation breakdown",
    });
    expect(within(updatedDialog).getByText("Strategy")).toBeInTheDocument();
  });

  it("releases a locked slice when pointer interactions finish outside the chart", async () => {
    render(
      <div style={{ width: 320, height: 240 }}>
        <BudgetDonut data={slices} total={1500} />
      </div>
    );

    const slice = await screen.findByTestId("slice-0");

    fireEvent.click(slice);

    await waitFor(() => {
      expect(slice).toHaveAttribute("data-active", "true");
    });

    fireEvent.pointerUp(document.body);

    await waitFor(() => {
      expect(slice).toHaveAttribute("data-active", "false");
    });
  });

  it("anchors the center popover to the viewport edge on mobile", async () => {
    const originalInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
    const originalInnerHeightDescriptor = Object.getOwnPropertyDescriptor(window, "innerHeight");
    const originalOffsetWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const originalOffsetHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      get() {
        return 360;
      },
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      get() {
        return 640;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 220;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 160;
      },
    });

    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    const restoreGlobals = () => {
      raf.mockRestore();
      if (originalOffsetWidthDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidthDescriptor);
      } else {
        delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
      }
      if (originalOffsetHeightDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeightDescriptor);
      } else {
        delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
      }
      if (originalInnerWidthDescriptor) {
        Object.defineProperty(window, "innerWidth", originalInnerWidthDescriptor);
      }
      if (originalInnerHeightDescriptor) {
        Object.defineProperty(window, "innerHeight", originalInnerHeightDescriptor);
      }
    };

    try {
      render(
        <div style={{ width: 320, height: 240 }}>
          <BudgetDonut
            data={slices}
            total={1500}
            totalFormatter={(value) => `$${value.toFixed(0)}`}
          />
        </div>
      );

      const centerButton = screen.getByRole("button", { name: /view budget allocation/i });
      Object.defineProperty(centerButton, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          width: 64,
          height: 64,
          top: 150,
          left: 180,
          right: 244,
          bottom: 214,
          x: 180,
          y: 150,
          toJSON: () => ({}),
        }),
      });

      fireEvent.mouseEnter(centerButton);

      const dialog = await screen.findByRole("dialog", { name: "Budget allocation breakdown" });
      const left = Number.parseFloat(dialog.style.left || "0");
      const top = Number.parseFloat(dialog.style.top || "0");
      const halfWidth = dialog.offsetWidth / 2;
      const halfHeight = dialog.offsetHeight / 2;

      expect(left - halfWidth).toBeCloseTo(16, 1);
      expect(left + halfWidth).toBeLessThanOrEqual(window.innerWidth - 16 + 0.0001);
      expect(top - halfHeight).toBeGreaterThanOrEqual(0);
      expect(top + halfHeight).toBeLessThanOrEqual(window.innerHeight);
    } finally {
      restoreGlobals();
    }
  });
});
