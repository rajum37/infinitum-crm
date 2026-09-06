/**
 * Shared pricing display utilities.
 * All customer-facing price rendering must go through these helpers.
 * Never read plan.basePrice for display — always use PlanPrice.amount.
 */

/** Maps billing interval + intervalCount to a human label */
export function intervalLabel(billingInterval: string, intervalCount = 1): string {
  const count = intervalCount ?? 1;
  switch (billingInterval) {
    case "MONTH":
      return count === 1 ? "month" : `${count} months`;
    case "QUARTER":
      return count === 1 ? "quarter" : `${count} quarters`;
    case "HALF_YEAR":
      return count === 1 ? "6 months" : `${count * 6} months`;
    case "YEAR":
      return count === 1 ? "year" : `${count} years`;
    case "WEEK":
      return count === 1 ? "week" : `${count} weeks`;
    case "DAY":
      return count === 1 ? "day" : `${count} days`;
    default:
      return billingInterval.toLowerCase();
  }
}

/** Maps billing interval to toggle button label */
export function intervalToggleLabel(interval: string): string {
  switch (interval) {
    case "MONTH": return "Monthly";
    case "QUARTER": return "Quarterly";
    case "HALF_YEAR": return "Half-Yearly";
    case "YEAR": return "Yearly";
    case "WEEK": return "Weekly";
    case "DAY": return "Daily";
    default: return interval;
  }
}

/** Format a monetary amount using the correct locale for the currency */
const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AUD: "en-AU",
  SGD: "en-SG",
};

export function formatCurrency(amount: number | string | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return "";
  const n = Number(amount);
  if (isNaN(n)) return "";
  const c = (currency || "USD").toUpperCase();
  const locale = CURRENCY_LOCALE[c] || "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${c} ${n.toFixed(2)}`;
  }
}

export interface PriceDisplayInfo {
  /** The actual price to pay (from price.amount) */
  amount: number;
  /** Original / undiscounted price (null if no discount) */
  originalAmount: number | null;
  /** Savings percent — 0 means no savings, never negative or NaN */
  savingsPercent: number | null;
  /** Savings are valid and should be displayed */
  hasDiscount: boolean;
  /** Formatted amount string using currency */
  formattedAmount: string;
  /** Formatted original amount string (only when hasDiscount) */
  formattedOriginalAmount: string | null;
  /** Label like "month", "quarter", "6 months", "year" */
  intervalLabel: string;
}

/**
 * Derive all display information from a PlanPrice record.
 * Never pass plan.basePrice here — only pass the selected price object.
 */
export function getPriceDisplayInfo(price: {
  amount: string | number;
  originalAmount?: string | number | null;
  discountAmount?: string | number | null;
  discountPercent?: string | number | null;
  currency: string;
  billingInterval: string;
  intervalCount?: number | null;
}): PriceDisplayInfo {
  const amount = Number(price.amount);
  const originalAmount = price.originalAmount != null ? Number(price.originalAmount) : null;
  const currency = price.currency || "USD";
  const iCount = Number(price.intervalCount ?? 1);

  // Validate: original must be strictly greater than amount to show discount
  const isValidDiscount =
    originalAmount !== null &&
    !isNaN(originalAmount) &&
    isFinite(originalAmount) &&
    originalAmount > amount;

  let savingsPercent: number | null = null;

  if (isValidDiscount && originalAmount !== null) {
    // Prefer explicit discountPercent from backend if it's a valid positive number
    const explicitPct = price.discountPercent != null ? Number(price.discountPercent) : null;
    if (explicitPct !== null && !isNaN(explicitPct) && explicitPct > 0 && explicitPct <= 100) {
      savingsPercent = Math.round(explicitPct);
    } else {
      // Calculate from amounts
      const calc = ((originalAmount - amount) / originalAmount) * 100;
      savingsPercent = Math.round(calc);
    }
    // Never show 0% savings
    if (savingsPercent === 0) savingsPercent = null;
  }

  return {
    amount,
    originalAmount: isValidDiscount ? originalAmount : null,
    savingsPercent,
    hasDiscount: isValidDiscount && savingsPercent !== null,
    formattedAmount: formatCurrency(amount, currency),
    formattedOriginalAmount: isValidDiscount && originalAmount !== null ? formatCurrency(originalAmount, currency) : null,
    intervalLabel: intervalLabel(price.billingInterval, iCount),
  };
}
