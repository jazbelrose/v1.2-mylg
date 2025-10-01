export function parseBudget(input: string | number | undefined | null): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }

  let str = String(input).trim();
  if (!str) return 0;

  // Normalize common dash variants that may precede negative numbers
  str = str.replace(/[\u2012-\u2015]/g, "-");

  // Replace common currency symbols or unsupported characters with spaces so
  // they do not interfere with pattern matching below.
  str = str.replace(/[^0-9a-zA-Z+\-.,()\s]/g, " ");

  const hasParens = str.includes("(") && str.includes(")");
  if (hasParens) {
    str = str.replace(/[()]/g, " ");
  }

  const match = str.match(/[-+]?(?:\d[\d\s.,]*|\.\d+)(?:[kKmM])?/);
  if (!match) return 0;

  let numeric = match[0].replace(/\s+/g, "");
  if (!numeric) return 0;

  let multiplier = 1;
  const suffix = numeric.slice(-1).toLowerCase();
  if (suffix === "k" || suffix === "m") {
    multiplier = suffix === "k" ? 1_000 : 1_000_000;
    numeric = numeric.slice(0, -1);
  }

  let sign = hasParens ? -1 : 1;
  if (numeric.startsWith("+") || numeric.startsWith("-")) {
    sign *= numeric.startsWith("-") ? -1 : 1;
    numeric = numeric.slice(1);
  }

  numeric = numeric.replace(/,/g, "");
  if (!numeric) return 0;

  const value = Number(numeric);
  if (!Number.isFinite(value)) return 0;

  return sign * value * multiplier;
}

export function formatUSD(value: string | number): string {
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,]/g, ""));
  if (isNaN(num)) return String(value);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}








