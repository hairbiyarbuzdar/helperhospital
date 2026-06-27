import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(req: NextRequest) {
  if (process.platform !== "win32") {
    return NextResponse.json(
      { ok: false, error: "Direct printing only supported on Windows." },
      { status: 400 },
    );
  }

  const { html, printerName } = (await req.json()) as {
    html: string;
    printerName: string;
  };

  const tmpFile = join(tmpdir(), `hh-slip-${Date.now()}.html`);
  const fileUrl = "file:///" + tmpFile.replace(/\\/g, "/");

  writeFileSync(tmpFile, html, "utf-8");

  // Escape single-quotes in printer name for PowerShell
  const safePrinter = printerName.replace(/'/g, "''");

  // Build the PowerShell script as a plain string (no JS template literal vars)
  const psLines = [
    "$p = Get-WmiObject -Query \"SELECT * FROM Win32_Printer WHERE Name='" + safePrinter + "'\"",
    "if ($p) { $p.SetDefaultPrinter() | Out-Null }",
    "$pf86 = [System.Environment]::GetFolderPath('ProgramFilesX86')",
    "$pf64 = [System.Environment]::GetFolderPath('ProgramFiles')",
    "$browsers = @(",
    "  \"$pf64\\Microsoft\\Edge\\Application\\msedge.exe\",",
    "  \"$pf86\\Microsoft\\Edge\\Application\\msedge.exe\",",
    "  \"$pf64\\Google\\Chrome\\Application\\chrome.exe\",",
    "  \"$pf86\\Google\\Chrome\\Application\\chrome.exe\"",
    ")",
    "$browser = $browsers | Where-Object { Test-Path $_ } | Select-Object -First 1",
    "if (-not $browser) { throw 'No supported browser found.' }",
    "$proc = Start-Process -FilePath $browser -ArgumentList '--kiosk-printing','--no-first-run','--disable-extensions','" + fileUrl + "' -PassThru",
    "Start-Sleep -Seconds 6",
    "Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue",
  ];

  const psScript = psLines.join("; ");

  try {
    execSync(`powershell -NonInteractive -Command "${psScript}"`, {
      timeout: 20000,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 },
    );
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {}
  }
}
