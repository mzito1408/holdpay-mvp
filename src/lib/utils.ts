export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Generate unique booking reference
 * Format: HP{timestamp}{random}
 */
export function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `HP${timestamp}${random}`;
}

/**
 * Generate 6-digit confirmation PIN
 */
export function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate refund amount based on policy
 * @param amount - Original deposit amount in cents
 * @param policy - Refund policy type
 * @param customPercentage - Custom percentage if policy is 'custom'
 * @returns Refund amount in cents
 */
export function calculateRefund(
  amount: number,
  policy: string,
  customPercentage?: number,
): number {
  if (policy === "none") return 0;
  if (policy === "25") return Math.floor(amount * 0.25);
  if (policy === "50") return Math.floor(amount * 0.5);
  if (policy === "custom" && customPercentage !== undefined) {
    return Math.floor(amount * (customPercentage / 100));
  }
  return 0;
}

/**
 * Format amount in cents to dollar string
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}