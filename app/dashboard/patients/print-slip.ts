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

// The eye exam findings recorded by hand on the left column of the OPD slip.
const EXAM_ROWS = ["VA", "PH", "Ref", "IOP", "Ant Sig", "Fundus", "B-Scan"];

function buildHtml(slip: SlipData): string {
  const when = fmtDateTime(slip.createdAt);
  // OPD number is the patient's serial, embedded at the start of the MR number.
  const opdNo = parseInt(slip.mrNumber, 10);
  const opdLabel = Number.isFinite(opdNo) ? String(opdNo) : "—";
  const examBoxes = EXAM_ROWS.map(
    (r) => `<div class="exam">${esc(r)}</div>`,
  ).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>OPD Slip ${esc(slip.mrNumber)}</title>
  <style>
    @page { size: A5; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#000; margin:0; }
    .slip { padding: 0; }
    .header { display:flex; align-items:center; gap:8px; padding:0 4px 6px; }
    .logo { flex:0 0 56px; height:56px; border:1px solid #000; border-radius:50%;
            font-size:6px; line-height:1.15; text-align:center; display:flex;
            align-items:center; justify-content:center; padding:4px; font-weight:bold; }
    .brand { flex:1; text-align:center; }
    .brand .name { font-weight:bold; font-size:16px; line-height:1.15; }
    .brand .kind { font-size:13px; margin-top:2px; }
    .box { border:1.5px solid #000; }
    .info { border-bottom:1.5px solid #000; }
    .info-row { display:flex; border-bottom:1px solid #000; }
    .info-row:last-child { border-bottom:none; }
    .cell { padding:3px 6px; font-size:11px; display:flex; gap:4px; align-items:baseline; }
    .cell.grow { flex:1; }
    .cell.div { border-left:1px solid #000; }
    .lbl { color:#000; white-space:nowrap; }
    .val { font-weight:bold; }
    .val.line { flex:1; border-bottom:1px dotted #666; min-width:60px; }
    .body { display:flex; min-height:135mm; }
    .sidebar { flex:0 0 74px; border-right:1.5px solid #000; padding:8px 6px;
               display:flex; flex-direction:column; gap:8px; }
    .exam { border:1px solid #000; border-radius:3px; padding:5px 4px;
            font-size:11px; font-weight:bold; text-align:center; }
    .rx { flex:1; padding:8px 10px; position:relative; }
    .rx .mark { font-size:20px; font-style:italic; }
    .footer { display:flex; justify-content:space-between; align-items:flex-end;
              border-top:1.5px solid #000; padding:6px 8px; font-size:11px; }
    .footer .made { max-width:45%; }
    .footer .sign { }
  </style></head>
  <body>
    <div class="slip">
      <div class="header">
        <div class="logo">HELPER'S EYE HOSPITAL</div>
        <div class="brand">
          <div class="name">Helper's Eye Teaching Hospital</div>
          <div class="name">Quetta</div>
          <div class="kind">OPD Slip</div>
        </div>
        <div class="logo">HELPER'S EYE HOSPITAL · QUETTA</div>
      </div>

      <div class="box">
        <div class="info">
          <div class="info-row">
            <div class="cell"><span class="lbl">OPD No.</span><span class="val">${esc(opdLabel)}</span></div>
            <div class="cell"><span class="lbl">MR #</span><span class="val">${esc(slip.mrNumber)}</span></div>
            <div class="cell div grow"><span class="lbl">Date:</span><span class="val">${when}</span></div>
          </div>
          <div class="info-row">
            <div class="cell grow"><span class="lbl">Patient</span><span class="val">${esc((slip.name || "").toUpperCase())}</span></div>
            <div class="cell div"><span class="lbl">Gender:</span><span class="val">${esc(slip.gender)}</span></div>
            <div class="cell"><span class="lbl">Age:</span><span class="val">${esc(slip.age)}</span></div>
          </div>
          <div class="info-row">
            <div class="cell grow"><span class="lbl">Diagnostic.</span><span class="val line"></span></div>
            <div class="cell div"><span class="lbl">CNIC:</span><span class="val">${esc(slip.cnic ?? "")}</span></div>
          </div>
        </div>

        <div class="body">
          <div class="sidebar">${examBoxes}</div>
          <div class="rx"><span class="mark">R<sub>x</sub></span></div>
        </div>

        <div class="footer">
          <div class="made">Slip Made By ${esc(slip.slipMadeBy ?? "—")}</div>
          <div class="sign">Signature : ______________________</div>
        </div>
      </div>
    </div>
    <script>
      window.onafterprint = function(){ window.close(); };
      window.onload = function(){ window.focus(); window.print(); };
    </script>
  </body></html>`;
}

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
