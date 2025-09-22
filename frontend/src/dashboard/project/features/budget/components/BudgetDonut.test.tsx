import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BudgetDonut, { type BudgetDonutSlice } from "./BudgetDonut";

describe("BudgetDonut", () => {
  const slices: BudgetDonutSlice[] = [
    { id: "design", label: "Design", value: 1000 },
    { id: "labor", label: "Labor", value: 500 },
  ];

  it("renders total label and accessible table", async () => {
    const user = userEvent.setup();

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

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$1500")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Test budget chart" })).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Labor")).toBeInTheDocument();

    const centerButton = screen.getByRole("button", { name: /view budget allocation/i });
    await user.click(centerButton);

    expect(
      screen.getByRole("dialog", { name: "Budget allocation breakdown" })
    ).toBeInTheDocument();
    expect(screen.getByText("Budget allocation")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("66.7%"))
      .toBeInTheDocument();

    await user.click(centerButton);
    expect(
      screen.queryByRole("dialog", { name: "Budget allocation breakdown" })
    ).not.toBeInTheDocument();
  });
});
