import type { TestReport, ReturnReport, OverviewReport } from "./actions";

function rs(n: number) {
  return "Rs " + n.toLocaleString("en-PK");
}

function fmtLong(dateStr: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateStr}T12:00:00+05:00`));
}

function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function genStamp() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function periodLabel(from: string, to: string) {
  return from === to ? fmtLong(from) : `${fmtLong(from)} — ${fmtLong(to)}`;
}

// A boxed, bordered summary strip (ledger-style figures across the top).
function summaryBox(pairs: [string, string, string?][]) {
  const cells = pairs
    .map(
      ([label, value, color]) =>
        `<td><span class="s-label">${label}</span><span class="s-val"${color ? ` style="color:${color}"` : ""}>${value}</span></td>`,
    )
    .join("");
  return `<table class="summary"><tr>${cells}</tr></table>`;
}

function shell(title: string, reportName: string, period: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>
@page{size:A4;margin:16mm 16mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000}
.head{text-align:center;border-bottom:3px double #000;padding-bottom:8px}
.hosp{font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:.3px}
.city{font-size:11px;color:#222;margin-top:1px}
.rtitle{margin-top:8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px}
.meta{display:flex;justify-content:space-between;font-size:10px;color:#222;margin:6px 1px 14px}
.meta b{font-weight:700}
table.summary{width:100%;border-collapse:collapse;margin-bottom:16px}
table.summary td{border:1px solid #000;padding:6px 9px;vertical-align:top}
.s-label{display:block;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#444}
.s-val{display:block;font-size:14px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}
.section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin:16px 0 5px;border-left:4px solid #000;padding-left:7px}
table.ledger{width:100%;border-collapse:collapse}
table.ledger th,table.ledger td{border:1px solid #000;padding:5px 8px;font-size:10.5px;text-align:left;vertical-align:top}
table.ledger th{background:#e6e6e6;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
table.ledger .r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
table.ledger .c{text-align:center}
table.ledger td.sr{text-align:center;width:36px;color:#222}
table.ledger .nm{font-weight:700;text-transform:uppercase}
table.ledger tfoot td{font-weight:800;background:#f0f0f0;border-top:2px solid #000}
.empty{text-align:center;color:#666;padding:14px}
.foot{margin-top:22px;display:flex;justify-content:space-between;font-size:9px;color:#444;border-top:1px solid #999;padding-top:6px}
</style></head><body>
<div class="head">
  <div class="hosp">Helper's Eye Teaching Hospital</div>
  <div class="city">Quetta</div>
  <div class="rtitle">${reportName}</div>
</div>
<div class="meta"><span>Period: <b>${period}</b></span><span>Generated: <b>${genStamp()}</b></span></div>
${body}
<div class="foot"><span>Helper's Eye Teaching Hospital · Quetta</span><span>Computer-generated ledger — no signature required.</span></div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

export function printOverviewReport(data: OverviewReport) {
  const win = window.open("", "_blank", "width=820,height=1100");
  if (!win) return;

  const period = periodLabel(data.from, data.to);
  const payTotal = data.payments.reduce((s, p) => s + p.amount, 0);

  const summary = summaryBox([
    ["Patients Registered", String(data.patientsRegistered)],
    ["Tests Ordered", String(data.testsOrdered)],
    ["Total Collected", rs(data.totalCollected)],
    ...(data.totalRefunded > 0
      ? ([["Refunded", rs(data.totalRefunded), "#c2410c"]] as [string, string, string][])
      : []),
    ["Net Collected", rs(data.netCollected), "#166534"],
  ]);

  const patientRows =
    data.patients.length === 0
      ? `<tr><td colspan="5" class="empty">No patients registered in this period.</td></tr>`
      : data.patients
          .map(
            (p, i) =>
              `<tr>
          <td class="sr">${i + 1}</td>
          <td>${p.mrNumber}</td>
          <td class="nm">${p.name}</td>
          <td>${p.doctor ?? "—"}</td>
          <td class="r">${fmtShort(p.createdAt)}</td>
        </tr>`,
          )
          .join("");

  const paymentRows =
    data.payments.length === 0
      ? `<tr><td colspan="6" class="empty">No payments collected in this period.</td></tr>`
      : data.payments
          .map(
            (p, i) =>
              `<tr>
          <td class="sr">${i + 1}</td>
          <td>#${p.receiptNo}</td>
          <td>${p.mrNumber}</td>
          <td class="nm">${p.patientName}</td>
          <td class="r">${rs(p.amount)}</td>
          <td class="r">${fmtShort(p.date)}</td>
        </tr>`,
          )
          .join("");

  const body = `
    ${summary}
    <div class="section">Patients Registered</div>
    <table class="ledger">
      <thead><tr><th>Sr.</th><th>MR #</th><th>Patient</th><th>Doctor</th><th class="r">Date</th></tr></thead>
      <tbody>${patientRows}</tbody>
    </table>
    <div class="section">Payments Collected</div>
    <table class="ledger">
      <thead><tr><th>Sr.</th><th>Receipt #</th><th>MR #</th><th>Patient</th><th class="r">Amount</th><th class="r">Date</th></tr></thead>
      <tbody>${paymentRows}</tbody>
      <tfoot><tr><td colspan="4">Total</td><td class="r">${rs(payTotal)}</td><td></td></tr></tfoot>
    </table>`;

  win.document.write(shell("Overview Report", "Overview Ledger", period, body));
  win.document.close();
}

export function printTestReport(data: TestReport) {
  const win = window.open("", "_blank", "width=820,height=1100");
  if (!win) return;

  const period = periodLabel(data.from, data.to);

  const summary = summaryBox([
    ["Total Tests", String(data.totalTests)],
    ["Total Revenue", rs(data.totalRevenue), "#166534"],
    ["Test Types", String(data.breakdown.length)],
  ]);

  const rows =
    data.breakdown.length === 0
      ? `<tr><td colspan="5" class="empty">No tests ordered in this period.</td></tr>`
      : data.breakdown
          .map(
            (r, i) =>
              `<tr>
          <td class="sr">${i + 1}</td>
          <td>${r.testName}</td>
          <td class="r">${rs(r.rate)}</td>
          <td class="r">${r.count}</td>
          <td class="r">${rs(r.revenue)}</td>
        </tr>`,
          )
          .join("");

  const body = `
    ${summary}
    <div class="section">Test Breakdown</div>
    <table class="ledger">
      <thead><tr><th>Sr.</th><th>Test Name</th><th class="r">Rate</th><th class="r">Count</th><th class="r">Revenue</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3">Total</td><td class="r">${data.totalTests}</td><td class="r">${rs(data.totalRevenue)}</td></tr></tfoot>
    </table>`;

  win.document.write(shell("Test Report", "Test Ledger", period, body));
  win.document.close();
}

export function printReturnReport(data: ReturnReport) {
  const win = window.open("", "_blank", "width=820,height=1100");
  if (!win) return;

  const period = periodLabel(data.from, data.to);

  const summary = summaryBox([
    ["Total Returns", String(data.totalReturns)],
    ["Total Amount Returned", rs(data.totalAmount), "#c2410c"],
  ]);

  const rows =
    data.rows.length === 0
      ? `<tr><td colspan="5" class="empty">No fee returns in this period.</td></tr>`
      : data.rows
          .map(
            (r, i) =>
              `<tr>
          <td class="sr">${i + 1}</td>
          <td>${r.mrNumber}</td>
          <td class="nm">${r.name}</td>
          <td class="r" style="color:#c2410c;font-weight:700">${rs(r.amount)}</td>
          <td class="r">${fmtDateTime(r.refundedAt)}</td>
        </tr>`,
          )
          .join("");

  const body = `
    ${summary}
    <div class="section">Fee Returns</div>
    <table class="ledger">
      <thead><tr><th>Sr.</th><th>MR #</th><th>Patient</th><th class="r">Amount</th><th class="r">Return Date</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3">Total</td><td class="r" style="color:#c2410c">${rs(data.totalAmount)}</td><td></td></tr></tfoot>
    </table>`;

  win.document.write(shell("Fee Return Report", "Fee Return Ledger", period, body));
  win.document.close();
}
