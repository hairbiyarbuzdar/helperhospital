import type { SlipData } from "./actions";

function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(h)}:${p(d.getMinutes())}${ampm}`;
}

function slipBlock(slip: SlipData, copyLabel: string): string {
  const when = fmtDateTime(slip.createdAt);
  const rows = slip.items
    .map(
      (i) =>
        `<tr><td>${esc(i.name)}</td><td class="amt">${i.amount.toFixed(2)}</td></tr>`,
    )
    .join("");
  return `
  <div class="slip">
    <div class="copy">${copyLabel}</div>
    <div class="title">Helper's Eye Teaching Hospital Quetta</div>
    <div class="subtitle">Test Slip</div>
    <div class="box">
      <div class="head">
        <div class="seal">HELPER'S EYE HOSPITAL · QUETTA</div>
        <table class="fields">
          <tr><td class="lbl">Receipt No.</td><td>${slip.receiptNo ?? "—"}</td><td class="lbl">MR #</td><td>${esc(slip.mrNumber)}</td><td class="lbl">Deposit Date:</td><td>${when}</td></tr>
          <tr><td class="lbl">Patient Name:</td><td class="nm">${esc((slip.name || "").toUpperCase())}</td><td class="lbl">Gender:</td><td>${esc(slip.gender)}</td><td class="lbl">Test Date:</td><td>${when}</td></tr>
          <tr><td class="lbl">Age:</td><td>${esc(slip.age)}</td><td class="lbl">CNIC:</td><td>${esc(slip.cnic ?? "")}</td><td class="lbl">Doctor:</td><td>${esc(slip.doctor ?? "")}</td></tr>
        </table>
      </div>
      <table class="items">
        <thead><tr><th>Test</th><th class="amt">Amount</th></tr></thead>
        <tbody>${rows || '<tr><td>&nbsp;</td><td class="amt"></td></tr>'}</tbody>
        <tfoot><tr><td>Total Amount</td><td class="amt">${slip.total.toFixed(2)}</td></tr></tfoot>
      </table>
      <div class="sign">Signature : ______________________</div>
    </div>
  </div>`;
}

function buildHtml(slip: SlipData): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Test Slip ${esc(slip.mrNumber)}</title>
  <style>
    @page { size: A5; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#000; margin:0; }
    .slip { padding: 2mm 0; page-break-inside: avoid; }
    .copy { text-align:right; font-size:9px; color:#555; }
    .title { text-align:center; font-weight:bold; font-size:15px; }
    .subtitle { text-align:center; font-weight:bold; font-size:13px; margin-bottom:4px; }
    .box { border:1.5px solid #000; padding:6px; }
    .head { display:flex; gap:8px; align-items:center; }
    .seal { flex:0 0 58px; height:58px; border:1px solid #000; border-radius:50%; font-size:7px; line-height:1.2; text-align:center; display:flex; align-items:center; justify-content:center; padding:4px; font-weight:bold; }
    .fields { width:100%; border-collapse:collapse; font-size:11px; }
    .fields td { padding:2px 4px; vertical-align:top; }
    .fields .lbl { color:#333; white-space:nowrap; }
    .fields .nm { font-weight:bold; text-transform:uppercase; }
    .items { width:100%; border-collapse:collapse; margin-top:6px; font-size:11px; }
    .items th, .items td { border:1px solid #000; padding:3px 6px; text-align:left; }
    .items .amt { text-align:right; width:90px; }
    .items tfoot td { font-weight:bold; }
    .sign { margin-top:14px; font-size:11px; }
    .cut { border-top:1px dashed #999; margin:5mm 0; }
  </style></head>
  <body>
    ${slipBlock(slip, "Hospital Copy")}
    <div class="cut"></div>
    ${slipBlock(slip, "Patient Copy")}
    <script>
      window.onafterprint = function(){ window.close(); };
      window.onload = function(){ window.focus(); window.print(); };
    </script>
  </body></html>`;
}

// Open a window synchronously (keeps it user-initiated so popup blockers allow
// it); call before awaiting the server action.
export function openSlipWindow(): Window | null {
  const w = window.open("", "_blank", "width=620,height=820");
  if (w) {
    w.document.write(
      "<p style='font-family:Arial;padding:24px;color:#444'>Preparing slip…</p>",
    );
  }
  return w;
}

export function writeSlip(w: Window, slip: SlipData) {
  w.document.open();
  w.document.write(buildHtml(slip));
  w.document.close();
}
