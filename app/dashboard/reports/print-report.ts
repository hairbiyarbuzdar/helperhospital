import type { TodayReport, TestReport } from "./actions";

const STORAGE_KEY = "hh_preferred_printer";

function rs(n: number) {
  return "Rs " + n.toLocaleString("en-PK");
}

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateStr}T12:00:00+05:00`));
}

function shell(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>
@page{size:A4;margin:18mm 20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111}
h1{font-size:18px;font-weight:700;margin-bottom:2px}
.sub{font-size:10px;color:#555;margin-bottom:16px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.stat{border:1px solid #ccc;border-radius:4px;padding:8px 10px}
.stat-label{font-size:8px;font-weight:700;letter-spacing:.5px;color:#888;text-transform:uppercase}
.stat-value{font-size:15px;font-weight:800;margin-top:2px}
table{width:100%;border-collapse:collapse}
th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#555;padding:6px 8px;border-bottom:2px solid #ccc;text-align:left}
th.r,td.r{text-align:right}
td{padding:5px 8px;border-bottom:1px solid #e5e5e5;font-size:10px}
tfoot td{font-weight:700;border-top:2px solid #ccc;border-bottom:none;padding:6px 8px}
</style></head><body>
${body}
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

async function tryDirectPrint(html: string): Promise<boolean> {
  const printerName =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) ?? "")
      : "";
  if (!printerName) return false;
  try {
    const res = await fetch("/api/direct-print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, printerName }),
    });
    const data = (await res.json()) as { ok: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

function buildTodayHtml(data: TodayReport): string {
  const period = fmtDate(data.date);
  const rows =
    data.patients.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#888;padding:16px">No patients registered.</td></tr>`
      : data.patients
          .map(
            (p) =>
              `<tr>
          <td>${p.mrNumber}</td>
          <td style="font-weight:700;text-transform:uppercase">${p.name}</td>
          <td>${p.doctor ?? "—"}</td>
          <td>${p.items.join(", ") || "—"}</td>
          <td class="r">${rs(p.paid)}</td>
        </tr>`,
          )
          .join("");
  const body = `
    <h1>Today's Report</h1>
    <p class="sub">Helper Hospital &nbsp;·&nbsp; ${period}</p>
    <div class="stats" style="grid-template-columns:repeat(${data.totalRefunded > 0 ? 4 : 3},1fr)">
      <div class="stat"><div class="stat-label">Patients Registered</div><div class="stat-value">${data.patientsRegistered}</div></div>
      <div class="stat"><div class="stat-label">Tests Ordered</div><div class="stat-value">${data.testsOrdered}</div></div>
      <div class="stat"><div class="stat-label">Total Collected</div><div class="stat-value">${rs(data.totalCollected)}</div></div>
      ${data.totalRefunded > 0 ? `<div class="stat"><div class="stat-label">Net Collected</div><div class="stat-value">${rs(data.netCollected)}</div></div>` : ""}
    </div>
    <table>
      <thead><tr><th>MR</th><th>Patient</th><th>Doctor</th><th>Items</th><th class="r">Paid</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4">Total</td><td class="r">${rs(data.totalCollected)}</td></tr></tfoot>
    </table>`;
  return shell("Today's Report", body);
}

function buildTestHtml(data: TestReport): string {
  const period =
    data.from === data.to
      ? fmtDate(data.from)
      : `${fmtDate(data.from)} — ${fmtDate(data.to)}`;
  const rows =
    data.breakdown.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:#888;padding:16px">No tests ordered in this period.</td></tr>`
      : data.breakdown
          .map(
            (r) =>
              `<tr>
          <td>${r.testName}</td>
          <td class="r">${rs(r.rate)}</td>
          <td class="r">${r.count}</td>
          <td class="r">${rs(r.revenue)}</td>
        </tr>`,
          )
          .join("");
  const body = `
    <h1>Test Report</h1>
    <p class="sub">Helper Hospital &nbsp;·&nbsp; ${period}</p>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat"><div class="stat-label">Total Tests</div><div class="stat-value">${data.totalTests}</div></div>
      <div class="stat"><div class="stat-label">Total Revenue</div><div class="stat-value">${rs(data.totalRevenue)}</div></div>
      <div class="stat"><div class="stat-label">Test Types</div><div class="stat-value">${data.breakdown.length}</div></div>
    </div>
    <table>
      <thead><tr><th>Test Name</th><th class="r">Rate</th><th class="r">Count</th><th class="r">Revenue</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td class="r">${data.totalTests}</td><td class="r">${rs(data.totalRevenue)}</td></tr></tfoot>
    </table>`;
  return shell("Test Report", body);
}

export async function printTodayReport(data: TodayReport) {
  const html = buildTodayHtml(data);
  if (await tryDirectPrint(html)) return;
  const win = window.open("", "_blank", "width=820,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export async function printTestReport(data: TestReport) {
  const html = buildTestHtml(data);
  if (await tryDirectPrint(html)) return;
  const win = window.open("", "_blank", "width=820,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
