import React from "react";

const HQOverview = React.lazy(() => import("./pages/HQOverview"));
const AccountsPage = React.lazy(() => import("./pages/AccountsPage"));
const TransactionsPage = React.lazy(() => import("./pages/TransactionsPage"));
const ReportsPage = React.lazy(() => import("./pages/ReportsPage"));
const InvoicesPage = React.lazy(() => import("./pages/InvoicesPage"));
const HQTasksPage = React.lazy(() => import("./pages/HQTasksPage"));
const HQEventsPage = React.lazy(() => import("./pages/HQEventsPage"));
const HQMessagesPage = React.lazy(() => import("./pages/HQMessagesPage"));

export const hqRoutes = [
  { path: "hq", element: <HQOverview /> },
  { path: "hq/accounts", element: <AccountsPage /> },
  { path: "hq/transactions", element: <TransactionsPage /> },
  { path: "hq/reports", element: <ReportsPage /> },
  { path: "hq/invoices", element: <InvoicesPage /> },
  { path: "hq/tasks", element: <HQTasksPage /> },
  { path: "hq/events", element: <HQEventsPage /> },
  { path: "hq/messages", element: <HQMessagesPage /> },
];

export default hqRoutes;
