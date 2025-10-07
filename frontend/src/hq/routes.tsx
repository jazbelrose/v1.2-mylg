import React from "react";

export const HQOverview = React.lazy(() => import("./pages/HQOverview"));
export const AccountsPage = React.lazy(() => import("./pages/AccountsPage"));
export const TransactionsPage = React.lazy(() => import("./pages/TransactionsPage"));
export const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));
export const InvoicesPage = React.lazy(() => import("./pages/InvoicesPage"));
export const HQTasksPage = React.lazy(() => import("./pages/HQTasksPage"));
export const HQEventsPage = React.lazy(() => import("./pages/HQEventsPage"));
export const HQMessagesPage = React.lazy(() => import("./pages/HQMessagesPage"));

export const hqRoutes = [
  { path: "", element: <HQOverview /> },
  { path: "accounts", element: <AccountsPage /> },
  { path: "transactions", element: <TransactionsPage /> },
  { path: "reports", element: <ReportsPage /> },
  { path: "invoices", element: <InvoicesPage /> },
  { path: "tasks", element: <HQTasksPage /> },
  { path: "events", element: <HQEventsPage /> },
  { path: "messages", element: <HQMessagesPage /> },
];

export default hqRoutes;
