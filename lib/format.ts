// Whole-rupee formatter, e.g. 55000 -> "Rs 55,000".
export function formatRs(amount: number) {
  return `Rs ${amount.toLocaleString("en-US")}`;
}
