"use client";
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="no-print" style={{ padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Print</button>;
}
