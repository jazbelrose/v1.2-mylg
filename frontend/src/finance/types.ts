export type FinanceAccount = {
  id: string;
  institution: string;
  name: string;
  mask?: string;
  type: "depository" | "credit" | "loan" | "investment" | "other";
  subtype?: string;
  currency: string;
  current: number;
  available?: number;
  lastSyncAt: string;
};

export type FinanceTxn = {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  isDebit: boolean;
  name: string;
  merchant?: string;
  category: string[];
  tags?: string[];
  note?: string;
  receiptUrl?: string;
};

export type FinanceAlert = {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical";
};
