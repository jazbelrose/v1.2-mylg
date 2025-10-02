import React, { useMemo, useState } from "react";
import FinanceLayout from "../components/FinanceLayout";
import FinanceCard from "../components/FinanceCard";
import TasksOverviewCard from "@/dashboard/home/components/TasksOverviewCard";
import styles from "./FinanceOverview.module.css";
import type { FinanceAlert } from "../types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const preciseCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const runwayFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const quickFilters = [
  { id: "month", label: "This month" },
  { id: "quarter", label: "Quarter" },
  { id: "ytd", label: "Year-to-date" },
  { id: "custom", label: "Custom" },
] as const;

const monthlyFlow = [
  { month: "Jan", inflow: 42000, outflow: 36000 },
  { month: "Feb", inflow: 38000, outflow: 41000 },
  { month: "Mar", inflow: 45500, outflow: 39500 },
  { month: "Apr", inflow: 47000, outflow: 42000 },
  { month: "May", inflow: 51000, outflow: 46000 },
  { month: "Jun", inflow: 48800, outflow: 43300 },
];

const categoryBreakdown = [
  { category: "Payroll", amount: 124500 },
  { category: "Production", amount: 88500 },
  { category: "Software", amount: 31200 },
  { category: "Travel", amount: 28600 },
  { category: "Marketing", amount: 19200 },
];

const recurringVendors = [
  { vendor: "Gusto", amount: 8200, cadence: "Bi-weekly payroll" },
  { vendor: "Adobe", amount: 1260, cadence: "Monthly subscription" },
  { vendor: "AWS", amount: 2175, cadence: "Monthly infrastructure" },
  { vendor: "Notion", amount: 360, cadence: "Monthly workspace" },
];

const alerts: FinanceAlert[] = [
  {
    id: "low-balance",
    severity: "warning",
    message: "Operating account dipped below 2 months of runway this week.",
  },
  {
    id: "unusual-spend",
    severity: "info",
    message: "Unusual spend detected: Travel was 46% higher than the trailing 3-month average.",
  },
];

const FinanceOverview: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<(typeof quickFilters)[number]["id"]>("ytd");

  const totals = useMemo(() => {
    const cashOnHand = 214500;
    const avgMonthlyBurn = 34500;
    const runwayMonths = cashOnHand / avgMonthlyBurn;
    const cashIn = monthlyFlow.reduce((acc, row) => acc + row.inflow, 0);
    const cashOut = monthlyFlow.reduce((acc, row) => acc + row.outflow, 0);
    const totalCategory = categoryBreakdown.reduce((acc, row) => acc + row.amount, 0);
    return { cashOnHand, avgMonthlyBurn, runwayMonths, cashIn, cashOut, totalCategory };
  }, []);

  const actions = (
    <div className={styles.filterRow} aria-label="Quick range filters">
      {quickFilters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className={[styles.filterButton, selectedRange === filter.id ? styles.filterButtonActive : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setSelectedRange(filter.id)}
          aria-pressed={selectedRange === filter.id}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );

  const maxFlow = Math.max(
    ...monthlyFlow.flatMap((row) => [row.inflow, row.outflow])
  );

  return (
    <FinanceLayout
      title="Finance"
      description="A live look at company health across accounts, spend, and runway. Connect Plaid to keep balances and transactions in sync."
      actions={actions}
    >
      <div className={styles.page}>
        <div className={styles.cardsGrid}>
          <FinanceCard
            title="Cash on hand"
            metric={currency.format(totals.cashOnHand)}
            badge="4 accounts"
            footer="Includes operating, savings, and reserve balances."
            aria-label={`Cash on hand across accounts: ${currency.format(totals.cashOnHand)}.`}
          />

          <FinanceCard
            title="Runway"
            metric={`${runwayFormatter.format(totals.runwayMonths)} mo`}
            subtitle="Cash on hand ÷ average burn (last 3 months)"
            footer={`Average monthly burn: ${currency.format(totals.avgMonthlyBurn)}`}
            aria-label={`Runway is ${runwayFormatter.format(
              totals.runwayMonths
            )} months based on average monthly burn of ${currency.format(totals.avgMonthlyBurn)}.`}
          />

          <FinanceCard
            title="Cash in vs cash out"
            subtitle={`Range: ${quickFilters.find((f) => f.id === selectedRange)?.label ?? "Year-to-date"}`}
            badge="Bars show inflow vs outflow"
            aria-label="Monthly cash inflow versus outflow chart"
          >
            <div className={styles.chartBars} role="img" aria-label="Monthly cash flow">
              {monthlyFlow.map((row) => {
                const inflowPercent = Math.round((row.inflow / maxFlow) * 100);
                const outflowPercent = Math.round((row.outflow / maxFlow) * 100);
                return (
                  <div key={row.month} className={styles.chartBarRow}>
                    <div className={styles.chartBar} aria-hidden>
                      <div
                        className={styles.chartBarFill}
                        style={{ width: `${inflowPercent}%` }}
                        title={`${row.month} inflow ${preciseCurrency.format(row.inflow)}`}
                      />
                    </div>
                    <span>{row.month}</span>
                    <div className={styles.chartBar} aria-hidden>
                      <div
                        className={styles.chartBarFill}
                        style={{ width: `${outflowPercent}%`, background: "rgba(255, 255, 255, 0.28)" }}
                        title={`${row.month} outflow ${preciseCurrency.format(row.outflow)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </FinanceCard>

          <FinanceCard
            title="Top categories"
            subtitle="Year-to-date"
            aria-label="Top spend categories year to date"
          >
            <ul className={styles.list}>
              {categoryBreakdown.map((entry) => {
                const pct = Math.round((entry.amount / totals.totalCategory) * 100);
                return (
                  <li key={entry.category} className={styles.listItem}>
                    <span>{entry.category}</span>
                    <span>{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </FinanceCard>

          <FinanceCard
            title="Recurring vendors"
            subtitle="Subscriptions & retainers"
            aria-label="Recurring vendor commitments"
          >
            <ul className={styles.list}>
              {recurringVendors.map((vendor) => (
                <li key={vendor.vendor} className={styles.listItem}>
                  <div>
                    <div>{vendor.vendor}</div>
                    <small>{vendor.cadence}</small>
                  </div>
                  <span>{preciseCurrency.format(vendor.amount)}</span>
                </li>
              ))}
            </ul>
          </FinanceCard>

          <FinanceCard
            title="AR vs AP"
            subtitle="Outstanding invoices & bills"
            aria-label="Accounts receivable versus accounts payable"
          >
            <div className={styles.listItem}>
              <span>Accounts receivable</span>
              <span>{currency.format(68500)}</span>
            </div>
            <div className={styles.listItem}>
              <span>Accounts payable</span>
              <span>{currency.format(45200)}</span>
            </div>
          </FinanceCard>

          <FinanceCard title="Alerts" aria-label="Finance alerts">
            <ul className={styles.alertsList}>
              {alerts.map((alert) => (
                <li key={alert.id} className={styles.alertItem}>
                  <span className={styles.alertBadge}>{alert.severity}</span>
                  <span>{alert.message}</span>
                </li>
              ))}
            </ul>
          </FinanceCard>

          <FinanceCard title="Tasks" aria-label="Finance tasks overview">
            <div className={styles.tasksCard}>
              <TasksOverviewCard className="finance-task-card" />
            </div>
          </FinanceCard>
        </div>
      </div>
    </FinanceLayout>
  );
};

export default FinanceOverview;
