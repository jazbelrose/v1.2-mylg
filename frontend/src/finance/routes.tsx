import React from "react";

const FinanceOverview = React.lazy(() => import("./pages/FinanceOverview"));
const AccountsPage = React.lazy(() => import("./pages/AccountsPage"));
const TransactionsPage = React.lazy(() => import("./pages/TransactionsPage"));
const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));
const InvoicesPage = React.lazy(() => import("./pages/InvoicesPage"));
const FinanceTasksPage = React.lazy(() => import("./pages/FinanceTasksPage"));

export const financeRoutes = [
  { path: "/finance", element: <FinanceOverview /> },
  { path: "/finance/accounts", element: <AccountsPage /> },
  { path: "/finance/transactions", element: <TransactionsPage /> },
  { path: "/finance/reports", element: <ReportsPage /> },
  { path: "/finance/invoices", element: <InvoicesPage /> },
  { path: "/finance/tasks", element: <FinanceTasksPage /> },
];

export default financeRoutes;
